/**
 * ============================================================
 * RAPORT MADRASAH DINIAH DARUL BAROKAH SURABAYA
 * Google Sheets Integration - sheets.js
 * Handles all communication with Google Apps Script Web App
 * ============================================================
 */

const SheetsAPI = (() => {
  // ── Private State ──────────────────────────────────────────
  let _scriptUrl = '';
  let _connected  = false;
  let _lastError  = null;

  // ── Constants ──────────────────────────────────────────────
  const CACHE_TTL = 60000; // 60 seconds
  const _cache    = {};

  // ── Helpers ────────────────────────────────────────────────
  function _cacheKey(action, params = {}) {
    return action + '_' + JSON.stringify(params);
  }

  function _getCache(key) {
    const item = _cache[key];
    if (!item) return null;
    if (Date.now() - item.ts > CACHE_TTL) {
      delete _cache[key];
      return null;
    }
    return item.data;
  }

  function _setCache(key, data) {
    _cache[key] = { data, ts: Date.now() };
  }

  function _clearCache() {
    Object.keys(_cache).forEach(k => delete _cache[k]);
  }

  // ── Core Fetch ─────────────────────────────────────────────
  /**
   * Make a GET request to the Apps Script Web App
   * @param {string} action - The action name
   * @param {Object} params - Query parameters
   * @param {boolean} useCache - Whether to use cache
   */
  async function _get(action, params = {}, useCache = true) {
    if (!_scriptUrl) throw new Error('URL Google Apps Script belum dikonfigurasi');

    const key = _cacheKey(action, params);
    if (useCache) {
      const cached = _getCache(key);
      if (cached) return cached;
    }

    const url = new URL(_scriptUrl);
    url.searchParams.set('action', action);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    const resp = await fetch(url.toString(), {
      method: 'GET',
      mode: 'cors',
    });

    if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
    const data = await resp.json();
    if (data.error) throw new Error(data.error);

    if (useCache) _setCache(key, data);
    return data;
  }

  /**
   * Make a POST request to the Apps Script Web App
   * @param {string} action - The action name
   * @param {Object} payload - Request body
   */
  async function _post(action, payload = {}) {
    if (!_scriptUrl) throw new Error('URL Google Apps Script belum dikonfigurasi');

    _clearCache(); // Invalidate cache on mutation

    const resp = await fetch(_scriptUrl, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'text/plain' }, // Apps Script requires text/plain for CORS
      body: JSON.stringify({ action, ...payload }),
    });

    if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
    const data = await resp.json();
    if (data.error) throw new Error(data.error);
    return data;
  }

  // ── Public API ─────────────────────────────────────────────

  /** Set and validate the Apps Script URL */
  async function setUrl(url) {
    _scriptUrl = url.trim();
    _connected = false;
    _lastError = null;
    try {
      await testConnection();
      _connected = true;
      return { ok: true };
    } catch (e) {
      _lastError = e.message;
      return { ok: false, error: e.message };
    }
  }

  function getUrl()       { return _scriptUrl;  }
  function isConnected()  { return _connected;   }
  function getLastError() { return _lastError;   }

  /** Ping the Apps Script to verify it's reachable */
  async function testConnection() {
    const data = await _get('ping', {}, false);
    if (data.pong !== true) throw new Error('Respons tidak valid dari server');
    _connected = true;
    return true;
  }

  // ─── Siswa (Students) ──────────────────────────────────────
  const Siswa = {
    async getAll()        { return _get('getSiswa'); },
    async getById(id)     { return _get('getSiswaById', { id }, false); },
    async save(data)      { return _post('saveSiswa', { data }); },
    async delete(id)      { return _post('deleteSiswa', { id }); },
  };

  // ─── Nilai (Grades) ────────────────────────────────────────
  const Nilai = {
    async getAll()             { return _get('getNilai'); },
    async getBySiswa(siswaId)  { return _get('getNilaiBySiswa', { siswaId }, false); },
    async getByKelas(params)   { return _get('getNilaiByKelas', params, false); },
    async save(data)           { return _post('saveNilai', { data }); },
    async saveMany(dataArray)  { return _post('saveNilaiMany', { data: dataArray }); },
    async delete(id)           { return _post('deleteNilai', { id }); },
  };

  // ─── Mapel Config (Subjects) ───────────────────────────────
  const Mapel = {
    async getAll()        { return _get('getMapel'); },
    async getByJenjang(j) { return _get('getMapelByJenjang', { jenjang: j }); },
    async save(data)      { return _post('saveMapel', { data }); },
    async delete(id)      { return _post('deleteMapel', { id }); },
    async saveAll(arr)    { return _post('saveMapelAll', { data: arr }); },
  };

  // ─── Guru (Teachers) ───────────────────────────────────────
  const Guru = {
    async getAll()     { return _get('getGuru'); },
    async getById(id)  { return _get('getGuruById', { id }, false); },
    async save(data)   { return _post('saveGuru', { data }); },
    async delete(id)   { return _post('deleteGuru', { id }); },
  };

  // ─── Kepala Madrasah ───────────────────────────────────────
  const Kepala = {
    async get()          { return _get('getKepala', {}, false); },
    async save(data)     { return _post('saveKepala', { data }); },
  };

  // ─── Kelas ─────────────────────────────────────────────────
  const Kelas = {
    async getAll()     { return _get('getKelas'); },
    async save(data)   { return _post('saveKelas', { data }); },
    async delete(id)   { return _post('deleteKelas', { id }); },
  };

  return {
    setUrl, getUrl, isConnected, getLastError,
    testConnection,
    Siswa, Nilai, Mapel, Guru, Kepala, Kelas,
    clearCache: _clearCache,
  };
})();

/* =============================================================
 * LocalStorage Fallback Store
 * Used when Google Sheets is not configured.
 * Mirrors the SheetsAPI interface with synchronous localStorage.
 * ============================================================= */
const LocalStore = (() => {
  function _load(key, def = []) {
    try {
      const raw = localStorage.getItem('mdb_' + key);
      return raw ? JSON.parse(raw) : def;
    } catch { return def; }
  }

  function _save(key, data) {
    localStorage.setItem('mdb_' + key, JSON.stringify(data));
  }

  function _genId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  // Generic CRUD factory
  function _collection(name) {
    return {
      async getAll() {
        return { data: _load(name) };
      },
      async getById(id) {
        const all = _load(name);
        return { data: all.find(r => r.id === id) || null };
      },
      async save(data) {
        const all = _load(name);
        if (data.id) {
          const idx = all.findIndex(r => r.id === data.id);
          if (idx >= 0) all[idx] = data;
          else all.push(data);
        } else {
          data.id = _genId();
          all.push(data);
        }
        _save(name, all);
        return { data, ok: true };
      },
      async delete(id) {
        const all = _load(name).filter(r => r.id !== id);
        _save(name, all);
        return { ok: true };
      },
    };
  }

  const Siswa = _collection('siswa');
  const Guru  = _collection('guru');
  const Kelas = _collection('kelas');

  const Mapel = {
    ..._collection('mapel'),
    async getByJenjang(jenjang) {
      const all = _load('mapel');
      return { data: all.filter(m => m.jenjang === jenjang) };
    },
    async saveAll(arr) {
      _save('mapel', arr);
      return { ok: true };
    },
  };

  const Nilai = {
    ..._collection('nilai'),
    async getBySiswa(siswaId) {
      const all = _load('nilai');
      return { data: all.filter(n => n.siswaId === siswaId) };
    },
    async getByKelas({ jenjang, kelas, semester, tahunAjaran }) {
      const all = _load('nilai');
      return {
        data: all.filter(n =>
          (!jenjang      || n.jenjang      === jenjang) &&
          (!kelas        || n.kelas        === kelas) &&
          (!semester     || n.semester     === semester) &&
          (!tahunAjaran  || n.tahunAjaran  === tahunAjaran)
        )
      };
    },
    async saveMany(dataArray) {
      const all = _load('nilai');
      dataArray.forEach(item => {
        if (!item.id) item.id = Date.now().toString(36) + Math.random().toString(36).slice(2);
        const idx = all.findIndex(n => n.id === item.id);
        if (idx >= 0) all[idx] = item;
        else all.push(item);
      });
      _save('nilai', all);
      return { ok: true };
    },
  };

  const Kepala = {
    async get() {
      return { data: _load('kepala', null) };
    },
    async save(data) {
      _save('kepala', data);
      return { data, ok: true };
    },
  };

  // Export / import for debugging
  function exportAll() {
    const keys = ['siswa', 'guru', 'kelas', 'mapel', 'nilai', 'kepala'];
    const obj = {};
    keys.forEach(k => { obj[k] = _load(k, null); });
    return JSON.stringify(obj, null, 2);
  }

  function importAll(jsonStr) {
    const obj = JSON.parse(jsonStr);
    Object.entries(obj).forEach(([k, v]) => _save(k, v));
  }

  return { Siswa, Guru, Kelas, Mapel, Nilai, Kepala, exportAll, importAll };
})();

/* =============================================================
 * DataService: Unified data access layer.
 * Automatically routes to SheetsAPI or LocalStore depending
 * on whether Google Sheets is connected.
 * ============================================================= */
const DataService = (() => {
  function _store() {
    return SheetsAPI.isConnected() ? SheetsAPI : LocalStore;
  }

  return {
    get store()   { return _store(); },
    get Siswa()   { return _store().Siswa; },
    get Nilai()   { return _store().Nilai; },
    get Mapel()   { return _store().Mapel; },
    get Guru()    { return _store().Guru; },
    get Kepala()  { return _store().Kepala; },
    get Kelas()   { return _store().Kelas; },
  };
})();
