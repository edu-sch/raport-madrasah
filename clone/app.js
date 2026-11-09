/**
 * Clone Application Controller (Clean-Room Implementation)
 * Handles routing, component rendering, event binding, and state management.
 */

const App = (() => {
  let _activePage = 'dashboard';
  let _pendingRombel = {};
  let _activeMapelId = 'm-1';

  // Toast Helper
  function toast(msg, type = 'info') {
    const box = document.getElementById('toast-container');
    if (!box) return;
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<span>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span><span>${msg}</span>`;
    box.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateX(100%)';
      el.style.transition = 'all 0.3s ease';
      setTimeout(() => el.remove(), 300);
    }, 3200);
  }

  // Navigation
  function navigate(pageId) {
    const currentUser = DataStore.getCurrentUser();
    // Guard: Akun Guru HANYA boleh Input Nilai & Cetak Raport
    if (currentUser && currentUser.role === 'guru') {
      const guruPages = ['nilai', 'cetak'];
      if (!guruPages.includes(pageId)) {
        pageId = 'nilai';
      }
    }

    _activePage = pageId;
    document.querySelectorAll('.nav-link').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.page === pageId);
    });

    const user = DataStore.getCurrentUser();
    const titleEl = document.getElementById('current-page-title');
    const titles = {
      dashboard: 'Dashboard Madrasah',
      siswa: 'Data Siswa & Rombel',
      nilai: 'Input Nilai Pembelajaran',
      cetak: 'Cetak Raport Resmi (A4)',
      settings: 'Pengaturan Madrasah'
    };
    if (titleEl) titleEl.textContent = titles[pageId] || 'Raport Madrasah';

    renderPage(pageId);
  }

  // Page Render Router
  function renderPage(page) {
    const container = document.getElementById('main-viewport');
    if (!container) return;

    switch (page) {
      case 'dashboard':
        renderDashboard(container);
        break;
      case 'siswa':
        renderSiswa(container);
        break;
      case 'nilai':
        renderNilai(container);
        break;
      case 'cetak':
        renderCetak(container);
        break;
      case 'settings':
        renderSettings(container);
        break;
      default:
        renderDashboard(container);
    }
  }

  // =========================================================================
  // S02: DASHBOARD
  // =========================================================================
  function renderDashboard(container) {
    const stats = DataStore.getStats();
    const user = DataStore.getCurrentUser();
    const siswa = DataStore.getSiswa();

    container.innerHTML = `
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-icon">👨‍🎓</div>
          <div>
            <div class="stat-number">${siswa.length}</div>
            <div class="stat-label">Siswa ${user.role !== 'admin' ? `(Kelas ${user.waliKelas})` : 'Terdaftar'}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📚</div>
          <div>
            <div class="stat-number">${stats.totalMapel}</div>
            <div class="stat-label">Mata Pelajaran</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🏫</div>
          <div>
            <div class="stat-number">2 Rombel</div>
            <div class="stat-label">Kelas 5 A & 5 B</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">👩‍🏫</div>
          <div>
            <div class="stat-number">${stats.totalGuru}</div>
            <div class="stat-label">Dewan Asatidz</div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h2 class="card-title">👨‍🎓 Daftar Siswa Kelas Bimbingan</h2>
          <button class="btn btn-sm btn-outline" onclick="App.navigate('siswa')">Kelola Rombel &rarr;</button>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>NIS</th>
                <th>Nama Siswa</th>
                <th>Jenjang</th>
                <th>Kelas</th>
                <th>Rombel</th>
                <th>Wali Santri</th>
                <th>Aksi Cepat</th>
              </tr>
            </thead>
            <tbody>
              ${siswa.slice(0, 5).map(s => `
                <tr>
                  <td><strong>${s.nis}</strong></td>
                  <td>${s.nama}</td>
                  <td>${s.jenjang}</td>
                  <td>Kelas ${s.kelas}</td>
                  <td><span class="badge-pill badge-gold">Rombel ${s.rombel}</span></td>
                  <td>${s.wali}</td>
                  <td>
                    <button class="btn btn-sm btn-outline" onclick="App.previewRaport('${s.id}')">Lihat Raport</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // S03: DATA SISWA & ROMBEL
  // =========================================================================
  function renderSiswa(container) {
    const siswa = DataStore.getSiswa();
    const dirtyCount = Object.keys(_pendingRombel).length;

    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div>
            <h2 class="card-title">Daftar Santri & Rombel</h2>
            <p style="font-size:12px;color:var(--color-text-muted);margin-top:2px;">Data santri, kelas, dan rombel dibaca langsung secara otomatis dari database spreadsheet.</p>
          </div>
          <div>
            <span class="badge-pill badge-info" style="font-size:12px;">Mode Baca Otomatis</span>
          </div>
        </div>

        <div style="margin-bottom: 16px; display: flex; gap: 12px; flex-wrap: wrap;">
          <input type="text" id="siswa-filter-q" class="form-input" placeholder="🔍 Cari nama atau NIS siswa..." style="max-width:320px;" oninput="App.onFilterSiswa(this.value)" />
        </div>

        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 50px;">No</th>
                <th>NIS</th>
                <th>Nama Lengkap Santri</th>
                <th>Kelas</th>
                <th style="text-align: center; width: 100px;">Rombel</th>
                <th>Nama Wali</th>
                <th>Alamat</th>
              </tr>
            </thead>
            <tbody id="siswa-table-body">
              ${renderSiswaRows(siswa)}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderSiswaRows(list) {
    if (list.length === 0) {
      return `<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--color-text-muted);">Tidak ada santri yang sesuai.</td></tr>`;
    }
    return list.map((s, idx) => {
      const currentRombel = _pendingRombel[s.id] !== undefined ? _pendingRombel[s.id] : s.rombel;
      const isDirty = _pendingRombel[s.id] !== undefined;

      return `
        <tr class="${isDirty ? 'tr-dirty' : ''}">
          <td>${idx + 1}</td>
          <td><strong>${s.nis}</strong></td>
          <td>${s.nama}</td>
          <td>Kelas ${s.kelas} ${s.jenjang}</td>
          <td style="text-align: center;">
            ${(() => {
              const r = String(s.rombel || '').trim().toUpperCase();
              if (!r) return '<span style="color:var(--color-text-muted);">-</span>';
              return `<span class="badge-pill ${r === 'A' ? 'badge-info' : 'badge-gold'}" style="font-weight:800;font-size:12px;padding:3px 12px;">${r}</span>`;
            })()}
          </td>
          <td>${s.wali}</td>
          <td>${s.alamat}</td>
        </tr>
      `;
    }).join('');
  }

  function setRombelDirty(siswaId, val) {
    _pendingRombel[siswaId] = val;
    const btn = document.getElementById('btn-save-rombel');
    const count = Object.keys(_pendingRombel).length;
    if (btn) {
      btn.disabled = false;
      btn.textContent = `💾 Simpan Rombel (${count} Diubah)`;
      btn.style.boxShadow = '0 0 0 3px rgba(212,172,13,0.5)';
    }
  }

  function saveAllRombel() {
    const count = DataStore.saveRombelBatch(_pendingRombel);
    _pendingRombel = {};
    toast(`Berhasil memperbarui rombel untuk ${count} santri!`, 'success');
    navigate('siswa');
  }

  function onFilterSiswa(q) {
    const list = DataStore.getSiswa({ search: q });
    const tbody = document.getElementById('siswa-table-body');
    if (tbody) tbody.innerHTML = renderSiswaRows(list);
  }

  // =========================================================================
  // S04: INPUT NILAI (CORE LOOP VERTICAL SLICE)
  // =========================================================================
  function renderNilai(container) {
    const mapelList = DataStore.getMapel('MI');
    const user = DataStore.getCurrentUser();
    let kelas = '5';
    let rombel = 'A';
    if (user && user.waliKelas) {
      const parts = user.waliKelas.split(' ');
      kelas = parts[0];
      rombel = parts[1] || 'A';
    }

    const grid = DataStore.getNilaiGrid(kelas, rombel, _activeMapelId);
    const activeMapel = mapelList.find(m => m.id === _activeMapelId) || mapelList[0];

    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div>
            <h2 class="card-title">📝 Input Nilai Siswa: ${activeMapel.nama}</h2>
            <p style="font-size:12px;color:var(--color-text-muted);margin-top:2px;">
              Kelas ${kelas} Rombel ${rombel} &bull; KKM Standar: <strong>${activeMapel.kkm}</strong>
            </p>
          </div>
          <button class="btn btn-md btn-primary" onclick="App.saveAllNilai()">
            💾 Simpan Semua Nilai
          </button>
        </div>

        <!-- Tab Pilihan Mapel -->
        <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px;">
          ${mapelList.map(m => `
            <button class="btn btn-sm ${m.id === _activeMapelId ? 'btn-primary' : 'btn-secondary'}" onclick="App.selectMapel('${m.id}')">
              ${m.nama} (KKM ${m.kkm})
            </button>
          `).join('')}
        </div>

        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 50px;">No</th>
                <th style="width: 130px;">NIS</th>
                <th>Nama Siswa</th>
                <th style="width: 140px; text-align: center;">Nilai Angka (0-100)</th>
                <th style="width: 100px; text-align: center;">Predikat</th>
                <th style="width: 110px; text-align: center;">Ketuntasan</th>
                <th>Catatan Mutu</th>
              </tr>
            </thead>
            <tbody>
              ${grid.map((row, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td><strong>${row.siswa.nis}</strong></td>
                  <td>${row.siswa.nama}</td>
                  <td style="text-align: center;">
                    <input 
                      type="number" 
                      min="0" 
                      max="100" 
                      class="form-input" 
                      style="width: 90px; text-align: center; font-weight: 700; height: 34px;" 
                      value="${row.nilai}" 
                      id="input-nilai-${row.siswa.id}"
                      oninput="App.onLiveNilaiChange('${row.siswa.id}', this.value, ${activeMapel.kkm})"
                    />
                  </td>
                  <td style="text-align: center;">
                    <span class="badge-grade grade-${(row.predikat || 'd').toLowerCase()}" id="predikat-${row.siswa.id}">
                      ${row.predikat}
                    </span>
                  </td>
                  <td style="text-align: center;" id="tuntas-${row.siswa.id}">
                    ${row.tuntas ? '<span style="color:var(--color-success);font-weight:700;">✅ Tuntas</span>' : '<span style="color:var(--color-danger);font-weight:700;">⚠️ Belum</span>'}
                  </td>
                  <td style="color:var(--color-text-muted);font-size:12px;" id="desc-${row.siswa.id}">
                    ${row.keterangan}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function selectMapel(mapelId) {
    _activeMapelId = mapelId;
    renderPage('nilai');
  }

  function onLiveNilaiChange(siswaId, val, kkm) {
    const input = document.getElementById(`input-nilai-${siswaId}`);
    if (input) input.classList.add('is-dirty');

    const pred = DataStore.calculatePredicate(kkm, val);
    const predEl = document.getElementById(`predikat-${siswaId}`);
    const tuntasEl = document.getElementById(`tuntas-${siswaId}`);
    const descEl = document.getElementById(`desc-${siswaId}`);

    if (predEl) {
      predEl.className = `badge-grade grade-${(pred.grade || 'd').toLowerCase()}`;
      predEl.textContent = pred.grade;
    }
    if (tuntasEl) {
      tuntasEl.innerHTML = pred.tuntas 
        ? '<span style="color:var(--color-success);font-weight:700;">✅ Tuntas</span>' 
        : '<span style="color:var(--color-danger);font-weight:700;">⚠️ Belum</span>';
    }
    if (descEl) descEl.textContent = pred.desc;
  }

  function saveAllNilai() {
    const user = DataStore.getCurrentUser();
    let kelas = '5';
    let rombel = 'A';
    if (user && user.waliKelas) {
      const parts = user.waliKelas.split(' ');
      kelas = parts[0];
      rombel = parts[1] || 'A';
    }

    const students = DataStore.getSiswa({ kelas, rombel });
    const items = [];
    students.forEach(s => {
      const el = document.getElementById(`input-nilai-${s.id}`);
      if (el) {
        // Jika nilai kosong otomatis tersimpan 0
        const raw = el.value.trim();
        const score = (raw === '' || isNaN(parseFloat(raw))) ? 0 : parseFloat(raw);
        items.push({ siswaId: s.id, score: score });
        el.value = score;
        el.classList.remove('is-dirty');
      }
    });

    const count = DataStore.saveNilaiBatch(_activeMapelId, items);
    toast(`Berhasil menyimpan nilai (${count} santri, nilai kosong otomatis tersimpan 0)!`, 'success');
  }

  // =========================================================================
  // S07: CETAK RAPORT RESMI (A4 VERTICAL SLICE)
  // =========================================================================
  function renderCetak(container, selectedSiswaId = null) {
    const siswaList = DataStore.getSiswa();
    const activeId = selectedSiswaId || (siswaList[0] ? siswaList[0].id : null);
    const data = activeId ? DataStore.getCetakData(activeId) : null;

    container.innerHTML = `
      <div class="card filter-controls">
        <div class="card-header">
          <h2 class="card-title">🖨️ Cetak Raport Fisik Santri</h2>
          <div style="display:flex;gap:10px;">
            <button class="btn btn-md btn-primary" onclick="window.print()">
              🖨️ Cetak Lembar Ini (Print / PDF)
            </button>
          </div>
        </div>
        <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap;">
          <div class="form-group" style="margin-bottom:0;min-width:280px;">
            <label class="form-label">Pilih Santri yang Dicetak:</label>
            <select class="form-select" onchange="App.onSelectCetakSiswa(this.value)">
              ${siswaList.map(s => `
                <option value="${s.id}" ${s.id === activeId ? 'selected' : ''}>
                  ${s.nama} (${s.nis}) - Kelas ${s.kelas}${s.rombel}
                </option>
              `).join('')}
            </select>
          </div>
        </div>
      </div>

      <!-- Lembar Raport A4 Siap Cetak -->
      <div class="raport-sheet" id="print-area">
        ${data ? `
          <div class="raport-kop">
            <div class="raport-kop-title">مدرسة دار البركة الدينية السلفية</div>
            <div class="raport-kop-sub">${data.profile.nama}</div>
            <div class="raport-kop-addr">${data.profile.alamat}</div>
          </div>

          <div style="text-align:center;font-weight:800;font-size:14px;letter-spacing:1px;margin-bottom:14px;">
            LAPORAN HASIL PENILAIAN SANTRI (RAPORT)
          </div>

          <div class="raport-meta-grid">
            <div><strong>Nama Santri:</strong> ${data.siswa.nama}</div>
            <div><strong>Kelas / Rombel:</strong> Kelas ${data.siswa.kelas} ${data.siswa.rombel}</div>
            <div><strong>NISN:</strong> ${data.siswa.nisn || '-'}</div>
            <div><strong>Jenjang:</strong> MADRASAH IBTIDAIYAH</div>
            <div><strong>NIS:</strong> ${data.siswa.nis}</div>
            <div><strong>Tahun Pelajaran:</strong> ${data.tahunAjaran.tahun} (${data.tahunAjaran.semester})</div>
          </div>

          <table class="raport-table">
            <thead>
              <tr>
                <th style="width:36px;">No</th>
                <th>Mata Pelajaran</th>
                <th style="width:55px;">KKM</th>
                <th style="width:70px;">Nilai</th>
                <th style="width:70px;">Predikat</th>
                <th>Keterangan Capaian</th>
              </tr>
            </thead>
            <tbody>
              ${data.rows.map((r, i) => `
                <tr>
                  <td style="text-align:center;">${i + 1}</td>
                  <td>${r.mapel}</td>
                  <td style="text-align:center;">${r.kkm}</td>
                  <td style="text-align:center;font-weight:700;">${r.nilai}</td>
                  <td style="text-align:center;font-weight:700;">${r.predikat}</td>
                  <td>${r.keterangan}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr style="background:#f9f9f9;font-weight:700;">
                <td colspan="3" style="text-align:right;">Jumlah / Nilai Rata-Rata</td>
                <td style="text-align:center;">${data.totalNilai}</td>
                <td style="text-align:center;">${data.rataRata}</td>
                <td>Predikat Rata-Rata Baik</td>
              </tr>
            </tfoot>
          </table>

          <div class="raport-signature-grid">
            <!-- Sebelah Kiri: Mengetahui Kepala Madrasah (Tanpa Tanggal) -->
            <div class="sign-box">
              <div>Mengetahui,</div>
              <div style="margin-bottom:6px;">${data.profile.jabatanKepala || 'Kepala Madrasah'}</div>
              <div class="sign-space"></div>
              <div class="sign-name">${data.profile.kepala}</div>
              <div style="font-size:10px;">NIP. ${data.profile.nipKepala || '-'}</div>
            </div>
            <!-- Sebelah Kanan: Wali Kelas Lengkap dengan Tanggal -->
            <div class="sign-box">
              <div>Surabaya, ${data.tahunAjaran.tanggalCetak}</div>
              <div style="margin-bottom:6px;">Wali Kelas ${data.siswa.kelas} ${data.siswa.rombel}</div>
              <div class="sign-space"></div>
              <div class="sign-name">${data.waliKelas.nama}</div>
              <div style="font-size:10px;">NIP. -</div>
            </div>
          </div>
        ` : `<div style="text-align:center;padding:40px;">Belum ada santri yang dipilih</div>`}
      </div>
    `;
  }

  function onSelectCetakSiswa(siswaId) {
    const container = document.getElementById('main-viewport');
    renderCetak(container, siswaId);
  }

  function previewRaport(siswaId) {
    navigate('cetak');
    const container = document.getElementById('main-viewport');
    renderCetak(container, siswaId);
  }

  // =========================================================================
  // S08: PENGATURAN
  // =========================================================================
  function renderSettings(container) {
    const s = DataStore.getSettings();
    container.innerHTML = `
      <div class="card" style="max-width:640px;">
        <div class="card-header">
          <h2 class="card-title">⚙️ Konfigurasi Lembaga & Periode</h2>
        </div>
        <form onsubmit="App.onSaveSettings(event)">
          <div class="form-group">
            <label class="form-label">Nama Lembaga Madrasah:</label>
            <input type="text" id="set-nama" class="form-input" value="${s.profile.nama}" required />
          </div>
          <div class="form-group">
            <label class="form-label">Alamat Madrasah:</label>
            <input type="text" id="set-alamat" class="form-input" value="${s.profile.alamat}" required />
          </div>
          <div class="form-group">
            <label class="form-label">Nama Kepala Madrasah:</label>
            <input type="text" id="set-kepala" class="form-input" value="${s.profile.kepala}" required />
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="form-group">
              <label class="form-label">Tahun Ajaran:</label>
              <input type="text" id="set-ta" class="form-input" value="${s.tahunAjaran.tahun}" required />
            </div>
            <div class="form-group">
              <label class="form-label">Semester:</label>
              <select id="set-sem" class="form-select">
                <option value="Ganjil" ${s.tahunAjaran.semester === 'Ganjil' ? 'selected' : ''}>Ganjil</option>
                <option value="Genap" ${s.tahunAjaran.semester === 'Genap' ? 'selected' : ''}>Genap</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Tanggal Titimangsa Raport:</label>
            <input type="date" id="set-tgl" class="form-input" value="${s.tahunAjaran.tanggalCetak}" required />
          </div>
          <button type="submit" class="btn btn-md btn-primary" style="margin-top:8px;">
            💾 Simpan Pengaturan
          </button>
        </form>
      </div>
    `;
  }

  function onSaveSettings(e) {
    e.preventDefault();
    DataStore.saveSettings(
      {
        nama: document.getElementById('set-nama').value,
        alamat: document.getElementById('set-alamat').value,
        kepala: document.getElementById('set-kepala').value
      },
      {
        tahun: document.getElementById('set-ta').value,
        semester: document.getElementById('set-sem').value,
        tanggalCetak: document.getElementById('set-tgl').value
      }
    );
    toast('Pengaturan berhasil disimpan!', 'success');
    applyRoleScoping();
    if (user.role === 'guru') {
      navigate('nilai');
    } else {
      navigate('dashboard');
    }
  }

  // =========================================================================
  // S01: AUTH & APP INIT
  // =========================================================================
  function applyRoleScoping() {
    const user = DataStore.getCurrentUser();
    const isGuru = user && user.role === 'guru';
    document.querySelectorAll('.nav-link').forEach(btn => {
      const page = btn.dataset.page;
      if (isGuru) {
        btn.style.display = (page === 'nilai' || page === 'cetak') ? '' : 'none';
      } else {
        btn.style.display = '';
      }
    });
    document.querySelectorAll('.nav-section-title').forEach(title => {
      if (isGuru) {
        const txt = title.textContent.trim().toLowerCase();
        if (txt.includes('menu utama') || txt.includes('konfigurasi')) {
          title.style.display = 'none';
        } else {
          title.style.display = '';
        }
      } else {
        title.style.display = '';
      }
    });
  }

  function init() {
    // Auto login demo as 'pakguru' (Wali Kelas 5 A) for instant vertical slice verification
    try {
      DataStore.login('pakguru', '123456');
    } catch {
      DataStore.login('admin', 'admin123');
    }

    const user = DataStore.getCurrentUser();
    const userDisplay = document.getElementById('sidebar-user-name');
    const roleDisplay = document.getElementById('sidebar-user-role');
    const avatarDisplay = document.getElementById('sidebar-user-avatar');

    if (userDisplay) userDisplay.textContent = user.nama;
    if (roleDisplay) roleDisplay.textContent = user.role === 'admin' ? 'Administrator' : `Wali Kelas ${user.waliKelas}`;
    if (avatarDisplay) avatarDisplay.textContent = user.nama.charAt(0);

    navigate('dashboard');
  }

  return {
    init,
    navigate,
    previewRaport,
    setRombelDirty,
    saveAllRombel,
    onFilterSiswa,
    selectMapel,
    onLiveNilaiChange,
    saveAllNilai,
    onSelectCetakSiswa,
    onSaveSettings
  };
})();

// Bootstrap
document.addEventListener('DOMContentLoaded', App.init);
