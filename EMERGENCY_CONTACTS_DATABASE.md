# Emergency Contacts Database Implementation

## Overview
Emergency contacts are now stored in **MongoDB** instead of browser localStorage, providing:
- ✅ **Cross-device sync**: Access contacts from any device
- ✅ **Persistent storage**: Contacts saved securely on server
- ✅ **Backup**: No data loss if browser cache is cleared
- ✅ **User-specific**: Each user has their own contacts
- ✅ **Scalable**: Can handle unlimited contacts

## Database Schema

### EmergencyContact Model
```javascript
{
  _id: ObjectId,              // Auto-generated MongoDB ID
  userId: ObjectId,           // Reference to User model
  name: String (required),    // Contact name
  phone: String (required),   // Phone number
  email: String (optional),   // Email address
  relationship: String,       // Family, Friend, Colleague, etc.
  isPrimary: Boolean,         // Primary contact flag
  createdAt: Date,           // Auto-generated timestamp
  updatedAt: Date            // Auto-updated timestamp
}
```

### Indexes
- `userId + createdAt`: For fast user-specific queries
- Sorted by: `isPrimary` (descending), then `createdAt` (descending)

## API Endpoints

### Base URL
```
https://guardiansos-backend.onrender.com/api/contacts
```

### Authentication
All endpoints require JWT token in header:
```
x-auth-token: <your-jwt-token>
```

---

### 1. Get All Contacts
**GET** `/api/contacts`

**Description**: Fetch all emergency contacts for logged-in user

**Headers**:
```
x-auth-token: <token>
```

**Response** (200 OK):
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "userId": "507f1f77bcf86cd799439012",
    "name": "John Doe",
    "phone": "1234567890",
    "email": "john@example.com",
    "relationship": "Family",
    "isPrimary": false,
    "createdAt": "2025-12-17T15:30:00.000Z",
    "updatedAt": "2025-12-17T15:30:00.000Z"
  }
]
```

---

### 2. Add Contact
**POST** `/api/contacts`

**Description**: Add a new emergency contact

**Headers**:
```
x-auth-token: <token>
Content-Type: application/json
```

**Body**:
```json
{
  "name": "Jane Smith",
  "phone": "9876543210",
  "email": "jane@example.com",
  "relationship": "Friend",
  "isPrimary": false
}
```

**Response** (200 OK):
```json
{
  "_id": "507f1f77bcf86cd799439013",
  "userId": "507f1f77bcf86cd799439012",
  "name": "Jane Smith",
  "phone": "9876543210",
  "email": "jane@example.com",
  "relationship": "Friend",
  "isPrimary": false,
  "createdAt": "2025-12-17T15:35:00.000Z",
  "updatedAt": "2025-12-17T15:35:00.000Z"
}
```

**Error** (400 Bad Request):
```json
{
  "msg": "Name and phone number are required"
}
```

---

### 3. Update Contact
**PUT** `/api/contacts/:id`

**Description**: Update an existing contact

**Headers**:
```
x-auth-token: <token>
Content-Type: application/json
```

**Body** (all fields optional):
```json
{
  "name": "Jane Doe",
  "phone": "9876543210",
  "email": "jane.doe@example.com",
  "relationship": "Family",
  "isPrimary": true
}
```

**Response** (200 OK):
```json
{
  "_id": "507f1f77bcf86cd799439013",
  "userId": "507f1f77bcf86cd799439012",
  "name": "Jane Doe",
  "phone": "9876543210",
  "email": "jane.doe@example.com",
  "relationship": "Family",
  "isPrimary": true,
  "createdAt": "2025-12-17T15:35:00.000Z",
  "updatedAt": "2025-12-17T15:40:00.000Z"
}
```

**Error** (404 Not Found):
```json
{
  "msg": "Contact not found"
}
```

**Error** (401 Unauthorized):
```json
{
  "msg": "Not authorized to update this contact"
}
```

---

### 4. Delete Contact
**DELETE** `/api/contacts/:id`

**Description**: Delete an emergency contact

**Headers**:
```
x-auth-token: <token>
```

**Response** (200 OK):
```json
{
  "msg": "Contact deleted successfully"
}
```

**Error** (404 Not Found):
```json
{
  "msg": "Contact not found"
}
```

---

### 5. Get Primary Contact
**GET** `/api/contacts/primary`

**Description**: Get the primary emergency contact

**Headers**:
```
x-auth-token: <token>
```

**Response** (200 OK):
```json
{
  "_id": "507f1f77bcf86cd799439013",
  "userId": "507f1f77bcf86cd799439012",
  "name": "Jane Doe",
  "phone": "9876543210",
  "email": "jane.doe@example.com",
  "relationship": "Family",
  "isPrimary": true,
  "createdAt": "2025-12-17T15:35:00.000Z",
  "updatedAt": "2025-12-17T15:40:00.000Z"
}
```

**Error** (404 Not Found):
```json
{
  "msg": "No primary contact set"
}
```

---

## Frontend Integration

### Component Updates
The `EmergencyContacts.jsx` component now:
- ✅ Fetches contacts from API on mount
- ✅ Sends POST request to add contacts
- ✅ Sends DELETE request to remove contacts
- ✅ Shows loading states during API calls
- ✅ Displays error messages
- ✅ Has refresh button to reload contacts

### API Calls Example

```javascript
// Get auth token
const token = localStorage.getItem('token');

// Fetch contacts
const response = await fetch('https://guardiansos-backend.onrender.com/api/contacts', {
  method: 'GET',
  headers: {
    'x-auth-token': token,
    'Content-Type': 'application/json'
  }
});

const contacts = await response.json();
```

## Files Created/Modified

### Backend Files
1. **`backend/models/EmergencyContact.js`** (NEW)
   - MongoDB schema for emergency contacts
   - Validation and indexing

2. **`backend/routes/contacts.js`** (NEW)
   - REST API endpoints
   - CRUD operations
   - Authentication middleware

3. **`backend/middleware/auth.js`** (NEW)
   - JWT authentication middleware
   - Token verification

4. **`server.js`** (MODIFIED)
   - Added contacts route

### Frontend Files
1. **`src/components/EmergencyContacts.jsx`** (MODIFIED)
   - API integration instead of localStorage
   - Loading and error states
   - Refresh functionality

2. **`src/styles/EmergencyContacts.css`** (MODIFIED)
   - Loading state styles
   - Error message styles
   - Refresh button styles

## Security Features

### Authentication
- ✅ JWT token required for all endpoints
- ✅ Token verified on every request
- ✅ User can only access their own contacts

### Authorization
- ✅ Users can only view their contacts
- ✅ Users can only modify their contacts
- ✅ Users can only delete their contacts

### Validation
- ✅ Name and phone required
- ✅ Email format validation
- ✅ Relationship enum validation
- ✅ User ownership verification

## Migration from localStorage

### Automatic Migration (Optional)
To migrate existing localStorage contacts to database:

```javascript
// In EmergencyContacts.jsx, add this to useEffect
const migrateLocalStorageContacts = async () => {
  const localContacts = localStorage.getItem('emergencyContacts');
  if (localContacts) {
    const contacts = JSON.parse(localContacts);
    
    for (const contact of contacts) {
      await fetch(API_URL, {
        method: 'POST',
        headers: {
          'x-auth-token': getAuthToken(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: contact.name,
          phone: contact.phone,
          email: contact.email || '',
          relationship: contact.relationship || ''
        })
      });
    }
    
    // Clear localStorage after migration
    localStorage.removeItem('emergencyContacts');
  }
};
```

## Testing the API

### Using cURL

**Get Contacts**:
```bash
curl -X GET https://guardiansos-backend.onrender.com/api/contacts \
  -H "x-auth-token: YOUR_TOKEN_HERE"
```

**Add Contact**:
```bash
curl -X POST https://guardiansos-backend.onrender.com/api/contacts \
  -H "x-auth-token: YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Contact",
    "phone": "1234567890",
    "email": "test@example.com",
    "relationship": "Friend"
  }'
```

**Delete Contact**:
```bash
curl -X DELETE https://guardiansos-backend.onrender.com/api/contacts/CONTACT_ID \
  -H "x-auth-token: YOUR_TOKEN_HERE"
```

### Using Postman
1. Set base URL: `https://guardiansos-backend.onrender.com/api/contacts`
2. Add header: `x-auth-token: <your-token>`
3. Test all endpoints

## Error Handling

### Common Errors

**401 Unauthorized**:
- No token provided
- Invalid token
- Expired token
- Solution: Login again to get new token

**404 Not Found**:
- Contact doesn't exist
- Wrong contact ID
- Solution: Verify contact ID

**500 Server Error**:
- Database connection issue
- Server error
- Solution: Check server logs

## Performance Optimization

### Indexing
- Contacts indexed by `userId` for fast queries
- Sorted results reduce client-side processing

### Caching (Future)
- Implement Redis caching for frequently accessed contacts
- Cache invalidation on updates

### Pagination (Future)
- Add pagination for users with many contacts
- Limit: 20 contacts per page

## Future Enhancements

- [ ] Batch operations (add/delete multiple contacts)
- [ ] Contact groups/categories
- [ ] Contact verification (verify phone/email)
- [ ] Contact sharing between users
- [ ] Contact import from phone
- [ ] Contact export to CSV
- [ ] Contact search and filtering
- [ ] Contact history/audit log

## Summary

✅ **Database Created**: MongoDB schema for emergency contacts
✅ **API Implemented**: Full CRUD operations with authentication
✅ **Frontend Updated**: API integration with loading/error states
✅ **Security**: JWT authentication and authorization
✅ **Testing**: All endpoints functional

**Your emergency contacts are now securely stored in the database!** 🎉
