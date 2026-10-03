# 📚 Aplikasi Raport Digital
## Madrasah Diniah Darul Barokah Surabaya

> **Yayasan Darul Barokah Surabaya** · Jatipurwo IV/14A Surabaya  
> Meliputi jenjang: MI (Ibtidaiyah) · MTs (Tsanawiyah) · MA (Aliyah)

---

## 🗂️ Struktur File

```
raport-madrasah/
├── index.html              ← Aplikasi utama (buka ini di browser)
├── style.css               ← Stylesheet utama (UI)
├── print.css               ← Stylesheet cetak (layout A4 raport)
├── app.js                  ← Logika aplikasi utama
├── sheets.js               ← Integrasi Google Sheets / LocalStorage
├── google-apps-script.gs   ← Backend Google Apps Script (deploy ke GAS)
└── README.md               ← Panduan ini
```

---

## ⚡ Cara Pakai Cepat (Tanpa Google Sheets)

Aplikasi langsung bisa digunakan **tanpa konfigurasi apapun** menggunakan penyimpanan lokal browser (LocalStorage).

1. **Buka `index.html`** di browser (Chrome/Edge direkomendasikan)
2. Mulai gunakan semua fitur — data tersimpan di browser
3. Ekspor data secara berkala via menu **Pengaturan → Ekspor Data**

> ⚠️ Data lokal akan hilang jika browser di-reset/clear cache. Gunakan Google Sheets untuk penyimpanan permanen.

---

## 🔗 Setup Google Sheets (Opsional tapi Direkomendasikan)

### Langkah 1: Buat Google Spreadsheet

1. Buka [Google Sheets](https://sheets.google.com) → Buat spreadsheet baru
2. Beri nama: **"Raport Darul Barokah"** (bebas)

### Langkah 2: Deploy Google Apps Script

1. Di Google Sheets: klik **Extensions → Apps Script**
2. Hapus semua kode default yang ada
3. **Copy-paste** seluruh isi file `google-apps-script.gs` ke editor
4. Klik **Save** (💾) lalu **Run → initSheets** untuk membuat semua sheet otomatis
5. Ketika diminta izin, klik **"Review permissions"** → **"Allow"**

### Langkah 3: Deploy sebagai Web App

1. Klik **Deploy → New Deployment**
2. Klik ikon ⚙️ di samping "Select type" → pilih **Web App**
3. Isi konfigurasi:
   - **Description:** Raport Darul Barokah API
   - **Execute as:** Me (akun Google Anda)
   - **Who has access:** Anyone
4. Klik **Deploy**
5. **Copy URL** yang muncul (format: `https://script.google.com/macros/s/xxxxx/exec`)

### Langkah 4: Hubungkan ke Aplikasi

1. Buka `index.html` di browser
2. Klik menu **⚙️ Pengaturan** di sidebar
3. Paste URL Apps Script ke kolom **"URL Google Apps Script Web App"**
4. Klik **🔗 Uji Koneksi**
5. Jika berhasil, status berubah menjadi ✅ hijau

---

## 📋 Struktur Google Sheets

Setelah `initSheets()` dijalankan, sheet berikut akan dibuat otomatis:

| Sheet | Fungsi | Kolom Utama |
|-------|--------|-------------|
| `Siswa` | Data siswa | id, nama, nis, jenjang, kelas, alamat... |
| `Nilai` | Nilai per mata pelajaran | id, siswaId, mapelId, nilai, semester... |
| `MapelConfig` | Konfigurasi mata pelajaran | id, jenjang, nama, guru, kkm |
| `GuruData` | Data guru | id, nama, nip, mapelAmpu |
| `KepalaData` | Data kepala madrasah | id, nama, nip, jabatan, ttdUrl |
| `Kelas` | Daftar kelas | id, nama, jenjang |

---

## 🖥️ Fitur Aplikasi

### 🏠 Dashboard
- Statistik jumlah siswa, guru, kelas per jenjang
- Aksi cepat (tambah siswa, cetak raport, input nilai)
- Tabel predikat nilai referensi

### 👨‍🎓 Data Siswa
- Tambah / Edit / Hapus data siswa
- Filter berdasarkan jenjang, kelas, dan pencarian nama/NIS
- Akses cepat ke raport siswa

### 📝 Input Nilai
- Pilih jenjang → kelas → semester → tahun ajaran
- Isi nilai per mata pelajaran (0-100)
- Predikat otomatis (A/B/C/D/E)
- Nilai di bawah KKM otomatis disorot oranye
- Input kehadiran (Hadir/Sakit/Izin/Alpa)
- Catatan wali kelas

### 📚 Mata Pelajaran
- Konfigurasi mapel berbeda per jenjang (MI/MTs/MA)
- Edit nama mapel secara inline
- Assign guru pengampu per mapel
- Set KKM per mapel (default: 70)

### 👩‍🏫 Data Guru
- Tambah / Edit / Hapus data guru
- NIP, mata pelajaran yang diampu, kontak

### 🏛️ Kepala Madrasah
- Nama, NIP, jabatan
- Upload tanda tangan (PNG transparan)
- Tanda tangan muncul di raport yang dicetak

### 🖨️ Cetak Raport
- Preview raport tampilan A4 di browser
- Print langsung ke printer
- Layout resmi: header sekolah, identitas siswa, tabel nilai, kehadiran, catatan, tanda tangan
- Mendukung multi-jenjang dalam satu session

### ⚙️ Pengaturan
- Konfigurasi URL Google Apps Script
- Tahun ajaran & semester aktif
- Ekspor/impor data lokal (JSON)

---

## 🎨 Tampilan Raport (Cetak)

Raport yang dicetak mencakup:

```
┌─────────────────────────────────────────────────┐
│  [LOGO]  MADRASAH DINIAH DARUL BAROKAH SURABAYA │
│          YAYASAN DARUL BAROKAH SURABAYA          │
│          Jatipurwo IV/14A Surabaya               │
├─────────────────────────────────────────────────┤
│         BUKU LAPORAN PENDIDIKAN (RAPORT)         │
│         Semester Ganjil · T.A. 2025/2026         │
├─────────────────────────────────────────────────┤
│ 📋 IDENTITAS PESERTA DIDIK                       │
│   Nama   : Muhammad Fauzan    Kelas : 7          │
│   NIS    : 2024001            Jenjang: MTs       │
│   TTL    : Surabaya, 01-01-2012                  │
│   Wali   : Bapak Ahmad        Alamat : ...       │
├─────────────────────────────────────────────────┤
│ 📊 HASIL BELAJAR                                  │
│ No │ Mata Pelajaran  │ Guru   │KKM│ Nilai │Pred  │
│  1 │ Al-Quran Hadits │ Ustad X│ 70│  85  │B-Baik│
│  2 │ Fiqih           │ Ustad Y│ 70│  90  │A-SB  │
│ ... (semua mapel)                                 │
│ Rata-rata: 87.5                                   │
├─────────────────────────────────────────────────┤
│ 📅 KEHADIRAN                                      │
│  Hadir: 90   Sakit: 2   Izin: 1   Alpa: 0        │
├─────────────────────────────────────────────────┤
│ 📝 CATATAN WALI KELAS                             │
│ Siswa menunjukkan perkembangan yang baik...       │
├─────────────────────────────────────────────────┤
│ Wali Kelas    │    Stempel    │  Kepala Madrasah │
│               │               │     [TTD]        │
│ _________     │    [cap]      │  ___________     │
│ Nama WK       │               │  Nama Kepala     │
└─────────────────────────────────────────────────┘
```

---

## 🎓 Mata Pelajaran Default

### MI (Ibtidaiyah) — Kelas 1-6
Al-Quran Hadits · Aqidah Akhlak · Fiqih · SKI · Bahasa Arab · Tahfidz · Tajwid · Shorof · Nahwu

### MTs (Tsanawiyah) — Kelas 7-9
Al-Quran Hadits · Aqidah Akhlak · Fiqih · SKI · Bahasa Arab · Tahfidz · Nahwu · Shorof · Balaaghah · Tafsir

### MA (Aliyah) — Kelas 10-12
Al-Quran Hadits · Aqidah Akhlak · Fiqih · SKI · Bahasa Arab · Tahfidz · Nahwu · Shorof · Balaaghah · Tafsir · Hadits · Ushul Fiqih

---

## 📏 Konversi Nilai / Predikat

| Nilai Angka | Predikat | Keterangan |
|:-----------:|:--------:|:----------:|
| 90 – 100 | **A** | Sangat Baik |
| 80 – 89  | **B** | Baik |
| 70 – 79  | **C** | Cukup |
| 60 – 69  | **D** | Perlu Bimbingan |
| < 60     | **E** | Kurang |

KKM default: **70** (dapat diubah per mata pelajaran)

---

## 💡 Tips Penggunaan

### Saat Mencetak Raport
1. Klik **Preview** dulu untuk memastikan data benar
2. Klik **🖨️ Print** atau tekan `Ctrl+P`
3. Di dialog print:
   - Ukuran kertas: **A4**
   - Orientasi: **Portrait**
   - Margin: **Default** atau **Minimal**
   - ✅ Centang **"Background graphics"** agar header berwarna

### Backup Data
- Lakukan ekspor data setiap akhir semester
- Simpan file JSON di tempat aman
- Jika pindah browser/komputer, impor file backup tersebut

### Performa Optimal
- Gunakan **Google Chrome** atau **Microsoft Edge** versi terbaru
- Untuk Google Sheets, pastikan koneksi internet stabil
- Tutup tab browser lain saat mencetak untuk hasil optimal

---

## 🔧 Troubleshooting

### Koneksi Google Sheets gagal
- Pastikan Apps Script sudah di-deploy dengan **"Who has access: Anyone"**
- Coba buka URL Apps Script langsung di browser baru — harus muncul `{"pong":true,...}`
- Jika ada CORS error, pastikan `doPost` menggunakan `Content-Type: text/plain`

### Data tidak tersimpan
- Cek apakah LocalStorage browser tidak diblokir
- Coba mode incognito untuk diagnosa
- Jika pakai Google Sheets, cek quota Apps Script harian

### Raport tidak tercetak dengan benar
- Gunakan Chrome/Edge (Firefox kadang ada masalah dengan print CSS)
- Centang "Background graphics" di dialog print
- Skala cetak: 100% (tidak auto-fit)

### Logo tidak tampil
- Jika logo tidak muncul, periksa koneksi internet
- Logo diambil dari URL eksternal; jika offline, akan digantikan emoji 📚

---

## 📞 Informasi Sekolah

| | |
|--|--|
| **Nama Madrasah** | Madrasah Diniah Darul Barokah Surabaya |
| **Yayasan** | Yayasan Darul Barokah Surabaya |
| **Alamat** | Jatipurwo IV/14A Surabaya |
| **Jenjang** | MI · MTs · MA |

---

*Aplikasi Raport Digital v1.0 · Pure HTML/CSS/JavaScript · No framework required*
