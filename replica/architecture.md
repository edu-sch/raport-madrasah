# Architecture: Raport Madrasah Diniah (Stand-Alone Rebuild)

Dokumen perancangan arsitektur sistem mandiri untuk Raport Digital Madrasah Diniah hasil analisis `replica-recon`. Menggantikan ketergantungan Google Spreadsheet dengan database relasional ACID mandiri, API terstruktur, serta keamanan berbasis peran (*Role-Based Access Control*).

---

## 1. Stack Teknologi

Dipilih stack yang modern, hemat sumber daya, mudah di-hosting secara gratis/murah, dan terbukti stabil:

| Layer | Pilihan | Alasan Pemilihan |
| :--- | :--- | :--- |
| **Web App** | **Next.js 14+ (App Router) + TypeScript** | Satu basis kode untuk Frontend & Backend (API Routes), Server-Side Rendering untuk cetak raport instan, performa cepat. |
| **Styling** | **Tailwind CSS** | Ringan, konsisten dengan standar desain OperatorSantri Suite, mudah mengontrol layout `@media print` A4. |
| **Database** | **PostgreSQL (Supabase / Neon / Docker Local)** | ACID-compliant, mendukung relasi tabel ketat, constraint unik komposit untuk mencegah duplikasi nilai santri. |
| **ORM / Query** | **Drizzle ORM** | Type-safe, beban memori mendekati nol (*zero-overhead*), performa SQL sangat cepat, migrasi otomatis. |
| **Auth** | **Auth.js (NextAuth) + BCrypt** | Session JWT aman, mendukung pembatasan hak akses berbasis penugasan wali kelas (*Role-Scoped Access*). |
| **File Storage** | **Cloudflare R2 / Supabase Storage** | Penyimpanan aset logo madrasah dan file tanda tangan digital kepala madrasah/wali santri (PNG transparan). |
| **Hosting** | **Cloudflare Pages / Vercel / VPS Docker** | Gratis di tier awal, waktu muat cepat, integrasi otomatis dengan GitHub. |

---

## 2. Skema Database Mandiri (`PostgreSQL`)

Total Tabel: **7 Tabel**.  
Aturan Akses: *Data-layer Authorization* & *Postgres Row Level Security (RLS)*.

Lihat file terpisah: [`replica/schema.sql`](./schema.sql).

### Entitas Inti & Relasi:
1. **`madrasah_profile`**: Profil madrasah, NSM, alamat, dan aset legalisir.
2. **`users`**: Akun login (Admin, Guru, Wali Kelas) dengan password hash bcrypt.
3. **`tahun_ajaran`**: Periode aktif (contoh: 2024/2025 Ganjil), status aktif, tanggal titimangsa raport.
4. **`rombel`**: Rombongan belajar (MI/MTs/MA, Tingkat 1-12, Rombel A/B) yang dikaitkan ke Wali Kelas.
5. **`siswa`**: Biodata santri (NIS, NISN, Nama, Wali, Alamat) terikat ke `rombel_id`.
6. **`mapel`**: Mata pelajaran dan KKM (Fikih, Aqidah, Al-Qur'an, Bahasa Arab, dll) per jenjang.
7. **`nilai`**: Nilai santri (0-100), predikat (A/B/C/D), status kelulusan, dan catatan wali kelas.
   - **Hard Constraint:** `UNIQUE (siswa_id, mapel_id, tahun_ajaran_id)` menjamin tidak akan ada nilai ganda untuk santri yang sama di satu periode.

---

## 3. Struktur API (REST Endpoints)

Endpoint dikelompokkan berdasarkan Alur Pengguna (Flow F01 - F05):

| Method & Path | Fungsi | Otorisasi | Input | Output | Alur |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST /api/auth/login` | Autentikasi guru / admin | Publik | `{ username, password }` | `{ user, token }` | F01 |
| `GET /api/auth/me` | Cek sesi aktif & kelas ampu | Authenticated | Header Bearer Token / Cookie | Data User & Rombel Wali | F01 |
| `GET /api/dashboard/stats` | Statistik santri & kelas | Authenticated | Query: `ta_id` | Counter data & ringkasan | F01 |
| `GET /api/siswa` | Daftar santri per rombel | Guru / Admin | Query: `rombel_id, search` | `[Siswa]` | F02 |
| `PATCH /api/siswa/batch-rombel` | Pindah/atur rombel A atau B massal | Admin / Wali | `{ changes: [{ siswaId, rombelId }] }` | `{ updatedCount }` | F02 |
| `GET /api/nilai/grid` | Ambil lembar nilai 1 kelas 1 mapel | Guru Mapel / Wali | Query: `rombel_id, mapel_id, ta_id` | `[SiswaWithNilai]` | F03 |
| `PUT /api/nilai/batch-upsert` | Simpan/perbarui nilai sekelas | Guru Mapel / Wali | `{ ta_id, mapel_id, items: [{ siswa_id, nilai }] }` | `{ savedCount }` | F03 |
| `GET /api/cetak/raport-data` | Data lengkap cetak raport A4 santri | Wali Kelas / Admin | Query: `siswa_id, ta_id` | Rekap Nilai, KKM, Biodata, TTD | F04 |
| `POST /api/backup/export-sheets` | Ekspor cadangan ke Google Sheets | Admin | `{ ta_id }` | Google Spreadsheet ID/URL | F05 |
| `POST /api/backup/import-sheets` | Impor data awal dari Google Sheets | Admin | `{ spreadsheetUrl }` | `{ importedCounts }` | F05 |

---

## 4. Bagian Krusial & Penanganan Risiko (*The Parts That Bite*)

1. **Perhitungan Predikat & KKM (Thresholds):**  
   Rentang nilai predikat A, B, C, D dihitung dinamis berdasarkan interval KKM masing-masing mapel `(100 - KKM) / 3`, bukan angka statis.
2. **Koneksi Simultan Saat Input Nilai Bersamaan:**  
   Saat seluruh guru menginput nilai di akhir semester, endpoint `batch-upsert` menggunakan klausa SQL `ON CONFLICT (siswa_id, mapel_id, tahun_ajaran_id) DO UPDATE` dalam satu transaksi (`BEGIN ... COMMIT`) agar bebas *race condition*.
3. **Pembatasan Hak Akses (*Role Scoping*):**  
   Middleware API memeriksa apakah guru yang sedang login adalah Wali Kelas dari santri yang nilainya hendak diubah. Guru tidak dapat memanipulasi nilai kelas lain kecuali memiliki role `admin`.
4. **Presisi Format Cetak Fisik A4:**  
   CSS `@page { size: A4 portrait; margin: 10mm 15mm; }` menjamin 1 lembar raport tidak terpotong menjadi 2 halaman secara acak di berbagai browser.

---

## 5. Urutan Pembangunan (*Build Order*)

### Tahap 1: Vertical Slice (Pembuktian Arsitektur Awal)
* **Target:** Alur Login Guru -> Input 1 Mapel -> Cetak 1 Lembar Raport.
* **Layar:** S01 (Login), S04 (Input Nilai), S07 (Cetak).
* **Tabel:** `users`, `siswa`, `mapel`, `nilai`, `tahun_ajaran`.
* **Routes:** `/api/auth/login`, `/api/nilai/grid`, `/api/nilai/batch-upsert`, `/api/cetak/raport-data`.

### Tahap 2: Must-Haves (Fitur Wajib Operasional)
* Penyusunan Rombel A / B serentak (S03).
* Dashboard statistik terfilter penugasan wali kelas (S02).
* Pengaturan profil madrasah, kepala sekolah & KKM (S05, S06, S08).
* Validasi input rentang nilai 0-100 dan status ketuntasan otomatis.

### Tahap 3: Should-Haves (Penyempurnaan & Fitur Tambahan)
* Modul integrasi impor/ekspor data Google Spreadsheet sebagai cadangan darurat (*cloud backup*).
* Upload gambar tanda tangan digital transparan kepala madrasah dan wali kelas.
* Fitur *batch print* (cetak berurutan seluruh santri dalam 1 kelas sekaligus).

---

Langkah selanjutnya: Jalankan **/replica-design** untuk mengekstrak token desain (warna, tipografi, radius, layout) dan komponen UI yang siap dibangun.
