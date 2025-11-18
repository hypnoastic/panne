class OAuthEmailService {
  async getAccessToken() {
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.GMAIL_CLIENT_ID,
          client_secret: process.env.GMAIL_CLIENT_SECRET,
          refresh_token: process.env.GMAIL_REFRESH_TOKEN,
          grant_type: 'refresh_token'
        })
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.access_token;
    } catch (error) {
      throw new Error(`Failed to get access token: ${error.message}`);
    }
  }

  createEmailMessage(to, subject, html) {
    const message = [
      `From: ${process.env.EMAIL_FROM}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
      '',
      html
    ].join('\n');

    return Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  async sendOTP(email, otp, type = 'Email Verification') {
    try {
      const accessToken = await this.getAccessToken();
      
      const isPasswordReset = type === 'Password Reset';
      const subject = isPasswordReset ? 'Panne - Password Reset' : 'Panne - Email Verification';
      const title = isPasswordReset ? 'Password Reset' : 'Email Verification';
      const message = isPasswordReset ? 'Your password reset code is:' : 'Your verification code is:';

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">${title}</h2>
          <p>${message}</p>
          <div style="background: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #2EC4B6; font-size: 32px; margin: 0;">${otp}</h1>
          </div>
          <p>This code will expire in 10 minutes.</p>
          ${isPasswordReset ? '<p style="color: #666;">If you didn\'t request this password reset, please ignore this email.</p>' : ''}
        </div>
      `;

      const encodedMessage = this.createEmailMessage(email, subject, html);

      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          raw: encodedMessage
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Gmail API error: ${response.statusText} - ${errorData}`);
      }

      const result = await response.json();
      console.log(`${type} email sent successfully:`, result.id);
      return result;
    } catch (error) {
      console.error('Email send error:', error);
      throw new Error(`Failed to send ${type} email: ${error.message}`);
    }
  }
}

export default new OAuthEmailService();