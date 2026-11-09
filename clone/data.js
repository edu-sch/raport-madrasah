/**
 * Clone Standalone Data Layer (Clean-Room Implementation)
 * Provides in-memory / LocalStorage persistent data with complete schema compatibility.
 */

const DataStore = (() => {
  const STORAGE_KEY = 'mdb_replica_clone_db_v1';

  // Seed Data Initializer
  const DEFAULT_DB = {
    profile: {
      nama: 'MADRASAH DINIAH DARUL BAROKAH',
      alamat: 'Jatipurwo IV/14A Semampir, Surabaya',
      kepala: 'H. AHMAD DAHLAN, S.Pd.I',
      nipKepala: '197805122005011003'
    },
    kepalaPerJenjang: {
      MI:  { nama: 'H. AHMAD DAHLAN, S.Pd.I', nip: '197805122005011003', jabatan: 'Kepala Madrasah Ibtidaiyah' },
      MTs: { nama: 'UST. MUHAMMAD RIDWAN, M.Pd.I', nip: '198203152008011002', jabatan: 'Kepala Madrasah Tsanawiyah' },
      MA:  { nama: 'DRS. H. ABDUL WAHID, M.Ag', nip: '197211041998031001', jabatan: 'Kepala Madrasah Aliyah' }
    },
    tahunAjaran: {
      tahun: '2024/2025',
      semester: 'Ganjil',
      tanggalCetak: '2024-12-21'
    },
    users: [
      { id: 'usr-1', username: 'admin', password: 'admin123', nama: 'Administrator Madrasah', role: 'admin', waliKelas: null },
      { id: 'usr-2', username: 'pakguru', password: '123456', nama: 'H. MUSTOFA ALI', role: 'guru', waliKelas: '5 A' }
    ],
    mapel: [
      { id: 'm-1', jenjang: 'MI', nama: 'Al-Qur\'an', kkm: 75, urutan: 1 },
      { id: 'm-2', jenjang: 'MI', nama: 'Hadits', kkm: 70, urutan: 2 },
      { id: 'm-3', jenjang: 'MI', nama: 'Aqidah', kkm: 75, urutan: 3 },
      { id: 'm-4', jenjang: 'MI', nama: 'Akhlak', kkm: 80, urutan: 4 },
      { id: 'm-5', jenjang: 'MI', nama: 'Fikih', kkm: 70, urutan: 5 },
      { id: 'm-6', jenjang: 'MI', nama: 'Tarikh Islam', kkm: 70, urutan: 6 },
      { id: 'm-7', jenjang: 'MI', nama: 'Bahasa Arab', kkm: 70, urutan: 7 },
      { id: 'm-8', jenjang: 'MI', nama: 'Tajwid', kkm: 75, urutan: 8 }
    ],
    siswa: [
      { id: 's-101', nis: '202405001', nisn: '0012345678', nama: 'ABDULLAH AHMAD', jenjang: 'MI', kelas: '5', rombel: 'A', wali: 'Ahmad Fauzi', alamat: 'Jatipurwo II/10' },
      { id: 's-102', nis: '202405002', nisn: '0012345679', nama: 'FATIMAH AZ-ZAHRA', jenjang: 'MI', kelas: '5', rombel: 'A', wali: 'Muhammad Ridwan', alamat: 'Jatipurwo V/22' },
      { id: 's-103', nis: '202405003', nisn: '0012345680', nama: 'IBRAHIM AL-FASI', jenjang: 'MI', kelas: '5', rombel: 'A', wali: 'Ali Hasan', alamat: 'Kranggan 14' },
      { id: 's-104', nis: '202405004', nisn: '0012345681', nama: 'KHADIJAH BILQIS', jenjang: 'MI', kelas: '5', rombel: 'A', wali: 'H. Usman', alamat: 'Kedung Mangu 8' },
      { id: 's-105', nis: '202405005', nama: 'MUHAMMAD ZULFIKAR', jenjang: 'MI', kelas: '5', rombel: 'B', wali: 'Zulham Efendi', alamat: 'Sidotopo Kidul 4' },
      { id: 's-106', nis: '202405006', nama: 'AISYAH NUR CAHYANI', jenjang: 'MI', kelas: '5', rombel: 'B', wali: 'Nur Hidayat', alamat: 'Pegirian 30' }
    ],
    nilai: {
      // Key: `${siswaId}_${mapelId}` -> Score
      's-101_m-1': 88, 's-101_m-2': 82, 's-101_m-3': 90, 's-101_m-4': 95, 's-101_m-5': 85, 's-101_m-6': 80, 's-101_m-7': 84, 's-101_m-8': 88,
      's-102_m-1': 92, 's-102_m-2': 88, 's-102_m-3': 94, 's-102_m-4': 96, 's-102_m-5': 90, 's-102_m-6': 85, 's-102_m-7': 89, 's-102_m-8': 92,
      's-103_m-1': 74, 's-103_m-2': 72, 's-103_m-3': 76, 's-103_m-4': 80, 's-103_m-5': 70, 's-103_m-6': 75, 's-103_m-7': 70, 's-103_m-8': 74,
      's-104_m-1': 85, 's-104_m-2': 80, 's-104_m-3': 88, 's-104_m-4': 92, 's-104_m-5': 84, 's-104_m-6': 82, 's-104_m-7': 78, 's-104_m-8': 86
    }
  };

  function _load() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : DEFAULT_DB;
    } catch {
      return DEFAULT_DB;
    }
  }

  function _save(db) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  }

  // Active Session
  let _currentUser = null;

  return {
    // Predicate Calculation Helper (Formula: Interval = (100 - KKM) / 3)
    calculatePredicate(kkm, score) {
      const val = parseFloat(score);
      if (isNaN(val) || val <= 0) return { grade: '-', tuntas: false, desc: 'Belum Dinilai' };
      const interval = (100 - kkm) / 3;
      if (val >= kkm + 2 * interval) return { grade: 'A', tuntas: true, desc: 'Sangat Baik' };
      if (val >= kkm + interval) return { grade: 'B', tuntas: true, desc: 'Baik' };
      if (val >= kkm) return { grade: 'C', tuntas: true, desc: 'Cukup' };
      return { grade: 'D', tuntas: false, desc: 'Perlu Bimbingan' };
    },

    // Auth
    login(username, password) {
      const db = _load();
      const u = (username || '').trim().toLowerCase();
      const p = (password || '').trim();
      const user = db.users.find(x => x.username.toLowerCase() === u || x.nama.toLowerCase() === u);
      if (!user) throw new Error('Akun tidak terdaftar');
      if (user.password !== p) throw new Error('Kata sandi salah');
      _currentUser = user;
      return user;
    },

    getCurrentUser() {
      return _currentUser;
    },

    logout() {
      _currentUser = null;
    },

    // Profil & Pengaturan
    getSettings() {
      const db = _load();
      return {
        profile: db.profile,
        tahunAjaran: db.tahunAjaran,
        kepalaPerJenjang: db.kepalaPerJenjang
      };
    },

    saveSettings(newProfile, newTA) {
      const db = _load();
      if (newProfile) db.profile = { ...db.profile, ...newProfile };
      if (newTA) db.tahunAjaran = { ...db.tahunAjaran, ...newTA };
      _save(db);
      return true;
    },

    // Siswa & Rombel
    getSiswa(filter = {}) {
      const db = _load();
      let list = [...db.siswa];

      // Scoped if wali kelas
      if (_currentUser && _currentUser.role !== 'admin' && _currentUser.waliKelas) {
        const [k, r] = _currentUser.waliKelas.split(' ');
        list = list.filter(s => s.kelas === k);
      }

      if (filter.kelas) list = list.filter(s => s.kelas === filter.kelas);
      if (filter.rombel) list = list.filter(s => s.rombel === filter.rombel);
      if (filter.search) {
        const q = filter.search.toLowerCase();
        list = list.filter(s => s.nama.toLowerCase().includes(q) || s.nis.includes(q));
      }
      return list;
    },

    saveRombelBatch(changes) {
      const db = _load();
      let updated = 0;
      Object.entries(changes).forEach(([siswaId, rombel]) => {
        const s = db.siswa.find(x => x.id === siswaId);
        if (s) {
          s.rombel = rombel;
          updated++;
        }
      });
      _save(db);
      return updated;
    },

    // Mapel
    getMapel(jenjang = 'MI') {
      const db = _load();
      return db.mapel.filter(m => m.jenjang === jenjang).sort((a, b) => a.urutan - b.urutan);
    },

    // Nilai
    getNilaiGrid(kelas = '5', rombel = 'A', mapelId) {
      const db = _load();
      const students = db.siswa.filter(s => s.kelas === kelas && s.rombel === rombel);
      const targetMapel = db.mapel.find(m => m.id === mapelId) || db.mapel[0];

      return students.map(s => {
        const key = `${s.id}_${targetMapel.id}`;
        const score = db.nilai[key] !== undefined ? db.nilai[key] : '';
        const pred = DataStore.calculatePredicate(targetMapel.kkm, score);
        return {
          siswa: s,
          mapel: targetMapel,
          nilai: score,
          predikat: pred.grade,
          tuntas: pred.tuntas,
          keterangan: pred.desc
        };
      });
    },

    saveNilaiBatch(mapelId, items) {
      const db = _load();
      let count = 0;
      items.forEach(({ siswaId, score }) => {
        const key = `${siswaId}_${mapelId}`;
        const val = parseFloat(score);
        if (!isNaN(val)) {
          db.nilai[key] = Math.min(100, Math.max(0, val));
          count++;
        }
      });
      _save(db);
      return count;
    },

    // Cetak Raport
    getCetakData(siswaId) {
      const db = _load();
      const s = db.siswa.find(x => x.id === siswaId);
      if (!s) return null;

      const mapelList = db.mapel.filter(m => m.jenjang === s.jenjang).sort((a, b) => a.urutan - b.urutan);
      let total = 0;
      let count = 0;

      const rows = mapelList.map(m => {
        const key = `${s.id}_${m.id}`;
        const val = db.nilai[key] !== undefined ? db.nilai[key] : 0;
        const pred = DataStore.calculatePredicate(m.kkm, val);
        if (db.nilai[key] !== undefined) {
          total += val;
          count++;
        }
        return {
          mapel: m.nama,
          kkm: m.kkm,
          nilai: val || '-',
          predikat: pred.grade,
          keterangan: pred.desc
        };
      });

      return {
        profile: db.profile,
        tahunAjaran: db.tahunAjaran,
        siswa: s,
        waliKelas: db.users.find(u => u.waliKelas === `${s.kelas} ${s.rombel}`) || { nama: 'Wali Kelas' },
        rows,
        totalNilai: total,
        rataRata: count > 0 ? (total / count).toFixed(1) : 0
      };
    },

    getKepalaPerJenjang(jenjang) {
      const db = _load();
      const list = db.kepalaPerJenjang || {
        MI:  { nama: 'H. AHMAD DAHLAN, S.Pd.I', nip: '197805122005011003', jabatan: 'Kepala Madrasah Ibtidaiyah' },
        MTs: { nama: 'UST. MUHAMMAD RIDWAN, M.Pd.I', nip: '198203152008011002', jabatan: 'Kepala Madrasah Tsanawiyah' },
        MA:  { nama: 'DRS. H. ABDUL WAHID, M.Ag', nip: '197211041998031001', jabatan: 'Kepala Madrasah Aliyah' }
      };
      return jenjang ? list[jenjang] : list;
    },

    saveKepalaJenjang(jenjang, data) {
      const db = _load();
      if (!db.kepalaPerJenjang) db.kepalaPerJenjang = {};
      db.kepalaPerJenjang[jenjang] = { ...data, jenjang };
      _save(db);
      return db.kepalaPerJenjang[jenjang];
    },

    getStats() {
      const db = _load();
      return {
        totalSiswa: db.siswa.length,
        totalGuru: db.users.filter(u => u.role === 'guru').length,
        totalMapel: db.mapel.length,
        kelasAktif: ['5 A', '5 B']
      };
    }
  };
})();
