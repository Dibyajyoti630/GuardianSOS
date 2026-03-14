const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const Evidence = require('./models/Evidence');
const SOS = require('./models/SOS');
const User = require('./models/User');
const Connection = require('./models/Connection');

// --- SCOPED EMIT INFRASTRUCTURE ---
// Maps a guardian's userId to their socket ID (for targeted emits)
const guardianSockets = new Map(); // guardianUserId -> socketId

// Maps a tracked user's userId to the set of guardian userIds watching them
const userGuardians = new Map(); // userId -> Set<guardianUserId>

/**
 * Emit a socket event ONLY to the guardians of a specific user.
 * Replaces all previous io.emit() / socket.broadcast.emit() calls.
 * Falls back silently if no guardians are connected (polling handles it).
 */
function emitToGuardians(io, userId, eventName, data) {
    // DEBUG: Log map state to diagnose scoped emit issues
    console.log(`[Scoped] emitToGuardians called for userId=${userId}, event='${eventName}'`);
    console.log(`[Scoped] userGuardians map keys:`, [...userGuardians.keys()]);
    console.log(`[Scoped] guardianSockets map:`, [...guardianSockets.entries()]);

    const guardianIds = userGuardians.get(userId);
    if (!guardianIds || guardianIds.size === 0) {
        console.log(`[Scoped] No connected guardians for user ${userId}, event '${eventName}' not emitted via socket`);
        return;
    }

    guardianIds.forEach(guardianId => {
        const gSocketId = guardianSockets.get(guardianId);
        if (gSocketId) {
            io.to(gSocketId).emit(eventName, data);
            console.log(`[Scoped] Emitted '${eventName}' to guardian ${guardianId} (socket: ${gSocketId})`);
        } else {
            console.log(`[Scoped] Guardian ${guardianId} is in userGuardians but has no socket in guardianSockets`);
        }
    });
}

/**
 * Load all guardian relationships for a specific guardian from MongoDB.
 * Populates the userGuardians map so their tracked users' events reach them.
 */
async function loadGuardianRelationships(guardianUserId) {
    try {
        // Query existing Connection model — guardian field matches this guardian
        const connections = await Connection.find({
            guardian: guardianUserId,
            status: 'active'
        });

        connections.forEach(conn => {
            const trackedUserId = conn.user.toString();
            if (!userGuardians.has(trackedUserId)) {
                userGuardians.set(trackedUserId, new Set());
            }
            userGuardians.get(trackedUserId).add(guardianUserId);
            // DEBUG: Log each relationship loaded
            console.log(`[Auth] Mapped: user ${trackedUserId} -> guardian ${guardianUserId}`);
        });

        console.log(`[Auth] Loaded ${connections.length} guardian relationships for guardian ${guardianUserId}`);
        console.log(`[Auth] userGuardians map state:`, [...userGuardians.entries()].map(([k,v]) => `${k}: [${[...v].join(',')}]`));
    } catch (err) {
        console.error(`[Auth] Error loading guardian relationships:`, err.message);
    }
}

/**
 * Remove a guardian from all userGuardians mappings and from guardianSockets.
 * Called on guardian disconnect.
 */
function removeGuardianMappings(guardianUserId) {
    // Remove this guardian from every user's guardian set
    userGuardians.forEach((guardianSet, userId) => {
        guardianSet.delete(guardianUserId);
        // Clean up empty sets
        if (guardianSet.size === 0) {
            userGuardians.delete(userId);
        }
    });

    // Remove socket mapping
    guardianSockets.delete(guardianUserId);
    console.log(`[Auth] Cleaned up mappings for guardian ${guardianUserId}`);
}

module.exports = (io, app) => {
    // --- STEP 1: JWT AUTH MIDDLEWARE ---
    // Authenticate every socket connection at handshake level.
    // Rejects unauthenticated clients before any event handler runs.
    io.use((socket, next) => {
        const token = socket.handshake.auth && socket.handshake.auth.token;
        if (!token) {
            console.error('[Auth] Socket connection rejected: no token provided');
            return next(new Error('Unauthorized'));
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
            // Attach authenticated user info to socket for use in all event handlers
            socket.user = {
                userId: decoded.user.id,
                role: decoded.user.role
            };
            next();
        } catch (err) {
            console.error('[Auth] Socket connection rejected: invalid token -', err.message);
            return next(new Error('Unauthorized'));
        }
    });

    // --- STEP 2 & 3: Expose emitToGuardians to the Express app (for routes/sos.js) ---
    if (app) {
        app.set('emitToGuardians', (userId, eventName, data) => {
            emitToGuardians(io, userId, eventName, data);
        });
    }

    io.on('connection', async (socket) => {
        const { userId, role } = socket.user;
        console.log(`Client connected: ${socket.id} (userId: ${userId}, role: ${role})`);

        // --- GUARDIAN SOCKET REGISTRATION ---
        // When a guardian connects, store their socket and load their user relationships
        if (role === 'guardian') {
            guardianSockets.set(userId, socket.id);
            await loadGuardianRelationships(userId);
            console.log(`[Auth] Guardian ${userId} registered with socket ${socket.id}`);
        }

        // Map to keep track of write streams for this socket
        const activeStreams = new Map();

        // -------------------------
        // MEDIA STREAMING LOGIC
        // -------------------------
        // CHANGED: Use socket.user.userId from handshake auth instead of per-event token verification
        socket.on('start-stream', ({ batchId, deviceId, type }) => {
            const streamUserId = socket.user.userId;

            const fileName = `${type}-${batchId}-${deviceId}-${Date.now()}.webm`;
            const uploadDir = path.join(__dirname, '../../uploads');

            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }

            const filePath = path.join(uploadDir, fileName);
            const relativePath = `/uploads/${fileName}`;

            // Create write stream
            const writeStream = fs.createWriteStream(filePath, { flags: 'a' });

            activeStreams.set(`${batchId}-${deviceId}`, {
                stream: writeStream,
                filePath: filePath,
                relativePath: relativePath,
                startTime: Date.now(),
                userId: streamUserId // Use authenticated user ID from handshake
            });

            console.log(`Stream started: ${fileName} for User ${streamUserId}`);
        });

        socket.on('stream-data', ({ batchId, deviceId, data }) => {
            const streamInfo = activeStreams.get(`${batchId}-${deviceId}`);
            if (streamInfo && streamInfo.stream) {
                streamInfo.stream.write(data);
            }
        });

        socket.on('end-stream', async ({ batchId, deviceId, location }) => {
            const key = `${batchId}-${deviceId}`;
            const streamInfo = activeStreams.get(key);

            if (streamInfo) {
                streamInfo.stream.end();

                // Save to DB
                try {
                    const evidence = new Evidence({
                        user: streamInfo.userId, // Use stored authenticated user ID
                        type: 'video',
                        filePath: streamInfo.relativePath,
                        fileName: path.basename(streamInfo.filePath),
                        location: location || {},
                        deviceId,
                        batchId
                    });

                    await evidence.save();
                    socket.emit('upload-complete', { batchId, deviceId, status: 'success' });
                    console.log(`Stream saved: ${streamInfo.relativePath}`);
                } catch (err) {
                    console.error('Error saving evidence:', err);
                    socket.emit('upload-error', { batchId, deviceId, msg: 'DB Error' });
                }

                activeStreams.delete(key);
            }
        });

        // -------------------------
        // LIVE LOCATION LOGIC
        // -------------------------
        // CHANGED: Use socket.user.userId instead of per-event token. Emit scoped instead of broadcast.
        socket.on('update-location', async ({ location }) => {
            try {
                const locUserId = socket.user.userId;

                // 1. Update User's last known location
                await User.findByIdAndUpdate(locUserId, {
                    lastKnownLocation: location
                });

                // 2. If SOS is active, append to SOS history
                const activeSOS = await SOS.findOne({ user: locUserId, isActive: true });

                if (activeSOS) {
                    activeSOS.locationHistory.push({
                        lat: location.lat,
                        lng: location.lng
                    });
                    await activeSOS.save();
                }

                // 3. CHANGED: Scoped emit to only this user's guardians (was: socket.broadcast.emit to ALL)
                emitToGuardians(io, locUserId, 'user-location-update', {
                    userId: locUserId,
                    location
                });

                console.log(`Loc update: User ${locUserId} -> ${location.lat},${location.lng} (SOS: ${!!activeSOS})`);

            } catch (err) {
                console.error('Loc update error:', err.message);
            }
        });

        // -------------------------
        // DYNAMIC INTERACTION LOGIC
        // -------------------------
        // CHANGED: Use socket.user.userId from handshake auth. Token param kept for backward compat but ignored.
        socket.on('user-online', async () => {
            const onlineUserId = socket.user.userId;
            console.log("RECEIVED user-online event for user", onlineUserId);
            try {
                await User.findByIdAndUpdate(onlineUserId, { isOnline: true });
                console.log(`User ${onlineUserId} came ONLINE via socket`);
            } catch (err) {
                console.error('User online error:', err.message);
            }
        });

        // CHANGED: Use socket.user.userId. Scoped emit instead of broadcast. Removed signal/wifi.
        socket.on('update-device-stats', async ({ battery }) => {
            const statsUserId = socket.user.userId;
            console.log("RECEIVED update-device-stats event", { battery, userId: statsUserId });
            try {
                const updateData = { isOnline: true }; // Heartbeat: always confirm online
                if (battery !== undefined) updateData.batteryLevel = battery;

                await User.findByIdAndUpdate(statsUserId, updateData);

                // CHANGED: Scoped emit to only this user's guardians (was: socket.broadcast.emit to ALL)
                emitToGuardians(io, statsUserId, 'user-stats-update', {
                    userId: statsUserId,
                    battery,
                    isOnline: true
                });

                console.log(`Updated stats for User ${statsUserId}: Battery ${battery}%`);
            } catch (err) {
                console.error('Device stats update error:', err.message);
            }
        });

        socket.on('disconnect', async () => {
            // Close all active streams for this socket
            activeStreams.forEach((info) => {
                if (info.stream) info.stream.end();
            });
            activeStreams.clear();

            // CHANGED: Use socket.user.userId instead of socket.userId
            const disconnectedUserId = socket.user.userId;
            const disconnectedRole = socket.user.role;

            // If guardian disconnected, clean up their socket and relationship mappings
            if (disconnectedRole === 'guardian') {
                removeGuardianMappings(disconnectedUserId);
            }

            // Mark user offline if they were a regular user
            if (disconnectedRole === 'user') {
                try {
                    await User.findByIdAndUpdate(disconnectedUserId, { isOnline: false });
                    console.log(`User ${disconnectedUserId} went OFFLINE`);
                } catch (err) {
                    console.error('Offline update error:', err.message);
                }
            }

            console.log(`Client disconnected: ${socket.id} (userId: ${disconnectedUserId}, role: ${disconnectedRole})`);
        });
    });
};
