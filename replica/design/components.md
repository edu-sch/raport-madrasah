# Component Specifications: Raport Madrasah Diniah

Spesifikasi detail komponen UI hasil ekstraksi desain dari aplikasi raport, dipetakan ke design tokens untuk implementasi langsung pada Next.js / Tailwind CSS.

---

### 1. Button (`btn`)
* **Variants:** 
  - `primary`: Background `accent`, text `on-accent`, hover `accent-hover`.
  - `secondary`: Background `surface-alt`, border `border`, text `text`.
  - `outline`: Background transparent, border `border`, hover `surface-alt`.
  - `danger`: Background `danger`, text `on-accent`.
  - `sync`: Rounded pill dengan ikon SVG spinner yang berputar saat loading.
* **Sizes:** 
  - `sm`: 32px height, padding 6px 12px, font `sm` (13px).
  - `md`: 40px height, padding 8px 16px, font `base` (15px).
  - `lg`: 48px height, padding 12px 24px, font `md` (16px, bold).
* **States:** `default`, `hover` (brightness 0.95), `active` (scale 0.98), `focus-visible` (ring 2px `accent`), `disabled` (opacity 0.6, cursor not-allowed), `loading` (spinner inline).
* **Tokens:** `radius-md`, `motion-fast`, `font-sans`.
* **A11y:** Real `<button type="button|submit">`, `aria-busy="true"` saat loading dengan teks pendukung untuk screen reader.
* **Digunakan Pada:** S01 (Login), S02 (Topbar Sync), S03 (Simpan Rombel), S04 (Simpan Nilai), S07 (Cetak).

---

### 2. Form Input & Select (`form-input`, `form-select`)
* **Variants:** Text Input, Password Input (dengan tombol ikon mata Reveal/Hide), Select Dropdown, Number Input (0 - 100).
* **Sizes:** 
  - `md`: 40px height, padding 8px 12px, font `base` (15px).
  - `table-inline`: 32px height, padding 4px 8px, font `sm` (13px, text-center untuk input nilai angka).
* **States:** 
  - `default`: Border `border-input` (70757a), background `surface`.
  - `focus`: Border `accent`, box-shadow ring 3px `rgba(26, 82, 118, 0.15)`.
  - `dirty`: Box shadow ring emas tipis (`rgba(212, 172, 13, 0.5)`) menandakan ada perubahan belum disimpan.
  - `error`: Border `danger`, animasi shake lembut 0.3s.
  - `disabled`: Background `surface-alt`, text `text-muted`.
* **Tokens:** `radius-md`, `border-input`, `motion-fast`.
* **A11y:** Label terikat `<label for="...">`, pesan error bertanda `role="alert"`.
* **Digunakan Pada:** S01, S03, S04, S05, S06, S08.

---

### 3. Stat Card (`stat-card`)
* **Variants:** Standard Metric Card, Mini Breakdown Card (MI, MTs, MA).
* **Ukuran:** Card lebar dinamis (min-width 200px), padding 20px.
* **Anatomi:**
  - Ikon / Avatar monogram di pojok kiri atas (background `surface-alt`, border `gold`).
  - Angka metrik besar (Font `xl` 22px / `display` 30px, weight 800, color `accent`).
  - Label metrik (Font `sm` 13px, weight 600, color `text-muted`).
* **States:** `default` (shadow `sm`), `hover` (translate-y -2px, shadow `md`).
* **Tokens:** `radius-lg`, `surface`, `border`, `shadow-sm`.
* **Digunakan Pada:** S02 (Dashboard).

---

### 4. Data Table (`data-table`)
* **Variants:** 
  - Siswa Rombel Table (dengan radio selection A / B).
  - Nilai Grid Table (dengan inline input nilai 0-100 dan predikat otomatis).
* **Anatomi:**
  - Header: Sticky top, background `accent`, text `on-accent`, font `sm` bold, uppercase tracking.
  - Body Rows: Alternating zebra striping (`surface` vs `surface-alt`), border-bottom `border`.
  - Predikat Pill: Badge kecil di samping nilai (A=Hijau, B=Biru, C=Kuning, D=Merah).
* **States:** `empty` (empty illustration / icon), `loading` (skeleton rows), `populated`.
* **Tokens:** `radius-md`, `border`, font `sm`.
* **A11y:** Elemen semantik `<table>`, `<thead>`, `<tbody>`, `scope="col"`.
* **Digunakan Pada:** S03 (Data Siswa), S04 (Input Nilai), S05 (Mata Pelajaran).

---

### 5. Official Report Sheet A4 (`print-sheet`)
* **Ukuran:** Strict ISO A4 Portrait (210mm x 297mm).
* **Anatomi:**
  - Kop Surat: Logo madrasah (kiri), Teks resmi lembaga (tengah, font `arabic` + `sans`), garis ganda kop surat.
  - Tabel Biodata Santri: Grid 2 kolom rapi (Nama, NIS/NISN, Kelas/Rombel, Semester, Tahun Ajaran).
  - Tabel Nilai Akademik: Kolom No, Mata Pelajaran, KKM, Nilai Angka, Huruf Mutu/Predikat, Deskripsi/Keterangan.
  - Blok Pengesahan: Titimangsa Surabaya, tanda tangan Wali Kelas (kiri), tanda tangan Kepala Madrasah + NIP (kanan).
* **Media Rules:** `@media screen` (preview card dengan border bayangan), `@media print` (`@page { size: A4; margin: 10mm; }`, sembunyikan semua sidebar, header, tombol, dan watermark).
* **Digunakan Pada:** S07 (Cetak Raport).

---

### 6. Modal Dialog (`modal-overlay`)
* **Ukuran:** Max-width 480px (form sederhana) s.d. 720px (form lebar).
* **Anatomi:** Backdrop gelapkan layar (`rgba(0, 0, 0, 0.45)`, blur 6px), Card Modal `surface`, Header dengan judul & tombol close `✕`, Body form, Footer actions (`Batal` & `Simpan`).
* **States:** `closed` (`display: none`), `open` (`animation: popIn 0.25s ease`).
* **Tokens:** `radius-xl`, `shadow-pop`, `surface`.
* **A11y:** `role="dialog"`, `aria-modal="true"`, trap focus, tutup saat tekan tombol Escape.
* **Digunakan Pada:** S05 (Modal Mapel), S06 (Kepala), S08 (Settings).

---

### 7. Toast Notification (`toast`)
* **Variants:** `success` (ikon ✅), `error` (ikon ❌), `warning` (ikon ⚠️), `info` (ikon ℹ️).
* **Ukuran:** Max-width 360px, padding 10px 14px, floating di pojok kanan atas / kanan bawah.
* **Animasi:** Slide-in dari kanan (0.25s), auto-dismiss setelah 3.5 detik.
* **Tokens:** `radius-md`, `shadow-md`, `text-sm`.
* **A11y:** `role="status"`, `aria-live="polite"`.
* **Digunakan Pada:** Seluruh sistem untuk umpan balik instan.

---

### 8. Watermark Pill (`badge-watermark-os`)
* **Bentuk:** Floating pill di pojok kanan bawah (bottom 14px, right 14px).
* **Anatomi:** Background putih `rgba(255, 255, 255, 0.96)`, blur 12px, border halus `rgba(226, 232, 240, 0.95)`, teks "by Operator Santri" dengan underline merah pada merek.
* **States:** `default`, `hover` (scale 1.06), `@media print` (`display: none !important`).
* **Tokens:** `radius-pill`, `shadow-md`.
