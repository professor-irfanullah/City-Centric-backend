require('dotenv').config()
const Brevo = require('@getbrevo/brevo');
const apiInstance = new Brevo.TransactionalEmailsApi();
apiInstance.setApiKey(
    Brevo.TransactionalEmailsApiApiKeys.apiKey,
    process.env.BREVO_API_KEY
);

/**
 * Send Email Verification Email
 */
async function sendVerificationEmail(obj) {
    const { email, name, verification_link } = obj
    const payload = {
        to: [{ email: email }],
        sender: { email: process.env.BREVO_VERIFIED_EMAIL, name: process.env.SYSTEM_NAME },
        templateId: Number(process.env.VERIFICATION_TEMPLATE_ID),
        params: {
            name: name,
            verification_link: verification_link,
            year: new Date().getFullYear()
        }
    };

    return apiInstance.sendTransacEmail(payload);
    // return obj
}

module.exports = { sendVerificationEmail };
