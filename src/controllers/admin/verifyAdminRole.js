const { errorGenerator } = require("../../utils/errorGenarator");
const crypto = require("crypto");
const { query } = require("../../config/db");
const verifyAdminRole = async (req, res, next) => {
    const checkQuery = `SELECT CNIC, TOKEN_HASH,EXPIRES_AT FROM SUPER_ADMIN_INVITES WHERE CNIC = $1 AND TOKEN_HASH = $2 AND EXPIRES_AT > NOW() AND STATUS = $3`;
    const updateTokenStatusQuery = `UPDATE SUPER_ADMIN_INVITES SET STATUS = 'used', updated_at = NOW() WHERE CNIC = $1;`;
    const updateAdminRoleQuery = `UPDATE USERS SET ROLE = 'admin', updated_at = NOW() WHERE CNIC = $1;`;
    const { token, cnic } = req.body;
    if (!token || !cnic)
        return next(errorGenerator("Token and CNIC are required", 400));

    try {
        const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
        const response = await query(checkQuery, [cnic, tokenHash, "pending"]);
        if (response.rows.length === 0) {
            return next(errorGenerator("Invalid token or CNIC", 401));
        }
        await query(updateTokenStatusQuery, [cnic]);
        await query(updateAdminRoleQuery, [cnic]);
        res
            .status(200)
            .json({ msg: "Admin role verified and updated successfully" });
    } catch (error) {
        console.log(error);
        next(errorGenerator("Internal Server Error"));
    }
};
module.exports = { verifyAdminRole };
