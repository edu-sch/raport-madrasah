/**
 * ============================================================
 * RAPORT MADRASAH DINIAH DARUL BAROKAH SURABAYA
 * Core Application Logic - app.js
 * ============================================================
 */

'use strict';

/* ============================================================
 * ─── CONSTANTS & CONFIG ────────────────────────────────────
 * ============================================================ */
const SCHOOL = {
  name:       'MADRASAH DINIAH DARUL BAROKAH SURABAYA',
  foundation: 'YAYASAN DARUL BAROKAH SURABAYA',
  address:    'JATIPURWO IV/14A SURABAYA',
  logo:       'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQD5VSg3vVkR0Y5Tlo7G9sCCAr0RwUbJMGXvnNxOSIS1A&s=10',
  phone:      '',
};

const JENJANG = {
  MI:  'MADRASAH IBTIDAIYAH (MI)',
  MTs: 'MADRASAH TSANAWIYAH (MTs)',
  MA:  'MADRASAH ALIYAH (MA)',
};

/** Default subjects by jenjang level */
const DEFAULT_MAPEL = {
  MI:  ['Al-Quran Hadits', 'Aqidah Akhlak', 'Fiqih', 'SKI', 'Bahasa Arab', 'Tahfidz', 'Tajwid', 'Shorof', 'Nahwu'],
  MTs: ['Al-Quran Hadits', 'Aqidah Akhlak', 'Fiqih', 'SKI', 'Bahasa Arab', 'Tahfidz', 'Nahwu', 'Shorof', 'Balaaghah', 'Tafsir'],
  MA:  ['Al-Quran Hadits', 'Aqidah Akhlak', 'Fiqih', 'SKI', 'Bahasa Arab', 'Tahfidz', 'Nahwu', 'Shorof', 'Balaaghah', 'Tafsir', 'Hadits', 'Ushul Fiqih'],
};

/** Grade conversion */
const GRADE_TABLE = [
  { min: 90, max: 100, predikat: 'A', label: 'Sangat Baik' },
  { min: 80, max: 89,  predikat: 'B', label: 'Baik' },
  { min: 70, max: 79,  predikat: 'C', label: 'Cukup' },
  { min: 60, max: 69,  predikat: 'D', label: 'Perlu Bimbingan' },
  { min: 0,  max: 59,  predikat: 'E', label: 'Kurang' },
];

const SEMESTER_LIST = ['Ganjil', 'Genap'];

/* ============================================================
 * ─── UTILITY FUNCTIONS ─────────────────────────────────────
 * ============================================================ */

/** Generate a ULID-like unique ID */
function genId() {
  return Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 7).toUpperCase();
}

/** Get current academic year string (e.g. "2025/2026") */
function currentTahunAjaran() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1; // 1-based
  return m >= 7 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
}

/** Determine predikat from numeric grade */
function getPredikat(nilai) {
  const n = parseFloat(nilai);
  if (isNaN(n)) return { predikat: '-', label: '-' };
  for (const g of GRADE_TABLE) {
    if (n >= g.min && n <= g.max) return g;
  }
  return { predikat: '-', label: '-' };
}

/** Convert number to Nilai Huruf (written word) */
function nilaiToHuruf(nilai) {
  const n = parseFloat(nilai);
  if (isNaN(n)) return '-';
  // Simple Indonesian number-to-words for exam scores
  const words = [
    '', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima',
    'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh',
  ];
  if (n === 100) return 'Seratus';
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  let result = '';
  if (tens > 0) {
    result += (tens === 1 ? 'Sepuluh' : tens === 9 ? 'Sembilan Puluh' : (words[tens] || '') + ' Puluh');
    if (ones > 0) result += ' ' + words[ones];
  } else {
    result = words[ones] || n.toString();
  }
  return result || n.toString();
}

/** Format date to Indonesian locale string */
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Get today's date in Indonesian format */
function todayIndonesian() {
  return new Date().toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
}

/** Escape HTML entities */
function escHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Calculate average of an array */
function avg(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/* ============================================================
 * ─── STATE MANAGEMENT ──────────────────────────────────────
 * ============================================================ */
const State = {
  /** Persistent settings */
  settings: loadSettings(),

  /** In-memory data (refreshed on page load) */
  siswa:     [],
  nilai:     [],
  mapel:     [],
  guru:      [],
  kelas:     [],
  kepala:    null,

  /** UI state */
  currentPage: 'dashboard',
  filterNilai: { jenjang: 'MI', kelas: '', semester: 'Ganjil', tahunAjaran: '' },
  filterSiswa: { search: '', jenjang: '', kelas: '' },
};

function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem('mdb_settings') || '{}');
  } catch { return {}; }
}

function saveSettings() {
  localStorage.setItem('mdb_settings', JSON.stringify(State.settings));
}

/* ============================================================
 * ─── TOAST NOTIFICATIONS ───────────────────────────────────
 * ============================================================ */
const Toast = {
  container: null,

  init() {
    this.container = document.getElementById('toast-container');
  },

  show(msg, type = 'info', duration = 3500) {
    if (!this.container) return;
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${escHtml(msg)}</span>`;
    this.container.appendChild(el);

    setTimeout(() => {
      el.classList.add('removing');
      setTimeout(() => el.remove(), 300);
    }, duration);
  },

  success(msg) { this.show(msg, 'success'); },
  error(msg)   { this.show(msg, 'error', 5000); },
  warning(msg) { this.show(msg, 'warning'); },
  info(msg)    { this.show(msg, 'info'); },
};

/* ============================================================
 * ─── MODAL MANAGER ─────────────────────────────────────────
 * ============================================================ */
const Modal = {
  open(id) {
    const el = document.getElementById(id);
    if (el) { el.classList.add('open'); el.setAttribute('aria-hidden', 'false'); }
  },
  close(id) {
    const el = document.getElementById(id);
    if (el) { el.classList.remove('open'); el.setAttribute('aria-hidden', 'true'); }
  },
  closeAll() {
    document.querySelectorAll('.modal-overlay.open').forEach(el => {
      el.classList.remove('open');
      el.setAttribute('aria-hidden', 'true');
    });
  },
};

/* ============================================================
 * ─── NAVIGATION ────────────────────────────────────────────
 * ============================================================ */
function navigate(page) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  // Show target page
  const target = document.getElementById(`page-${page}`);
  if (target) target.classList.add('active');

  // Update nav items
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === page);
  });

  // Update page title
  const titles = {
    dashboard:  '🏠 Dashboard',
    siswa:      '👨‍🎓 Data Siswa',
    nilai:      '📝 Input Nilai',
    mapel:      '📚 Mata Pelajaran',
    guru:       '👩‍🏫 Data Guru',
    kepala:     '🏛️ Kepala Madrasah',
    cetak:      '🖨️ Cetak Raport',
    pengaturan: '⚙️ Pengaturan',
  };
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = titles[page] || page;

  State.currentPage = page;

  // Close sidebar on mobile
  if (window.innerWidth < 900) {
    document.querySelector('.sidebar').classList.remove('open');
    document.querySelector('.sidebar-backdrop').classList.remove('show');
  }

  // Load page data
  loadPageData(page);
}

async function loadPageData(page) {
  switch (page) {
    case 'dashboard':  await renderDashboard(); break;
    case 'siswa':      await renderSiswa(); break;
    case 'nilai':      await renderNilaiControls(); break;
    case 'mapel':      await renderMapel(); break;
    case 'guru':       await renderGuru(); break;
    case 'kepala':     await renderKepala(); break;
    case 'cetak':      await renderCetak(); break;
    case 'pengaturan': renderPengaturan(); break;
    case 'akun':       await renderAkun(); break;
  }
}

/* ============================================================
 * ─── DASHBOARD PAGE ────────────────────────────────────────
 * ============================================================ */
async function renderDashboard() {
  try {
    const [siswaRes, guruRes, kelasRes] = await Promise.all([
      DataService.Siswa.getAll(),
      DataService.Guru.getAll(),
      DataService.Kelas.getAll(),
    ]);

    State.siswa = siswaRes.data || [];
    State.guru  = guruRes.data  || [];
    State.kelas = kelasRes.data || [];

    const totalSiswa = State.siswa.length;
    const totalGuru  = State.guru.length;
    const totalKelas = State.kelas.length;

    const countMI  = State.siswa.filter(s => s.jenjang === 'MI').length;
    const countMTs = State.siswa.filter(s => s.jenjang === 'MTs').length;
    const countMA  = State.siswa.filter(s => s.jenjang === 'MA').length;

    document.getElementById('stat-total-siswa').textContent = totalSiswa;
    document.getElementById('stat-total-guru').textContent  = totalGuru;
    document.getElementById('stat-total-kelas').textContent = totalKelas;

    document.getElementById('jenjang-mi-count').textContent  = countMI;
    document.getElementById('jenjang-mts-count').textContent = countMTs;
    document.getElementById('jenjang-ma-count').textContent  = countMA;

    // Recent students
    const recentEl = document.getElementById('recent-siswa-list');
    const recent = State.siswa.slice(-5).reverse();
    if (recent.length === 0) {
      recentEl.innerHTML = `<div class="empty-state"><div class="empty-icon">👨‍🎓</div><p>Belum ada data siswa</p></div>`;
    } else {
      recentEl.innerHTML = recent.map(s => `
        <div class="recent-item">
          <div class="recent-item-avatar">${escHtml(s.nama?.charAt(0) || '?')}</div>
          <div>
            <strong>${escHtml(s.nama)}</strong>
            <span style="color:var(--gray-500)"> · ${escHtml(s.nis)} · Kelas ${escHtml(s.kelas)} ${escHtml(s.jenjang)}</span>
          </div>
        </div>
      `).join('');
    }

    // Semester & tahun info
    const semester = State.settings.semester || 'Ganjil';
    const tahun    = State.settings.tahunAjaran || currentTahunAjaran();
    document.getElementById('topbar-semester').textContent  = `Semester ${semester}`;
    document.getElementById('topbar-tahun').textContent     = `T.A. ${tahun}`;

  } catch (e) {
    console.error('Dashboard error:', e);
  }
}

/* ============================================================
 * ─── DATA SISWA PAGE ───────────────────────────────────────
 * ============================================================ */
let _editingSiswaId = null;

async function renderSiswa() {
  try {
    const res = await DataService.Siswa.getAll();
    State.siswa = res.data || [];
    _applySiswaFilter();
  } catch (e) {
    Toast.error('Gagal memuat data siswa: ' + e.message);
  }
}

function _applySiswaFilter() {
  const { search, jenjang, kelas } = State.filterSiswa;
  let list = [...State.siswa];

  if (search)  list = list.filter(s => (s.nama + s.nis).toLowerCase().includes(search.toLowerCase()));
  if (jenjang) list = list.filter(s => s.jenjang === jenjang);
  if (kelas)   list = list.filter(s => s.kelas === kelas);

  renderSiswaTable(list);
}

function renderSiswaTable(list) {
  const tbody = document.getElementById('siswa-tbody');
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--gray-500)">
      Belum ada data siswa. Klik "+ Tambah Siswa" untuk menambahkan.
    </td></tr>`;
    return;
  }

  tbody.innerHTML = list.map((s, i) => `
    <tr data-id="${escHtml(s.id)}">
      <td>${i + 1}</td>
      <td><strong>${escHtml(s.nama)}</strong></td>
      <td>${escHtml(s.nis)}</td>
      <td>
        <span class="badge badge-${(s.jenjang || '').toLowerCase().replace('mts','mts')}">${escHtml(s.jenjang)}</span>
      </td>
      <td>${escHtml(s.kelas)}</td>
      <td>${escHtml(s.waliKelas || '-')}</td>
      <td>${escHtml(s.namaWali || '-')}</td>
      <td>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <button class="btn btn-outline btn-sm" onclick="openEditSiswa('${escHtml(s.id)}')">✏️ Edit</button>
          <button class="btn btn-danger btn-sm" onclick="confirmDeleteSiswa('${escHtml(s.id)}', '${escHtml(s.nama)}')">🗑️</button>
          <button class="btn btn-gold btn-sm" onclick="previewRaportSiswa('${escHtml(s.id)}')">📄 Raport</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function openAddSiswa() {
  _editingSiswaId = null;
  document.getElementById('modal-siswa-title').textContent = 'Tambah Siswa Baru';
  document.getElementById('form-siswa').reset();
  populateKelasOptions('siswa-kelas-select', '');
  Modal.open('modal-siswa');
}

async function openEditSiswa(id) {
  const s = State.siswa.find(x => x.id === id);
  if (!s) return Toast.error('Data siswa tidak ditemukan');

  _editingSiswaId = id;
  document.getElementById('modal-siswa-title').textContent = 'Edit Data Siswa';

  const f = document.getElementById('form-siswa');
  f['siswa-nama'].value     = s.nama     || '';
  f['siswa-nis'].value      = s.nis      || '';
  f['siswa-jenjang'].value  = s.jenjang  || 'MI';
  populateKelasOptions('siswa-kelas-select', s.jenjang || 'MI');
  f['siswa-kelas-select'].value  = s.kelas     || '';
  f['siswa-alamat'].value   = s.alamat   || '';
  f['siswa-wali'].value     = s.namaWali || '';
  f['siswa-wali-kelas'].value = s.waliKelas || '';
  f['siswa-tl'].value       = s.tempatLahir || '';
  f['siswa-ttl'].value      = s.tanggalLahir || '';
  f['siswa-jk'].value       = s.jenisKelamin || 'L';

  Modal.open('modal-siswa');
}

function populateKelasOptions(selectId, jenjang) {
  const sel = document.getElementById(selectId);
  if (!sel) return;

  const kelasByJenjang = {
    MI:  ['1', '2', '3', '4', '5', '6'],
    MTs: ['7', '8', '9'],
    MA:  ['10', '11', '12'],
  };

  const opts = kelasByJenjang[jenjang] || ['1', '2', '3', '4', '5', '6'];
  // Custom kelas from state
  const customKelas = State.kelas.filter(k => k.jenjang === jenjang).map(k => k.nama);
  const all = [...new Set([...opts, ...customKelas])];

  sel.innerHTML = `<option value="">-- Pilih Kelas --</option>` +
    all.map(k => `<option value="${escHtml(k)}">${escHtml(k)}</option>`).join('');
}

async function saveSiswa(e) {
  e.preventDefault();
  const f = document.getElementById('form-siswa');
  const data = {
    id:            _editingSiswaId || genId(),
    nama:          f['siswa-nama'].value.trim(),
    nis:           f['siswa-nis'].value.trim(),
    jenjang:       f['siswa-jenjang'].value,
    kelas:         f['siswa-kelas-select'].value,
    alamat:        f['siswa-alamat'].value.trim(),
    namaWali:      f['siswa-wali'].value.trim(),
    waliKelas:     f['siswa-wali-kelas'].value.trim(),
    tempatLahir:   f['siswa-tl'].value.trim(),
    tanggalLahir:  f['siswa-ttl'].value,
    jenisKelamin:  f['siswa-jk'].value,
    createdAt:     _editingSiswaId ? undefined : new Date().toISOString(),
    updatedAt:     new Date().toISOString(),
  };

  if (!data.nama || !data.nis || !data.jenjang || !data.kelas) {
    return Toast.warning('Mohon lengkapi data wajib: Nama, NIS, Jenjang, dan Kelas');
  }

  const btn = f.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Menyimpan...';

  try {
    await DataService.Siswa.save(data);
    Toast.success(`Data siswa "${data.nama}" berhasil disimpan`);
    Modal.close('modal-siswa');
    await renderSiswa();
  } catch (err) {
    Toast.error('Gagal menyimpan: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '💾 Simpan';
  }
}

async function confirmDeleteSiswa(id, nama) {
  if (!confirm(`Hapus data siswa "${nama}"? Data nilai terkait tidak akan terhapus secara otomatis.`)) return;
  try {
    await DataService.Siswa.delete(id);
    Toast.success(`Data siswa "${nama}" berhasil dihapus`);
    await renderSiswa();
  } catch (e) {
    Toast.error('Gagal menghapus: ' + e.message);
  }
}

/* ============================================================
 * ─── MATA PELAJARAN PAGE ───────────────────────────────────
 * ============================================================ */
let _activeMapelJenjang = 'MI';

async function renderMapel() {
  try {
    const res = await DataService.Mapel.getAll();
    State.mapel = res.data || [];

    // If no mapel data yet, seed with defaults
    if (State.mapel.length === 0) {
      await seedDefaultMapel();
      const res2 = await DataService.Mapel.getAll();
      State.mapel = res2.data || [];
    }

    renderMapelForJenjang(_activeMapelJenjang);
    await loadGuruForMapel();
  } catch (e) {
    Toast.error('Gagal memuat mata pelajaran: ' + e.message);
  }
}

async function seedDefaultMapel() {
  const items = [];
  for (const [jenjang, mapelList] of Object.entries(DEFAULT_MAPEL)) {
    mapelList.forEach((nama, idx) => {
      items.push({ id: genId(), jenjang, nama, urutan: idx + 1, guru: '', kkm: 70 });
    });
  }
  await DataService.Mapel.saveAll(items);
}

function renderMapelForJenjang(jenjang) {
  _activeMapelJenjang = jenjang;

  // Update tab buttons
  document.querySelectorAll('.mapel-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.jenjang === jenjang);
  });

  const filtered = State.mapel.filter(m => m.jenjang === jenjang)
    .sort((a, b) => (a.urutan || 0) - (b.urutan || 0));

  const tbody = document.getElementById('mapel-tbody');

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--gray-500)">
      Belum ada mata pelajaran untuk jenjang ${jenjang}
    </td></tr>`;
    return;
  }

  const guruOptions = State.guru.map(g =>
    `<option value="${escHtml(g.nama)}">${escHtml(g.nama)}</option>`
  ).join('');

  tbody.innerHTML = filtered.map((m, i) => `
    <tr data-mapel-id="${escHtml(m.id)}">
      <td>${i + 1}</td>
      <td>
        <input type="text" class="mapel-nama-input" value="${escHtml(m.nama)}"
          onchange="updateMapelField('${escHtml(m.id)}', 'nama', this.value)"
          style="border:none;background:transparent;width:100%;font-weight:600;color:var(--gray-900)" />
      </td>
      <td>
        <select class="mapel-guru-select"
          onchange="updateMapelField('${escHtml(m.id)}', 'guru', this.value)"
          style="border:1px solid var(--gray-300);width:100%">
          <option value="">-- Pilih Guru --</option>
          ${guruOptions}
        </select>
      </td>
      <td>
        <input type="number" min="0" max="100" value="${escHtml(m.kkm ?? 70)}"
          onchange="updateMapelField('${escHtml(m.id)}', 'kkm', parseInt(this.value))"
          class="kkm-input" />
      </td>
      <td>
        <button class="btn btn-danger btn-sm btn-icon" title="Hapus" onclick="deleteMapel('${escHtml(m.id)}')">🗑️</button>
      </td>
    </tr>
  `).join('');

  // Set selected guru
  filtered.forEach(m => {
    const row = tbody.querySelector(`[data-mapel-id="${m.id}"]`);
    if (row && m.guru) {
      const sel = row.querySelector('.mapel-guru-select');
      if (sel) sel.value = m.guru;
    }
  });
}

async function loadGuruForMapel() {
  try {
    const res = await DataService.Guru.getAll();
    State.guru = res.data || [];
    renderMapelForJenjang(_activeMapelJenjang);
  } catch {}
}

function updateMapelField(id, field, value) {
  const m = State.mapel.find(x => x.id === id);
  if (m) m[field] = value;
}

async function saveMapelAll() {
  const btn = document.getElementById('btn-save-mapel');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Menyimpan...';

  try {
    await DataService.Mapel.saveAll(State.mapel);
    Toast.success('Konfigurasi mata pelajaran berhasil disimpan');
  } catch (e) {
    Toast.error('Gagal menyimpan: ' + e.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '💾 Simpan Semua';
  }
}

async function addMapel() {
  const namaInput = document.getElementById('new-mapel-nama');
  const nama = namaInput.value.trim();
  if (!nama) return Toast.warning('Nama mata pelajaran tidak boleh kosong');

  const existing = State.mapel.filter(m => m.jenjang === _activeMapelJenjang);
  const newMapel = {
    id:      genId(),
    jenjang: _activeMapelJenjang,
    nama,
    urutan:  existing.length + 1,
    guru:    '',
    kkm:     70,
  };

  State.mapel.push(newMapel);
  namaInput.value = '';
  renderMapelForJenjang(_activeMapelJenjang);
  Toast.info(`Mata pelajaran "${nama}" ditambahkan (belum disimpan)`);
}

async function deleteMapel(id) {
  const m = State.mapel.find(x => x.id === id);
  if (!m) return;
  if (!confirm(`Hapus mata pelajaran "${m.nama}"?`)) return;

  State.mapel = State.mapel.filter(x => x.id !== id);
  renderMapelForJenjang(_activeMapelJenjang);
  Toast.info(`Mata pelajaran "${m.nama}" dihapus (belum disimpan)`);
}

/* ============================================================
 * ─── DATA GURU PAGE ────────────────────────────────────────
 * ============================================================ */
let _editingGuruId = null;

async function renderGuru() {
  try {
    const res = await DataService.Guru.getAll();
    State.guru = res.data || [];
    renderGuruTable(State.guru);
  } catch (e) {
    Toast.error('Gagal memuat data guru: ' + e.message);
  }
}

function renderGuruTable(list) {
  const tbody = document.getElementById('guru-tbody');

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--gray-500)">
      Belum ada data guru. Klik "+ Tambah Guru" untuk menambahkan.
    </td></tr>`;
    return;
  }

  tbody.innerHTML = list.map((g, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><strong>${escHtml(g.nama)}</strong></td>
      <td>${escHtml(g.nip || '-')}</td>
      <td>${escHtml(g.mapelAmpu || '-')}</td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn btn-outline btn-sm" onclick="openEditGuru('${escHtml(g.id)}')">✏️ Edit</button>
          <button class="btn btn-danger btn-sm" onclick="confirmDeleteGuru('${escHtml(g.id)}', '${escHtml(g.nama)}')">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function openAddGuru() {
  _editingGuruId = null;
  document.getElementById('modal-guru-title').textContent = 'Tambah Guru Baru';
  document.getElementById('form-guru').reset();
  Modal.open('modal-guru');
}

function openEditGuru(id) {
  const g = State.guru.find(x => x.id === id);
  if (!g) return Toast.error('Data guru tidak ditemukan');

  _editingGuruId = id;
  document.getElementById('modal-guru-title').textContent = 'Edit Data Guru';

  const f = document.getElementById('form-guru');
  f['guru-nama'].value      = g.nama      || '';
  f['guru-nip'].value       = g.nip       || '';
  f['guru-mapel'].value     = g.mapelAmpu || '';
  f['guru-telp'].value      = g.telepon   || '';
  f['guru-alamat'].value    = g.alamat    || '';

  Modal.open('modal-guru');
}

async function saveGuru(e) {
  e.preventDefault();
  const f = document.getElementById('form-guru');
  const data = {
    id:         _editingGuruId || genId(),
    nama:       f['guru-nama'].value.trim(),
    nip:        f['guru-nip'].value.trim(),
    mapelAmpu:  f['guru-mapel'].value.trim(),
    telepon:    f['guru-telp'].value.trim(),
    alamat:     f['guru-alamat'].value.trim(),
  };

  if (!data.nama) return Toast.warning('Nama guru tidak boleh kosong');

  const btn = f.querySelector('button[type="submit"]');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Menyimpan...';

  try {
    await DataService.Guru.save(data);
    Toast.success(`Data guru "${data.nama}" berhasil disimpan`);
    Modal.close('modal-guru');
    await renderGuru();
  } catch (err) {
    Toast.error('Gagal menyimpan: ' + err.message);
  } finally {
    btn.disabled = false; btn.innerHTML = '💾 Simpan';
  }
}

async function confirmDeleteGuru(id, nama) {
  if (!confirm(`Hapus data guru "${nama}"?`)) return;
  try {
    await DataService.Guru.delete(id);
    Toast.success(`Data guru "${nama}" berhasil dihapus`);
    await renderGuru();
  } catch (e) {
    Toast.error('Gagal menghapus: ' + e.message);
  }
}

/* ============================================================
 * ─── INPUT NILAI PAGE ──────────────────────────────────────
 * ============================================================ */
let _nilaiData = {}; // Keyed by mapelId => { nilai, catatan, absen }
let _currentNilaiSiswaId = null;

async function renderNilaiControls() {
  // Populate jenjang select
  const jenjangSel = document.getElementById('nilai-jenjang-sel');
  jenjangSel.value = State.filterNilai.jenjang;

  // Populate semester
  document.getElementById('nilai-semester-sel').value = State.filterNilai.semester;

  // Populate tahun ajaran
  const ta = State.filterNilai.tahunAjaran || State.settings.tahunAjaran || currentTahunAjaran();
  document.getElementById('nilai-ta-sel').value = ta;

  // Populate kelas based on jenjang
  updateNilaiKelasOptions();
}

function updateNilaiKelasOptions() {
  const jenjang = document.getElementById('nilai-jenjang-sel').value;
  const kelasByJenjang = {
    MI:  ['1', '2', '3', '4', '5', '6'],
    MTs: ['7', '8', '9'],
    MA:  ['10', '11', '12'],
  };
  const kelasSel = document.getElementById('nilai-kelas-sel');
  const opts = kelasByJenjang[jenjang] || [];
  kelasSel.innerHTML = `<option value="">-- Pilih Kelas --</option>` +
    opts.map(k => `<option value="${k}">${k}</option>`).join('');

  // Also show custom kelas
  State.kelas.filter(k => k.jenjang === jenjang).forEach(k => {
    const opt = document.createElement('option');
    opt.value = opt.textContent = k.nama;
    kelasSel.appendChild(opt);
  });
}

async function loadNilaiSiswaList() {
  const jenjang  = document.getElementById('nilai-jenjang-sel').value;
  const kelas    = document.getElementById('nilai-kelas-sel').value;

  if (!jenjang || !kelas) {
    return Toast.warning('Pilih jenjang dan kelas terlebih dahulu');
  }

  State.filterNilai.jenjang  = jenjang;
  State.filterNilai.kelas    = kelas;
  State.filterNilai.semester = document.getElementById('nilai-semester-sel').value;
  State.filterNilai.tahunAjaran = document.getElementById('nilai-ta-sel').value;

  try {
    // Load students for this class
    const siswaRes = await DataService.Siswa.getAll();
    State.siswa = siswaRes.data || [];

    const siswaKelas = State.siswa.filter(s =>
      s.jenjang === jenjang && s.kelas === kelas
    );

    renderNilaiSiswaList(siswaKelas);
  } catch (e) {
    Toast.error('Gagal memuat data: ' + e.message);
  }
}

function renderNilaiSiswaList(list) {
  const container = document.getElementById('nilai-siswa-list');
  const panel = document.getElementById('nilai-input-panel');
  panel.style.display = 'none';

  if (!list.length) {
    container.innerHTML = `<div class="empty-state">
      <div class="empty-icon">👨‍🎓</div>
      <h3>Tidak ada siswa</h3>
      <p>Tidak ada siswa di kelas ini. Tambahkan siswa terlebih dahulu.</p>
    </div>`;
    return;
  }

  container.innerHTML = `
    <p style="font-size:0.85rem;color:var(--gray-700);margin-bottom:12px">
      Ditemukan <strong>${list.length}</strong> siswa di kelas ${State.filterNilai.kelas} ${State.filterNilai.jenjang}.
      Klik nama siswa untuk mengisi nilai.
    </p>
    <div class="table-wrapper">
      <table>
        <thead><tr>
          <th>No</th><th>Nama Siswa</th><th>NIS</th><th>Status Nilai</th><th>Aksi</th>
        </tr></thead>
        <tbody>
          ${list.map((s, i) => `
            <tr>
              <td>${i + 1}</td>
              <td><strong>${escHtml(s.nama)}</strong></td>
              <td>${escHtml(s.nis)}</td>
              <td id="nilai-status-${escHtml(s.id)}">
                <span style="color:var(--gray-500);font-size:0.82rem">Belum diisi</span>
              </td>
              <td>
                <button class="btn btn-primary btn-sm" onclick="openNilaiInput('${escHtml(s.id)}')">
                  ✏️ Isi Nilai
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

async function openNilaiInput(siswaId) {
  _currentNilaiSiswaId = siswaId;
  const siswa = State.siswa.find(s => s.id === siswaId);
  if (!siswa) return Toast.error('Data siswa tidak ditemukan');

  // Load mapel for this jenjang
  const mapelRes = await DataService.Mapel.getAll();
  State.mapel = mapelRes.data || [];
  const mapelList = State.mapel
    .filter(m => m.jenjang === State.filterNilai.jenjang)
    .sort((a, b) => (a.urutan || 0) - (b.urutan || 0));

  if (!mapelList.length) {
    return Toast.warning('Belum ada mata pelajaran untuk jenjang ini. Atur di menu Mata Pelajaran.');
  }

  // Load existing nilai for this student
  let existingNilai = {};
  try {
    const nilaiRes = await DataService.Nilai.getBySiswa(siswaId);
    const nilaiArr = nilaiRes.data || [];
    const semester = State.filterNilai.semester;
    const ta       = State.filterNilai.tahunAjaran;
    nilaiArr
      .filter(n => n.semester === semester && n.tahunAjaran === ta)
      .forEach(n => { existingNilai[n.mapelId] = n; });
  } catch {}

  _nilaiData = { ...existingNilai };

  // Render the input panel
  const panel = document.getElementById('nilai-input-panel');
  panel.style.display = 'block';

  document.getElementById('nilai-siswa-name').textContent = siswa.nama;
  document.getElementById('nilai-siswa-nis').textContent  = siswa.nis;

  renderNilaiTable(mapelList, existingNilai);
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderNilaiTable(mapelList, existing) {
  const tbody = document.getElementById('nilai-tbody');

  tbody.innerHTML = mapelList.map((m, i) => {
    const n = existing[m.id] || {};
    const nilai = n.nilai ?? '';
    const { predikat, label } = getPredikat(nilai);
    const kkm = m.kkm ?? 70;
    const belowKkm = nilai !== '' && parseFloat(nilai) < kkm;

    return `
      <tr data-mapel-id="${escHtml(m.id)}" ${belowKkm ? 'class="below-kkm-row"' : ''}>
        <td class="no-col">${i + 1}</td>
        <td><strong>${escHtml(m.nama)}</strong></td>
        <td>${escHtml(m.guru || '-')}</td>
        <td class="kkm-col">${escHtml(kkm)}</td>
        <td>
          <input type="number" min="0" max="100" step="0.5"
            class="nilai-input" value="${escHtml(nilai)}"
            placeholder="0-100"
            onchange="onNilaiChange('${escHtml(m.id)}', this.value, ${escHtml(kkm)})"
            oninput="onNilaiChange('${escHtml(m.id)}', this.value, ${escHtml(kkm)})" />
        </td>
        <td class="huruf-col" id="huruf-${escHtml(m.id)}">${nilai !== '' ? nilaiToHuruf(parseFloat(nilai)) : '-'}</td>
        <td class="pred-col predikat-cell pred-${(predikat || 'x').toLowerCase()}"
          id="pred-${escHtml(m.id)}">${predikat !== '-' ? predikat + ' (' + label + ')' : '-'}</td>
      </tr>
    `;
  }).join('');

  // Average row
  const vals = mapelList
    .map(m => _nilaiData[m.id]?.nilai)
    .filter(v => v !== undefined && v !== '');
  const rataRata = vals.length ? (vals.reduce((a, b) => a + parseFloat(b), 0) / vals.length).toFixed(2) : '-';

  tbody.innerHTML += `
    <tr class="avg-row">
      <td colspan="4" style="text-align:right;font-weight:700">Rata-rata Nilai:</td>
      <td class="angka-col" id="avg-nilai" colspan="3" style="font-weight:800;font-size:1rem">
        ${rataRata}
      </td>
    </tr>
  `;
}

function onNilaiChange(mapelId, value, kkm) {
  const n = parseFloat(value);
  const { predikat, label } = getPredikat(n);

  // Update state
  if (!_nilaiData[mapelId]) _nilaiData[mapelId] = {};
  _nilaiData[mapelId].nilai = value === '' ? '' : n;
  _nilaiData[mapelId].mapelId = mapelId;

  // Update huruf
  const hurufEl = document.getElementById(`huruf-${mapelId}`);
  if (hurufEl) hurufEl.textContent = value !== '' ? nilaiToHuruf(n) : '-';

  // Update predikat
  const predEl = document.getElementById(`pred-${mapelId}`);
  if (predEl) {
    predEl.className = `pred-col predikat-cell pred-${(predikat || 'x').toLowerCase()}`;
    predEl.textContent = predikat !== '-' ? `${predikat} (${label})` : '-';
  }

  // Update below kkm highlight
  const row = document.querySelector(`tr[data-mapel-id="${mapelId}"]`);
  if (row) {
    row.classList.toggle('below-kkm-row', value !== '' && n < kkm);
  }

  // Recalculate average
  const allVals = Object.values(_nilaiData)
    .map(d => d.nilai)
    .filter(v => v !== '' && v !== undefined && !isNaN(v));
  const avgEl = document.getElementById('avg-nilai');
  if (avgEl) {
    avgEl.textContent = allVals.length
      ? (allVals.reduce((a, b) => a + parseFloat(b), 0) / allVals.length).toFixed(2)
      : '-';
  }
}

async function saveNilai() {
  const siswaId  = _currentNilaiSiswaId;
  const semester = State.filterNilai.semester;
  const ta       = State.filterNilai.tahunAjaran;
  const jenjang  = State.filterNilai.jenjang;
  const kelas    = State.filterNilai.kelas;

  const mapelList = State.mapel.filter(m => m.jenjang === jenjang);
  const dataArray = mapelList.map(m => ({
    id:           _nilaiData[m.id]?.id || genId(),
    siswaId,
    mapelId:      m.id,
    mapelNama:    m.nama,
    guru:         m.guru || '',
    nilai:        _nilaiData[m.id]?.nilai ?? '',
    jenjang,
    kelas,
    semester,
    tahunAjaran:  ta,
    updatedAt:    new Date().toISOString(),
  })).filter(n => n.nilai !== '');

  // Save absensi too
  const absen = {
    id:          `abs_${siswaId}_${semester}_${ta}`,
    siswaId,
    jenis:       'absensi',
    hadir:       parseInt(document.getElementById('absen-hadir')?.value || 0),
    sakit:       parseInt(document.getElementById('absen-sakit')?.value || 0),
    izin:        parseInt(document.getElementById('absen-izin')?.value  || 0),
    alpa:        parseInt(document.getElementById('absen-alpa')?.value  || 0),
    semester,
    tahunAjaran: ta,
    kelas,
    jenjang,
    catatan:     document.getElementById('catatan-wali-kelas')?.value || '',
  };

  // Persist absensi to localStorage always (for fast access)
  const absenKey = `absen_${siswaId}_${semester}_${ta}`;
  localStorage.setItem(absenKey, JSON.stringify(absen));

  const btn = document.getElementById('btn-save-nilai');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Menyimpan...';

  try {
    await DataService.Nilai.saveMany(dataArray);
    Toast.success('Nilai berhasil disimpan');

    // Update status in list
    const statusEl = document.getElementById(`nilai-status-${siswaId}`);
    if (statusEl) {
      statusEl.innerHTML = `<span style="color:var(--green-ok);font-size:0.82rem">✅ Sudah diisi (${dataArray.length} mapel)</span>`;
    }

    // Close panel
    document.getElementById('nilai-input-panel').style.display = 'none';
    _currentNilaiSiswaId = null;
  } catch (e) {
    Toast.error('Gagal menyimpan nilai: ' + e.message);
  } finally {
    btn.disabled = false; btn.innerHTML = '💾 Simpan Nilai';
  }
}

/* ============================================================
 * ─── KEPALA MADRASAH PAGE ──────────────────────────────────
 * ============================================================ */
async function renderKepala() {
  try {
    const res = await DataService.Kepala.get();
    State.kepala = res.data || {};

    const f = document.getElementById('form-kepala');
    f['kepala-nama'].value   = State.kepala.nama   || '';
    f['kepala-nip'].value    = State.kepala.nip    || '';
    f['kepala-jabatan'].value = State.kepala.jabatan || 'Kepala Madrasah';

    // Signature preview
    if (State.kepala.ttdUrl) {
      document.getElementById('kepala-ttd-preview').innerHTML =
        `<img src="${escHtml(State.kepala.ttdUrl)}" alt="TTD" class="sig-image-preview" style="max-width:200px;max-height:120px" />`;
    }
  } catch (e) {
    Toast.error('Gagal memuat data kepala madrasah: ' + e.message);
  }
}

async function saveKepala(e) {
  e.preventDefault();
  const f = document.getElementById('form-kepala');

  const data = {
    nama:    f['kepala-nama'].value.trim(),
    nip:     f['kepala-nip'].value.trim(),
    jabatan: f['kepala-jabatan'].value.trim() || 'Kepala Madrasah',
    ttdUrl:  State.kepala?.ttdUrl || '',
  };

  if (!data.nama) return Toast.warning('Nama Kepala Madrasah tidak boleh kosong');

  const btn = f.querySelector('button[type="submit"]');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Menyimpan...';

  try {
    await DataService.Kepala.save(data);
    State.kepala = data;
    Toast.success('Data Kepala Madrasah berhasil disimpan');
  } catch (err) {
    Toast.error('Gagal menyimpan: ' + err.message);
  } finally {
    btn.disabled = false; btn.innerHTML = '💾 Simpan Data';
  }
}

function handleTtdUpload(input) {
  const file = input.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) return Toast.error('File harus berupa gambar');
  if (file.size > 2 * 1024 * 1024) return Toast.error('Ukuran file maksimal 2MB');

  const reader = new FileReader();
  reader.onload = e => {
    const dataUrl = e.target.result;
    if (!State.kepala) State.kepala = {};
    State.kepala.ttdUrl = dataUrl;

    document.getElementById('kepala-ttd-preview').innerHTML =
      `<img src="${escHtml(dataUrl)}" alt="TTD" style="max-width:200px;max-height:120px;object-fit:contain" />`;
    Toast.info('Tanda tangan berhasil diunggah. Simpan data untuk menyimpan perubahan.');
  };
  reader.readAsDataURL(file);
}

/* ============================================================
 * ─── CETAK RAPORT PAGE ─────────────────────────────────────
 * ============================================================ */
async function renderCetak() {
  try {
    const res = await DataService.Siswa.getAll();
    State.siswa = res.data || [];
    populateCetakSiswaOptions();
  } catch (e) {
    Toast.error('Gagal memuat data: ' + e.message);
  }
}

function populateCetakSiswaOptions() {
  const jenjang  = document.getElementById('cetak-jenjang-sel').value;
  const kelas    = document.getElementById('cetak-kelas-sel').value;

  let list = State.siswa;
  if (jenjang) list = list.filter(s => s.jenjang === jenjang);
  if (kelas)   list = list.filter(s => s.kelas === kelas);

  const sel = document.getElementById('cetak-siswa-sel');
  sel.innerHTML = `<option value="">-- Pilih Siswa --</option>` +
    list.map(s =>
      `<option value="${escHtml(s.id)}">${escHtml(s.nama)} (${escHtml(s.nis)}) - Kelas ${escHtml(s.kelas)}</option>`
    ).join('');
}

function updateCetakKelasOptions() {
  const jenjang = document.getElementById('cetak-jenjang-sel').value;
  const kelasByJenjang = {
    MI:  ['1','2','3','4','5','6'],
    MTs: ['7','8','9'],
    MA:  ['10','11','12'],
  };
  const kelasSel = document.getElementById('cetak-kelas-sel');
  const opts = kelasByJenjang[jenjang] || [];
  kelasSel.innerHTML = `<option value="">-- Semua Kelas --</option>` +
    opts.map(k => `<option value="${k}">${k}</option>`).join('');
  populateCetakSiswaOptions();
}

async function previewRaportSiswa(siswaId) {
  // Navigate to cetak page and auto-select student
  navigate('cetak');
  setTimeout(async () => {
    const sel = document.getElementById('cetak-siswa-sel');
    if (sel) {
      sel.value = siswaId;
      await generateRaportPreview();
    }
  }, 300);
}

async function generateRaportPreview() {
  const siswaId  = document.getElementById('cetak-siswa-sel').value;
  const semester = document.getElementById('cetak-semester-sel').value;
  const ta       = document.getElementById('cetak-ta-sel').value || State.settings.tahunAjaran || currentTahunAjaran();

  if (!siswaId) return Toast.warning('Pilih siswa terlebih dahulu');

  const siswa = State.siswa.find(s => s.id === siswaId);
  if (!siswa) return Toast.error('Data siswa tidak ditemukan');

  const previewArea = document.getElementById('raport-preview-area');
  previewArea.innerHTML = `<div class="loading-overlay" style="position:relative;min-height:200px">
    <div class="spinner spinner-dark"></div>
  </div>`;

  try {
    // Load mapel
    const mapelRes = await DataService.Mapel.getAll();
    State.mapel = mapelRes.data || [];
    const mapelList = State.mapel
      .filter(m => m.jenjang === siswa.jenjang)
      .sort((a, b) => (a.urutan || 0) - (b.urutan || 0));

    // Load nilai
    const nilaiRes = await DataService.Nilai.getBySiswa(siswaId);
    const allNilai = nilaiRes.data || [];
    const nilaiMap = {};
    allNilai
      .filter(n => n.semester === semester && n.tahunAjaran === ta)
      .forEach(n => { nilaiMap[n.mapelId] = n; });

    // Load absensi from localStorage
    const absenKey = `absen_${siswaId}_${semester}_${ta}`;
    const absen = JSON.parse(localStorage.getItem(absenKey) || '{}');

    // Load kepala
    if (!State.kepala) {
      try {
        const kepRes = await DataService.Kepala.get();
        State.kepala = kepRes.data || {};
      } catch {}
    }

    // Generate raport HTML
    const html = buildRaportHTML(siswa, mapelList, nilaiMap, absen, semester, ta, State.kepala);
    previewArea.innerHTML = html;

  } catch (e) {
    previewArea.innerHTML = `<div class="empty-state"><div class="empty-icon">❌</div>
      <h3>Gagal memuat data raport</h3><p>${escHtml(e.message)}</p></div>`;
    Toast.error('Gagal generate raport: ' + e.message);
  }
}

function buildRaportHTML(siswa, mapelList, nilaiMap, absen, semester, ta, kepala) {
  const jenjangLabel = JENJANG[siswa.jenjang] || siswa.jenjang;

  // Tempat & tanggal cetak dari pengaturan, atau fallback ke default
  const tempatCetak = State.settings.tempatCetak || 'Surabaya';
  const rawTanggal  = State.settings.tanggalCetak; // 'yyyy-mm-dd' atau ''
  const tanggalRaport = rawTanggal
    ? new Date(rawTanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : todayIndonesian();
  const lokasiTanggal = `${tempatCetak}, ${tanggalRaport}`;

  // Calculate values
  const nilaiArr = mapelList
    .map(m => nilaiMap[m.id]?.nilai)
    .filter(v => v !== undefined && v !== '' && !isNaN(v))
    .map(v => parseFloat(v));

  const rataRata = nilaiArr.length
    ? (nilaiArr.reduce((a, b) => a + b, 0) / nilaiArr.length).toFixed(2)
    : '-';

  // Build grades rows
  const gradesRows = mapelList.map((m, i) => {
    const n = nilaiMap[m.id];
    const nilai = n?.nilai ?? '';
    const { predikat, label } = getPredikat(nilai);
    const kkm = m.kkm ?? 70;
    const belowKkm = nilai !== '' && parseFloat(nilai) < kkm;
    const huruf = nilai !== '' ? nilaiToHuruf(parseFloat(nilai)) : '-';

    return `
      <tr ${belowKkm ? 'class="below-kkm"' : ''}>
        <td class="no-col">${i + 1}</td>
        <td class="mapel-col">${escHtml(m.nama)}</td>
        <td class="guru-col">${escHtml(m.guru || '-')}</td>
        <td class="kkm-col">${escHtml(kkm)}</td>
        <td class="angka-col" style="font-weight:700">${nilai !== '' ? escHtml(nilai) : '-'}</td>
        <td class="huruf-col">${escHtml(huruf)}</td>
        <td class="pred-col pred-${(predikat || 'x').toLowerCase()}">${predikat !== '-' ? escHtml(predikat) + ' - ' + escHtml(label) : '-'}</td>
      </tr>
    `;
  }).join('');

  // Kepala info
  const kepalaHtml = kepala?.ttdUrl
    ? `<div class="sig-block has-signature">
        <div class="sig-title">${lokasiTanggal}<br>${escHtml(kepala.jabatan || 'Kepala Madrasah')}</div>
        <img src="${escHtml(kepala.ttdUrl)}" class="sig-image" alt="TTD Kepala" />
        <div class="sig-name">${escHtml(kepala.nama || '')}</div>
        <div class="sig-nip">NIP. ${escHtml(kepala.nip || '-')}</div>
      </div>`
    : `<div class="sig-block">
        <div class="sig-title">${lokasiTanggal}<br>${escHtml(kepala?.jabatan || 'Kepala Madrasah')}</div>
        <div class="sig-name">${escHtml(kepala?.nama || '.........................')}</div>
        <div class="sig-nip">NIP. ${escHtml(kepala?.nip || '-')}</div>
      </div>`;

  return `
    <div class="raport-doc" id="raport-document">

      <!-- ── Header ── -->
      <div class="raport-header">
        <img src="${SCHOOL.logo}" alt="Logo" class="raport-logo"
          onerror="this.style.display='none'" />
        <div class="raport-school-info">
          <div class="yayasan">${escHtml(SCHOOL.foundation)}</div>
          <div class="madrasah-name">${escHtml(SCHOOL.name)}</div>
          <div class="jenjang-name">${escHtml(jenjangLabel)}</div>
          <div class="address-line">Alamat: ${escHtml(SCHOOL.address)}</div>
        </div>
      </div>

      <!-- ── Title ── -->
      <div class="raport-title-section">
        <h2>BUKU LAPORAN PENDIDIKAN (RAPORT)</h2>
        <p>Semester ${escHtml(semester)} &bull; Tahun Pelajaran ${escHtml(ta)}</p>
      </div>

      <!-- ── Identity ── -->
      <div class="student-identity">
        <h3>📋 Identitas Peserta Didik</h3>
        <div class="identity-grid">
          <div class="identity-row">
            <span class="identity-label">Nama Lengkap</span>
            <span class="identity-colon">:</span>
            <span class="identity-value">${escHtml(siswa.nama)}</span>
          </div>
          <div class="identity-row">
            <span class="identity-label">Kelas</span>
            <span class="identity-colon">:</span>
            <span class="identity-value">${escHtml(siswa.kelas)}</span>
          </div>
          <div class="identity-row">
            <span class="identity-label">NIS</span>
            <span class="identity-colon">:</span>
            <span class="identity-value">${escHtml(siswa.nis)}</span>
          </div>
          <div class="identity-row">
            <span class="identity-label">Jenjang</span>
            <span class="identity-colon">:</span>
            <span class="identity-value">${escHtml(jenjangLabel)}</span>
          </div>
          <div class="identity-row">
            <span class="identity-label">Tempat/Tgl Lahir</span>
            <span class="identity-colon">:</span>
            <span class="identity-value">${escHtml(siswa.tempatLahir || '-')} / ${escHtml(formatDate(siswa.tanggalLahir) || '-')}</span>
          </div>
          <div class="identity-row">
            <span class="identity-label">Wali Kelas</span>
            <span class="identity-colon">:</span>
            <span class="identity-value">${escHtml(siswa.waliKelas || '-')}</span>
          </div>
          <div class="identity-row">
            <span class="identity-label">Nama Orang Tua/Wali</span>
            <span class="identity-colon">:</span>
            <span class="identity-value">${escHtml(siswa.namaWali || '-')}</span>
          </div>
          <div class="identity-row">
            <span class="identity-label">Alamat</span>
            <span class="identity-colon">:</span>
            <span class="identity-value">${escHtml(siswa.alamat || '-')}</span>
          </div>
        </div>
      </div>

      <!-- ── Grades Table ── -->
      <div class="grades-section">
        <h3>📊 Hasil Belajar</h3>
        <table class="grades-table">
          <thead>
            <tr>
              <th class="no-col">No</th>
              <th class="mapel-col">Mata Pelajaran</th>
              <th class="guru-col">Guru Pengampu</th>
              <th class="kkm-col">KKM</th>
              <th class="angka-col">Nilai Angka</th>
              <th class="huruf-col">Nilai Huruf</th>
              <th class="pred-col">Predikat</th>
            </tr>
          </thead>
          <tbody>
            ${gradesRows}
            <tr class="avg-row">
              <td colspan="4" style="text-align:right">Rata-rata Keseluruhan</td>
              <td class="angka-col">${escHtml(rataRata)}</td>
              <td colspan="2"></td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- ── Attendance ── -->
      <div class="attendance-section">
        <h3>📅 Rekapitulasi Kehadiran</h3>
        <div class="attendance-grid">
          <div class="att-item">
            <span class="att-label">Hadir</span>
            <span class="att-value">${escHtml(absen.hadir ?? 0)}</span>
            <span class="att-unit">hari</span>
          </div>
          <div class="att-item">
            <span class="att-label">Sakit</span>
            <span class="att-value">${escHtml(absen.sakit ?? 0)}</span>
            <span class="att-unit">hari</span>
          </div>
          <div class="att-item">
            <span class="att-label">Izin</span>
            <span class="att-value">${escHtml(absen.izin ?? 0)}</span>
            <span class="att-unit">hari</span>
          </div>
          <div class="att-item">
            <span class="att-label">Alpa</span>
            <span class="att-value">${escHtml(absen.alpa ?? 0)}</span>
            <span class="att-unit">hari</span>
          </div>
        </div>
      </div>

      <!-- ── Teacher Notes ── -->
      <div class="notes-section">
        <h3>📝 Catatan Wali Kelas</h3>
        <div class="notes-content">${escHtml(absen.catatan || 'Anak ini menunjukkan perkembangan yang baik selama semester ini.')}</div>
      </div>

      <!-- ── Signatures ── -->
      <div class="signature-section">
        <!-- Wali Kelas -->
        <div class="sig-block">
          <div class="sig-title">${lokasiTanggal}<br>Wali Kelas</div>
          <div class="sig-name">${escHtml(siswa.waliKelas || '.........................')}</div>
          <div class="sig-nip">NIP. -</div>
        </div>

        <!-- Stempel -->
        <div style="text-align:center;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:4px">
          <div class="stamp-circle">STEMPEL<br>MADRASAH</div>
          <div style="font-size:7.5pt;color:#aaa;margin-top:4px">Cap Madrasah</div>
        </div>

        <!-- Kepala Madrasah -->
        ${kepalaHtml}
      </div>

      <!-- ── Footer ── -->
      <div class="raport-footer">
        Raport ini diterbitkan oleh ${escHtml(SCHOOL.name)} &bull;
        ${escHtml(SCHOOL.address)} &bull; Semester ${escHtml(semester)} T.A. ${escHtml(ta)}
      </div>

    </div>
  `;
}

function printRaport() {
  const doc = document.getElementById('raport-document');
  if (!doc) return Toast.warning('Preview raport belum tersedia. Generate terlebih dahulu.');

  // Put print area content in a printable container
  const printArea = document.getElementById('cetak-print-area');
  printArea.innerHTML = document.getElementById('raport-preview-area').innerHTML;

  window.print();

  // Cleanup after print dialog
  setTimeout(() => { printArea.innerHTML = ''; }, 1000);
}

/* ============================================================
 * ─── PENGATURAN PAGE ───────────────────────────────────────
 * ============================================================ */
function renderPengaturan() {
  const s = State.settings;

  const urlInput = document.getElementById('setting-sheets-url');
  if (urlInput) urlInput.value = s.sheetsUrl || SheetsAPI.getUrl() || '';

  const taInput = document.getElementById('setting-tahun-ajaran');
  if (taInput) taInput.value = s.tahunAjaran || currentTahunAjaran();

  const semInput = document.getElementById('setting-semester');
  if (semInput) semInput.value = s.semester || 'Ganjil';

  const tempatInput = document.getElementById('setting-tempat-cetak');
  if (tempatInput) tempatInput.value = s.tempatCetak || 'Surabaya';

  const tanggalInput = document.getElementById('setting-tanggal-cetak');
  if (tanggalInput) tanggalInput.value = s.tanggalCetak || '';

  updateConnectionStatus();
}

function updateConnectionStatus() {
  const statusEl = document.getElementById('sheets-connection-status');
  if (!statusEl) return;

  const url = SheetsAPI.getUrl();
  if (!url) {
    statusEl.className = 'sheets-status';
    statusEl.innerHTML = `<span class="dot"></span><span>Belum dikonfigurasi (Mode Lokal)</span>`;
  } else if (SheetsAPI.isConnected()) {
    statusEl.className = 'sheets-status connected';
    statusEl.innerHTML = `<span class="dot"></span><span>Terhubung ke Google Sheets</span>`;
  } else {
    statusEl.className = 'sheets-status error';
    statusEl.innerHTML = `<span class="dot"></span><span>Gagal terhubung: ${escHtml(SheetsAPI.getLastError() || 'Error')}</span>`;
  }

  // Update sidebar status too
  const sidebarStatus = document.getElementById('sidebar-sheets-status');
  if (sidebarStatus) {
    sidebarStatus.className = statusEl.className;
    sidebarStatus.innerHTML = statusEl.innerHTML;
  }
}

async function testSheetsConnection() {
  const url = document.getElementById('setting-sheets-url').value.trim();
  if (!url) return Toast.warning('Masukkan URL Google Apps Script terlebih dahulu');

  const btn = document.getElementById('btn-test-sheets');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Menguji...';

  const resultEl = document.getElementById('url-test-result');
  resultEl.className = 'url-test-result';
  resultEl.style.display = 'none';

  try {
    const result = await SheetsAPI.setUrl(url);
    if (result.ok) {
      resultEl.className = 'url-test-result success';
      resultEl.textContent = '✅ Berhasil terhubung ke Google Apps Script!';
      State.settings.sheetsUrl = url;
      saveSettings();
      await Auth.syncFromSheets();
      Toast.success('Koneksi Google Sheets berhasil!');
    } else {
      resultEl.className = 'url-test-result error';
      resultEl.textContent = '❌ Gagal: ' + result.error;
      Toast.error('Koneksi gagal: ' + result.error);
    }
    resultEl.style.display = 'block';
    updateConnectionStatus();
  } catch (e) {
    resultEl.className = 'url-test-result error';
    resultEl.textContent = '❌ Error: ' + e.message;
    resultEl.style.display = 'block';
    Toast.error('Error: ' + e.message);
  } finally {
    btn.disabled = false; btn.innerHTML = '🔗 Uji Koneksi';
  }
}

function savePengaturan() {
  const ta      = document.getElementById('setting-tahun-ajaran').value.trim();
  const sem     = document.getElementById('setting-semester').value;
  const tempat  = document.getElementById('setting-tempat-cetak').value.trim() || 'Surabaya';
  const tanggal = document.getElementById('setting-tanggal-cetak').value; // yyyy-mm-dd or ''

  State.settings.tahunAjaran  = ta;
  State.settings.semester     = sem;
  State.settings.tempatCetak  = tempat;
  State.settings.tanggalCetak = tanggal;
  saveSettings();

  // Update topbar display
  document.getElementById('topbar-semester').textContent = `Semester ${sem}`;
  document.getElementById('topbar-tahun').textContent    = `T.A. ${ta}`;

  // Sync filter defaults
  State.filterNilai.semester    = sem;
  State.filterNilai.tahunAjaran = ta;

  Toast.success('Pengaturan berhasil disimpan');
}

function exportData() {
  try {
    const json = LocalStore.exportAll();
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `raport-mdb-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    Toast.success('Data berhasil diekspor');
  } catch (e) {
    Toast.error('Gagal ekspor: ' + e.message);
  }
}

function importData(input) {
  const file = input.files[0];
  if (!file) return;
  if (!file.name.endsWith('.json')) return Toast.error('File harus berformat .json');

  const reader = new FileReader();
  reader.onload = e => {
    try {
      if (!confirm('Import akan MENGGANTI semua data lokal yang ada. Lanjutkan?')) return;
      LocalStore.importAll(e.target.result);
      Toast.success('Data berhasil diimpor. Silakan refresh halaman.');
    } catch (err) {
      Toast.error('Gagal impor: ' + err.message);
    }
  };
  reader.readAsText(file);
}

function resetSemuaData() {
  if (!confirm('⚠️ PERINGATAN!\n\nSeluruh data akan dihapus permanen:\n• Data Siswa\n• Nilai\n• Mata Pelajaran\n• Guru\n• Akun\n• Pengaturan\n\nApakah Anda YAKIN ingin mereset semua data?')) return;
  if (!confirm('🗑️ Konfirmasi terakhir!\n\nData TIDAK BISA dikembalikan setelah dihapus.\n\nLanjutkan reset?')) return;

  // Hapus semua key localStorage yang berhubungan dengan aplikasi
  const keys = Object.keys(localStorage).filter(k => k.startsWith('mdb_') || k.startsWith('absen_'));
  keys.forEach(k => localStorage.removeItem(k));
  sessionStorage.clear();

  Toast.success('Semua data berhasil dihapus. Halaman akan dimuat ulang...');
  setTimeout(() => location.reload(), 1500);
}


/* ============================================================
 * ─── AUTH MODULE ───────────────────────────────────────────
 * ============================================================ */
const Auth = {
  _currentUser: null,
  _ACCOUNTS_KEY: 'mdb_accounts',
  _SESSION_KEY:  'mdb_session',

  /** Simple hash (not cryptographic - basic protection) */
  _hash(str) {
    return btoa(unescape(encodeURIComponent(str + '_mdb_salt_2024')));
  },

  /** Get all accounts from LocalStorage */
  _getAccounts() {
    try {
      return JSON.parse(localStorage.getItem(this._ACCOUNTS_KEY) || '[]');
    } catch { return []; }
  },

  /** Save accounts to LocalStorage */
  _saveAccounts(accounts) {
    localStorage.setItem(this._ACCOUNTS_KEY, JSON.stringify(accounts));
  },

  /** Create default admin account if none exist */
  _initDefaultAdmin() {
    const accounts = this._getAccounts();
    const hasAdmin = accounts.some(a => a.role === 'admin');
    if (!hasAdmin) {
      accounts.push({
        id: 'admin',
        username: 'admin',
        namaGuru: 'Administrator',
        role: 'admin',
        passwordHash: this._hash('admin123'),
        aktif: true,
        createdAt: new Date().toISOString(),
      });
      this._saveAccounts(accounts);
    }
  },

  /** Initialize auth on app start */
  init() {
    this._initDefaultAdmin();

    // Sinkronkan akun dari Google Sheets jika sudah terhubung
    this.syncFromSheets().catch(() => {});

    // Check for saved session
    try {
      const session = sessionStorage.getItem(this._SESSION_KEY);
      if (session) {
        const user = JSON.parse(session);
        // Verify account still exists and is active
        const accounts = this._getAccounts();
        const found = accounts.find(a => a.id === user.id && a.aktif);
        if (found) {
          this._currentUser = found;
          this._showApp();
          return;
        }
      }
    } catch { /* ignore */ }

    // Show login screen
    this._showLogin();
  },

  /** Sinkronisasi akun dari Google Sheets ke cache lokal */
  async syncFromSheets() {
    if (typeof SheetsAPI !== 'undefined' && SheetsAPI.isConnected()) {
      try {
        const res = await DataService.Akun.getAll();
        if (res && Array.isArray(res.data) && res.data.length > 0) {
          this._saveAccounts(res.data);
          console.log('✅ Akun berhasil disinkronkan dari Google Sheets');
        }
      } catch (err) {
        console.warn('Sync akun dari Sheets gagal:', err);
      }
    }
  },

  /** Handle login form submit */
  login(e) {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const errEl    = document.getElementById('login-error');
    const btnText  = document.getElementById('btn-login-text');
    const btn      = document.getElementById('btn-login');

    errEl.style.display = 'none';
    btn.disabled = true;
    btnText.innerHTML = '<span class="spinner"></span> Memproses...';

    // Small delay for UX
    setTimeout(() => {
      try {
        const accounts = this._getAccounts();
        const account  = accounts.find(a => a.username === username);

        if (!account) {
          this._showLoginError('Username tidak ditemukan', errEl);
          btn.disabled = false;
          btnText.textContent = 'Masuk';
          return;
        }

        if (!account.aktif) {
          this._showLoginError('Akun tidak aktif. Hubungi administrator.', errEl);
          btn.disabled = false;
          btnText.textContent = 'Masuk';
          return;
        }

        if (account.passwordHash !== this._hash(password)) {
          this._showLoginError('Password salah. Coba lagi.', errEl);
          btn.disabled = false;
          btnText.textContent = 'Masuk';
          return;
        }

        // Success
        this._currentUser = account;
        sessionStorage.setItem(this._SESSION_KEY, JSON.stringify(account));
        this._showApp();
        Toast.success(`Selamat datang, ${account.namaGuru}! 👋`);

      } catch (err) {
        this._showLoginError('Terjadi kesalahan: ' + err.message, errEl);
        btn.disabled = false;
        btnText.textContent = 'Masuk';
      }
    }, 500);
  },

  /** Show login error */
  _showLoginError(msg, errEl) {
    errEl.innerHTML = `❌ ${escHtml(msg)}`;
    errEl.style.display = 'flex';
    // Shake animation
    const input = document.getElementById('login-password');
    input.style.borderColor = 'var(--red)';
    setTimeout(() => { input.style.borderColor = ''; }, 2000);
  },

  /** Logout */
  logout() {
    if (!confirm('Apakah Anda yakin ingin keluar?')) return;
    sessionStorage.removeItem(this._SESSION_KEY);
    this._currentUser = null;
    Modal.closeAll();
    this._showLogin();
    // Reset form
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    document.getElementById('login-error').style.display = 'none';
    document.getElementById('btn-login').disabled = false;
    document.getElementById('btn-login-text').textContent = 'Masuk';
  },

  /** Show the login screen */
  _showLogin() {
    const loginScreen = document.getElementById('login-screen');
    const app = document.getElementById('app');
    loginScreen.classList.remove('hidden');
    app.style.display = 'none';
  },

  /** Show the main app */
  _showApp() {
    const loginScreen = document.getElementById('login-screen');
    const app = document.getElementById('app');
    loginScreen.classList.add('hidden');
    app.style.display = 'flex';

    // Update topbar user info
    const u = this._currentUser;
    if (u) {
      const userEl   = document.getElementById('topbar-user');
      const nameEl   = document.getElementById('topbar-user-name');
      const roleEl   = document.getElementById('topbar-user-role');
      const avatarEl = document.getElementById('topbar-user-avatar');
      if (userEl) {
        userEl.style.display = 'flex';
        nameEl.textContent   = u.namaGuru || u.username;
        roleEl.textContent   = u.role === 'admin' ? 'Administrator' : 'Guru';
        avatarEl.textContent = (u.namaGuru || u.username).charAt(0).toUpperCase();
      }
    }

    // Apply role restrictions
    this.applyRoleRestrictions();
  },

  /** Apply UI restrictions based on role */
  applyRoleRestrictions() {
    const isAdmin = this.isAdmin();

    // Nav items only visible to admin
    const adminOnlyPages = ['siswa', 'mapel', 'guru', 'kepala', 'pengaturan', 'akun', 'dashboard'];
    const guruOnlyPages  = ['nilai', 'cetak'];

    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
      const page = item.dataset.page;
      if (isAdmin) {
        // Admin sees everything except 'akun' which has its own toggle
        item.style.display = '';
      } else {
        // Guru sees only nilai and cetak
        item.style.display = guruOnlyPages.includes(page) ? '' : 'none';
      }
    });

    // Akun Guru nav item only for admin
    const navAkun = document.getElementById('nav-akun');
    if (navAkun) navAkun.style.display = isAdmin ? '' : 'none';
  },

  /** Toggle password visibility */
  togglePassword() {
    const inp = document.getElementById('login-password');
    const btn = document.getElementById('btn-show-pass');
    if (inp.type === 'password') {
      inp.type = 'text';
      btn.textContent = '🙈';
    } else {
      inp.type = 'password';
      btn.textContent = '👁️';
    }
  },

  getUser()  { return this._currentUser; },
  isAdmin()  { return this._currentUser?.role === 'admin'; },
  isGuru()   { return this._currentUser?.role === 'guru'; },
};

/* ============================================================
 * ─── AKUN GURU PAGE ────────────────────────────────────────
 * ============================================================ */
let _editingAkunId = null;

async function renderAkun() {
  const tbody = document.getElementById('akun-tbody');
  if (!tbody) return;

  let accounts = [];

  // Jika terhubung ke Google Sheets, ambil data terbaru dari spreadsheet
  if (SheetsAPI.isConnected()) {
    try {
      const res = await DataService.Akun.getAll();
      if (res && Array.isArray(res.data) && res.data.length > 0) {
        accounts = res.data;
        // Sinkronkan ke cache lokal
        Auth._saveAccounts(accounts);
      }
    } catch (err) {
      console.warn('Gagal memuat akun dari Sheets, menggunakan data lokal:', err);
    }
  }

  if (!accounts || accounts.length === 0) {
    accounts = Auth._getAccounts();
  }

  if (!accounts.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--gray-500)">
      Belum ada akun. Klik "+ Tambah Akun" untuk menambahkan.
    </td></tr>`;
    return;
  }

  tbody.innerHTML = accounts.map((a, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><strong>${escHtml(a.username)}</strong></td>
      <td>${escHtml(a.namaGuru || '-')}</td>
      <td><span class="badge badge-${escHtml(a.role)}">${escHtml(a.role === 'admin' ? 'Admin' : 'Guru')}</span></td>
      <td><span class="badge badge-${a.aktif ? 'aktif' : 'nonaktif'}">${a.aktif ? 'Aktif' : 'Non-Aktif'}</span></td>
      <td>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          ${a.id !== 'admin' ? `<button class="btn btn-outline btn-sm" onclick="openEditAkun('${escHtml(a.id)}')">✏️ Edit</button>` : ''}
          ${a.id !== 'admin' ? `<button class="btn btn-danger btn-sm" onclick="deleteAkun('${escHtml(a.id)}', '${escHtml(a.username)}')">🗑️</button>` : ''}
          ${a.id === 'admin' ? `<span style="font-size:0.75rem;color:var(--gray-500)">Akun sistem</span>` : ''}
        </div>
      </td>
    </tr>
  `).join('');
}

async function openAddAkun() {
  if (!Auth.isAdmin()) return Toast.warning('Hanya admin yang dapat mengelola akun');
  _editingAkunId = null;

  const f = document.getElementById('form-akun');
  f.reset();
  document.getElementById('modal-akun-title').textContent = 'Tambah Akun Guru';
  document.getElementById('akun-password-group').style.display = '';
  document.getElementById('akun-konfirmasi-group').style.display = '';
  document.getElementById('akun-ganti-password-wrap').style.display = 'none';
  f['akun-username'].readOnly = false;

  // Isi saran nama guru ke datalist
  await _populateAkunGuruDropdown('');

  Modal.open('modal-akun');
}

async function openEditAkun(id) {
  if (!Auth.isAdmin()) return Toast.warning('Hanya admin yang dapat mengelola akun');
  const accounts = Auth._getAccounts();
  const a = accounts.find(x => x.id === id);
  if (!a) return Toast.error('Akun tidak ditemukan');

  _editingAkunId = id;
  document.getElementById('modal-akun-title').textContent = 'Edit Akun Guru';

  const f = document.getElementById('form-akun');
  f.reset();
  f['akun-username'].value  = a.username;
  f['akun-username'].readOnly = true; // Username tidak boleh diubah saat edit
  f['akun-nama-guru'].value = a.namaGuru || '';
  f['akun-role'].value      = a.role;
  f['akun-status'].value    = a.aktif ? 'aktif' : 'nonaktif';

  // Sembunyikan field password saat edit, tampilkan toggle ganti password
  document.getElementById('akun-password-group').style.display    = 'none';
  document.getElementById('akun-konfirmasi-group').style.display  = 'none';
  document.getElementById('akun-ganti-password-wrap').style.display = '';
  document.getElementById('akun-ganti-password').checked = false;

  await _populateAkunGuruDropdown(a.namaGuru);

  Modal.open('modal-akun');
}

async function _populateAkunGuruDropdown(selectedNama) {
  const datalist = document.getElementById('akun-guru-datalist');
  const input = document.getElementById('akun-nama-guru-input');
  if (input && selectedNama) input.value = selectedNama;
  if (!datalist) return;

  try {
    const res = await DataService.Guru.getAll();
    const guruList = res.data || [];
    datalist.innerHTML = guruList.map(g => `<option value="${escHtml(g.nama)}"></option>`).join('');
  } catch {
    datalist.innerHTML = '';
  }
}

function toggleGantiPassword(checked) {
  document.getElementById('akun-password-group').style.display   = checked ? '' : 'none';
  document.getElementById('akun-konfirmasi-group').style.display = checked ? '' : 'none';
}

async function saveAkun(e) {
  if (e && e.preventDefault) e.preventDefault();
  if (!Auth.isAdmin()) return Toast.warning('Hanya admin yang dapat mengelola akun');

  const f        = document.getElementById('form-akun');
  const username = f['akun-username'].value.trim();
  const namaGuru = f['akun-nama-guru'].value.trim() || username;
  const role     = f['akun-role'].value;
  const status   = f['akun-status'].value;
  const pass     = f['akun-password'].value;
  const konfirm  = f['akun-konfirmasi'].value;
  const btn      = document.getElementById('btn-save-akun');

  if (!username) return Toast.warning('Username wajib diisi');
  if (!namaGuru) return Toast.warning('Nama guru/pengguna wajib diisi');

  const accounts = Auth._getAccounts();
  const isGantiPassword = !_editingAkunId || document.getElementById('akun-ganti-password')?.checked;

  if (isGantiPassword) {
    if (!pass) return Toast.warning('Password wajib diisi');
    if (pass.length < 6) return Toast.warning('Password minimal 6 karakter');
    if (pass !== konfirm) return Toast.warning('Konfirmasi password tidak sesuai');
  }

  let targetAccount = null;

  if (!_editingAkunId) {
    // Akun baru - cek keunikan username
    if (accounts.find(a => a.username.toLowerCase() === username.toLowerCase())) {
      return Toast.warning(`Username "${username}" sudah digunakan`);
    }
    targetAccount = {
      id:           genId(),
      username,
      namaGuru:     namaGuru,
      role,
      passwordHash: Auth._hash(pass),
      aktif:        status === 'aktif',
      createdAt:    new Date().toISOString(),
      updatedAt:    new Date().toISOString(),
    };
    accounts.push(targetAccount);
  } else {
    const idx = accounts.findIndex(a => a.id === _editingAkunId);
    if (idx === -1) return Toast.error('Akun tidak ditemukan');
    accounts[idx].namaGuru  = namaGuru;
    accounts[idx].role      = role;
    accounts[idx].aktif     = (status === 'aktif');
    accounts[idx].updatedAt = new Date().toISOString();
    if (isGantiPassword && pass) {
      accounts[idx].passwordHash = Auth._hash(pass);
    }
    targetAccount = accounts[idx];
  }

  if (btn) { btn.disabled = true; btn.textContent = 'Menyimpan...'; }

  try {
    // Simpan ke penyimpanan lokal
    Auth._saveAccounts(accounts);

    // Jika terhubung ke Google Sheets, sinkronkan ke Spreadsheet
    if (SheetsAPI.isConnected()) {
      try {
        await DataService.Akun.save(targetAccount);
      } catch (sheetErr) {
        console.warn('Gagal sinkron akun ke Google Sheets:', sheetErr);
        Toast.warning('Akun tersimpan lokal, namun gagal sinkron ke Sheets: ' + sheetErr.message);
      }
    }

    Toast.success(`Akun "${username}" berhasil ${_editingAkunId ? 'diperbarui' : 'ditambahkan'}`);
    Modal.close('modal-akun');
    await renderAkun();
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '💾 Simpan'; }
  }
}

async function deleteAkun(id, username) {
  if (!Auth.isAdmin()) return Toast.warning('Hanya admin yang dapat mengelola akun');
  if (id === 'admin') return Toast.warning('Akun admin sistem tidak dapat dihapus');
  if (!confirm(`Hapus akun "${username}"? Tindakan ini tidak dapat dibatalkan.`)) return;

  const accounts = Auth._getAccounts().filter(a => a.id !== id);
  Auth._saveAccounts(accounts);

  if (SheetsAPI.isConnected()) {
    try {
      await DataService.Akun.delete(id);
    } catch (err) {
      console.warn('Gagal hapus akun di Google Sheets:', err);
    }
  }

  Toast.success(`Akun "${username}" berhasil dihapus`);
  await renderAkun();
}

/* ============================================================
 * ─── IMPORT EXCEL (SISWA) ──────────────────────────────────
 * ============================================================ */
let _importData = [];

/** Download template Excel kosong dengan contoh data */
function downloadTemplateSiswa() {
  if (typeof XLSX === 'undefined') {
    Toast.error('Library XLSX belum termuat. Coba refresh halaman.');
    return;
  }

  const ws_data = [
    ['No', 'Nama Lengkap', 'NISN', 'NIS', 'Tempat Lahir', 'Tanggal Lahir', 'Kelas', 'Jenjang'],
    [1, 'Ahmad Fauzan', '1234567890', '2024001', 'Surabaya', '15/06/2013', '5', 'MI'],
    [2, 'Siti Aisyah', '0987654321', '2024002', 'Gresik',   '22/09/2011', '7', 'MTs'],
    [3, 'Muhammad Rizki', '1122334455', '2024003', 'Sidoarjo','01/03/2009', '10', 'MA'],
  ];

  const ws = XLSX.utils.aoa_to_sheet(ws_data);

  // Set column widths
  ws['!cols'] = [
    { wch: 5 }, { wch: 30 }, { wch: 15 }, { wch: 12 },
    { wch: 20 }, { wch: 15 }, { wch: 8 }, { wch: 8 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data Siswa');
  XLSX.writeFile(wb, 'template_siswa_mdb.xlsx');
  Toast.success('Template Excel berhasil diunduh');
}

/** Open the Import Excel modal */
function openImportExcel() {
  _importData = [];
  // Reset modal state
  document.getElementById('excel-drop-area').classList.remove('drag-over');
  document.getElementById('excel-preview-wrap').style.display = 'none';
  document.getElementById('excel-error').style.display = 'none';
  document.getElementById('excel-preview-tbody').innerHTML = '';
  document.getElementById('btn-import-excel').disabled = true;

  // Reset file input
  const fileInput = document.getElementById('excel-file-input');
  if (fileInput) fileInput.value = '';

  Modal.open('modal-import-excel');
}

/** Handle drag-and-drop */
function handleExcelDrop(e) {
  e.preventDefault();
  document.getElementById('excel-drop-area').classList.remove('drag-over');
  const file = e.dataTransfer?.files?.[0];
  if (file) handleExcelFile(file);
}

/** Parse uploaded Excel file */
function handleExcelFile(file) {
  if (!file) return;

  const errEl = document.getElementById('excel-error');
  errEl.style.display = 'none';

  const validTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ];
  const isValidExt = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

  if (!isValidExt && !validTypes.includes(file.type)) {
    errEl.innerHTML = '❌ File harus berformat .xlsx atau .xls';
    errEl.style.display = 'flex';
    return;
  }

  if (typeof XLSX === 'undefined') {
    errEl.innerHTML = '❌ Library XLSX belum termuat. Coba refresh halaman.';
    errEl.style.display = 'flex';
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data  = new Uint8Array(e.target.result);
      const wb    = XLSX.read(data, { type: 'array', cellDates: true });
      const wsName = wb.SheetNames[0];
      const ws    = wb.Sheets[wsName];
      const rows  = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

      if (rows.length < 2) {
        throw new Error('File tidak memiliki data (minimal 2 baris: header + 1 data)');
      }

      // Validate headers (row 0)
      const headers = rows[0].map(h => String(h).trim().toLowerCase());
      const requiredCols = ['nama'];
      const hasRequired = requiredCols.every(col =>
        headers.some(h => h.includes(col))
      );
      if (!hasRequired) {
        throw new Error('Kolom "Nama Lengkap" tidak ditemukan. Pastikan baris pertama adalah header sesuai template.');
      }

      // Parse data rows (skip header row 0)
      const parsed = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        // Skip empty rows
        if (!row || row.every(cell => cell === '' || cell == null)) continue;

        // Map columns: A=No, B=Nama, C=NISN, D=NIS, E=Tempat, F=Tgl, G=Kelas, H=Jenjang
        const nama      = String(row[1] || '').trim();
        const nisn      = String(row[2] || '').trim();
        const nis       = String(row[3] || '').trim();
        const tempatLahir = String(row[4] || '').trim();
        const rawTgl    = row[5];
        const kelas     = String(row[6] || '').trim();
        const jenjang   = String(row[7] || '').trim().toUpperCase();

        if (!nama) continue; // Skip rows without name

        // Parse tanggal lahir
        let tanggalLahir = '';
        if (rawTgl instanceof Date) {
          tanggalLahir = rawTgl.toISOString().split('T')[0];
        } else if (rawTgl) {
          const str = String(rawTgl).trim();
          // Try dd/mm/yyyy
          const parts = str.split('/');
          if (parts.length === 3) {
            const d = parts[0].padStart(2, '0');
            const m = parts[1].padStart(2, '0');
            const y = parts[2];
            tanggalLahir = `${y}-${m}-${d}`;
          } else {
            tanggalLahir = str;
          }
        }

        // Validate jenjang
        const validJenjang = ['MI', 'MTS', 'MA'];
        const jenjangNorm  = jenjang === 'MTS' ? 'MTs' : jenjang;

        parsed.push({
          _rowNum: i + 1,
          nama,
          nisn,
          nis:     nis || nisn,
          tempatLahir,
          tanggalLahir,
          kelas:   String(kelas),
          jenjang: validJenjang.includes(jenjang) ? jenjangNorm : jenjang,
        });
      }

      if (parsed.length === 0) {
        throw new Error('Tidak ada data valid yang ditemukan di file Excel');
      }

      _importData = parsed;

      // Show preview (first 5 rows)
      const preview = parsed.slice(0, 5);
      const tbody = document.getElementById('excel-preview-tbody');
      tbody.innerHTML = preview.map((r, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td><strong>${escHtml(r.nama)}</strong></td>
          <td>${escHtml(r.nisn)}</td>
          <td>${escHtml(r.nis)}</td>
          <td>${escHtml(r.tempatLahir)}</td>
          <td>${escHtml(r.tanggalLahir)}</td>
          <td>${escHtml(r.kelas)}</td>
          <td><span class="badge badge-${(r.jenjang || '').toLowerCase().replace('mts','mts')}">${escHtml(r.jenjang)}</span></td>
        </tr>
      `).join('');

      document.getElementById('excel-preview-count').textContent =
        parsed.length > 5 ? `Menampilkan 5 dari ${parsed.length} baris` : `Total ${parsed.length} baris data`;
      document.getElementById('excel-total-count').textContent =
        `Total: ${parsed.length} siswa akan diimport`;

      document.getElementById('excel-preview-wrap').style.display = 'block';
      document.getElementById('btn-import-excel').disabled = false;

    } catch (err) {
      const errEl = document.getElementById('excel-error');
      errEl.innerHTML = `❌ ${escHtml(err.message)}`;
      errEl.style.display = 'flex';
      document.getElementById('excel-preview-wrap').style.display = 'none';
      document.getElementById('btn-import-excel').disabled = true;
      _importData = [];
    }
  };
  reader.readAsArrayBuffer(file);
}

/** Process import after user confirms */
async function processImportSiswa() {
  if (!_importData.length) return Toast.warning('Tidak ada data untuk diimport');

  const btn = document.getElementById('btn-import-excel');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Mengimport...';

  let success = 0;
  let failed  = 0;

  // Get existing siswa for dedup by NIS
  let existing = [];
  try {
    const res = await DataService.Siswa.getAll();
    existing = res.data || [];
  } catch { /* ignore */ }

  const existingNisMap = {};
  existing.forEach(s => { if (s.nis) existingNisMap[s.nis] = s.id; });

  for (const row of _importData) {
    try {
      const existingId = row.nis ? existingNisMap[row.nis] : null;
      const siswa = {
        id:            existingId || genId(),
        nama:          row.nama,
        nisn:          row.nisn  || '',
        nis:           row.nis   || '',
        jenjang:       row.jenjang || 'MI',
        kelas:         row.kelas  || '',
        tempatLahir:   row.tempatLahir  || '',
        tanggalLahir:  row.tanggalLahir || '',
        namaWali:      '',
        waliKelas:     '',
        alamat:        '',
        jenisKelamin:  'L',
        updatedAt:     new Date().toISOString(),
        createdAt:     existingId ? undefined : new Date().toISOString(),
      };
      await DataService.Siswa.save(siswa);
      success++;
    } catch (err) {
      console.warn(`Gagal import baris ${row._rowNum}:`, err);
      failed++;
    }
  }

  btn.disabled = false;
  btn.innerHTML = '📥 Import Data';

  Modal.close('modal-import-excel');
  await renderSiswa();

  if (failed === 0) {
    Toast.success(`✅ Berhasil mengimport ${success} data siswa`);
  } else {
    Toast.warning(`Import selesai: ${success} berhasil, ${failed} gagal`);
  }
  _importData = [];
}

/* ============================================================
 * ─── INITIALIZATION ────────────────────────────────────────
 * ============================================================ */
function initApp() {
  // Auth: inisialisasi akun default + cek sesi (HARUS dipanggil pertama)
  Auth.init();

  // Toast
  Toast.init();

  // Navigation: attach click handlers
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', () => navigate(item.dataset.page));
  });

  // Sidebar toggle (mobile)
  const sidebarToggle  = document.getElementById('sidebar-toggle');
  const sidebar        = document.querySelector('.sidebar');
  const backdrop       = document.querySelector('.sidebar-backdrop');

  sidebarToggle?.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    backdrop.classList.toggle('show');
  });

  backdrop?.addEventListener('click', () => {
    sidebar.classList.remove('open');
    backdrop.classList.remove('show');
  });

  // Modal close buttons
  document.querySelectorAll('.modal-close, [data-modal-close]').forEach(btn => {
    btn.addEventListener('click', () => Modal.closeAll());
  });

  // Close modal on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) Modal.closeAll();
    });
  });

  // Form submissions
  document.getElementById('form-siswa')?.addEventListener('submit', saveSiswa);
  document.getElementById('form-guru')?.addEventListener('submit',  saveGuru);
  document.getElementById('form-kepala')?.addEventListener('submit', saveKepala);
  document.getElementById('form-akun')?.addEventListener('submit',   saveAkun);

  // Jenjang change in siswa form
  document.getElementById('siswa-jenjang')?.addEventListener('change', function() {
    populateKelasOptions('siswa-kelas-select', this.value);
  });

  // Jenjang change in nilai filter
  document.getElementById('nilai-jenjang-sel')?.addEventListener('change', updateNilaiKelasOptions);

  // Cetak jenjang change
  document.getElementById('cetak-jenjang-sel')?.addEventListener('change', updateCetakKelasOptions);

  // Siswa search/filter
  document.getElementById('siswa-search')?.addEventListener('input', function() {
    State.filterSiswa.search = this.value;
    _applySiswaFilter();
  });
  document.getElementById('siswa-filter-jenjang')?.addEventListener('change', function() {
    State.filterSiswa.jenjang = this.value;
    _applySiswaFilter();
  });
  document.getElementById('siswa-filter-kelas')?.addEventListener('change', function() {
    State.filterSiswa.kelas = this.value;
    _applySiswaFilter();
  });

  // Initialize settings
  const s = State.settings;
  if (s.sheetsUrl) {
    SheetsAPI.setUrl(s.sheetsUrl).then(updateConnectionStatus);
  }

  // Set default tahun ajaran
  if (!s.tahunAjaran) {
    s.tahunAjaran = currentTahunAjaran();
    saveSettings();
  }

  State.filterNilai.semester    = s.semester    || 'Ganjil';
  State.filterNilai.tahunAjaran = s.tahunAjaran || currentTahunAjaran();

  // Cetak defaults
  const cetakTa = document.getElementById('cetak-ta-sel');
  if (cetakTa) cetakTa.value = s.tahunAjaran || currentTahunAjaran();

  const cetakSem = document.getElementById('cetak-semester-sel');
  if (cetakSem) cetakSem.value = s.semester || 'Ganjil';

  // Navigate to dashboard by default
  navigate('dashboard');

  console.log('✅ Raport Madrasah Darul Barokah - App initialized');
}

// Boot
document.addEventListener('DOMContentLoaded', initApp);
