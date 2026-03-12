require('dotenv').config();
const { Pool } = require('pg');

// Configuration uses environment variables
const pool = new Pool({
    host: process.env.HOST_NAME, // Make sure this is defined in your .env file
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    user: process.env.DB_USER,
    port: process.env.DB_PORT,
    // ssl: {
    //     rejectUnauthorized: false
    // }
});

// --- VERIFICATION LOGIC ADDED HERE ---
pool.connect()
    .then(client => {
        // Run an SQL query on the acquired client to get server details
        client.query('SELECT inet_server_addr() AS ip, inet_server_port() AS port')
            .then(res => {
                const { ip, port } = res.rows[0];
                console.log(`Connection successful.`);
                console.log(`Connected IP: ${ip}, Port: ${port}`);

                // Check if the connected IP matches what you intended
                if (ip === process.env.HOST_NAME || ip === '127.0.0.1' && process.env.HOST_NAME === 'localhost') {
                    console.log('✅ Connected to the intended server.');
                } else {
                    console.log('⚠️ Connected to an unexpected IP address.');
                }
            })
            .catch(err => console.error('Error fetching server info:', err.stack))
            .finally(() => {
                client.release(); // IMPORTANT: Release the client back to the pool
            });
    })
    .catch((err) => {
        console.log('Database connection failed.');
        console.log(err.stack);
    });

// The rest of your module export remains the same
const query = (query, params) => {
    return new Promise((resolve, reject) => {
        pool.query(query, params, (err, result) => {
            if (err) {
                return reject(err)
            }
            resolve(result)
        })
    })
}

module.exports = { pool, query }
