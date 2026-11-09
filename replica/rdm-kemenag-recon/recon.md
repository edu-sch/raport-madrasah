# Recon map: Rapor Digital Madrasah (RDM) - MIS Darul Barokah (Web PWA / Nginx / PHP-MySQL)

Scope: Full Institutional Academic Loop (Autentikasi Multi-Peran Proktor & Guru Mapel/Wali Kelas, Manajemen Profil Lembaga & Rombel Siswa, Struktur Kurikulum Merdeka & K13, Input Nilai Formatif/Sumatif/P5RA, Rekapitulasi Leger, Cetak Dokumen Rapor Standar Kemenag A4, serta Sinkronisasi Data).
For: MIS Darul Barokah, Madrasah Ibtidaiyah/Tsanawiyah/Aliyah, Pengembang Sistem Rapor Pendidikan Madrasah, dan Operator Santri.
Date: 2026-11-09

## Sources

| # | source | URL | notes |
| --- | --- | --- | --- |
| 1 | Production Web Instance | https://darulbarokah.rdmsby.com | Endpoint live produksi MIS Darul Barokah (Surabaya). NSM: 111235780084, Versi: RDM 3.1 (Build 20261014132219). |
| 2 | Reset Proktor Portal | https://darulbarokah.rdmsby.com/login/resetproktor | Mekanisme pemulihan akun Proktor/Admin menggunakan token resmi RDM Pusat. |
| 3 | Service Worker & PWA Manifest | https://darulbarokah.rdmsby.com/rdm-sw.js | Definisi caching Workbox v5.1.4, bundle proktor & guru, CoreUI icons, routing strategi network-first. |
| 4 | Web App Manifest | https://darulbarokah.rdmsby.com/assets/images/favicon/manifest.json | Konfigurasi PWA: "Rapor Digital Madrasah", theme-color `#2196F3`. |
| 5 | Official Kemenag RDM Portal | https://rdm.kemenag.go.id/ | Dokumentasi resmi Ditjen Pendidikan Islam Kemenag RI, pedoman penilaian, panduan Kurikulum Merdeka & P5RA. |
| 6 | Panduan Teknis & Manual Operasional | Sumber publik panduan manual RDM Kemenag | Alur kerja Proktor, Guru Mapel, Wali Kelas, Kepala Madrasah, bobot KKM, dan struktur leger raport. |

## Core loop

Proktor madrasah mengonfigurasi rombel dan penugasan mengajar, guru mengentri nilai capaian belajar (formatif, sumatif, ekskul, P5RA) per semester, dan wali kelas merekap leger serta mencetak dokumen resmi rapor santri berstandar Kementerian Agama.

## Screens

| ID | screen | route / how to reach | purpose | key components | states seen |
| --- | --- | --- | --- | --- | --- |
| S01 | Login Screen | `/` (Default entry) | Autentikasi multi-peran dengan filter konteks periode akademik | Card login, logo RDM & nama MIS Darul Barokah, input username, input password + tombol toggle `fa-eye`, dropdown Tahun Ajaran (2019/2020 s.d 2026/2027), dropdown Semester (Ganjil/Genap), tombol Submit, link Lupa Password Admin, preloader animasi progres, notice non-komersial, badge versi | Initial render, loading pre-loader, input focus, error validasi, redirect role |
| S02 | Reset Password Proktor | `/login/resetproktor` | Reset kata sandi administrator madrasah dengan token otorisasi pusat | Form reset, display NSM statis lembaga (`111235780084`), input Token RDM Pusat, input password baru + toggle view, input repassword + toggle view, tombol Batal, tombol Reset Password | Default view, password mismatch, invalid token, success notification |
| S03 | Dashboard Proktor / Admin | `/proktor/` | Ringkasan metrik madrasah, status kalender, dan progres input nilai pengajar | Topbar info TA & Semester, stat counters (Total Siswa, Guru, Rombel, Kelas), grafik progres pengisian nilai per guru, kartu profil lembaga, shortcut sinkronisasi EMIS & backup DB | Loaded, empty data, synchronizing, active alerts |
| S04 | Lembaga & Profil Madrasah | `/proktor/lembaga` | Pengaturan identitas resmi madrasah, KKM lembaga, dan penandatangan | Form profil lembaga (NSM, NPSN, Nama, Alamat, Jenjang MI), upload logo & kop surat resmi, input identitas Kepala Madrasah (Nama, NIP, tanda tangan digital), pengaturan titimangsa cetak | View mode, edit mode, uploading logo, saving |
| S05 | Manajemen Guru & Penugasan | `/proktor/guru` | Inventarisasi pendidik, akun akses, dan pembagian tugas mengajar | Tabel guru (NUPTK/PegID, Nama, Username, Status), tombol Tambah/Import Excel, modal penugasan mapel per kelas, penunjukan Wali Kelas & Pembina Ekskul/P5RA, tombol cetak kartu akun | Filtered, modal open, saving assignment, batch import |
| S06 | Rombongan Belajar & Data Siswa | `/proktor/siswa` & `/proktor/kelas` | Manajemen data induk santri dan penempatan kelas/rombel (1A, 1B, dst.) | Filter kelas/tingkat, tabel siswa (NIS, NISN, Nama, Gender, TTL, Nama Wali), tombol Sync EMIS Kemenag, tombol Impor/Ekspor Excel, aksi kenaikan kelas & mutasi santri | Populated table, multi-select batch action, syncing with EMIS |
| S07 | Mata Pelajaran & Kurikulum | `/proktor/mapel` | Konfigurasi struktur kurikulum (Kurikulum Merdeka / K13) dan bobot nilai | Tab kategori mapel (Agama: Al-Qur'an Hadis, Akidah Akhlak, Fikih, SKI, B. Arab; Umum: PKn, B. Indo, MTK, IPA, IPS, SBdP, PJOK; Mulok: B. Daerah/Qiraati/Tahfidz), set KKM/KKTP, bobot formatif/sumatif | List mapel, modal add/edit mapel, sort order reordering |
| S08 | Dashboard Guru | `/guru/` | Beranda pendidik menampilkan penugasan kelas dan progres entri nilai | Kartu kelas yang diampu (misal: "Akidah Akhlak - Kelas 3"), badge status ("Belum Mengisi", "Draft", "Terkirim/Terkunci"), navigasi cepat ke penilaian & catatan sikap | Loaded cards, status highlighted, notification bar |
| S09 | Input Nilai Formatif & Sumatif | `/guru/nilai` | Formulir pengisian angka capaian kompetensi per siswa | Filter jenjang/kelas/mapel, tab jenis nilai (Formatif/Lingkup Materi, Sumatif Akhir Semester), grid input interaktif mirip spreadsheet, kalkulasi otomatis predikat & deskripsi capaian, tombol import template Excel, tombol Kirim Nilai | Empty table, editing active, auto-calculated predicate, error invalid score (>100/<0) |
| S10 | Modul Wali Kelas: Catatan & Presensi | `/guru/walikelas` | Pengisian rekap ketidakhadiran, kegiatan ekstrakurikuler, dan catatan wali | Tabel siswa rombel wali kelas, kolom input presensi (Sakit, Izin, Alpa), dropdown ekskul & nilai (Sangat Baik/Baik), textarea catatan perkembangan santri, rekomendasi kenaikan/kelulusan | View mode, inline edit, dirty state indicator, batch saved |
| S11 | Penilaian Karakter & Kokurikuler P5RA | `/guru/p5ra` | Penilaian Projek Penguatan Profil Pelajar Pancasila & Rahmatan lil 'Alamin | Pilihan tema proyek, dimensi & sub-elemen P5RA, rubrik capaian (MB: Mulai Berkembang, SB: Sedang Berkembang, BSH: Berkembang Sesuai Harapan, SAB: Sangat Berkembang), deskripsi catatan proyek | Rubric rating matrix, mass save |
| S12 | Leger Nilai Rombel | `/guru/walikelas/leger` & `/proktor/leger` | Matriks rekapitulasi nilai seluruh mata pelajaran satu rombongan belajar | Spreadsheet-style wide table (No, NIS, Nama, kolom nilai seluruh mapel, jumlah nilai, rata-rata, peringkat kelas), tombol ekspor Leger (.xlsx) | Rendered leger, horizontal scroll, downloading export |
| S13 | Cetak Dokumen Rapor Resmi | `/guru/walikelas/rapor` | Pratinjau dan pencetakan dokumen fisik rapor standar Kemenag format A4 | Selector siswa, preview dokumen A4 multi-halaman (Halaman Sampul, Identitas Siswa, Lembar Capaian Akademik, Lembar Ekstrakurikuler & Catatan, Lembar Rapor P5RA), QR Code validasi keaslian, tombol Cetak Satuan / Cetak Rombel (Bulk PDF), tombol Kunci Rapor | Print layout preview, print media active (@media print), locked status |
| S14 | Backup, Restore & Sinkronisasi Pusat | `/proktor/system` | Pengelolaan basis data lokal dan sinkronisasi pelaporan nilai ke Kemenag Pusat | Status sinkronisasi ke server pusat, tombol Generate Backup Database (.sql/.zip), tombol Restore DB, log pembaruan aplikasi dan patch versi | Processing backup, success toast, upload migration modal |

## Flows

```
F01 Login Terautentikasi Berbasis Periode Akademik
    S01 -> Masukkan username & password -> Pilih Tahun Ajaran (e.g. 2026/2027) & Semester -> Klik Login -> Validasi -> Redirect ke S03 (Proktor) atau S08 (Guru)
    happy path clicks: 4
    edge: Akun dinonaktifkan, salah password, sesi kadaluarsa, pergantian tahun ajaran aktif

F02 Pemulihan Akses Proktor via Token Kemenag Pusat
    S01 -> Klik 'Lupa Password Admin?' -> S02 -> Verifikasi NSM Madrasah (111235780084) -> Input Token valid dari Admin Kemenag -> Input & konfirmasi password baru -> Klik 'Reset Password' -> Kembali ke S01
    happy path clicks: 5
    edge: Token kadaluarsa/sudah digunakan saat registrasi, konfirmasi password tidak cocok

F03 Penataan Rombel & Penugasan Guru Awal Tahun
    S03 -> S04 (Cek profil madrasah & KKM) -> S07 (Atur struktur mapel K13/Merdeka) -> S06 (Import data siswa & bentuk rombel) -> S05 (Petakan guru pengampu mapel & tetapkan wali kelas)
    happy path clicks: 12
    edge: Mutasi siswa pertengahan semester, guru mengampu beberapa rombel sekaligus

F04 Entri & Finalisasi Nilai oleh Guru Mata Pelajaran
    S08 -> Pilih kartu kelas/mapel -> S09 -> Masukkan nilai formatif per materi & sumatif akhir semester (manual atau upload excel) -> Predikat & deskripsi terisi otomatis -> Klik 'Simpan Nilai' -> Klik 'Kirim Nilai ke Wali Kelas'
    happy path clicks: 4 + entri data
    edge: Nilai di luar rentang 0-100, ada siswa belum memiliki nilai saat dikirim, guru merevisi nilai setelah dikirim (buka kunci oleh proktor)

F05 Verifikasi Rekapitulasi & Catatan Wali Kelas
    S08 -> Masuk menu Wali Kelas -> S10 (Input presensi & nilai ekskul) -> S11 (Input asesmen P5RA) -> S12 (Tinjau kelengkapan Leger) -> Pastikan tidak ada nilai mapel yang kosong
    happy path clicks: 8
    edge: Nilai salah satu mapel belum dikirim oleh guru yang bersangkutan

F06 Pratinjau & Pencetakan Fisik Dokumen Rapor A4
    S12 -> S13 Cetak Rapor -> Pilih siswa (atau pilih Cetak Semua) -> Tinjau layout halaman raport (Kop, Biodata, Tabel Nilai, Blok TTD Kepala & Wali Kelas) -> Klik 'Cetak Dokumen' -> Dialog Cetak Browser (Simpan PDF / Print Fisik) -> Proktor mengunci nilai (Locking)
    happy path clicks: 4
    edge: Halaman terpotong pada cetak printer (harus margin presisi A4), ttd digital belum terpasang, QR-code validasi nilai
```

## Components

| component | variants | states | used on |
| --- | --- | --- | --- |
| Preloader Progress | Fullscreen overlay dengan progress bar & persentase (0-100%) | running, completed, hidden | S01 |
| Button | Primary (CoreUI Blue/Green), Danger (Reset/Hapus), Outline, Link, Success (Excel/Kirim) | default, hover, focus, disabled, loading | All screens |
| Input Text / Password | Standard form-control dengan prepend icon FontAwesome (`fa-user`, `fa-key`, `fa-calendar`) dan append eye toggle (`togglePass`) | default, active, focus, invalid/error | S01, S02, S04, S05, S06 |
| Dropdown Select | Tahun Ajaran, Semester, Jenjang, Kelas, Kurikulum, Predikat | default, open, selected, disabled | S01, S04, S05, S06, S07, S09, S13 |
| Metric Stat Card | Card persegi dengan ikon CoreUI/FA, angka besar, label keterangan | default, hover shadow | S03, S08 |
| Editable Data Table | Grid tabel penilaian responsif dengan sticky header & auto-calc columns | empty, loading, editing, dirty, saved | S05, S06, S07, S09, S10, S12 |
| Rubric Selector | Radio/Pill buttons dimensi P5RA (MB, SB, BSH, SAB) | unselected, selected (accented) | S11 |
| Modal Dialog | Tambah/Edit Guru, Import Excel, Reset Konfirmasi, Penugasan Mapel | hidden, open backdrop-blur, loading | S04, S05, S06, S07, S14 |
| Toast / BlockUI Alert | Dialog pesan `Harap bersabar... Sedang memproses data.` & notification toast | hidden, showing, fade-out | All screens |
| Report Sheet Canvas | Preview lembar cetak standar A4 Kemenag, kop resmi, tabel border solid, area ttd | screen view, print view (@media print strict) | S13 |

## Inferred data model

```
Madrasah         id, nsm (e.g. "111235780084"), npsn, nama ("MIS DARUL BAROKAH"), jenjang ("MI"), alamat, desa, kecamatan, kota, provinsi, kepala_nama, kepala_nip, kepala_ttd_url, stempel_url, logo_url, active_ta, active_semester
                 evidence: S01 header, S02 NSM, S04 profil lembaga, manual Kemenag
                 confidence: high

Pengguna (User)  id, username, password_hash, role ("proktor" | "guru" | "kamad"), nama_lengkap, nip_nuptk, email, no_hp, status_aktif, created_at, updated_at
                 evidence: S01 form login, S05 data guru, /proktor vs /guru routing
                 confidence: high

TahunAjaran      id, kode (e.g. "2026/2027"), semester ("1" | "2" / "Ganjil" | "Genap"), status ("aktif" | "nonaktif")
                 evidence: S01 dropdown select tahun ajaran & semester
                 confidence: high

Kelas / Rombel   id, tingkat (1-6), nama_kelas (misal: "Kelas 1", "Kelas 3A"), kurikulum ("merdeka" | "k13"), wali_kelas_id, tahun_ajaran_id
                 evidence: S05 penugasan wali, S06 rombel siswa
                 confidence: high

Siswa            id, nis, nisn, nik, nama_lengkap, jenis_kelamin ("L" | "P"), tempat_lahir, tanggal_lahir, nama_ayah, nama_ibu, pekerjaan_ortu, alamat_siswa, kelas_id, status ("aktif" | "lulus" | "mutasi")
                 evidence: S06 biodata santri, S13 halaman identitas raport
                 confidence: high

MataPelajaran    id, kode_mapel, nama_mapel, kategori ("pai" | "umum" | "mulok"), sub_kategori ("quran_hadis" | "akidah" | "fikih" | "ski" | "b_arab"), urutan_rapor, kkm_kktp
                 evidence: S07 konfigurasi kurikulum, S09 dropdown mapel
                 confidence: high

PenugasanGuru    id, guru_id, mapel_id, kelas_id, tahun_ajaran_id
                 evidence: S05 mapping penugasan mengajar
                 confidence: high

NilaiAkademik    id, siswa_id, mapel_id, kelas_id, tahun_ajaran_id, nilai_formatif (json), nilai_sumatif (json), nilai_pas, nilai_akhir, predikat ("A"|"B"|"C"|"D"), deskripsi_capaian, status ("draft" | "terkirim" | "terkunci")
                 evidence: S09 input nilai grid, S12 leger, S13 lembar raport
                 confidence: high

NilaiKarakter    id, siswa_id, kelas_id, tahun_ajaran_id, sakit, izin, alpa, catatan_wali, status_kenaikan ("Naik ke kelas..." | "Tinggal di kelas...")
                 evidence: S10 catatan wali kelas
                 confidence: high

NilaiEkskul      id, siswa_id, kegiatan_ekskul, predikat ("Sangat Baik" | "Baik"), keterangan
                 evidence: S10 form ekskul
                 confidence: high

NilaiP5RA        id, siswa_id, proyek_nama, dimensi, elemen, sub_elemen, kriteria ("MB" | "SB" | "BSH" | "SAB"), catatan_proses
                 evidence: S11 modul P5RA
                 confidence: high
```

Relationships:
- Madrasah (1) -> memiliki banyak Pengguna, Kelas, Siswa, MataPelajaran
- Kelas (1) -> memiliki banyak Siswa
- Guru (1) -> ditugaskan ke banyak (Kelas, MataPelajaran) melalui PenugasanGuru
- Siswa (1) -> memiliki banyak NilaiAkademik, NilaiEkskul, NilaiP5RA, NilaiKarakter per Periode
- Kelas (1) -> dipimpin oleh (1) Wali Kelas

## Feature matrix

See `features.csv`. Must: 11, should: 5, could: 3, skip: 2.

## Out of scope (cannot or should not be cloned)

- Server otentikasi pusat Kemenag RI (`rdm.kemenag.go.id`) dan generator token registrasi kabupaten/provinsi (diganti dengan secret master token lokal).
- Database closed-source terenkripsi ionCube loader biner bawaan installer VDI Kemenag (direkayasa ulang menggunakan skema modern open-source: Node.js/TypeScript atau PHP Clean Architecture dengan MySQL/PostgreSQL/SQLite).
- Hak kekayaan intelektual nama logo & identitas institusi resmi kementerian (menggunakan template branding independen yang adaptif untuk madrasah).

## Size

Screens: 14, Flows: 6, Entities: 11.
Hard parts: Otentikasi ganda berbasis Tahun Ajaran & Semester aktif, multi-peran Proktor vs Guru Mapel vs Wali Kelas, engine rumus perhitungan Kurikulum Merdeka (Formatif + Sumatif + P5RA) vs K13 (Pengetahuan + Keterampilan), akurasi tata letak cetak dokumen fisik A4 multi-halaman berstandar rapor resmi, dan mekanisme penguncian nilai (locking & un-locking).
Size: **L** (Aplikasi sistem informasi akademik lengkap tingkat institusi madrasah dengan manajemen penilaian komprehensif).