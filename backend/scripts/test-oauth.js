import dotenv from 'dotenv';
import oauthService from '../services/oauthService.js';

dotenv.config();

async function testOAuthSetup() {
  console.log('🔍 Testing OAuth Configuration...\n');

  // Check environment variables
  const requiredEnvVars = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_CALLBACK_URL'
  ];

  let missingVars = [];
  requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      missingVars.push(varName);
    } else {
      console.log(`✅ ${varName}: ${process.env[varName].substring(0, 20)}...`);
    }
  });

  if (missingVars.length > 0) {
    console.log(`\n❌ Missing environment variables: ${missingVars.join(', ')}`);
    console.log('Please check your .env file and add the missing variables.');
    process.exit(1);
  }

  // Test OAuth URL generation
  try {
    const authUrl = oauthService.generateGoogleAuthUrl();
    console.log(`\n✅ OAuth URL generated successfully`);
    console.log(`🔗 Auth URL: ${authUrl.substring(0, 100)}...`);
  } catch (error) {
    console.log(`\n❌ Failed to generate OAuth URL: ${error.message}`);
    process.exit(1);
  }

  console.log('\n🎉 OAuth configuration test completed successfully!');
  console.log('\nNext steps:');
  console.log('1. Start the backend server: npm run dev');
  console.log('2. Start the frontend server: cd ../frontend && npm run dev');
  console.log('3. Test the OAuth flow in the browser');
  
  process.exit(0);
}

testOAuthSetup().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});