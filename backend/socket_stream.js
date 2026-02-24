const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const Evidence = require('./models/Evidence');
const SOS = require('./models/SOS');
const User = require('./models/User');

module.exports = (io) => {
    io.on('connection', (socket) => {
        console.log('Client connected to stream/socket:', socket.id);

        // Map to keep track of write streams for this socket
        const activeStreams = new Map();

        // Track which user this socket belongs to for online status
        socket.userId = null;

        // -------------------------
        // MEDIA STREAMING LOGIC
        // -------------------------
        socket.on('start-stream', ({ batchId, deviceId, type, token }) => {
            let userId = null;
            try {
                if (!token) throw new Error('No token provided');
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
                userId = decoded.user.id;
            } catch (err) {
                console.error('Socket Auth Error:', err.message);
                socket.emit('upload-error', { batchId, deviceId, msg: 'Auth Failed' });
                return;
            }

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
                userId: userId // Store authenticated user ID
            });

            console.log(`Stream started: ${fileName} for User ${userId}`);
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
        socket.on('update-location', async ({ location, token }) => {
            try {
                if (!token) return;
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
                const userId = decoded.user.id;

                // 1. Update User's last known location
                await User.findByIdAndUpdate(userId, {
                    lastKnownLocation: location
                });

                // 2. If SOS is active, append to SOS history
                const activeSOS = await SOS.findOne({ user: userId, isActive: true });

                if (activeSOS) {
                    activeSOS.locationHistory.push({
                        lat: location.lat,
                        lng: location.lng
                    });
                    await activeSOS.save();
                }

                console.log(`Loc update: User ${userId} -> ${location.lat},${location.lng} (SOS: ${!!activeSOS})`);

            } catch (err) {
                console.error('Loc update error:', err.message);
            }
        });

        // -------------------------
        // DYNAMIC INTERACTION LOGIC
        // -------------------------
        socket.on('user-online', async ({ token }) => {
            console.log("RECEIVED user-online event", token ? "with token" : "without token");
            try {
                if (!token) return;
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
                const userId = decoded.user.id;
                socket.userId = userId; // Associate socket with user

                await User.findByIdAndUpdate(userId, { isOnline: true });
                console.log(`User ${userId} came ONLINE via socket`);
            } catch (err) {
                console.error('User online error:', err.message);
            }
        });

        socket.on('update-device-stats', async ({ battery, signal, wifi, token }) => {
            console.log("RECEIVED update-device-stats event", { battery, signal, wifi, hasToken: !!token });
            try {
                if (!token) return;
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
                const userId = decoded.user.id;

                const updateData = {};
                if (battery !== undefined) updateData.batteryLevel = battery;
                if (signal !== undefined) updateData.networkSignal = signal;
                if (wifi !== undefined) updateData.wifiStatus = wifi;

                await User.findByIdAndUpdate(userId, updateData);
                console.log(`Updated stats for User ${userId}: Battery ${battery}%, Signal ${signal}, Wifi ${wifi}`);
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

            // Mark user offline if they were authenticated
            if (socket.userId) {
                try {
                    await User.findByIdAndUpdate(socket.userId, { isOnline: false });
                    console.log(`User ${socket.userId} went OFFLINE`);
                } catch (err) {
                    console.error('Offline update error:', err.message);
                }
            }

            console.log('Client disconnected from socket');
        });
    });
};
