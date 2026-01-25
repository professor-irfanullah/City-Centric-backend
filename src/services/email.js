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
async function sendAdminInviteEmail(obj) {
    const {
        email, name, company_name, assignment_date, super_admin, portal_url, admin_email
    } = obj;
    const payload = {
        to: [{ email: email, name: name }],
        sender: {
            email: process.env.BREVO_VERIFIED_EMAIL,
            name: process.env.SYSTEM_NAME,
        },
        templateId: Number(process.env.ADMIN_ROLE_TEMPLATE_ID),
        params: {
            RECIPIENT_NAME: name,
            COMPANY_NAME: process.env.SYSTEM_NAME,
            ASSIGNMENT_DATE: assignment_date || new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            }),
            SUPER_ADMIN: super_admin,
            PORTAL_URL: portal_url,
            ADMIN_EMAIL: admin_email,
            COMPANY_ADDRESS: company_name || 'N/A',
            CURRENT_YEAR: new Date().getFullYear().toString(),
            COMPANY_DOMAIN: email.substring(email.indexOf('@')),
        },
        tags: ['admin_role_assignment', 'system_notification'],
    }
    return apiInstance.sendTransacEmail(payload);
}

module.exports = { sendVerificationEmail, sendAdminInviteEmail };
