const db = require('../config/database');

exports.getQuestions = async (req, res) => {
  const { category, difficulty } = req.query;
  let query = 'SELECT * FROM questions WHERE 1=1';
  let params = [];
  
  if (category && category !== 'all') {
    query += ' AND category = ?';
    params.push(category);
  }
  if (difficulty && difficulty !== 'all') {
    query += ' AND difficulty = ?';
    params.push(difficulty);
  }

  try {
    const [rows] = await db.query(query, params);
    // Parse options from JSON
    const questions = rows.map(r => ({
      ...r,
      options: typeof r.options === 'string' ? JSON.parse(r.options) : r.options
    }));
    res.json(questions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal mengambil soal.' });
  }
};

exports.addQuestion = async (req, res) => {
  const { category, difficulty, question, options, correctIndex, explanation } = req.body;
  const user_id = req.user.id;

  if (!question || !options || options.length !== 4) {
    return res.status(400).json({ error: 'Soal dan 4 opsi jawaban wajib diisi.' });
  }
  if (correctIndex < 0 || correctIndex > 3) {
    return res.status(400).json({ error: 'correctIndex harus antara 0-3.' });
  }

  try {
    const [result] = await db.query(
      'INSERT INTO questions (category, difficulty, question, options, correct_index, explanation, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [category || '', difficulty || '', question, JSON.stringify(options), correctIndex, explanation || '', user_id]
    );
    res.status(201).json({ id: result.insertId, message: 'Soal berhasil ditambahkan.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal menambah soal.' });
  }
};

exports.updateQuestion = async (req, res) => {
  const id = req.params.id;
  const { category, difficulty, question, options, correctIndex, explanation } = req.body;
  const user_id = req.user.id;

  if (correctIndex !== undefined && (correctIndex < 0 || correctIndex > 3)) {
    return res.status(400).json({ error: 'correctIndex harus antara 0-3.' });
  }

  try {
    const [existing] = await db.query('SELECT created_by FROM questions WHERE id = ?', [id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Soal tidak ditemukan.' });
    if (existing[0].created_by !== user_id) return res.status(403).json({ error: 'Tidak memiliki izin untuk mengubah soal ini.' });

    let query = 'UPDATE questions SET ';
    const updates = [];
    const params = [];

    if (category !== undefined) { updates.push('category = ?'); params.push(category); }
    if (difficulty !== undefined) { updates.push('difficulty = ?'); params.push(difficulty); }
    if (question !== undefined) { updates.push('question = ?'); params.push(question); }
    if (options !== undefined) { updates.push('options = ?'); params.push(JSON.stringify(options)); }
    if (correctIndex !== undefined) { updates.push('correct_index = ?'); params.push(correctIndex); }
    if (explanation !== undefined) { updates.push('explanation = ?'); params.push(explanation); }

    if (updates.length === 0) return res.status(400).json({ error: 'Tidak ada data untuk diupdate.' });

    query += updates.join(', ') + ' WHERE id = ?';
    params.push(id);

    await db.query(query, params);
    res.json({ message: 'Soal berhasil diupdate.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal mengupdate soal.' });
  }
};

exports.deleteQuestion = async (req, res) => {
  const id = req.params.id;
  const user_id = req.user.id;

  try {
    const [existing] = await db.query('SELECT created_by FROM questions WHERE id = ?', [id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Soal tidak ditemukan.' });
    if (existing[0].created_by !== user_id) return res.status(403).json({ error: 'Tidak memiliki izin untuk menghapus soal ini.' });

    await db.query('DELETE FROM questions WHERE id = ?', [id]);
    res.json({ message: 'Soal berhasil dihapus.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal menghapus soal.' });
  }
};
