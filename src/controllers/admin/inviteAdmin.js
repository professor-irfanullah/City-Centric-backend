const crypto = require('crypto');
const { errorGenerator } = require("../../utils/errorGenarator");
const { pool } = require('../../config/db');
const { sendAdminInviteEmail } = require("../../services/email");

const inviteAdmin = async (req, res, next) => {
    let client;
    const { cnic } = req.body;
    const adminUser = req.user;

    if (!cnic) return next(errorGenerator('CNIC is required', 400));

    const rawCnic = cnic.toString().replace(/\D/g, '');
    if (rawCnic.length !== 13) return next(errorGenerator('CNIC must be 13 digits long', 400));
    const formatedCnic = rawCnic.replace(/(\d{5})(\d{7})(\d{1})/, '$1-$2-$3');

    try {
        client = await pool.connect();

        const userRes = await client.query(
            `SELECT email, role, name FROM users WHERE cnic = $1`,
            [formatedCnic]
        );

        if (userRes.rows.length === 0) {
            return next(errorGenerator('User with this CNIC does not exist', 404));
        }

        const userData = userRes.rows[0];
        if (['admin', 'super_admin'].includes(userData.role)) {
            return next(errorGenerator('User is already an admin', 400));
        }

        // 3. Prepare Invite Data
        const plainToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(plainToken).digest('hex');
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 12);

        const portal_url = `${process.env.FRONTEND_URL}/verify-admin/?token=${plainToken}`;
        const payload = {
            email: userData.email,
            name: userData.name,
            company_name: process.env.SYSTEM_NAME || 'System',
            assignment_date: new Date().toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' }),
            super_admin: adminUser.name,
            portal_url,
            admin_email: adminUser.email
        };

        // 4. Start Atomic Transaction
        await client.query('BEGIN');

        // Check if invite already exists
        const inviteRes = await client.query(
            `SELECT id, status, expires_at < now() as is_expired 
             FROM super_admin_invites WHERE cnic = $1 FOR UPDATE`,
            [formatedCnic]
        );

        if (inviteRes.rows.length > 0) {
            const { id, status, is_expired } = inviteRes.rows[0];

            if (status === 'used') {
                await client.query('ROLLBACK');
                return next(errorGenerator('User has already accepted an invite', 403));
            }

            if (status === 'pending' && !is_expired) {
                await client.query('ROLLBACK');
                return next(errorGenerator('An active invitation already exists', 403));
            }

            // Record exists but is expired/pending: Update it
            await client.query(
                `UPDATE super_admin_invites SET token_hash = $1, expires_at = $2, status = 'pending' WHERE id = $3`,
                [tokenHash, expiresAt, id]
            );
        } else {
            // No record exists: Create new
            await client.query(
                `INSERT INTO super_admin_invites (email,cnic, token_hash, status, expires_at, invited_by_id) 
                 VALUES ($1,$2,$3,$4,$5,$6)`,
                [userData.email, formatedCnic, tokenHash, 'pending', expiresAt, adminUser.user_id]
            );
        }

        // 5. Trigger Email INSIDE the transaction
        await sendAdminInviteEmail(payload);

        await client.query('COMMIT');

        return res.status(200).json({
            msg: 'Invitation processed and email sent successfully.'
        });

    } catch (error) {
        // This block catches DB errors AND Email errors
        if (client) {
            try {
                await client.query('ROLLBACK');
            } catch (rollbackErr) {
                console.error("Rollback failed:", rollbackErr);
            }
        }

        console.error("Transaction Error:", error);

        // Custom message based on where it failed
        const errMsg = error.message.includes('email')
            ? 'Failed to send invite email. No changes were made to the database.'
            : 'An error occurred. Please try again.';

        return next(errorGenerator(errMsg, 500));
    } finally {
        if (client) client.release();
    }
};

module.exports = { inviteAdmin };
