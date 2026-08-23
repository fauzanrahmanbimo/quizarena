# Laporan Kesenjangan Data (Data Gap Report)

Sesuai dengan instruksi Tahap 4 Aturan 7: _"Jika bank soal server belum selaras dengan frontend, berhenti dan dokumentasikan gap; jangan membuat validasi pura-pura."_

Saat akan mengimplementasikan endpoint sinkronisasi (`POST /api/progress/sync`), ditemukan blokir struktural berikut:

## Kondisi Saat Ini (As-Is)
- **Frontend:** Memiliki 900 soal statis yang divalidasi dan dimuat dari `questions/default.json`. Setiap opsi jawaban (A, B, C, D) dan jawaban benar terdefinisi penuh pada _client_.
- **Backend (MySQL):** Tabel `questions` dan `levels` dalam kondisi kosong. Database server belum mengetahui apa pun mengenai _level_ yang valid maupun daftar 900 soal tersebut beserta jawaban benarnya.

## Celah (The Gap)
- Validasi sisi server (Server-Side Validation) menuntut agar perhitungan _score_, _accuracy_, _is_correct_, dan _passed state_ dihitung ulang secara independen oleh server. Server dilarang keras memercayai variabel seperti `attempt.accuracy` atau `answer.isCorrect` yang dikirim dari klien via REST API.
- Tanpa adanya tabel `questions` yang terisi (_seeded_), endpoint sinkronisasi tidak memiliki sumber kebenaran (_Source of Truth_) untuk mencocokkan `selected_option_id` dengan `correct_option_id`.

## Status Endpoint `/api/progress/sync`
- Pembangunan endpoint `sync` **DIBEKUKAN** sementara dengan kembalian status `501 Not Implemented`.

## Tindakan yang Diperlukan (Rekomendasi)
Sebelum melanjutkan ke tahap sinkronisasi data progres pengguna, kita diwajibkan untuk:
1. Menyusun _seed script_ yang akan membaca 900 soal dari `questions/default.json` milik P0.
2. Memasukkan keseluruhan JSON tersebut ke dalam tabel `questions` dan memetakan tabel `levels` di database MySQL.
3. Menjamin bahwa struktur ID soal yang ter-*seed* ke dalam MySQL identik atau terpetakan secara pasti (stabil) dengan data JSON klien, agar saat klien mengirim ID tersebut, server dapat menemukannya.
