import dotenv from 'dotenv';
import { sendOTP } from '../services/emailService.js';

dotenv.config();

async function testEmail() {
  try {
    console.log('Testing Gmail OAuth2 email service...');
    
    const testEmail = process.env.EMAIL_FROM;
    const testOTP = '123456';
    
    await sendOTP(testEmail, testOTP, 'Password Reset');
    console.log('✅ Email sent successfully!');
  } catch (error) {
    console.error('❌ Email test failed:', error.message);
  }
}

testEmail();