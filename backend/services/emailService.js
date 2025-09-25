import { google } from "googleapis";

const createGmailClient = async () => {
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      "https://developers.google.com/oauthplayground"
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GMAIL_REFRESH_TOKEN
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    return gmail;
  } catch (error) {
    console.error('Error creating Gmail client:', error);
    throw error;
  }
};

const createEmail = ({ to, subject, html }) => {
  const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
  const messageParts = [
    `From: ${process.env.EMAIL_FROM}`,
    `To: ${to}`,
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
    `Subject: ${utf8Subject}`,
    '',
    html,
  ];
  const message = messageParts.join('\n');
  const encodedMessage = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return encodedMessage;
};

// Verify transporter connection
const verifyConnection = async () => {
  try {
    await transporter.verify();
    return true;
  } catch (error) {
    console.error('SMTP Connection Error:', error);
    return false;
  }
};

// Retry mechanism for failed attempts
const retry = async (fn, retries = 3, delay = 2000) => {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return retry(fn, retries - 1, delay * 1.5);
    }
    throw error;
  }
};

export const sendOTP = async (email, otp, type = "Email Verification") => {
  try {
    console.log(`Attempting to send ${type} email to: ${email}`);
    
    const isPasswordReset = type === "Password Reset";
    const subject = isPasswordReset
      ? "Panne - Password Reset"
      : "Panne - Email Verification";
    const title = isPasswordReset ? "Password Reset" : "Email Verification";
    const message = isPasswordReset
      ? "Your password reset code is:"
      : "Your verification code is:";

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">${title}</h2>
        <p>${message}</p>
        <div style="background: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
          <h1 style="color: #2EC4B6; font-size: 32px; margin: 0;">${otp}</h1>
        </div>
        <p>This code will expire in 10 minutes.</p>
        ${
          isPasswordReset
            ? "<p style=\"color: #666;\">If you didn't request this password reset, please ignore this email.</p>"
            : ""
        }
      </div>
    `;

    // Create raw email
    const encodedMessage = createEmail({
      to: email,
      subject,
      html
    });

    // Send email using Gmail API with retry mechanism
    await retry(async () => {
      const gmail = await createGmailClient();
      const { data: { id } = {} } = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage,
        },
      });
      console.log(`${type} email sent successfully. MessageId:`, id);
      return id;
    });
  } catch (error) {
    console.error("Email send error details:", {
      error: error.message,
      stack: error.stack,
      details: error.response?.data || error
    });

    throw new Error(
      `Failed to send ${type} email: ${error.message}. ` +
      `Please check Gmail API settings and permissions.`
    );
  }
};
