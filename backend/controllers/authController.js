const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/database');

const setAuthCookie = (res, token) => {
  res.cookie('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
};

exports.register = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email dan password wajib diisi.' });
  if (password.length < 8) return res.status(400).json({ error: 'Password minimal 8 karakter.' });
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return res.status(400).json({ error: 'Format email tidak valid.' });

  try {
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) return res.status(400).json({ error: 'Registrasi gagal. Coba lagi.' }); // Generic error

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const [result] = await db.query('INSERT INTO users (email, password) VALUES (?, ?)', [email, hashedPassword]);
    const token = jwt.sign({ id: result.insertId, email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    setAuthCookie(res, token);
    res.status(201).json({ message: 'Registrasi berhasil', user: { id: result.insertId, email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Terjadi kesalahan internal.' });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email dan password wajib diisi.' });

  try {
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) return res.status(400).json({ error: 'Email atau password salah.' });

    const user = users[0];
    const validPass = await bcrypt.compare(password, user.password);
    if (!validPass) return res.status(400).json({ error: 'Email atau password salah.' });

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    setAuthCookie(res, token);
    res.json({ message: 'Login berhasil', user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Terjadi kesalahan internal.' });
  }
};

exports.logout = (req, res) => {
  res.clearCookie('auth_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/'
  });
  res.json({ message: 'Logout berhasil' });
};

exports.me = async (req, res) => {
  try {
    const [users] = await db.query('SELECT id, email, created_at FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0) return res.status(404).json({ error: 'User tidak ditemukan' });
    
    const [progress] = await db.query('SELECT * FROM user_progress WHERE user_id = ?', [req.user.id]);
    
    res.json({ user: users[0], progress: progress[0] || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Terjadi kesalahan internal.' });
  }
};

exports.getCsrf = (req, res) => {
  // Generate a CSRF token
  const csrfToken = crypto.randomBytes(32).toString('hex');
  // Set it in a cookie that Javascript CANNOT read (for double submit check)
  // Actually, double-submit cookie usually relies on the client reading a cookie, or the server sending it in JSON
  // and the client sending it in a header, while the server compares header to a httpOnly cookie.
  res.cookie('csrf_token', csrfToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  });
  res.json({ csrfToken }); // Send to client so they can put it in headers
};
