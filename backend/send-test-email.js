require('dotenv').config();
const sgMail = require('@sendgrid/mail');

// Set API Key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function sendTestEmail() {
    const args = process.argv.slice(2);
    const toEmail = args[0];

    if (!toEmail) {
        console.error("❌ Please provide an email address to send the test email to.");
        console.error("Usage: node send-test-email.js <your-email@example.com>");
        process.exit(1);
    }

    const msg = {
        to: toEmail,
        from: 'guardiansosfromguardian.com@gmail.com', // Must match the verified sender in your project
        subject: 'GuardianSOS: Test Email Integration',
        text: 'Hello, this is a test email from your GuardianSOS backend to verify that SendGrid is working properly.',
        html: `
            <div style="background-color: #e0f2fe; padding: 20px; border: 2px solid #0284c7; border-radius: 8px; font-family: Arial, sans-serif;">
                <h1 style="color: #0369a1; margin-top: 0;">GuardianSOS Email Test</h1>
                <p style="font-size: 18px;">Hello,</p>
                <p>This is a test email to confirm that your SendGrid API integration is <strong>working successfully!</strong></p>
                <p style="margin-top: 20px; color: #666;">This is an automated message from your GuardianSOS backend.</p>
            </div>
        `
    };

    console.log(`Sending test email to: ${toEmail}...`);

    try {
        await sgMail.send(msg);
        console.log('✅ Test email sent successfully! Please check your inbox (and spam folder).');
    } catch (error) {
        console.error('❌ Failed to send test email:');
        console.error(error.message);
        if (error.response) {
            console.error(error.response.body);
        }
    }
}

sendTestEmail();
