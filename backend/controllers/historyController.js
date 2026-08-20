const db = require('../config/database');

exports.saveHistory = async (req, res) => {
  const user_id = req.user.id;
  const { mode, levelId, categoryFilter, difficultyFilter, totalQuestions, correctCount, wrongCount, skippedCount, accuracy, durationSeconds, questionDetails } = req.body;

  try {
    const [result] = await db.query(
      'INSERT INTO histories (user_id, mode, level_id, category_filter, difficulty_filter, total_questions, correct_count, wrong_count, skipped_count, accuracy, duration_seconds, question_details) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [user_id, mode, levelId, categoryFilter, difficultyFilter, totalQuestions, correctCount, wrongCount, skippedCount, accuracy, durationSeconds, JSON.stringify(questionDetails)]
    );
    res.status(201).json({ id: result.insertId, message: 'Riwayat berhasil disimpan.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal menyimpan riwayat.' });
  }
};

exports.getHistory = async (req, res) => {
  const user_id = req.user.id;

  try {
    const [rows] = await db.query('SELECT * FROM histories WHERE user_id = ? ORDER BY created_at DESC', [user_id]);
    const history = rows.map(r => ({
      ...r,
      question_details: typeof r.question_details === 'string' ? JSON.parse(r.question_details) : r.question_details
    }));
    res.json(history);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal mengambil riwayat.' });
  }
};

exports.getStats = async (req, res) => {
  const user_id = req.user.id;

  try {
    const [globalStats] = await db.query(
      'SELECT COUNT(id) as total_sessions, AVG(accuracy) as average_accuracy FROM histories WHERE user_id = ?', 
      [user_id]
    );

    // Kategori dihitung dari JSON arrays (pendekatan sederhana dengan menarik history dan mereduksi di memori)
    // Di aplikasi nyata bisa menggunakan MySQL 5.7+ JSON_TABLE, tapi untuk MVP kita proses di Node.js
    const [histories] = await db.query('SELECT question_details FROM histories WHERE user_id = ?', [user_id]);
    const catStats = {};

    histories.forEach(h => {
      let details = typeof h.question_details === 'string' ? JSON.parse(h.question_details) : h.question_details;
      if (Array.isArray(details)) {
        details.forEach(q => {
          if (!q.category) return;
          if (!catStats[q.category]) catStats[q.category] = { total: 0, correct: 0 };
          catStats[q.category].total++;
          if (q.correct) catStats[q.category].correct++;
        });
      }
    });

    const categoryAccuracy = Object.keys(catStats).map(cat => ({
      category: cat,
      total: catStats[cat].total,
      accuracy: Math.round((catStats[cat].correct / catStats[cat].total) * 100)
    }));

    res.json({
      totalSessions: globalStats[0].total_sessions || 0,
      averageAccuracy: Math.round(globalStats[0].average_accuracy || 0),
      categoryAccuracy: categoryAccuracy
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal mengambil statistik.' });
  }
};
