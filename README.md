# QuizArena

Aplikasi kuis bahasa Inggris interaktif dengan dukungan *mode hybrid* (API Backend + LocalStorage).

## Mode Hybrid
Aplikasi ini dirancang menggunakan pendekatan hibrida (*Hybrid Approach*). 
- **Mode Online (Backend):** Secara default, frontend akan berusaha terhubung ke REST API Backend. Autentikasi JWT didukung, dan data bank soal serta riwayat bermain pengguna akan disinkronkan ke server secara nirkabel (*seamless*).
- **Mode Offline (Fallback LocalStorage):** Jika server backend mati, tidak tersedia, atau pengguna menolak *login*, aplikasi akan otomatis beralih menggunakan pangkalan data luring (\questions/default.json\) dan memori lokal peramban (\localStorage\). 

## Integrasi Backend

1. **Konfigurasi Environment Frontend:**
   Buka \config.js\ yang berada di dalam root folder.
   \\\javascript
   const API_CONFIG = {
     BASE_URL: 'http://localhost:5000', // Ubah ini ke URL production
     TIMEOUT_MS: 5000,
     USE_BACKEND: true
   };
   \\\

2. **Menjalankan Backend Lokal (Development):**
   \\\ash
   cd backend
   npm install
   npm start
   \\\
   Pastikan Anda telah menyalin dan mengatur koneksi MySQL di file \ackend/.env\.

3. **Eksekusi:** 
   Silakan jalankan index.html dari root menggunakan *Live Server* atau peramban modern. Anda kini dapat *login*, menambah riwayat ke *database* asli, serta memanen seluruh manfaat kuis QuizArena secara hibrida!
