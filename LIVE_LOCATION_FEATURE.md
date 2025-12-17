# Live Location Feature - User Dashboard

## Overview
The user dashboard now displays the user's **live location** with automatic updates and real-time tracking.

## Features Implemented

### 1. **Real-Time Location Tracking**
- Uses the browser's Geolocation API with `watchPosition()` for continuous location updates
- Automatically updates the map marker as the user moves
- High accuracy mode enabled for precise location tracking

### 2. **Reverse Geocoding**
- Converts GPS coordinates to human-readable addresses
- Uses OpenStreetMap's Nominatim API for address lookup
- Displays full address with street, city, and postal code information

### 3. **Live Updates**
- Shows a timestamp of the last location update
- Displays coordinates with 6 decimal precision
- Loading indicator while fetching location

### 4. **Error Handling**
- Graceful handling of location permission denials
- Clear error messages for different failure scenarios:
  - Permission denied
  - Location unavailable
  - Request timeout
  - Browser not supporting geolocation
- Falls back to default location (New Delhi) if location access fails

### 5. **Location Sharing**
- Share button to share current location
- Uses native Web Share API when available
- Falls back to copying Google Maps link to clipboard
- Button is disabled until location is acquired

### 6. **Visual Feedback**
- Animated loading spinner while fetching location
- Map automatically centers on user's position
- "Live" indicator in the location title
- Smooth transitions and updates

## Technical Implementation

### Components Modified
1. **LocationCard.jsx**
   - Added state management for position, address, loading, and errors
   - Implemented `watchPosition()` for continuous tracking
   - Added reverse geocoding function
   - Implemented location sharing functionality
   - Added MapUpdater component to recenter map on position changes

2. **LocationCard.css**
   - Added loading spinner animation
   - Styled error messages
   - Added update timestamp styling
   - Improved button states (disabled/enabled)

## How It Works

1. **On Component Mount:**
   - Checks if browser supports geolocation
   - Requests location permission from user
   - Starts watching user's position

2. **On Location Update:**
   - Updates map marker position
   - Fetches address from coordinates
   - Updates timestamp
   - Recenters map to new position

3. **On Component Unmount:**
   - Cleans up location watcher to prevent memory leaks

## User Experience

### First Time Use
1. User opens dashboard
2. Browser prompts for location permission
3. Once granted, map shows user's actual location
4. Address is fetched and displayed

### Ongoing Use
- Location updates automatically as user moves
- No need to refresh or manually update
- Share button becomes active once location is acquired

## Privacy & Permissions

- Location is only tracked when dashboard is open
- User must grant permission explicitly
- Location data is not stored on server (client-side only)
- User can revoke permission anytime through browser settings

## Browser Compatibility

Works on all modern browsers that support:
- Geolocation API
- React Leaflet
- Web Share API (with clipboard fallback)

## Future Enhancements

Potential improvements:
- Store location history
- Send location to emergency contacts during SOS
- Geofencing alerts
- Battery-optimized location tracking
- Offline map support
