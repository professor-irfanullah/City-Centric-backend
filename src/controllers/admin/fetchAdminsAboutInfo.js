const { query } = require("../../config/db")
const { errorGenerator } = require("../../utils/errorGenarator")

const fetchAdminsData = async (req, res, next) => {
    const fetchingQuery = `SELECT
    COUNT(*) AS TOTAL_ADMINS,
    COUNT(*) FILTER (WHERE STATUS = 'pending') AS PENDING_INVITES,
	COUNT(*) FILTER (WHERE STATUS = 'used') AS ACCEPTED_INVITES,
	COUNT(*) FILTER (WHERE EXPIRES_AT < NOW() AND STATUS = 'pending') AS EXPIRED_INVITES,
    COUNT(*) AS TOTAL_INVITES,
    (
        SELECT
            JSONB_AGG(
                JSONB_BUILD_OBJECT(
                    'name', INITCAP(U.NAME),
                    'email', U.EMAIL, 
                    'role', U.ROLE,
                    'status', S2.STATUS,
                    'joined_at',s2.updated_at
                )
            )
        FROM
            SUPER_ADMIN_INVITES S2
         JOIN USERS U ON U.cnic = S2.cnic and u.email = s2.email
        WHERE S2.INVITED_BY_ID = MAIN.INVITED_BY_ID 
    ) AS ADMINS
FROM
    SUPER_ADMIN_INVITES MAIN
GROUP BY 
    INVITED_BY_ID;

`
    try {
        const response = await query(fetchingQuery)
        res.status(200).json(response.rows[0])
    } catch (error) {
        console.log(error);

        next(errorGenerator('Something went wrong', 503))
    }
}
module.exports = { fetchAdminsData }