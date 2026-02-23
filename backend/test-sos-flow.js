const io = require('socket.io-client');

async function runTest() {
    const baseUrl = 'http://127.0.0.1:5000';
    console.log("=== Starting SOS Flow Verification ===");

    // 1. Signup a new user
    const email = `sostest${Date.now()}@example.com`;
    console.log(`\n1. Registering user: ${email}`);

    let token = '';
    let userId = '';

    try {
        const signupRes = await fetch(`${baseUrl}/api/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: "SOS Test User",
                email: email,
                password: "password123",
                role: "user"
            })
        });

        const signupData = await signupRes.json();
        if (!signupRes.ok) throw new Error(signupData.msg || 'Signup failed');

        token = signupData.token;
        console.log("   -> Signup Success. Token received.");

    } catch (err) {
        console.error("   -> Signup Error:", err.message);
        return;
    }

    // 2. Connect Socket
    console.log("\n2. Connecting to Socket.io...");
    const socket = io(baseUrl);

    await new Promise((resolve) => {
        socket.on('connect', () => {
            console.log("   -> Socket Connected:", socket.id);
            resolve();
        });
        setTimeout(() => resolve(), 2000);
    });

    if (!socket.connected) {
        console.error("   -> Socket Connection Failed.");
        // Proceeding anyway might fail later
    }

    // 3. Trigger SOS
    console.log("\n3. Triggering SOS...");
    try {
        const triggerRes = await fetch(`${baseUrl}/api/sos/trigger`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': token
            },
            body: JSON.stringify({
                location: { lat: 28.61, lng: 77.20, address: "Test Location" }
            })
        });

        const triggerData = await triggerRes.json();
        if (!triggerRes.ok) throw new Error(triggerData.msg || 'Trigger failed');

        console.log("   -> SOS Triggered. SOS ID:", triggerData._id);

    } catch (err) {
        console.error("   -> Trigger Error:", err.message);
    }

    // 4. Send Location Updates via Socket
    console.log("\n4. Streaming Location Updates...");
    const steps = 3;
    for (let i = 0; i < steps; i++) {
        const loc = { lat: 28.61 + (i * 0.01), lng: 77.20 + (i * 0.01) };
        socket.emit('update-location', { location: loc, token });
        console.log(`   -> Sent location: ${loc.lat}, ${loc.lng}`);
        await new Promise(r => setTimeout(r, 500));
    }

    // 5. Cancel SOS
    console.log("\n5. Cancelling SOS...");
    try {
        const cancelRes = await fetch(`${baseUrl}/api/sos/cancel`, {
            method: 'POST',
            headers: { 'x-auth-token': token }
        });

        const cancelData = await cancelRes.json();
        if (!cancelRes.ok) throw new Error(cancelData.msg || 'Cancel failed');

        console.log("   -> SOS Cancelled:", cancelData.msg);

    } catch (err) {
        console.error("   -> Cancel Error:", err.message);
    }

    socket.disconnect();
    console.log("\n=== Test Complete ===");
}

runTest();
