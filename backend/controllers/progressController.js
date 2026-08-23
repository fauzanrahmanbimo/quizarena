const db = require('../config/database');

exports.sync = async (req, res) => {
  // PENGHENTIAN STRATEGIS (Sesuai Aturan 7):
  // Bank soal server saat ini kosong (tidak sinkron dengan 900 soal di questions/default.json).
  // Dilarang melakukan validasi pura-pura (menerima \`isCorrect\` dari frontend).
  // Endpoint ini ditahan sampai proses Seed/Migrasi Soal dari JSON ke MySQL diselesaikan.
  return res.status(501).json({ error: 'Not Implemented: Bank soal server belum tersinkronisasi dengan frontend.' });
};
