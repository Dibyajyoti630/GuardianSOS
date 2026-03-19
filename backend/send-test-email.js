require('dotenv').config();
// DEPRECATED (SendGrid) — kept for rollback
// const sgMail = require('@sendgrid/mail');
// sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const emailService = require('./utils/brevoEmailService');

async function sendTestEmail() {
    const args = process.argv.slice(2);
    const toEmail = args[0];

    if (!toEmail) {
        console.error("❌ Please provide an email address to send the test email to.");
        console.error("Usage: node send-test-email.js <your-email@example.com>");
        process.exit(1);
    }

    const testHtml = `
            <div style="background-color: #e0f2fe; padding: 20px; border: 2px solid #0284c7; border-radius: 8px; font-family: Arial, sans-serif;">
                <h1 style="color: #0369a1; margin-top: 0;">GuardianSOS Email Test</h1>
                <p style="font-size: 18px;">Hello,</p>
                <p>This is a test email to confirm that your <strong>Brevo API integration</strong> is working successfully!</p>
                <p style="margin-top: 20px; color: #666;">This is an automated message from your GuardianSOS backend.</p>
            </div>
        `;
    const testText = 'Hello, this is a test email from your GuardianSOS backend to verify that Brevo is working properly.';

    // DEPRECATED (SendGrid) — kept for rollback
    // const msg = { to: toEmail, from: 'guardiansosfromguardian.com@gmail.com', subject: 'GuardianSOS: Test Email Integration', text: testText, html: testHtml };
    // await sgMail.send(msg);

    console.log(`Sending test email to: ${toEmail}...`);

    try {
        const result = await emailService.sendEmail(toEmail, 'GuardianSOS: Test Email Integration', testHtml, testText);
        if (result.success) {
            console.log('✅ Test email sent successfully via Brevo! Please check your inbox (and spam folder).');
        } else {
            console.error('❌ Failed to send test email:', result.error);
        }
    } catch (error) {
        console.error('❌ Failed to send test email:');
        console.error(error.message);
    }
}

sendTestEmail();
