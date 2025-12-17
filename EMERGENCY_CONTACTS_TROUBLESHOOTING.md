# Emergency Contacts - Troubleshooting Guide

## Issue: "Failed to load contacts" or 404 Error

### Root Cause
The Emergency Contacts feature requires **authentication**. You must be logged in to access your contacts.

### Solution Steps

#### 1. Make Sure Both Servers Are Running

**Frontend Server** (Vite):
```bash
npm run dev
```
Should show: `Local: http://localhost:5173/`

**Backend Server** (Express):
```bash
npm run server
```
Should show: `Server running on port 5000`

#### 2. Login to the Application

1. Navigate to: http://localhost:5173/guardiansos/user/login
2. **Sign Up** if you don't have an account:
   - Name: Your Name
   - Email: your@email.com
   - Password: YourPassword123
   - Click "Create Account"

3. **OR Login** if you already have an account:
   - Email: your@email.com
   - Password: YourPassword123
   - Click "Sign In"

#### 3. Access Dashboard

After login, you'll be redirected to: http://localhost:5173/dashboard

#### 4. Open Emergency Contacts

1. Find the **Quick Actions** section
2. Click the **"Contacts"** button (blue button with Users icon)
3. The modal should open successfully!

---

## Common Errors and Fixes

### Error: "401 Unauthorized" or "No token, authorization denied"

**Cause**: You're not logged in or your session expired

**Fix**:
1. Go to login page
2. Sign in again
3. Return to dashboard
4. Try opening contacts again

---

### Error: "404 Not Found" on `/api/contacts`

**Cause**: Backend server not running or old server still active

**Fix**:
1. Stop all node processes:
   ```powershell
   Get-Process node | Stop-Process -Force
   ```

2. Restart backend server:
   ```bash
   npm run server
   ```

3. Verify it's running:
   - Open: http://127.0.0.1:5000/api/contacts
   - Should see: `{"msg":"No token, authorization denied"}`
   - This means the API is working!

---

### Error: "Failed to fetch contacts"

**Cause**: Network error or server not responding

**Fix**:
1. Check if backend server is running
2. Check console for detailed error
3. Verify MongoDB is connected (check server logs)

---

### Error: "ERR_CONNECTION_REFUSED" on localhost:5173

**Cause**: Frontend server not running

**Fix**:
```bash
npm run dev
```

---

## Verification Checklist

Before using Emergency Contacts, verify:

- [ ] Backend server running on port 5000
- [ ] Frontend server running on port 5173
- [ ] MongoDB connected (check server logs)
- [ ] You are logged in (check localStorage for 'token')
- [ ] No old node processes running

---

## How to Check if You're Logged In

### Method 1: Check localStorage
1. Open browser DevTools (F12)
2. Go to **Application** tab
3. Click **Local Storage** → http://localhost:5173
4. Look for key: `token`
5. If it exists and has a value, you're logged in!

### Method 2: Check Dashboard
1. Navigate to: http://localhost:5173/dashboard
2. If you see the dashboard (not redirected to login), you're logged in!

---

## Testing the API Directly

### Test if API is working:
```bash
# This should return: {"msg":"No token, authorization denied"}
curl http://127.0.0.1:5000/api/contacts
```

### Test with authentication:
1. Login to get a token
2. Copy token from localStorage
3. Test API:
```bash
curl -H "x-auth-token: YOUR_TOKEN_HERE" http://127.0.0.1:5000/api/contacts
```

Should return: `[]` (empty array if no contacts) or your contacts list

---

## Step-by-Step: First Time Setup

1. **Start Servers**:
   ```bash
   # Terminal 1
   npm run dev
   
   # Terminal 2  
   npm run server
   ```

2. **Create Account**:
   - Go to: http://localhost:5173/guardiansos/user/login
   - Click "Sign Up"
   - Fill in details
   - Click "Create Account"

3. **Access Dashboard**:
   - You'll be auto-redirected to dashboard
   - Or manually go to: http://localhost:5173/dashboard

4. **Add Emergency Contact**:
   - Click "Contacts" button (blue, Quick Actions section)
   - Click "Add Emergency Contact"
   - Fill in:
     - Name: John Doe
     - Phone: 1234567890
     - Email: john@example.com (optional)
     - Relationship: Family
   - Click "Add Contact"

5. **Verify**:
   - Contact should appear in the list
   - You can call or delete it
   - Refresh the page - contact persists!

---

## Still Having Issues?

### Check Server Logs

**Backend Server Terminal**:
Look for:
- `MongoDB Connected...` ✅
- `Server running on port 5000` ✅
- `GET /api/contacts` (when you click Contacts button)

**Browser Console** (F12):
Look for:
- `📍 Location Update:` (location tracking working)
- `🗺️ LocationCard component mounted`
- Any red error messages

### Common Mistakes

1. ❌ **Not logged in** → Login first!
2. ❌ **Old server running** → Kill all node processes, restart
3. ❌ **Wrong port** → Backend: 5000, Frontend: 5173
4. ❌ **MongoDB not connected** → Check .env file has MONGO_URI

---

## Success Indicators

When everything is working:

✅ Both servers running
✅ Logged in (token in localStorage)
✅ Dashboard loads
✅ Contacts modal opens
✅ Shows "No Emergency Contacts" (if empty) or your contacts list
✅ Can add contacts successfully
✅ Contacts persist after page refresh

---

## Quick Reset

If nothing works, try this:

```powershell
# 1. Stop everything
Get-Process node | Stop-Process -Force

# 2. Clear browser data
# In browser: Ctrl+Shift+Delete → Clear all

# 3. Restart servers
npm run dev    # Terminal 1
npm run server # Terminal 2

# 4. Create new account and try again
```

---

**Need More Help?**

Check the detailed documentation:
- `EMERGENCY_CONTACTS_DATABASE.md` - API documentation
- `EMERGENCY_CONTACTS_FEATURE.md` - Feature guide
- `LOCATION_ACCURACY_GUIDE.md` - Location troubleshooting

**Your contacts are stored securely in MongoDB and will work perfectly once you're logged in!** 🎉
