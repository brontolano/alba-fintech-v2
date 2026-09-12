const mysql = require('mysql2/promise');

mysql.createConnection({
    host: 'srv594.hstgr.io',
    user: 'u826712707_alba',
    password: 'B-5millahberkah',
    database: 'u826712707_alba'
})
.then(conn => {
    return conn.query('SHOW TABLES LIKE "system_settings"').then(([rows]) => {
        console.log('Tables found:', rows.length > 0 ? 'YES - system_settings exists' : 'NO - system_settings MISSING');
        conn.end();
    });
})
.catch(e => console.log('Error:', e.message));