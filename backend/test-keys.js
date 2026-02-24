require('dotenv').config();
const twilio = require('twilio');

async function testKeys() {
    console.log('Testing SendGrid API Key...');
    try {
        const response = await fetch('https://api.sendgrid.com/v3/scopes', {
            headers: {
                Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`
            }
        });

        if (response.ok) {
            console.log('✅ SendGrid API Key is valid (authenticated successfully).');
        } else {
            const body = await response.text();
            console.log(`❌ SendGrid API Key failed: ${response.status} ${response.statusText}`, body);
        }
    } catch (err) {
        console.error('Error testing SendGrid:', err.message);
    }

    console.log('\nTesting Twilio Credentials...');
    try {
        const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        const account = await client.api.v2010.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
        console.log(`✅ Twilio Account authenticated successfully. Status: ${account.status}`);

        // Check Messaging Service
        const msgService = await client.messaging.v1.services(process.env.TWILIO_MESSAGING_SERVICE_SID).fetch();
        console.log(`✅ Twilio Messaging Service is valid. Name: ${msgService.friendlyName}`);
    } catch (err) {
        console.error(`❌ Twilio authentication failed: ${err.message}`);
    }
}

testKeys();
