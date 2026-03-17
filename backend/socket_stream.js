const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const Evidence = require('./models/Evidence');
const SOS = require('./models/SOS');
const User = require('./models/User');
const Connection = require('./models/Connection');
const { notifyGuardians } = require('./utils/notifyGuardians');

// --- VOLUNTARY DISCONNECT TRACKING ---
const voluntaryDisconnects = new Set(); // Stores socketIds of intentional disconnects
const reconnectGraceTimers = new Map(); // userId -> timerId
const userSockets = new Map(); // userId -> socketId
const suspiciousTimers = new Map(); // userId -> timeoutId

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
        console.log(`[Auth] userGuardians map state:`, [...userGuardians.entries()].map(([k, v]) => `${k}: [${[...v].join(',')}]`));
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

        // Cancel pending suspicious disconnect timer if user reconnects
        if (suspiciousTimers.has(userId)) {
            clearTimeout(suspiciousTimers.get(userId));
            suspiciousTimers.delete(userId);
            console.log('[Connect] Cancelled pending suspicious timer for user', userId);
        }

        // Clear unreachable state immediately on connect
        // so guardian polling picks up clean state on next cycle
        if (role === 'user') {
            const activeSOS = await SOS.findOne({ user: userId, isActive: true });
            if (!activeSOS) {
                await User.findByIdAndUpdate(userId, {
                    isUnreachable: false,
                    unreachableSince: null,
                    disconnectType: null
                });
                console.log('[Connect] Cleared unreachable state for user', userId);
            }
        }

        // Check for duplicate user sockets
        if (role === 'user') {
            const existingSocketId = userSockets.get(userId);
            if (existingSocketId && existingSocketId !== socket.id) {
                console.log('[Connect] Duplicate socket detected for user', userId, '— disconnecting old socket:', existingSocketId);
                const existingSocket = io.sockets.sockets.get(existingSocketId);
                if (existingSocket) {
                    voluntaryDisconnects.add(existingSocketId);
                    setTimeout(() => voluntaryDisconnects.delete(existingSocketId), 10000);
                    existingSocket.disconnect(true);
                    console.log('[Connect] Marked duplicate socket as voluntary before disconnect');
                }
            }
            userSockets.set(userId, socket.id);
        }

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

            // Cancel grace timer if user reconnects within grace period
            if (reconnectGraceTimers.has(onlineUserId)) {
                clearTimeout(reconnectGraceTimers.get(onlineUserId));
                reconnectGraceTimers.delete(onlineUserId);
                console.log('[Reconnect] User reconnected within grace period, suspicious alert cancelled');
            }

            try {
                const activeSOS = await SOS.findOne({ user: onlineUserId, isActive: true });
                const updateData = { isOnline: true };

                await User.findByIdAndUpdate(onlineUserId, updateData);
                console.log(`User ${onlineUserId} came ONLINE via socket. Active SOS: ${!!activeSOS}`);
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

        // -------------------------
        // 3-STATE DISCONNECT LOGIC
        // -------------------------

        socket.on('voluntary-offline', async () => {
            const currentUserId = socket.user.userId;
            console.log(`[Disconnect] User ${currentUserId} signaled voluntary offline`);

            voluntaryDisconnects.add(socket.id);
            setTimeout(() => voluntaryDisconnects.delete(socket.id), 10000); // 10s auto-cleanup

            try {
                await User.findByIdAndUpdate(currentUserId, { disconnectType: 'voluntary' });
                socket.emit('voluntary-offline-ack');
            } catch (err) {
                console.error('[Disconnect] Voluntary offline DB error:', err.message);
                // Still ack so client can disconnect even if DB fails
                socket.emit('voluntary-offline-ack');
            }
        });

        socket.on('duress-offline', async () => {
            const currentUserId = socket.user.userId;
            console.log(`[Disconnect] User ${currentUserId} signaled DURESS offline - silent SOS triggered`);

            voluntaryDisconnects.add(socket.id);
            setTimeout(() => voluntaryDisconnects.delete(socket.id), 10000); // 10s auto-cleanup

            try {
                const user = await User.findById(currentUserId);
                const location = user ? user.lastKnownLocation : null;

                // Trigger silent SOS internally
                const newSOS = new SOS({
                    user: currentUserId,
                    startLocation: location,
                    locationHistory: [location ? { lat: location.lat, lng: location.lng } : {}]
                });

                // Run critical DB writes in parallel, similar to routes/sos.js
                await Promise.all([
                    newSOS.save({ skipNotify: true }), // Prevent double notification if middleware exists
                    User.findByIdAndUpdate(currentUserId, {
                        status: 'SOS',
                        disconnectType: 'duress'
                    })
                ]);

                // Emit recursive scoped event
                emitToGuardians(io, currentUserId, 'sos-status-change', {
                    userId: currentUserId,
                    status: 'SOS',
                    location
                });

                // Call notifyGuardians utility explicitly ONCE
                await notifyGuardians({
                    userId: currentUserId,
                    alertLevel: 'SOS',
                    location,
                    battery: user ? user.batteryLevel : 'Unknown',
                    network: user ? user.networkSignal : 'Unknown'
                });

            } catch (err) {
                console.error('[Disconnect] Duress offline error:', err.message);
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

            // Check 3-State Disconnect (Voluntary vs Suspicious)
            if (disconnectedRole === 'user') {
                // Only process if this is still the active socket for this user
                if (userSockets.get(disconnectedUserId) === socket.id) {
                    userSockets.delete(disconnectedUserId);
                } else {
                    console.log('[Disconnect] Ignoring stale socket disconnect for user', disconnectedUserId);
                    return;
                }

                if (voluntaryDisconnects.has(socket.id)) {
                    // Voluntary disconnect: normal offline
                    voluntaryDisconnects.delete(socket.id);
                    try {
                        await User.findByIdAndUpdate(disconnectedUserId, { isOnline: false });
                        console.log(`User ${disconnectedUserId} went OFFLINE (Voluntary)`);
                    } catch (err) {
                        console.error('Offline update error (Voluntary):', err.message);
                    }
                } else {
                    // Suspicious disconnect
                    const timer = setTimeout(async () => {
                        suspiciousTimers.delete(disconnectedUserId);

                        try {
                            console.log('[Suspicious] Starting suspicious disconnect handler for', disconnectedUserId);

                            await User.findByIdAndUpdate(disconnectedUserId, {
                                isOnline: false,
                                disconnectType: 'suspicious',
                                isUnreachable: true,
                                unreachableSince: new Date()
                            }, { new: true, returnDocument: 'after' });

                            const updatedUser = await User.findById(disconnectedUserId);
                            console.log('[Suspicious] DB updated — isUnreachable:', updatedUser.isUnreachable, 'isOnline:', updatedUser.isOnline);

                            const lastKnownLocation = updatedUser.lastKnownLocation || null;

                            emitToGuardians(io, disconnectedUserId, 'user-unreachable', {
                                userId: disconnectedUserId,
                                lastKnownLocation,
                                lastSeen: new Date(),
                                message: 'User disconnected unexpectedly'
                            });

                            await notifyGuardians({
                                userId: disconnectedUserId,
                                alertLevel: 'Unreachable',
                                location: lastKnownLocation,
                                battery: updatedUser.batteryLevel || 'Unknown',
                                network: updatedUser.networkSignal || 'Unknown'
                            });

                            console.log('[Suspicious] Handler completed for', disconnectedUserId);
                        } catch (err) {
                            console.error('[Suspicious] ERROR in suspicious disconnect handler:', err);
                        }
                    }, 4000); // 4 second grace period

                    suspiciousTimers.set(disconnectedUserId, timer);
                }
                // Cleanup Set regardless just in case
                voluntaryDisconnects.delete(socket.id);
            }

            console.log(`Client disconnected: ${socket.id} (userId: ${disconnectedUserId}, role: ${disconnectedRole})`);
        });
    });
};
