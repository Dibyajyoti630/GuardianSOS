# Google OAuth Setup Guide for GuardianSOS

## Overview
This guide will help you set up Google OAuth authentication for your GuardianSOS application.

## Prerequisites
- A Google account
- Your GuardianSOS application running locally

## Step-by-Step Setup

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top
3. Click "New Project"
4. Enter project name: `GuardianSOS` (or any name you prefer)
5. Click "Create"

### 2. Enable Google+ API

1. In the Google Cloud Console, go to "APIs & Services" > "Library"
2. Search for "Google+ API"
3. Click on it and press "Enable"

### 3. Configure OAuth Consent Screen

1. Go to "APIs & Services" > "OAuth consent screen"
2. Select "External" user type
3. Click "Create"
4. Fill in the required information:
   - **App name**: GuardianSOS
   - **User support email**: Your email
   - **Developer contact information**: Your email
5. Click "Save and Continue"
6. On the "Scopes" page, click "Add or Remove Scopes"
7. Add these scopes:
   - `userinfo.email`
   - `userinfo.profile`
8. Click "Save and Continue"
9. Add test users (your email) if in testing mode
10. Click "Save and Continue"

### 4. Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Select "Web application"
4. Configure:
   - **Name**: GuardianSOS Web Client
   - **Authorized JavaScript origins**:
     - `http://localhost:5173` (Vite dev server)
     - `http://127.0.0.1:5173`
   - **Authorized redirect URIs**:
     - `http://localhost:5173`
     - `http://127.0.0.1:5173`
5. Click "Create"
6. **IMPORTANT**: Copy the "Client ID" that appears

### 5. Update Your .env File

1. Open the `.env` file in your GuardianSOS project
2. Replace `YOUR_GOOGLE_CLIENT_ID_HERE` with your actual Client ID:
   ```
   VITE_GOOGLE_CLIENT_ID=your-actual-client-id-here.apps.googleusercontent.com
   ```
3. Save the file

### 6. Restart Your Development Servers

Since you updated the .env file, you need to restart your servers:

1. Stop both running servers (Ctrl+C in both terminals)
2. Restart the frontend: `npm run dev`
3. Restart the backend: `npm run server`

## Testing Google Login

1. Navigate to your login page: `http://localhost:5173/guardiansos/user/login`
2. Click the "Continue with Google" button
3. You should see a Google sign-in popup
4. Select your Google account
5. Grant permissions
6. You should be redirected to the dashboard

## Troubleshooting

### Error: "redirect_uri_mismatch"
- Make sure your authorized redirect URIs in Google Cloud Console match exactly with your app's URL
- Check both `http://localhost:5173` and `http://127.0.0.1:5173`

### Error: "idpiframe_initialization_failed"
- Clear your browser cookies and cache
- Make sure third-party cookies are enabled
- Try in an incognito/private window

### Error: "popup_closed_by_user"
- This happens when the user closes the Google sign-in popup
- Just try clicking the button again

### Google button doesn't work
- Check browser console for errors
- Verify your Client ID is correctly set in .env
- Make sure you restarted the dev server after updating .env

## Security Notes

⚠️ **Important Security Considerations:**

1. **Never commit your Client ID to public repositories** if it contains sensitive data
2. For production, you'll need to:
   - Verify your app with Google
   - Add your production domain to authorized origins
   - Use environment variables for different environments
3. The current implementation uses implicit flow which is suitable for development
4. Consider implementing token refresh for production use

## Features Implemented

✅ Google OAuth login for both User and Guardian roles
✅ Automatic user creation on first Google login
✅ Profile picture support from Google account
✅ Seamless integration with existing JWT authentication
✅ Error handling and user feedback

## Next Steps

- Test the Google login flow thoroughly
- Consider adding a "Link Google Account" feature for existing users
- Implement profile picture display in the dashboard
- Add option to unlink Google account

---

**Need Help?** If you encounter any issues, check the browser console and server logs for detailed error messages.
