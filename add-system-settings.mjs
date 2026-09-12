import mysql from 'mysql2/promise';

async function main() {
    const connection = await mysql.createConnection({
        host: 'srv594.hstgr.io',
        user: 'u826712707_alba',
        password: 'B-5millahberkah',
        database: 'u826712707_alba'
    });
    
    console.log('Connected to database!');
    
    // Check if system_settings exists
    const [rows] = await connection.query("SHOW TABLES LIKE 'system_settings'");
    
    if (rows.length === 0) {
        // Create system_settings table
        await connection.query(`
            CREATE TABLE system_settings (
              id VARCHAR(36) PRIMARY KEY,
              \`key\` VARCHAR(255) NOT NULL UNIQUE,
              \`value\` TEXT,
              description TEXT,
              createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
              updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) DEFAULT CHARSET=utf8mb4
        `);
        console.log('✅ Tabel system_settings dibuat');
    } else {
        console.log('ℹ️ Tabel system_settings sudah ada');
    }
    
    // Check if unit_settings exists
    const [rows2] = await connection.query("SHOW TABLES LIKE 'unit_settings'");
    
    if (rows2.length === 0) {
        await connection.query(`
            CREATE TABLE unit_settings (
              id VARCHAR(36) PRIMARY KEY,
              unitId VARCHAR(36) UNIQUE NOT NULL,
              posEnabled BOOLEAN DEFAULT TRUE,
              inventoryEnabled BOOLEAN DEFAULT TRUE,
              autoApproval BOOLEAN DEFAULT FALSE,
              requiresApproval BOOLEAN DEFAULT TRUE,
              createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
              updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) DEFAULT CHARSET=utf8mb4
        `);
        console.log('✅ Tabel unit_settings dibuat');
    } else {
        console.log('ℹ️ Tabel unit_settings sudah ada');
    }
    
    // Insert default system settings
    await connection.query(`
        INSERT IGNORE INTO system_settings (\`key\`, \`value\`, description) VALUES
        ('theme.primary', '#3b82f6', 'Primary warna aplikasi'),
        ('theme.ring', '#7c3aed', 'Warna ring button'),
        ('app.name', 'ALBA Finance', 'Nama aplikasi'),
        ('app.version', '3.0.0', 'Versi aplikasi')
    `);
    console.log('✅ Default settings ditambahkan');
    
    await connection.end();
    console.log('✅ Selesai!');
}

main().catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
});