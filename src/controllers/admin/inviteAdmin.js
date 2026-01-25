const crypto = require('crypto');
const { errorGenerator } = require("../../utils/errorGenarator");
const { query, pool } = require('../../config/db');
const { sendAdminInviteEmail } = require("../../services/email");

const inviteAdmin = async (req, res, next) => {
    const clinet = await pool.connect();
    const { cnic } = req.body;
    const adminUser = req.user;

    if (!cnic) return next(errorGenerator('CNIC is required', 400));

    const rawCnic = cnic.toString().replace(/\D/g, '');
    if (rawCnic.length !== 13) return next(errorGenerator('CNIC must be 13 digits long', 400));

    const formatedCnic = rawCnic.replace(/(\d{5})(\d{7})(\d{1})/, '$1-$2-$3');

    try {
        // 1. Verify User Exists and is not already an admin
        const chkQuery = `SELECT email, role, user_id, name FROM users WHERE cnic = $1`;
        const response = await query(chkQuery, [formatedCnic]);

        if (response.rows.length === 0) return next(errorGenerator('User with this CNIC does not exist', 404));

        const userData = response.rows[0];
        if (['admin', 'super_admin'].includes(userData.role)) {
            return next(errorGenerator('User is already an admin', 400));
        }

        const plainToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(plainToken).digest('hex');
        const expires_at = new Date();
        // 12 hours set
        expires_at.setHours(expires_at.getHours() + 12);

        const insertQuery = `
            INSERT INTO super_admin_invites (email, cnic, token_hash, invited_by_id, expires_at, status) 
            VALUES ($1, $2, $3, $4, $5, 'pending')
        `;

        const portal_url = `${process.env.FRONTEND_URL}/verify-admin/?token=${plainToken}`;

        // 6. Send Email via Brevo
        const payload = {
            email: userData.email,
            name: userData.name,
            company_name: process.env.SYSTEM_NAME,
            assignment_date: new Date().toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' }),
            super_admin: adminUser.name,
            portal_url: portal_url,
            admin_email: adminUser.email,
        };
        await clinet.query('BEGIN')

        await sendAdminInviteEmail(payload);
        await clinet.query(insertQuery, [userData.email, formatedCnic, tokenHash, adminUser.user_id, expires_at]);
        await clinet.query('COMMIT')
        res.status(200).json({ msg: 'Admin invite sent successfully' });
    } catch (error) {
        console.error("Invite Error:", error);
        await clinet.query('ROLLBACK')
        if (error.code == 'ENOTFOUND') return next(errorGenerator('Network Disconnected'))
        return next(errorGenerator(error.message));
    }
};
module.exports = { inviteAdmin };
