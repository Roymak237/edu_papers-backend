const mysql = require('mysql2/promise');

async function initDatabase() {
  const connection = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || 'Epsilon97rq0',
    database: process.env.DB_NAME || 'edu_users',
    connectTimeout: 60000,
    waitForConnections: true,
    queueLimit: 0
  });

  try {
    const conn = await connection;

    // Paper requests table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS paper_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        studentId INT NOT NULL,
        studentName VARCHAR(255) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        year VARCHAR(10),
        level VARCHAR(50),
        requestDate DATETIME DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(50) DEFAULT 'pending',
        FOREIGN KEY (studentId) REFERENCES users(id)
      )
    `);

    console.log('Paper requests table created successfully');
  } catch (err) {
    console.error('Error creating table:', err);
  } finally {
    await connection.end();
  }
}

initDatabase();
