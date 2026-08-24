const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  let token = req.cookies && req.cookies.auth_token;
  
  if (!token) {
    const authHeader = req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
  }

  if (!token) return res.status(401).json({ error: 'Akses ditolak. Token tidak disediakan.' });

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token tidak valid atau sudah kadaluarsa.' });
  }
};
