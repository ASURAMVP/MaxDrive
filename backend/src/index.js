/**
 * Minimal Express backend for MEGA MAX
 * Handles: 
 * - Presigned POST generation for S3 uploads
 * - Basic file metadata management via PostgreSQL
 *
 * ⚠️ Note: In production, add authentication, validation, and rate limiting.
 */

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');
const { createPresignedPost } = require('@aws-sdk/s3-presigned-post');
const { S3Client } = require('@aws-sdk/client-s3');
require('dotenv').config();

const app = express();

// ✅ CORS Configuration (Important for frontend-backend connection)
const corsOptions = {
  origin: [
    "https://megamax-frontend.onrender.com", // change this to your actual frontend Render URL
  ],
  methods: ["GET", "POST", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(bodyParser.json());

// ✅ Database setup
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// ✅ S3 Client setup
const s3Client = new S3Client({ region: process.env.AWS_REGION });

// ✅ Generate S3 Presigned URL
async function generatePresignedPost(key, maxSizeBytes = 50 * 1024 * 1024 * 1024) {
  const params = {
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Conditions: [['content-length-range', 0, maxSizeBytes]],
    Expires: 600, // seconds
  };
  return await createPresignedPost(s3Client, params, { expiresIn: 600 });
}

// ✅ Create tables if they don't exist
async function bootstrap() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT,
      plan TEXT DEFAULT 'free',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS files (
      id SERIAL PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      key TEXT NOT NULL,
      name TEXT,
      content_type TEXT,
      size BIGINT DEFAULT 0,
      visibility TEXT DEFAULT 'private',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  console.log("✅ Database initialized successfully.");
}
bootstrap().catch(console.error);

// ✅ Route: Generate Presigned Upload URL
app.post('/api/upload-url', async (req, res) => {
  try {
    const { filename, contentType, size, userId } = req.body;
    if (!filename) return res.status(400).json({ error: 'filename required' });

    const key = `uploads/${userId || 'demo-user'}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${filename}`;
    const presigned = await generatePresignedPost(key);

    const result = await pool.query(
      `INSERT INTO files(user_id, key, name, content_type, size, created_at)
       VALUES($1,$2,$3,$4,$5,NOW()) RETURNING id, created_at`,
      [userId || 'demo-user', key, filename, contentType || null, size || 0]
    );

    res.json({
      uploadId: result.rows[0].id,
      key,
      url: presigned.url,
      fields: presigned.fields,
    });
  } catch (err) {
    console.error('upload-url error:', err);
    res.status(500).json({ error: 'server error' });
  }
});

// ✅ Route: Confirm Upload
app.post('/api/confirm-upload', async (req, res) => {
  try {
    const { uploadId, size } = req.body;
    if (!uploadId) return res.status(400).json({ error: 'uploadId required' });
    await pool.query('UPDATE files SET size = $1 WHERE id = $2', [size || 0, uploadId]);
    res.json({ ok: true });
  } catch (err) {
    console.error('confirm-upload error:', err);
    res.status(500).json({ error: 'server error' });
  }
});

// ✅ Route: List Files
app.get('/api/files', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, user_id, name, key, size, created_at FROM files ORDER BY created_at DESC LIMIT 200');
    res.json(result.rows);
  } catch (err) {
    console.error('files list error:', err);
    res.status(500).json({ error: 'server error' });
  }
});

// ✅ Route: Delete File Metadata
app.delete('/api/files/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await pool.query('DELETE FROM files WHERE id = $1', [id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('delete file error:', err);
    res.status(500).json({ error: 'server error' });
  }
});

// ✅ Start Server
const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`🚀 MEGA MAX backend running on port ${port}`);
});
                  
