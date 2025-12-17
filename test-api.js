// Native fetch used


// Polyfill for Node < 18 if needed, but 'npm install node-fetch' would be safer. 
// However, the environment seems to be Node. So I'll try native fetch first.

async function testSignup() {
    console.log("Testing Signup API...");
    const url = 'http://127.0.0.1:5000/api/auth/signup';
    const body = {
        name: "API Test User",
        email: `apitest${Date.now()}@example.com`,
        password: "password123",
        role: "user"
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const rawText = await response.text();
        console.log("Status:", response.status);
        console.log("Raw Response:", rawText);

        // Try parsing JSON if possible, just for logging
        try {
            const data = JSON.parse(rawText);
            console.log("Parsed Data:", data);
        } catch (e) {
            console.log("Not JSON");
        }

        if (response.ok) {
            console.log("SUCCESS: User created and token received.");
        } else {
            console.log("FAILURE: API returned error.");
        }
    } catch (e) {
        console.error("ERROR: Request failed", e);
    }
}

async function testRoot() {
    console.log("Testing Root API...");
    const url = 'http://127.0.0.1:5000/';
    try {
        const response = await fetch(url);
        const text = await response.text();
        console.log("Root Status:", response.status);
        console.log("Root Response:", text);
    } catch (e) { console.error("Root failed", e); }
}

testRoot();
testSignup();
