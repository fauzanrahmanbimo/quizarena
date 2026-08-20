# Tata Kelola Proyek (Project Governance) - QuizArena

Dokumen ini mendefinisikan aturan dan alur kerja pengembangan (workflow) terkontrol untuk repositori QuizArena. Semua kontributor, termasuk AI Developer, wajib mematuhi aturan ini.

## Struktur Peran
- **Pemilik Proyek (Project Owner):** Memiliki otoritas tertinggi untuk memberikan persetujuan akhir sebelum kode digabungkan (merge) ke production.
- **Mandor / Quality Controller:** Menentukan spesifikasi teknis, mengevaluasi bukti penyelesaian tugas (laporan & pengujian), serta memutuskan apakah tugas perlu direvisi atau disetujui untuk merge.
- **Developer AI:** Bertugas mengubah kode, menguji secara mandiri, melakukan commit, push, dan membuat Pull Request (PR). **Dilarang keras melakukan merge tanpa persetujuan eksplisit dari Pemilik Proyek atau Mandor.**

## Aturan Percabangan (Branching)
- main: Hanya berisi kode yang stabil dan siap produksi (production-ready).
- feature/<nama-fitur>: Digunakan untuk pengembangan fitur baru.
- fix/<nama-perbaikan>: Digunakan untuk perbaikan bug atau QA hardening.
- docs/<nama-dokumen>: Digunakan untuk pembaruan atau pembuatan dokumentasi proyek.

## Alur Kerja Wajib (Workflow)
Setiap tugas pengembangan harus melalui langkah-langkah berikut:
1. Buat branch baru.
2. Implementasi.
3. Jalankan validasi yang tersedia.
4. Buat/perbarui REPORT.md.
5. Commit dan push.
6. Buat Pull Request ke main.
7. Tunggu review dan persetujuan.
8. Hanya setelah persetujuan eksplisit: squash and merge.

## Standar Commit (Conventional Commits)
Pesan commit harus diawali dengan:
feat:, fix:, docs:, refactor:, style:, test:, chore:, a11y:

## Larangan
- Jangan push langsung ke main.
- Jangan merge PR sendiri.
- Jangan menghapus fitur, file penting, atau data tanpa instruksi eksplisit.
- Jangan memasukkan API key, token, password, atau file .env ke Git.

## Checklist Review Wajib
- Tidak ada error console.
- Navigasi kuis utama berjalan.
- UI responsif pada mobile.
- Keyboard dapat mengoperasikan elemen penting.
- Build/lint/test dijalankan jika tersedia.
- Preview Vercel sudah diuji.

## Format Laporan Wajib pada REPORT.md
- Tujuan tugas.
- Branch dan commit.
- Daftar file yang berubah.
- Ringkasan perubahan perilaku aplikasi.
- Perintah pengujian dan hasilnya.
- URL Pull Request.
- URL Preview Vercel.
- Risiko/keterbatasan.
- Langkah manual untuk menguji perubahan.

## Instruksi untuk Antigravity
Sebelum merge, developer harus memberikan URL PR, URL Preview Vercel, isi REPORT.md, hasil pengujian, dan menunggu persetujuan eksplisit dari pemilik proyek atau Mandor.
