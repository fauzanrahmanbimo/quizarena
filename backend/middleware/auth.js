const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const authHeader = req.header('Authorization');
  if (!authHeader) return res.status(401).json({ error: 'Akses ditolak. Token tidak disediakan.' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Format token salah.' });

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(400).json({ error: 'Token tidak valid.' });
  }
};
