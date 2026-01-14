// Add this at the very top of db.js
require('dotenv').config();
const mysql = require('mysql2/promise');

const connection = mysql.createConnection({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || 'Sololeveling123',
  database: process.env.DB_NAME || 'edu_users',
  connectTimeout: 60000,
  waitForConnections: true,
  queueLimit: 0
});

connection.then(() => {
  console.log('Connected to MySQL database');
}).catch((err) => {
  console.error('Error connecting to MySQL database:', err);
});

// Table creation functions
async function createTables() {
  try {
    const conn = await connection;

    // Users table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        isAdmin BOOLEAN DEFAULT FALSE,
        contributionPoints INT DEFAULT 0,
        joinDate DATETIME DEFAULT CURRENT_TIMESTAMP,
        badges JSON,
        achievements JSON,
        streakDays INT DEFAULT 0,
        lastActivityDate DATETIME DEFAULT CURRENT_TIMESTAMP,
        profilePicture VARCHAR(500),
        offlineMode BOOLEAN DEFAULT FALSE,
        level INT DEFAULT 1,
        currentXP INT DEFAULT 0
      )
    `);

    // Papers table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS papers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        level VARCHAR(50) NOT NULL,
        year VARCHAR(10) NOT NULL,
        uploaderId INT NOT NULL,
        uploaderName VARCHAR(255) NOT NULL,
        contentType VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        fileType VARCHAR(10) NOT NULL,
        uploadDate DATETIME DEFAULT CURRENT_TIMESTAMP,
        description TEXT,
        tags JSON,
        downloadCount INT DEFAULT 0,
        rejectionReason TEXT,
        FOREIGN KEY (uploaderId) REFERENCES users(id)
      )
    `);

    // Messages table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        content TEXT NOT NULL,
        isUser BOOLEAN NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        userId INT,
        FOREIGN KEY (userId) REFERENCES users(id)
      )
    `);

    // AI Feedback table for training data
    await conn.query(`
      CREATE TABLE IF NOT EXISTS ai_feedback (
        id INT AUTO_INCREMENT PRIMARY KEY,
        messageId INT NOT NULL,
        userId INT,
        rating INT CHECK (rating >= 1 AND rating <= 5),
        feedback TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (messageId) REFERENCES messages(id),
        FOREIGN KEY (userId) REFERENCES users(id)
      )
    `);

    // Login logs table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS login_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        username_or_email VARCHAR(255),
        success BOOLEAN NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        ip_address VARCHAR(45),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Account creation logs table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS account_creation_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        ip_address VARCHAR(45)
      )
    `);

    // Subjects table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS subjects (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        icon VARCHAR(255),
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Courses table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS courses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        subjectId INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(50),
        description TEXT,
        level VARCHAR(50),
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (subjectId) REFERENCES subjects(id) ON DELETE CASCADE
      )
    `);

    // Quizzes table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS quizzes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        subjectId INT,
        courseId INT,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        difficultyLevel VARCHAR(20) NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        createdBy INT,
        FOREIGN KEY (subjectId) REFERENCES subjects(id) ON DELETE SET NULL,
        FOREIGN KEY (courseId) REFERENCES courses(id) ON DELETE SET NULL,
        FOREIGN KEY (createdBy) REFERENCES users(id)
      )
    `);

    // Quiz questions table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS quiz_questions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        quizId INT NOT NULL,
        question TEXT NOT NULL,
        options JSON NOT NULL,
        correctAnswer INT NOT NULL,
        explanation TEXT,
        difficulty VARCHAR(20) NOT NULL,
        topic VARCHAR(255),
        tags JSON,
        FOREIGN KEY (quizId) REFERENCES quizzes(id) ON DELETE CASCADE
      )
    `);

    // Quiz attempts table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS quiz_attempts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        quizId INT NOT NULL,
        score INT NOT NULL,
        totalQuestions INT NOT NULL,
        answers JSON NOT NULL,
        completedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id),
        FOREIGN KEY (quizId) REFERENCES quizzes(id)
      )
    `);

    // User levels table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS user_levels (
        id INT AUTO_INCREMENT PRIMARY KEY,
        level INT UNIQUE NOT NULL,
        requiredXP INT NOT NULL,
        badgeName VARCHAR(255) NOT NULL,
        badgeIcon VARCHAR(255),
        badgeDescription TEXT
      )
    `);

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

    console.log('Tables created successfully');
  } catch (err) {
    console.error('Error creating tables:', err);
  }
}

// Call createTables on connection
connection.then(createTables);

// Function to populate sample data
async function populateSampleData() {
  try {
    const conn = await connection;

    // Check if papers already exist
    const [existingPapers] = await conn.query('SELECT COUNT(*) as count FROM papers');
    if (existingPapers[0].count > 0) {
      console.log('Sample data already exists');
      return;
    }

    // Ensure specific users exist for uploaderId references
    const requiredUsers = [
      { id: 1, username: 'his_royalty', email: 'his_royalty@example.com', password: 'password123', isAdmin: false },
      { id: 2, username: 'arise', email: 'arise@example.com', password: 'password123', isAdmin: false }
    ];

    for (const user of requiredUsers) {
      const [existingUser] = await conn.query('SELECT * FROM users WHERE id = ?', [user.id]);
      if (existingUser.length === 0) {
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(user.password, 10);
        await conn.query(
          'INSERT INTO users (id, username, email, password, isAdmin) VALUES (?, ?, ?, ?, ?)',
          [user.id, user.username, user.email, hashedPassword, user.isAdmin]
        );
      }
    }

    // Sample papers data
    const samplePapers = [
      {
        title: 'real analysis Final Exam 2023',
        subject: 'Mathematics',
        level: 'level2',
        year: '2023',
        uploaderId: 1,
        uploaderName: 'his_royalty',
        contentType: 'pastPaper',
        status: 'approved',
        fileType: 'PDF',
        description: 'Comprehensive final exam covering calculus and algebra',
        tags: ['final', 'calculus'],
        downloadCount: 5
      },
      {
        title: 'software modelling Study Notes',
        subject: 'Biology',
        level: 'level1',
        year: '2024',
        uploaderId: 2,
        uploaderName: 'arise',
        contentType: 'notes',
        status: 'approved',
        fileType: 'PDF',
        description: 'Detailed notes on software and uml diagrams',
        tags: ['lecture-notes', 'genetics'],
        downloadCount: 32
      },
      {
        title: 'chemistry Lab Answers',
        subject: 'Chemistry',
        level: 'level3',
        year: '2023',
        uploaderId: 1,
        uploaderName: 'john_doe',
        contentType: 'answerSheet',
        status: 'pending',
        fileType: 'DOCX',
        description: 'Solutions to organic chemistry lab experiments',
        tags: ['solutions', 'lab'],
        downloadCount: 0
      }
    ];

    // Insert sample papers
    for (const paper of samplePapers) {
      // Ensure tags are properly formatted as JSON string
      const paperData = {
        ...paper,
        tags: JSON.stringify(paper.tags)
      };
      await createPaper(paperData);
    }

    console.log('Sample data populated successfully');
  } catch (error) {
    console.error('Error populating sample data:', error);
  }
}

// Populate sample data after tables are created
setTimeout(populateSampleData, 3000); // Wait 3 seconds for tables to be created

// User CRUD functions
async function createUser(userData) {
  try {
    const conn = await connection;
    const [result] = await conn.query(
      'INSERT INTO users (username, email, password, isAdmin, contributionPoints, joinDate, badges, achievements, streakDays, lastActivityDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [userData.username, userData.email, userData.password, userData.isAdmin || false, userData.contributionPoints || 0, null, JSON.stringify(userData.badges || []), JSON.stringify(userData.achievements || []), userData.streakDays || 0, null]
    );
    return result.insertId;
  } catch (err) {
    throw err;
  }
}

async function getUserById(id) {
  try {
    const conn = await connection;
    const [rows] = await conn.query('SELECT * FROM users WHERE id = ?', [id]);
    if (rows[0]) {
      // Parse JSON fields with error handling
      try {
        rows[0].badges = JSON.parse(rows[0].badges || '[]');
      } catch (e) {
        rows[0].badges = [];
      }
      try {
        rows[0].achievements = JSON.parse(rows[0].achievements || '[]');
      } catch (e) {
        rows[0].achievements = [];
      }
    }
    return rows[0];
  } catch (err) {
    throw err;
  }
}

async function getUserByUsernameOrEmail(username, email) {
  try {
    const conn = await connection;
    let query, params;

    if (username && email) {
      query = 'SELECT * FROM users WHERE username = ? OR email = ?';
      params = [username, email];
    } else if (username) {
      query = 'SELECT * FROM users WHERE username = ?';
      params = [username];
    } else if (email) {
      query = 'SELECT * FROM users WHERE email = ?';
      params = [email];
    } else {
      return null;
    }

    const [rows] = await conn.query(query, params);
    if (rows[0]) {
      // Parse JSON fields with error handling
      try {
        rows[0].badges = JSON.parse(rows[0].badges || '[]');
      } catch (e) {
        rows[0].badges = [];
      }
      try {
        rows[0].achievements = JSON.parse(rows[0].achievements || '[]');
      } catch (e) {
        rows[0].achievements = [];
      }
      // Convert MySQL boolean (TINYINT) to JavaScript boolean
      console.log('Original isAdmin value:', rows[0].isAdmin, typeof rows[0].isAdmin);
      rows[0].isAdmin = rows[0].isAdmin === 1;
      console.log('Converted isAdmin value:', rows[0].isAdmin, typeof rows[0].isAdmin);
    }
    return rows[0];
  } catch (err) {
    throw err;
  }
}

async function getAllUsers() {
  try {
    const conn = await connection;
    const [rows] = await conn.query('SELECT id, username, email, isAdmin, contributionPoints, joinDate, badges, achievements, streakDays, lastActivityDate FROM users');
    return rows.map(user => {
      try {
        return {
          ...user,
          badges: JSON.parse(user.badges || '[]'),
          achievements: JSON.parse(user.achievements || '[]'),
          isAdmin: Boolean(user.isAdmin)
        };
      } catch (e) {
        return {
          ...user,
          badges: [],
          achievements: [],
          isAdmin: Boolean(user.isAdmin)
        };
      }
    });
  } catch (err) {
    throw err;
  }
}

async function updateUser(id, userData) {
  try {
    const conn = await connection;
    const fields = [];
    const values = [];
    if (userData.username) { fields.push('username = ?'); values.push(userData.username); }
    if (userData.email) { fields.push('email = ?'); values.push(userData.email); }
    if (userData.password) { fields.push('password = ?'); values.push(userData.password); }
    if (userData.isAdmin !== undefined) { fields.push('isAdmin = ?'); values.push(userData.isAdmin); }
    if (userData.contributionPoints !== undefined) { fields.push('contributionPoints = ?'); values.push(userData.contributionPoints); }
    if (userData.badges) { fields.push('badges = ?'); values.push(JSON.stringify(userData.badges)); }
    if (userData.achievements) { fields.push('achievements = ?'); values.push(JSON.stringify(userData.achievements)); }
    if (userData.streakDays !== undefined) { fields.push('streakDays = ?'); values.push(userData.streakDays); }
    if (userData.lastActivityDate) { fields.push('lastActivityDate = ?'); values.push(userData.lastActivityDate); }
    if (userData.currentXP !== undefined) { fields.push('currentXP = ?'); values.push(userData.currentXP); }
    if (userData.level !== undefined) { fields.push('level = ?'); values.push(userData.level); }
    if (userData.profilePicture !== undefined) { fields.push('profilePicture = ?'); values.push(userData.profilePicture); }
    if (userData.offlineMode !== undefined) { fields.push('offlineMode = ?'); values.push(userData.offlineMode); }
    values.push(id);
    await conn.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
  } catch (err) {
    console.error('Error updating user:', err);
    throw err;
  }
}

async function deleteUser(id) {
  try {
    const conn = await connection;
    await conn.query('DELETE FROM users WHERE id = ?', [id]);
  } catch (err) {
    throw err;
  }
}

// Paper CRUD functions
async function createPaper(paperData) {
  try {
    const conn = await connection;
    const [result] = await conn.query(
      'INSERT INTO papers (title, subject, level, year, uploaderId, uploaderName, contentType, status, fileType, uploadDate, description, tags, downloadCount, rejectionReason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [paperData.title, paperData.subject, paperData.level, paperData.year, paperData.uploaderId, paperData.uploaderName, paperData.contentType, paperData.status || 'pending', paperData.fileType, null, paperData.description, JSON.stringify(paperData.tags || []), paperData.downloadCount || 0, paperData.rejectionReason]
    );
    return result.insertId;
  } catch (err) {
    throw err;
  }
}

async function getAllPapers() {
  try {
    const conn = await connection;
    const [rows] = await conn.query('SELECT * FROM papers');
    return rows.map(row => ({ ...row, tags: JSON.parse(row.tags || '[]') }));
  } catch (err) {
    throw err;
  }
}

async function getPaperById(id) {
  try {
    const conn = await connection;
    const [rows] = await conn.query('SELECT * FROM papers WHERE id = ?', [id]);
    if (rows[0]) {
      rows[0].tags = JSON.parse(rows[0].tags || '[]');
    }
    return rows[0];
  } catch (err) {
    throw err;
  }
}

async function updatePaper(id, paperData) {
  try {
    const conn = await connection;
    const fields = [];
    const values = [];
    if (paperData.title) { fields.push('title = ?'); values.push(paperData.title); }
    if (paperData.subject) { fields.push('subject = ?'); values.push(paperData.subject); }
    if (paperData.level) { fields.push('level = ?'); values.push(paperData.level); }
    if (paperData.year) { fields.push('year = ?'); values.push(paperData.year); }
    if (paperData.uploaderId) { fields.push('uploaderId = ?'); values.push(paperData.uploaderId); }
    if (paperData.uploaderName) { fields.push('uploaderName = ?'); values.push(paperData.uploaderName); }
    if (paperData.contentType) { fields.push('contentType = ?'); values.push(paperData.contentType); }
    if (paperData.status) { fields.push('status = ?'); values.push(paperData.status); }
    if (paperData.fileType) { fields.push('fileType = ?'); values.push(paperData.fileType); }
    if (paperData.description) { fields.push('description = ?'); values.push(paperData.description); }
    if (paperData.tags) { fields.push('tags = ?'); values.push(JSON.stringify(paperData.tags)); }
    if (paperData.downloadCount !== undefined) { fields.push('downloadCount = ?'); values.push(paperData.downloadCount); }
    if (paperData.rejectionReason) { fields.push('rejectionReason = ?'); values.push(paperData.rejectionReason); }
    values.push(id);
    await conn.query(`UPDATE papers SET ${fields.join(', ')} WHERE id = ?`, values);
  } catch (err) {
    throw err;
  }
}

async function deletePaper(id) {
  try {
    const conn = await connection;
    await conn.query('DELETE FROM papers WHERE id = ?', [id]);
  } catch (err) {
    throw err;
  }
}

async function getPapersByUserId(userId) {
  try {
    const conn = await connection;
    const [rows] = await conn.query('SELECT * FROM papers WHERE uploaderId = ?', [userId]);
    return rows.map(row => ({ ...row, tags: JSON.parse(row.tags || '[]') }));
  } catch (err) {
    throw err;
  }
}

async function getPendingPapers() {
  try {
    const conn = await connection;
    const [rows] = await conn.query('SELECT * FROM papers WHERE status = ?', ['pending']);
    return rows.map(row => ({ ...row, tags: JSON.parse(row.tags || '[]') }));
  } catch (err) {
    throw err;
  }
}

// Message CRUD functions
async function createMessage(messageData) {
  try {
    const conn = await connection;
    const [result] = await conn.query(
      'INSERT INTO messages (content, isUser, timestamp, userId) VALUES (?, ?, ?, ?)',
      [messageData.content, messageData.isUser, null, messageData.userId || null]
    );
    return result.insertId;
  } catch (err) {
    throw err;
  }
}

async function getAllMessages() {
  try {
    const conn = await connection;
    const [rows] = await conn.query('SELECT * FROM messages ORDER BY timestamp ASC');
    return rows;
  } catch (err) {
    throw err;
  }
}

async function deleteAllMessages() {
  try {
    const conn = await connection;
    await conn.query('DELETE FROM messages');
  } catch (err) {
    throw err;
  }
}

// Log login attempt
async function logLoginAttempt(logData) {
  try {
    const conn = await connection;
    await conn.query(
      'INSERT INTO login_logs (user_id, username_or_email, success, timestamp, ip_address) VALUES (?, ?, ?, ?, ?)',
      [logData.user_id, logData.username_or_email, logData.success, null, logData.ip_address]
    );
  } catch (err) {
    throw err;
  }
}

// AI Feedback CRUD functions
async function createAIFeedback(feedbackData) {
  try {
    const conn = await connection;
    const [result] = await conn.query(
      'INSERT INTO ai_feedback (messageId, userId, rating, feedback, timestamp) VALUES (?, ?, ?, ?, ?)',
      [feedbackData.messageId, feedbackData.userId, feedbackData.rating, feedbackData.feedback, null]
    );
    return result.insertId;
  } catch (err) {
    throw err;
  }
}

async function getAIFeedbackByMessageId(messageId) {
  try {
    const conn = await connection;
    const [rows] = await conn.query('SELECT * FROM ai_feedback WHERE messageId = ?', [messageId]);
    return rows;
  } catch (err) {
    throw err;
  }
}

async function getAllAIFeedback() {
  try {
    const conn = await connection;
    const [rows] = await conn.query('SELECT * FROM ai_feedback ORDER BY timestamp DESC');
    return rows;
  } catch (err) {
    throw err;
  }
}

// Log account creation
async function logAccountCreation(logData) {
  try {
    const conn = await connection;
    await conn.query(
      'INSERT INTO account_creation_logs (username, email, timestamp, ip_address) VALUES (?, ?, ?, ?)',
      [logData.username, logData.email, null, logData.ip_address]
    );
  } catch (err) {
    throw err;
  }
}

// Function to save evaluation questions for a specific paper
async function saveEvaluationQuestions(paperId, questions) {
  try {
    const db = await getDatabaseConnection(); // Assuming getDatabaseConnection is defined

    const query = `INSERT INTO evaluation_questions (paper_id, question_text, solution) VALUES (?, ?, ?)`;

    for (const question of questions) {
      await db.run(query, [paperId, question.text, question.solution]);
    }
  } catch (error) {
    console.error('Error saving evaluation questions:', error);
    throw error;
  }
}

// Function to get evaluation questions for a specific paper
async function getEvaluationQuestions(paperId) {
  try {
    const db = await getDatabaseConnection(); // Assuming getDatabaseConnection is defined

    const query = `SELECT question_text AS text, solution FROM evaluation_questions WHERE paper_id = ?`;
    const rows = await db.all(query, [paperId]);

    return rows;
  } catch (error) {
    console.error('Error retrieving evaluation questions:', error);
    throw error;
  }
}

// Quiz CRUD functions
async function createQuiz(quizData) {
  try {
    const conn = await connection;
    const [result] = await conn.query(
      'INSERT INTO quizzes (subjectId, courseId, title, description, difficultyLevel, createdBy) VALUES (?, ?, ?, ?, ?, ?)',
      [quizData.subjectId, quizData.courseId, quizData.title, quizData.description, quizData.difficultyLevel, quizData.createdBy]
    );
    return result.insertId;
  } catch (err) {
    throw err;
  }
}

async function getQuizById(id) {
  try {
    const conn = await connection;
    const [rows] = await conn.query('SELECT * FROM quizzes WHERE id = ?', [id]);
    return rows[0];
  } catch (err) {
    throw err;
  }
}

async function getQuizzesBySubject(subjectId) {
  try {
    const conn = await connection;
    const [rows] = await conn.query('SELECT * FROM quizzes WHERE subjectId = ?', [subjectId]);
    return rows;
  } catch (err) {
    throw err;
  }
}

async function getQuizzesByCourse(courseId) {
  try {
    const conn = await connection;
    const [rows] = await conn.query('SELECT * FROM quizzes WHERE courseId = ?', [courseId]);
    return rows;
  } catch (err) {
    throw err;
  }
}

async function getQuizzesByDifficulty(difficulty) {
  try {
    const conn = await connection;
    const [rows] = await conn.query('SELECT * FROM quizzes WHERE difficultyLevel = ?', [difficulty]);
    return rows;
  } catch (err) {
    throw err;
  }
}

async function getAllQuizzes() {
  try {
    const conn = await connection;
    const [rows] = await conn.query('SELECT * FROM quizzes');
    return rows;
  } catch (err) {
    throw err;
  }
}

// Quiz question CRUD functions
async function createQuizQuestion(questionData) {
  try {
    const conn = await connection;
    const [result] = await conn.query(
      'INSERT INTO quiz_questions (quizId, question, options, correctAnswer, explanation, difficulty, topic, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [questionData.quizId, questionData.question, JSON.stringify(questionData.options), questionData.correctAnswer, questionData.explanation, questionData.difficulty, questionData.topic, JSON.stringify(questionData.tags || [])]
    );
    return result.insertId;
  } catch (err) {
    throw err;
  }
}

async function getQuestionsByQuizId(quizId) {
  try {
    const conn = await connection;
    const [rows] = await conn.query('SELECT * FROM quiz_questions WHERE quizId = ?', [quizId]);
    return rows.map(row => ({
      ...row,
      options: JSON.parse(row.options),
      tags: JSON.parse(row.tags || '[]')
    }));
  } catch (err) {
    throw err;
  }
}

async function getQuestionsByDifficulty(quizId, difficulty) {
  try {
    const conn = await connection;
    const [rows] = await conn.query('SELECT * FROM quiz_questions WHERE quizId = ? AND difficulty = ?', [quizId, difficulty]);
    return rows.map(row => ({
      ...row,
      options: JSON.parse(row.options),
      tags: JSON.parse(row.tags || '[]')
    }));
  } catch (err) {
    throw err;
  }
}

// Quiz attempt CRUD functions
async function createQuizAttempt(attemptData) {
  try {
    const conn = await connection;
    const [result] = await conn.query(
      'INSERT INTO quiz_attempts (userId, quizId, score, totalQuestions, answers) VALUES (?, ?, ?, ?, ?)',
      [attemptData.userId, attemptData.quizId, attemptData.score, attemptData.totalQuestions, JSON.stringify(attemptData.answers)]
    );
    return result.insertId;
  } catch (err) {
    throw err;
  }
}

async function getQuizAttemptsByUserId(userId) {
  try {
    const conn = await connection;
    const [rows] = await conn.query('SELECT * FROM quiz_attempts WHERE userId = ?', [userId]);
    return rows.map(row => ({
      ...row,
      answers: JSON.parse(row.answers)
    }));
  } catch (err) {
    throw err;
  }
}

async function getQuizAttemptsByQuizId(quizId) {
  try {
    const conn = await connection;
    const [rows] = await conn.query('SELECT * FROM quiz_attempts WHERE quizId = ?', [quizId]);
    return rows.map(row => ({
      ...row,
      answers: JSON.parse(row.answers)
    }));
  } catch (err) {
    throw err;
  }
}

// User level CRUD functions
async function createUserLevel(levelData) {
  try {
    const conn = await connection;
    const [result] = await conn.query(
      'INSERT INTO user_levels (level, requiredXP, badgeName, badgeIcon, badgeDescription) VALUES (?, ?, ?, ?, ?)',
      [levelData.level, levelData.requiredXP, levelData.badgeName, levelData.badgeIcon, levelData.badgeDescription]
    );
    return result.insertId;
  } catch (err) {
    throw err;
  }
}

async function getUserLevel(level) {
  try {
    const conn = await connection;
    const [rows] = await conn.query('SELECT * FROM user_levels WHERE level = ?', [level]);
    return rows[0];
  } catch (err) {
    throw err;
  }
}

async function getAllUserLevels() {
  try {
    const conn = await connection;
    const [rows] = await conn.query('SELECT * FROM user_levels ORDER BY level ASC');
    return rows;
  } catch (err) {
    throw err;
  }
}

async function updateUserLevel(userId, newLevel, newXP) {
  try {
    const conn = await connection;
    await conn.query(
      'UPDATE users SET level = ?, currentXP = ? WHERE id = ?',
      [newLevel, newXP, userId]
    );
  } catch (err) {
    throw err;
  }
}

// Subject CRUD functions
async function createSubject(subjectData) {
  try {
    const conn = await connection;
    const [result] = await conn.query(
      'INSERT INTO subjects (name, description, icon) VALUES (?, ?, ?)',
      [subjectData.name, subjectData.description, subjectData.icon]
    );
    return result.insertId;
  } catch (err) {
    throw err;
  }
}

async function getAllSubjects() {
  try {
    const conn = await connection;
    const [rows] = await conn.query('SELECT * FROM subjects ORDER BY name ASC');
    return rows;
  } catch (err) {
    throw err;
  }
}

async function getSubjectById(id) {
  try {
    const conn = await connection;
    const [rows] = await conn.query('SELECT * FROM subjects WHERE id = ?', [id]);
    return rows[0];
  } catch (err) {
    throw err;
  }
}

async function updateSubject(id, subjectData) {
  try {
    const conn = await connection;
    const fields = [];
    const values = [];
    if (subjectData.name) { fields.push('name = ?'); values.push(subjectData.name); }
    if (subjectData.description !== undefined) { fields.push('description = ?'); values.push(subjectData.description); }
    if (subjectData.icon !== undefined) { fields.push('icon = ?'); values.push(subjectData.icon); }
    values.push(id);
    await conn.query(`UPDATE subjects SET ${fields.join(', ')} WHERE id = ?`, values);
  } catch (err) {
    throw err;
  }
}

async function deleteSubject(id) {
  try {
    const conn = await connection;
    await conn.query('DELETE FROM subjects WHERE id = ?', [id]);
  } catch (err) {
    throw err;
  }
}

// Course CRUD functions
async function createCourse(courseData) {
  try {
    const conn = await connection;
    const [result] = await conn.query(
      'INSERT INTO courses (subjectId, name, code, description, level) VALUES (?, ?, ?, ?, ?)',
      [courseData.subjectId, courseData.name, courseData.code, courseData.description, courseData.level]
    );
    return result.insertId;
  } catch (err) {
    throw err;
  }
}

async function getAllCourses() {
  try {
    const conn = await connection;
    const [rows] = await conn.query('SELECT * FROM courses ORDER BY name ASC');
    return rows;
  } catch (err) {
    throw err;
  }
}

async function getCourseById(id) {
  try {
    const conn = await connection;
    const [rows] = await conn.query('SELECT * FROM courses WHERE id = ?', [id]);
    return rows[0];
  } catch (err) {
    throw err;
  }
}

async function getCoursesBySubjectId(subjectId) {
  try {
    const conn = await connection;
    const [rows] = await conn.query('SELECT * FROM courses WHERE subjectId = ?', [subjectId]);
    return rows;
  } catch (err) {
    throw err;
  }
}

async function updateCourse(id, courseData) {
  try {
    const conn = await connection;
    const fields = [];
    const values = [];
    if (courseData.subjectId) { fields.push('subjectId = ?'); values.push(courseData.subjectId); }
    if (courseData.name) { fields.push('name = ?'); values.push(courseData.name); }
    if (courseData.code !== undefined) { fields.push('code = ?'); values.push(courseData.code); }
    if (courseData.description !== undefined) { fields.push('description = ?'); values.push(courseData.description); }
    if (courseData.level !== undefined) { fields.push('level = ?'); values.push(courseData.level); }
    values.push(id);
    await conn.query(`UPDATE courses SET ${fields.join(', ')} WHERE id = ?`, values);
  } catch (err) {
    throw err;
  }
}

async function deleteCourse(id) {
  try {
    const conn = await connection;
    await conn.query('DELETE FROM courses WHERE id = ?', [id]);
  } catch (err) {
    throw err;
  }
}

// Paper request CRUD functions
async function createPaperRequest(requestData) {
  try {
    const conn = await connection;
    const [result] = await conn.query(
      'INSERT INTO paper_requests (studentId, studentName, subject, title, description, year, level, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [requestData.studentId, requestData.studentName, requestData.subject, requestData.title, requestData.description, requestData.year, requestData.level, requestData.status || 'pending']
    );
    return result.insertId;
  } catch (err) {
    throw err;
  }
}

async function getAllPaperRequests() {
  try {
    const conn = await connection;
    const [rows] = await conn.query('SELECT * FROM paper_requests ORDER BY requestDate DESC');
    return rows;
  } catch (err) {
    throw err;
  }
}

async function getPaperRequestById(id) {
  try {
    const conn = await connection;
    const [rows] = await conn.query('SELECT * FROM paper_requests WHERE id = ?', [id]);
    return rows[0];
  } catch (err) {
    throw err;
  }
}

async function getPaperRequestsByStudentId(studentId) {
  try {
    const conn = await connection;
    const [rows] = await conn.query('SELECT * FROM paper_requests WHERE studentId = ? ORDER BY requestDate DESC', [studentId]);
    return rows;
  } catch (err) {
    throw err;
  }
}

async function getPendingPaperRequests() {
  try {
    const conn = await connection;
    const [rows] = await conn.query('SELECT * FROM paper_requests WHERE status = ? ORDER BY requestDate DESC', ['pending']);
    return rows;
  } catch (err) {
    throw err;
  }
}

async function updatePaperRequest(id, requestData) {
  try {
    const conn = await connection;
    const fields = [];
    const values = [];
    if (requestData.studentId) { fields.push('studentId = ?'); values.push(requestData.studentId); }
    if (requestData.studentName) { fields.push('studentName = ?'); values.push(requestData.studentName); }
    if (requestData.subject) { fields.push('subject = ?'); values.push(requestData.subject); }
    if (requestData.title) { fields.push('title = ?'); values.push(requestData.title); }
    if (requestData.description !== undefined) { fields.push('description = ?'); values.push(requestData.description); }
    if (requestData.year !== undefined) { fields.push('year = ?'); values.push(requestData.year); }
    if (requestData.level !== undefined) { fields.push('level = ?'); values.push(requestData.level); }
    if (requestData.status) { fields.push('status = ?'); values.push(requestData.status); }
    values.push(id);
    await conn.query(`UPDATE paper_requests SET ${fields.join(', ')} WHERE id = ?`, values);
  } catch (err) {
    throw err;
  }
}

async function deletePaperRequest(id) {
  try {
    const conn = await connection;
    await conn.query('DELETE FROM paper_requests WHERE id = ?', [id]);
  } catch (err) {
    throw err;
  }
}

module.exports = {
  connection,
  createUser,
  getUserById,
  getUserByUsernameOrEmail,
  getAllUsers,
  updateUser,
  deleteUser,
  createPaper,
  getAllPapers,
  getPaperById,
  updatePaper,
  deletePaper,
  getPapersByUserId,
  getPendingPapers,
  createMessage,
  getAllMessages,
  deleteAllMessages,
  createAIFeedback,
  getAIFeedbackByMessageId,
  getAllAIFeedback,
  logLoginAttempt,
  logAccountCreation,
  saveEvaluationQuestions,
  getEvaluationQuestions,
  createQuiz,
  getQuizById,
  getQuizzesBySubject,
  getQuizzesByCourse,
  getQuizzesByDifficulty,
  getAllQuizzes,
  createQuizQuestion,
  getQuestionsByQuizId,
  getQuestionsByDifficulty,
  createQuizAttempt,
  getQuizAttemptsByUserId,
  getQuizAttemptsByQuizId,
  createUserLevel,
  getUserLevel,
  getAllUserLevels,
  updateUserLevel,
  createSubject,
  getAllSubjects,
  getSubjectById,
  updateSubject,
  deleteSubject,
  createCourse,
  getAllCourses,
  getCourseById,
  getCoursesBySubjectId,
  updateCourse,
  deleteCourse,
  createPaperRequest,
  getAllPaperRequests,
  getPaperRequestById,
  getPaperRequestsByStudentId,
  getPendingPaperRequests,
  updatePaperRequest,
  deletePaperRequest,
};
