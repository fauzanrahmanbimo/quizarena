module.exports = (req, res, next) => {
  // Only check CSRF for state-changing methods
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const csrfCookie = req.cookies && req.cookies.csrf_token;
    const csrfHeader = req.header('X-CSRF-Token');

    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      return res.status(403).json({ error: 'Validasi CSRF gagal.' });
    }
  }
  next();
};
