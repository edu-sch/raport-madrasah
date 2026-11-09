# Recon map: Raport Madrasah Diniah (Web SPA / PWA)

Scope: Full core loop (Autentikasi Wali Kelas & Admin, Manajemen Siswa & Rombel, Input Nilai per Mapel, Predikat Otomatis, Cetak Raport Resmi A4, dan Sinkronisasi Cloud Google Spreadsheet).
For: Madrasah Diniyah, Pesantren, Lembaga Pendidikan Islam & Operator Madrasah.
Date: 2026-11-09

## Sources

| # | source | URL | notes |
| --- | --- | --- | --- |
| 1 | Live Production Web App | https://edu-sch.pages.dev/raport-diniah/ | Antarmuka pengguna aktif, navigasi SPA, login, dashboard, input nilai, pratinjau cetak A4 |
| 2 | Portal Ekosistem | https://edu-sch.pages.dev/ | Menu Hub OperatorSantri Suite |
| 3 | Repositori Sumber | https://github.com/edu-sch/raport-madrasah | Kode frontend (HTML5/CSS3/Vanilla JS) dan Apps Script Backend |
| 4 | Google Apps Script Backend | https://script.google.com/macros/s/AKfycby_qJ7gIzI4xffuPjwKbzinRgq4YNQaFGrAgCbEavHW2-z6A1jpie4Dm2jxU_dznd-5/exec | REST API endpoint database Google Spreadsheet |

## Core loop

Guru / Wali Kelas masuk ke sistem, memilih kelas & mata pelajaran yang diampu, menginput nilai siswa secara massal, dan langsung mencetak lembar raport resmi standar A4 yang siap ditandatangani dan dibagikan ke wali santri.

## Screens

| ID | screen | route / how to reach | purpose | key components | states seen |
| --- | --- | --- | --- | --- | --- |
| S01 | Login Screen | Default saat pertama dibuka | Autentikasi Admin & Guru/Wali Kelas | Form username/password, toggle lihat sandi, tombol login dengan loading spinner, live status koneksi Spreadsheet, badge floating `by Operator Santri` | Default, loading auth, error sandi salah/user tidak ditemukan, terhubung ke sheets |
| S02 | Dashboard | Navigasi `Dashboard` | Ringkasan statistik & aktivitas akademik | Topbar info Semester & TA, tombol sinkronisasi SVG animated, kartu counter total siswa (terkunci ke kelas wali), total guru, total kelas, pembagian per jenjang (MI, MTs, MA), daftar santri terbaru | Loaded, role-locked (Wali Kelas vs Admin), empty state |
| S03 | Data Siswa | Navigasi `Data Siswa` | Menampilkan siswa & pemilihan rombel (A/B) | Filter pencarian, dropdown jenjang & kelas, tombol `Simpan Rombel Sekaligus`, tabel siswa (NIS, Nama, Jenjang, Kelas, Radio/Checkbox Rombel A / B, Wali, Alamat) | Filtered, dirty changes pending save, batch saving |
| S04 | Input Nilai | Navigasi `Input Nilai` | Memasukkan nilai angka per mata pelajaran | Selector jenjang/kelas/semester/TA, tombol `Simpan Semua Nilai`, kartu tab pemilihan mapel dinamis, tabel nilai (angka 0-100, kalkulasi otomatis predikat A/B/C/D & status tuntas) | Empty, input active, auto-calculated predicate, batch saving |
| S05 | Mata Pelajaran | Navigasi `Mata Pelajaran` (Admin) | Konfigurasi kurikulum & KKM | Tab jenjang (MI, MTs, MA), tabel mapel & KKM, modal tambah/edit mapel | List per jenjang, modal add/edit |
| S06 | Kepala Madrasah | Navigasi `Kepala Madrasah` (Admin) | Pengaturan identitas penandatangan | Form nama kepala, NIP, jabatan, preview & input URL tanda tangan digital | Filled, updated |
| S07 | Cetak Raport | Navigasi `Cetak Raport` | Pratinjau & pencetakan fisik raport A4 | Selector jenjang, kelas, rombel, nama santri, semester, TA, tombol `🖨️ Cetak Raport`, lembar dokumen resmi A4 (kop madrasah, biodata, tabel nilai KKM, catatan wali, blok tanda tangan) | Preview render, print media CSS (hide UI/watermark, A4 margins) |
| S08 | Pengaturan | Navigasi `Pengaturan` | Pengaturan semester, TA, & cloud sheets | Form Tahun Ajaran aktif, Semester aktif, titimangsa cetak, status koneksi Sheets, input URL Web App Apps Script, tombol test koneksi | Connected, error, testing |

## Flows

```
F01 Login Guru & Penguncian Hak Akses (Role-Scoped View)
    S01 -> Input username/nama guru & password -> Validasi lokal/cloud -> S02 Dashboard
    happy path clicks: 2
    edge: Akun belum terdaftar di tab 'User' Spreadsheet, keyboard HP auto-capitalize, offline cache fallback

F02 Penentuan Rombel Siswa (Kelas A / B)
    S02 -> S03 Data Siswa -> Centang pilihan Rombel A atau B pada siswa -> Klik 'Simpan Rombel'
    happy path clicks: 3
    edge: Perubahan lebih dari 1 siswa disimpan sekaligus (batch save)

F03 Input Nilai per Mata Pelajaran
    S02 -> S04 Input Nilai -> Pilih Mata Pelajaran -> Isi nilai siswa (0-100) -> Predikat terisi otomatis -> Klik 'Simpan Semua Nilai'
    happy path clicks: 4 + entri angka
    edge: Nilai di luar rentang 0-100, pergantian semester/tahun ajaran, auto-sync ke Google Sheets

F04 Cetak Raport Fisik Santri (A4 Print/PDF)
    S02 -> S07 Cetak Raport -> Pilih Siswa & Rombel -> Tinjau Nilai -> Klik '🖨️ Cetak Raport' -> Window Print Browser (PDF/Printer)
    happy path clicks: 3
    edge: Nilai belum lengkap pada mapel tertentu, tanda tangan digital transparan

F05 Sinkronisasi Dua Arah Google Spreadsheet
    S02 -> Klik tombol 'Sinkronisasi Data' di Topbar -> Fetch & Push perubahan -> Notifikasi Toast Sukses
    happy path clicks: 1
    edge: Koneksi internet putus, kuota Google Apps Script rate limit, caching browser HP
```

## Components

| component | variants | states | used on |
| --- | --- | --- | --- |
| Button | primary (emerald/navy), outline, ghost, danger, icon-only | default, hover, focus, disabled, loading (spinner) | All screens |
| Sync Button | SVG crisp spinner button | idle, syncing (rotating 360deg), disabled | Topbar |
| Form Input | text, password, select, number (0-100) | default, focus (emerald ring), error (red shake), disabled | S01, S03, S04, S06, S08 |
| Stat Card | large metric counter, subtitle, icon avatar | default, hover lift | S02 |
| Data Table | responsive scroll, striped rows, sticky header | empty, loading, populated | S03, S04, S05 |
| Toast Notification | success, error, warning, info | slide-in, auto-dismiss (3500ms), removing | All screens |
| Modal Dialog | add/edit record, confirmation prompt | closed, open (backdrop-blur), animating | S03, S05, S08 |
| Print Document Sheet | Lembar resmi Raport A4, border ganda, kop surat | screen preview, @media print strict A4 | S07 |
| Watermark Pill | Floating `by Operator Santri` glassmorphism pill | default, hover scale, print hidden | S01 - S08 |

## Inferred data model

```
User/Guru        user (username, string), password (plain/hash), namaGuru (string), tugas (e.g. "Wali Kelas 5 A"), status ("Aktif"|"Nonaktif")
                 evidence: S01 form, tab 'User' Spreadsheet, AuthService login check
                 confidence: high

Siswa            id (string), nama (string), nis (string), jenjang ("MI"|"MTs"|"MA"), kelas ("1"-"12"), rombel ("A"|"B"), alamat (string), namaWali (string), waliKelas (string), tempatLahir (string), tanggalLahir (string), jenisKelamin ("L"|"P"), createdAt (iso), updatedAt (iso)
                 evidence: S03 table, tab 'Siswa' Spreadsheet, import Excel parser
                 confidence: high

Nilai            id (string), siswaId (string), mapelId (string), mapelNama (string), guru (string), nilai (number 0-100), jenjang (string), kelas (string), semester ("Ganjil"|"Genap"), tahunAjaran (string), updatedAt (iso)
                 evidence: S04 grid, tab 'Nilai' Spreadsheet, kalkulator predikat
                 confidence: high

Mapel            id (string), jenjang ("MI"|"MTs"|"MA"), nama (string), urutan (number), kkm (number)
                 evidence: S05 config, tab 'MapelConfig' Spreadsheet
                 confidence: high

KepalaMadrasah   id (string), nama (string), nip (string), jabatan (string), ttdUrl (string)
                 evidence: S06 settings, tab 'KepalaData' Spreadsheet
                 confidence: high

Settings         semester (string), tahunAjaran (string), tanggalCetak (string), sheetsUrl (string)
                 evidence: S08 settings, LocalStorage `mdb_settings`
                 confidence: high
```

Relationships:
- Kelas (1) has many Siswa (n)
- Siswa (1) has many Nilai (n)
- Mapel (1) has many Nilai (n)
- Guru/Wali Kelas (1) binds to (1) Kelas + Rombel

## Feature matrix

See `features.csv`. Must: 10, should: 4, could: 2, skip: 1.

## Out of scope (cannot or should not be cloned)

- Kredensial akun Google Drive pribadi / API token rahasia milik lembaga (menggunakan data sanitasi).
- Tanda tangan basah & stempel resmi legalisir madrasah asli (disiapkan sebagai field dinamis yang dapat diunggah masing-masing madrasah).

## Size

Screens: 8, Flows: 5, Entities: 6.
Hard parts: Integrasi tanpa-server Google Apps Script CORS Web App, sinkronisasi dua arah real-time, offline resilience fallback, role-lock wali kelas, dan akurasi layout cetak A4.
Size: **M** (Aplikasi web ringkas, modular, tanpa dependensi framework berat, sangat stabil).
