# OAuth and Email OTP Setup Guide

This guide will help you set up Google OAuth authentication and email OTP verification for the Panne project.

## 🚀 Quick Start

### 1. Run Database Migrations

```bash
cd backend
npm run migrate-oauth
```

### 2. Configure Environment Variables

Update your `.env` files with the OAuth configuration:

#### Backend (.env)
```env
# Google OAuth Configuration (for user authentication)
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/auth/google/callback

# Gmail OAuth2 Configuration (for sending emails)
GMAIL_CLIENT_ID=your_gmail_oauth_client_id
GMAIL_CLIENT_SECRET=your_gmail_oauth_client_secret
GMAIL_REFRESH_TOKEN=your_gmail_refresh_token
EMAIL_FROM=your_gmail_address@gmail.com
EMAIL_USER=your_gmail_address@gmail.com
```

#### Frontend (.env)
```env
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id
```

### 3. Start the Application

```bash
# Backend
cd backend
npm run dev

# Frontend (in another terminal)
cd frontend
npm run dev
```

## 📋 Detailed Setup Instructions

### Step 1: Google Cloud Console Setup

1. **Create a Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one

2. **Enable APIs**
   - Enable the **Google+ API** or **Google Identity API**
   - Enable the **Gmail API** (for email sending)

3. **Create OAuth 2.0 Credentials**
   - Go to **APIs & Services > Credentials**
   - Click **Create Credentials > OAuth 2.0 Client IDs**
   - Choose **Web application**
   - Add authorized origins:
     - `http://localhost:3000` (if using different port)
     - `http://localhost:5173` (Vite default)
     - Your production domain
   - Add authorized redirect URIs:
     - `http://localhost:5000/auth/google/callback`
     - Your production callback URL

4. **Get Gmail Refresh Token**
   - Use the existing Gmail OAuth setup or run:
   ```bash
   cd backend
   npm run setup-gmail
   ```

### Step 2: Database Schema

The OAuth migration adds these tables and columns:

```sql
-- Add OAuth support to users table
ALTER TABLE users 
ALTER COLUMN password_hash DROP NOT NULL,
ADD COLUMN google_id VARCHAR(255) UNIQUE,
ADD COLUMN provider VARCHAR(50) DEFAULT 'local',
ADD COLUMN is_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN refresh_token TEXT;

-- Email verification OTPs
CREATE TABLE email_verification_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  otp VARCHAR(6) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- OAuth refresh tokens (secure storage)
CREATE TABLE oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);
```

### Step 3: API Endpoints

#### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register with email verification |
| POST | `/auth/verify-email` | Verify email with OTP |
| POST | `/auth/resend-verification` | Resend verification OTP |
| GET | `/auth/google/url` | Get Google OAuth URL |
| POST | `/auth/google/callback` | Handle OAuth callback |
| POST | `/auth/google` | Legacy Google Sign-In |
| POST | `/auth/google/refresh` | Refresh Google access token |
| POST | `/auth/logout` | Logout and clear tokens |

#### OAuth Flow

1. **Authorization URL Generation**
   ```javascript
   const response = await fetch('/api/auth/google/url');
   const { authUrl } = await response.json();
   window.location.href = authUrl; // or open in popup
   ```

2. **Handle Callback**
   ```javascript
   // After user authorizes, Google redirects with code
   const response = await fetch('/api/auth/google/callback', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ code: authorizationCode })
   });
   const { user, token } = await response.json();
   ```

### Step 4: Frontend Integration

#### Registration with Email Verification

```javascript
// 1. Register user
const registerResponse = await authApi.register({
  name: 'John Doe',
  email: 'john@example.com',
  password: 'password123'
});

// 2. If requiresVerification is true, show OTP form
if (registerResponse.requiresVerification) {
  // Show OTP verification component
}

// 3. Verify OTP
const verifyResponse = await authApi.verifyEmail({
  email: 'john@example.com',
  otp: '123456'
});
```

#### Google OAuth Integration

```javascript
// Using the enhanced Google Auth component
import EnhancedGoogleAuth from '../components/EnhancedGoogleAuth';

<EnhancedGoogleAuth
  mode="popup" // or "redirect"
  onSuccess={(data) => {
    // Handle successful authentication
    console.log('User:', data.user);
    navigate('/dashboard');
  }}
  onError={(error) => {
    // Handle authentication error
    console.error('Auth error:', error);
  }}
/>
```

### Step 5: Security Features

#### Token Management
- **Access tokens**: Short-lived (1 hour)
- **Refresh tokens**: Stored securely in database
- **Session tokens**: JWT with configurable expiration
- **Automatic token refresh**: Built-in refresh mechanism

#### Error Handling
- **Invalid grant**: Prompts re-authentication
- **Expired tokens**: Automatic refresh attempt
- **Revoked access**: Clears stored tokens

#### Rate Limiting
- **OAuth attempts**: 10 per 15 minutes per IP
- **OTP requests**: 1 per minute per email
- **Login attempts**: Built-in protection

### Step 6: Production Deployment

#### Environment Variables
```env
# Production OAuth URLs
GOOGLE_CALLBACK_URL=https://yourdomain.com/auth/google/callback
FRONTEND_URL=https://yourdomain.com

# Security
NODE_ENV=production
JWT_SECRET=your_production_jwt_secret
```

#### HTTPS Requirements
- Google OAuth requires HTTPS in production
- Update authorized origins and redirect URIs
- Use secure cookies in production

## 🔧 Troubleshooting

### Common Issues

1. **"OAuth not configured" error**
   - Check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`
   - Verify environment variables are loaded

2. **"Invalid redirect URI" error**
   - Check Google Cloud Console redirect URIs
   - Ensure exact match with callback URL

3. **Email sending fails**
   - Verify Gmail OAuth refresh token
   - Check Gmail API is enabled
   - Run `npm run test-email` to test

4. **OTP not received**
   - Check spam folder
   - Verify email service configuration
   - Check server logs for email errors

### Testing

```bash
# Test email functionality
cd backend
npm run test-email

# Test OAuth flow
# 1. Start both frontend and backend
# 2. Navigate to /register or /login
# 3. Try Google OAuth button
# 4. Check browser network tab for API calls
```

## 📚 API Reference

### Request/Response Examples

#### Register with Email Verification
```javascript
// Request
POST /api/auth/register
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}

// Response
{
  "user": {
    "id": "uuid",
    "email": "john@example.com",
    "name": "John Doe",
    "is_verified": false
  },
  "message": "Registration successful. Please check your email for verification code.",
  "requiresVerification": true
}
```

#### Verify Email OTP
```javascript
// Request
POST /api/auth/verify-email
{
  "email": "john@example.com",
  "otp": "123456"
}

// Response
{
  "user": {
    "id": "uuid",
    "email": "john@example.com",
    "name": "John Doe",
    "is_verified": true
  },
  "token": "jwt_token_here",
  "message": "Email verified successfully"
}
```

#### Google OAuth Callback
```javascript
// Request
POST /api/auth/google/callback
{
  "code": "google_authorization_code"
}

// Response
{
  "user": {
    "id": "uuid",
    "email": "user@gmail.com",
    "name": "User Name",
    "avatar_url": "https://...",
    "is_verified": true,
    "provider": "google"
  },
  "token": "jwt_token_here",
  "message": "Google authentication successful"
}
```

## 🔒 Security Best Practices

1. **Never expose refresh tokens** to frontend
2. **Use HTTPS** in production
3. **Validate all inputs** on backend
4. **Implement rate limiting** for auth endpoints
5. **Log security events** for monitoring
6. **Rotate secrets** regularly
7. **Use secure cookie settings** in production

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section
2. Review server logs for detailed errors
3. Verify all environment variables are set
4. Test with the provided examples

---

**Note**: This implementation provides production-ready OAuth and email verification with proper security measures, error handling, and user experience considerations.