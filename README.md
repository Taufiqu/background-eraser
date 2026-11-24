# ✨ QuickErase - Background Eraser (Non-AI)

Aplikasi pembersih background gambar berbasis web yang terinspirasi dari aplikasi Android legendaris **HandyCloset Background Eraser**.

Aplikasi ini dibuat **100% tanpa AI / Deep Learning**, melainkan murni menggunakan algoritma **Computer Vision & Image Processing Klasik** (Flood Fill, Perceptual Color Distance, Edge Detection, dan Morphological Alpha Erosion).

---

## 🚀 Keunggulan
- **⚡ 100% Client-Side:** Seluruh pemrosesan gambar dieksekusi di browser pengguna via `HTML5 Canvas` & `ImageData` array.
- **🔒 Privasi Terjamin:** Gambar tidak pernah diunggah ke server mana pun (bisa bekerja offline).
- **🪶 Super Ringan:** Tanpa framework berat (murni Vanilla JavaScript, HTML5, CSS3).
- **📱 Touch & Cursor Offset:** Mendukung offset kursor agar jari tidak menutupi bagian yang sedang dihapus saat dibuka di layar sentuh HP.

---

## 🎯 Fitur Utama

1. **Auto Mode (Magic Wand):**
   - Hapus background sewarna secara instan hanya dengan satu kali klik.
   - Menggunakan algoritma **Scanline Stack Flood Fill** berkecepatan tinggi.
   - Pilihan *Contiguous* (hanya area yang menyambung) atau *Global* (semua warna serupa di seluruh gambar).
   - Slider toleransi warna (*threshold*) adaptif.

2. **Magic Brush (Edge-Aware):**
   - Kuas pintar yang mengambil sampel warna di titik tengah brush (+) secara real-time.
   - Hanya menghapus warna serupa di dalam radius brush tanpa menembus garis batas objek.

3. **Manual Eraser:**
   - Kuas penghapus bebas dengan ukuran yang bisa disesuaikan.

4. **Repair Brush:**
   - Mengembalikan bagian gambar asli yang terhapus secara sengaja maupun tidak sengaja.

5. **Smooth Edge (Finishing):**
   - Mengaplikasikan *Alpha Mask Erosion* dan *Feathering* (level 0–5) sebelum diekspor untuk menghilangkan sisa halo/fringing background di tepian objek.

6. **Workspace Interaktif:**
   - Latar transparan kotak-kotak catur (*checkerboard*).
   - Zoom & Pan (mouse wheel, pinch-to-zoom, atau tombol floating).
   - Undo (Ctrl+Z) dan Redo (Ctrl+Y).
   - Ekspor format PNG transparan kualitas penuh.

---

## 💻 Cara Menjalankan di Lokal (Laptop/PC)

Karena dibuat tanpa build step, kamu cukup membuka file `index.html` langsung di browser, atau gunakan server lokal ringan:

```bash
cd Documents/Dev/background-eraser-web

# Menggunakan Python 3:
python3 -m http.server 8000
```
Buka browser di: `http://localhost:8000`

---

## 🌐 Cara Hosting Gratis di GitHub Pages (`.github.io`)

Kamu bisa hosting aplikasi ini secara gratis selamanya di GitHub Pages:

### Langkah 1: Buat Repository Baru di GitHub
1. Buka [github.com/new](https://github.com/new).
2. Beri nama repositori, misalnya: `background-eraser`.
3. Pilih **Public**.
4. Klik **Create repository** (jangan centang Add README karena kita sudah punya).

### Langkah 2: Hubungkan & Push dari Komputer Kamu
Buka terminal dan jalankan:

```bash
cd /home/taufiqu/Documents/Dev/background-eraser-web

# Ganti YOUR_USERNAME dan YOUR_REPO sesuai milikmu:
git remote add origin https://github.com/<YOUR_USERNAME>/<YOUR_REPO>.git
git branch -M main
git push -u origin main
```

### Langkah 3: Aktifkan GitHub Pages
1. Di halaman repositori GitHub kamu, klik tab **Settings** (di bagian atas).
2. Di menu sebelah kiri, klik **Pages**.
3. Pada bagian **Build and deployment > Source**, pilih **Deploy from a branch**.
4. Pada dropdown Branch, pilih **main** dan folder **/(root)**.
5. Klik **Save**.
6. Tunggu sekitar 1–2 menit, web kamu akan langsung aktif di:
   ```
   https://<YOUR_USERNAME>.github.io/<YOUR_REPO>/
   ```

---

## ⚡ Cara Hosting di Vercel (Alternatif Cepat)

Jika mau pakai Vercel:
1. Buka [vercel.com](https://vercel.com) dan login dengan akun GitHub kamu.
2. Klik **Add New... > Project**.
3. Pilih repository `background-eraser` yang sudah kamu push ke GitHub.
4. Karena ini Vanilla HTML/JS, biarkan pengaturan default (Framework Preset: Other).
5. Klik **Deploy**. Dalam 10 detik website kamu sudah live dengan custom domain `*.vercel.app`!
