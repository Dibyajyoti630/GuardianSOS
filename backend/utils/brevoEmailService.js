const { BrevoClient } = require('@getbrevo/brevo');

class BrevoEmailService {
    constructor() {
        this.client = new BrevoClient({
            apiKey: process.env.BREVO_API_KEY
        });

        this.defaultSender = {
            name:  process.env.BREVO_SENDER_NAME  || 'GuardianSOS',
            email: process.env.BREVO_SENDER_EMAIL || 'guardiansosfromguardian.com@gmail.com'
        };
    }

    /**
     * Send a transactional email via Brevo.
     *
     * @param {string} to            - Recipient email address
     * @param {string} subject       - Email subject
     * @param {string} htmlContent   - HTML body of the email
     * @param {string} [textContent] - Optional plain-text body
     * @returns {Promise<{ success: boolean, error?: string }>}
     */
    async sendEmail(to, subject, htmlContent, textContent) {
        try {
            const payload = {
                sender:      this.defaultSender,
                to:          [{ email: to }],
                subject:     subject,
                htmlContent: htmlContent
            };

            if (textContent) {
                payload.textContent = textContent;
            }

            await this.client.transactionalEmails.sendTransacEmail(payload);
            return { success: true };
        } catch (error) {
            const errorBody = error.body ? JSON.stringify(error.body) : error.message;
            console.error('[Brevo] Email send error:', errorBody);
            return { success: false, error: errorBody };
        }
    }
}

module.exports = new BrevoEmailService();
