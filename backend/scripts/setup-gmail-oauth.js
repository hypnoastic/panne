import { google } from 'googleapis';
import readline from 'readline';

const SCOPES = ['https://www.googleapis.com/auth/gmail.send'];

async function setupGmailOAuth() {
  console.log('Gmail OAuth2 Setup');
  console.log('==================');
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (prompt) => new Promise((resolve) => {
    rl.question(prompt, resolve);
  });

  try {
    const clientId = await question('Enter your Gmail OAuth Client ID: ');
    const clientSecret = await question('Enter your Gmail OAuth Client Secret: ');

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      'https://developers.google.com/oauthplayground'
    );

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
    });

    console.log('\n1. Visit this URL in your browser:');
    console.log(authUrl);
    console.log('\n2. Complete the authorization process');
    console.log('3. Copy the authorization code from the redirect URL\n');

    const code = await question('Enter the authorization code: ');

    const { tokens } = await oauth2Client.getToken(code);
    
    console.log('\n✅ Success! Add these to your .env file:');
    console.log('==========================================');
    console.log(`GMAIL_CLIENT_ID=${clientId}`);
    console.log(`GMAIL_CLIENT_SECRET=${clientSecret}`);
    console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log(`EMAIL_FROM=your_gmail_address@gmail.com`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    rl.close();
  }
}

setupGmailOAuth();