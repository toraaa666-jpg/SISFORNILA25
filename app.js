// ============================
// FIREBASE CONFIG
// ============================
const firebaseConfig = {
  apiKey: "AIzaSyBKZriAa__A646o7kMmK5QQALxYQLVNK0M",

  authDomain: "sisfornila25.firebaseapp.com",

  databaseURL: "https://sisfornila25-default-rtdb.asia-southeast1.firebasedatabase.app",

  projectId: "sisfornila25",

  storageBucket: "sisfornila25.firebasestorage.app",

  messagingSenderId: "164874794036",

  appId: "1:164874794036:web:700e220791d5eb51134661"

};

// Firebase Safe Init
let db = null;
let firebaseReady = false;
try {
  if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY") {
    firebase.initializeApp(firebaseConfig);
    db = firebase.database();
    firebaseReady = true;
  }
} catch (e) { console.warn("Firebase error:", e); }

// LocalStorage fallback
function lsGet(k) { try { return JSON.parse(localStorage.getItem('kku_'+k)||'{}'); } catch { return {}; } }
function lsSet(k, v) { try { localStorage.setItem('kku_'+k, JSON.stringify(v)); } catch {} }

function dbPush(col, data) {
  if (firebaseReady) return db.ref(col).push(data);
  const id = 'L'+Date.now()+Math.random().toString(36).slice(2,6);
  const s = lsGet(col); s[id] = data; lsSet(col, s);
  appData[col] = s; scheduleRender(); return Promise.resolve({key:id});
}
function dbUpdate(col, id, data) {
  if (firebaseReady) return db.ref(col+'/'+id).update(data);
  const s = lsGet(col); s[id] = Object.assign({}, s[id]||{}, data); lsSet(col, s);
  appData[col] = s; scheduleRender(); return Promise.resolve();
}
function dbRemove(col, id) {
  if (firebaseReady) return db.ref(col+'/'+id).remove();
  const s = lsGet(col); delete s[id]; lsSet(col, s);
  appData[col] = s; scheduleRender(); return Promise.resolve();
}
let _rt = null;
function scheduleRender() {
  clearTimeout(_rt);
  _rt = setTimeout(()=>{ renderKelas();renderJadwal();renderAbsen();renderTugas();updateDashboard();populateSelects(); }, 50);
}
function loadLocalData() {
  ['kelas','jadwal','absen','tugas'].forEach(k => { appData[k] = lsGet(k); });
}

// Admin credentials — ganti sebelum deploy!
const ADMINS = [
  { username: "admin", password: "kelas2024" },
  { username: "dosen", password: "dosen123" }
];

// State
let isAdmin = false;
let currentUser = null;
let appData = { kelas:{}, jadwal:{}, absen:{}, tugas:{} };
let selectedColor = "#6366f1";
let shuffledGroups = [];

// ============================
// AUTH
// ============================
function doLogin() {
  const user = document.getElementById('loginUser').value.trim();
  const pass = document.getElementById('loginPass').value;
  const found = ADMINS.find(a => a.username === user && a.password === pass);
  if (found) {
    isAdmin = true; currentUser = user;
    document.getElementById('loginModal').classList.remove('active');
    initApp();
    showToast('Berhasil masuk sebagai admin! 👑', 'success');
  } else {
    document.getElementById('loginError').classList.remove('hidden');
    setTimeout(() => document.getElementById('loginError').classList.add('hidden'), 3000);
  }
}
function enterAsGuest() {
  isAdmin = false; currentUser = null;
  document.getElementById('loginModal').classList.remove('active');
  initApp();
}
function doLogout() {
  isAdmin = false; currentUser = null;
  updateAdminUI();
  document.getElementById('loginModal').classList.add('active');
  document.getElementById('loginUser').value = '';
  document.getElementById('loginPass').value = '';
}
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('loginPass').addEventListener('keydown', e => { if(e.key==='Enter') doLogin(); });
  document.getElementById('loginUser').addEventListener('keydown', e => { if(e.key==='Enter') doLogin(); });
});

// ============================
// INIT
// ============================
function initApp() {
  updateAdminUI();
  if (firebaseReady) {
    listenFirebase();
  } else {
    loadLocalData();
    renderKelas(); renderJadwal(); renderAbsen(); renderTugas();
    updateDashboard(); populateSelects();
    showFirebaseWarning();
  }
}

function showFirebaseWarning() {
  if (document.getElementById('fbWarn')) return;
  const bar = document.createElement('div');
  bar.id = 'fbWarn';
  bar.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:linear-gradient(90deg,#f59e0b,#ef4444);color:white;font-size:13px;font-weight:600;padding:10px 20px;text-align:center;z-index:9999;display:flex;align-items:center;justify-content:center;gap:12px;';
  bar.innerHTML = '⚠️ Firebase belum dikonfigurasi — data hanya tersimpan di browser ini. <span style="font-weight:400;opacity:0.85">Edit app.js dan isi firebaseConfig untuk data permanen</span> <button onclick="this.parentElement.remove()" style="background:rgba(0,0,0,0.25);border:none;color:white;padding:4px 10px;border-radius:6px;cursor:pointer;">✕</button>';
  document.body.appendChild(bar);
}

// ============================
// UPDATE ADMIN UI
// ============================
function updateAdminUI() {
  // Tampilkan/sembunyikan tombol admin dengan getElementById + inline style
  var show = isAdmin ? 'inline-block' : 'none';
  var adminBtns = ['logoutBtn','startBtn','btnTambahKelas','btnTambahJadwal','btnTambahAbsen','btnTambahTugas'];
  adminBtns.forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.style.display = show;
  });

  var tag = document.getElementById('adminTag');
  document.getElementById('modeLabel').textContent = isAdmin ? 'Mode Admin' : 'Mode Pengunjung';
  if (isAdmin) { tag.classList.add('is-admin'); } else { tag.classList.remove('is-admin'); }
  document.getElementById('userName').textContent = currentUser || 'Pengunjung';
  document.getElementById('userRole').textContent = isAdmin ? 'Administrator' : 'Read Only';
  document.getElementById('userAvatar').textContent = isAdmin ? '👑' : '👤';
}

// ============================
// FIREBASE LISTENERS
// ============================
function listenFirebase() {
  db.ref('kelas').on('value', snap => { appData.kelas = snap.val()||{}; renderKelas(); updateDashboard(); populateSelects(); });
  db.ref('jadwal').on('value', snap => { appData.jadwal = snap.val()||{}; renderJadwal(); updateDashboard(); });
  db.ref('absen').on('value', snap => { appData.absen = snap.val()||{}; renderAbsen(); updateDashboard(); });
  db.ref('tugas').on('value', snap => { appData.tugas = snap.val()||{}; renderTugas(); updateDashboard(); });
}

// ============================
// NAVIGATION
// ============================
function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-'+page).classList.add('active');
  const nav = document.querySelector('[data-page="'+page+'"]');
  if (nav) nav.classList.add('active');
  const titles = {dashboard:'Dashboard',kelas:'Kelas',jadwal:'Jadwal',absen:'Absensi',tugas:'Tugas & Kelompok'};
  document.getElementById('pageTitle').textContent = titles[page]||page;
  if (window.innerWidth < 768) document.getElementById('sidebar').classList.remove('open');
}
function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }

// ============================
// MODALS
// ============================
function openModal(id) {
  if (!isAdmin) { showToast('Anda tidak memiliki akses admin', 'error'); return; }
  document.getElementById(id).classList.add('active');
  // Init tabel mahasiswa jika buka modal kelas baru
  if (id === 'modalKelas') {
    var tbody = document.getElementById('mhsInputBody');
    if (tbody && tbody.rows.length === 0) tambahBarisMhs();
  }
}
function closeModal(id) { document.getElementById(id).classList.remove('active'); }
window.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay') && e.target.id !== 'loginModal')
    e.target.classList.remove('active');
});

// Color picker
document.querySelectorAll('.color-opt').forEach(el => {
  el.addEventListener('click', () => {
    document.querySelectorAll('.color-opt').forEach(o => o.classList.remove('active'));
    el.classList.add('active');
    selectedColor = el.dataset.color;
  });
});

// ============================
// POPULATE SELECTS
// ============================
function populateSelects() {
  ['jadwalKelas','absenKelas','tugasKelas'].forEach(sid => {
    const sel = document.getElementById(sid); if (!sel) return;
    const val = sel.value;
    sel.innerHTML = '<option value="">Pilih Kelas</option>';
    Object.entries(appData.kelas).forEach(([id,k]) => { sel.innerHTML += '<option value="'+id+'">'+k.nama+'</option>'; });
    if (val) sel.value = val;
  });
}

// ============================
// DASHBOARD
// ============================
function updateDashboard() {
  const kLen=Object.keys(appData.kelas).length, jLen=Object.keys(appData.jadwal).length;
  const tLen=Object.keys(appData.tugas).length, aLen=Object.keys(appData.absen).length;
  const hasData = kLen > 0;

  document.getElementById('dashboardEmpty').classList.toggle('hidden', hasData);
  document.getElementById('dashboardStats').classList.toggle('hidden', !hasData);
  // startBtn sudah dihandle oleh updateAdminUI via class admin-hidden
  if (!hasData) return;

  document.getElementById('statKelas').textContent = kLen;
  document.getElementById('statJadwal').textContent = jLen;
  document.getElementById('statTugas').textContent = tLen;
  document.getElementById('statSesi').textContent = aLen;

  const days=['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu'];
  const todayIdx = (new Date().getDay()+6)%7;
  const jadwals = Object.values(appData.jadwal).sort((a,b)=>
    ((days.indexOf(a.hari)-todayIdx+7)%7)-((days.indexOf(b.hari)-todayIdx+7)%7)||a.mulai.localeCompare(b.mulai));

  const upList = document.getElementById('upcomingList');
  upList.innerHTML = jadwals.length===0 ? '<div style="color:var(--text3);font-size:13px">Belum ada jadwal</div>'
    : jadwals.slice(0,4).map(j => {
        const k=appData.kelas[j.kelasId], c=k?.warna||'#6366f1';
        return '<div class="upcoming-item"><div class="upcoming-dot" style="background:'+c+'"></div><div class="upcoming-text"><div style="font-weight:600;font-size:13px">'+(k?.nama||j.kelasId)+'</div><div style="color:var(--text3);font-size:12px">'+j.hari+'</div></div><div class="upcoming-time">'+j.mulai+' – '+j.selesai+'</div></div>';
      }).join('');

  const now=new Date();
  const tugasArr=Object.values(appData.tugas).filter(t=>t.deadline&&new Date(t.deadline)>now).sort((a,b)=>new Date(a.deadline)-new Date(b.deadline));
  const dlList=document.getElementById('deadlineList');
  dlList.innerHTML = tugasArr.length===0 ? '<div style="color:var(--text3);font-size:13px">Tidak ada deadline terdekat</div>'
    : tugasArr.slice(0,4).map(t => {
        const k=appData.kelas[t.kelasId], diff=Math.ceil((new Date(t.deadline)-now)/86400000);
        const c=diff<=3?'var(--danger)':'var(--warning)';
        return '<div class="upcoming-item"><div class="upcoming-dot" style="background:'+c+'"></div><div class="upcoming-text"><div style="font-weight:600;font-size:13px">'+t.nama+'</div><div style="color:var(--text3);font-size:12px">'+(k?.nama||'')+'</div></div><div class="upcoming-time" style="color:'+c+'">'+(diff===0?'Hari ini':diff+'h lagi')+'</div></div>';
      }).join('');
}

// ============================
// KELAS
// ============================
// ============================
// IMPORT MAHASISWA
// ============================
var importPreviewData = [];

function triggerImport() {
  document.getElementById('importFileInput').click();
}

function handleImportFile(input) {
  var file = input.files[0];
  if (!file) return;
  var ext = file.name.split('.').pop().toLowerCase();
  var title = '📄 Preview: ' + file.name;
  document.getElementById('importHelperTitle').textContent = title;

  if (ext === 'csv' || ext === 'txt') {
    var reader = new FileReader();
    reader.onload = function(e) {
      var text = e.target.result;
      var rows = parseCSV(text);
      showImportPreview(rows);
    };
    reader.readAsText(file, 'UTF-8');
  } else if (ext === 'xlsx' || ext === 'xls') {
    var reader = new FileReader();
    reader.onload = function(e) {
      try {
        var data = new Uint8Array(e.target.result);
        var workbook = XLSX.read(data, {type:'array'});
        var sheet = workbook.Sheets[workbook.SheetNames[0]];
        var rows = XLSX.utils.sheet_to_json(sheet, {header:1, defval:''});
        showImportPreview(rows);
      } catch(err) {
        showToast('Gagal baca file Excel: ' + err.message, 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  } else if (ext === 'docx') {
    var reader = new FileReader();
    reader.onload = function(e) {
      try {
        mammoth.extractRawText({arrayBuffer: e.target.result}).then(function(result) {
          var text = result.value;
          var rows = parseTextTable(text);
          showImportPreview(rows);
        });
      } catch(err) {
        showToast('Gagal baca file DOCX: ' + err.message, 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  } else {
    showToast('Format tidak didukung. Gunakan CSV, TXT, XLSX, atau DOCX.', 'error');
  }
  // Reset input supaya bisa import file yang sama lagi
  input.value = '';
}

function parseCSV(text) {
  // Support delimiter: koma, titik koma, tab
  var lines = text.split(/\r?\n/).filter(function(l){ return l.trim(); });
  return lines.map(function(line) {
    // Deteksi delimiter
    var delim = line.indexOf(';') > -1 ? ';' : line.indexOf('\t') > -1 ? '\t' : ',';
    // Handle quoted fields
    var result = [], cur = '', inQ = false;
    for (var i = 0; i < line.length; i++) {
      var c = line[i];
      if (c === '"') { inQ = !inQ; }
      else if (c === delim && !inQ) { result.push(cur.trim()); cur = ''; }
      else { cur += c; }
    }
    result.push(cur.trim());
    return result;
  });
}

function parseTextTable(text) {
  // Ambil baris dari teks DOCX — support tab-separated atau spasi banyak
  var lines = text.split(/\r?\n/).filter(function(l){ return l.trim(); });
  return lines.map(function(line) {
    if (line.indexOf('\t') > -1) return line.split('\t').map(function(s){return s.trim();});
    // Coba split by 2+ spasi
    var parts = line.split(/  +/);
    if (parts.length > 1) return parts.map(function(s){return s.trim();});
    // Fallback: satu kolom (nama saja)
    return [line.trim()];
  });
}

// Deteksi apakah baris adalah header
function isHeaderRow(row) {
  var headers = ['nama','name','nim','nrp','nip','mahasiswa','student','no','nomor','gender','jk','sex','hp','telp','phone','email','ket','keterangan'];
  var first = (row[0]||'').toLowerCase().trim();
  return headers.some(function(h){ return first.indexOf(h) > -1; });
}

// Map kolom otomatis berdasarkan header atau urutan
function mapColumns(rows) {
  if (rows.length === 0) return [];
  var dataRows = rows;
  var colMap = { nama:-1, nim:-1, gender:-1, hp:-1, email:-1, ket:-1 };

  if (isHeaderRow(rows[0])) {
    // Pakai baris pertama sebagai header
    var headers = rows[0].map(function(h){ return (h||'').toLowerCase().trim(); });
    headers.forEach(function(h, i) {
      if (/nama|name|mahasiswa|student/.test(h)) colMap.nama = i;
      else if (/nim|nrp|nip|no\.?\s*mhs|nomor/.test(h) && colMap.nim === -1) colMap.nim = i;
      else if (/gender|jk|jenis|sex|kelamin/.test(h)) colMap.gender = i;
      else if (/hp|telp|phone|wa|whatsapp|handphone/.test(h)) colMap.hp = i;
      else if (/email|mail/.test(h)) colMap.email = i;
      else if (/ket|keterangan|note|info/.test(h)) colMap.ket = i;
    });
    dataRows = rows.slice(1);
  }

  // Jika header tidak terdeteksi, pakai urutan default: Nama, NIM, Gender, HP, Email, Ket
  if (colMap.nama === -1) {
    colMap = { nama:0, nim:1, gender:2, hp:3, email:4, ket:5 };
  }

  return dataRows.map(function(row) {
    var g = colMap.gender > -1 ? (row[colMap.gender]||'').toUpperCase().trim() : '';
    if (g === 'LAKI-LAKI' || g === 'LAKI' || g === 'L' || g === 'M' || g === 'MALE') g = 'L';
    else if (g === 'PEREMPUAN' || g === 'PR' || g === 'P' || g === 'F' || g === 'FEMALE' || g === 'WANITA') g = 'P';
    else g = '';
    return {
      nama:  colMap.nama  > -1 ? (row[colMap.nama]||'').toString().trim()  : '',
      nim:   colMap.nim   > -1 ? (row[colMap.nim]||'').toString().trim()   : '',
      gender: g,
      hp:    colMap.hp    > -1 ? (row[colMap.hp]||'').toString().trim()    : '',
      email: colMap.email > -1 ? (row[colMap.email]||'').toString().trim() : '',
      ket:   colMap.ket   > -1 ? (row[colMap.ket]||'').toString().trim()   : '',
    };
  }).filter(function(m){ return m.nama.length > 0; });
}

function showImportPreview(rows) {
  importPreviewData = mapColumns(rows);
  var panel = document.getElementById('importHelperPanel');
  var body  = document.getElementById('importHelperBody');

  if (importPreviewData.length === 0) {
    body.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text3)">Tidak ada data yang terdeteksi. Cek format file.</div>';
    panel.classList.remove('hidden');
    return;
  }

  var ok = importPreviewData.filter(function(m){ return m.nama; }).length;
  var html = '<table class="import-preview-table">'
    + '<thead><tr><th>No</th><th>Nama</th><th>NIM</th><th>Gender</th><th>HP</th><th>Email</th><th>Ket</th></tr></thead>'
    + '<tbody>'
    + importPreviewData.map(function(m, i){
        var cls = m.nama ? 'import-row-ok' : 'import-row-warn';
        return '<tr class="' + cls + '">'
          + '<td style="color:var(--text3)">' + (i+1) + '</td>'
          + '<td style="font-weight:600">' + (m.nama||'<span style="color:var(--danger)">–</span>') + '</td>'
          + '<td style="font-family:monospace">' + (m.nim||'–') + '</td>'
          + '<td>' + (m.gender ? '<span style="color:'+(m.gender==='L'?'#60a5fa':'#f472b6')+'">' + m.gender + '</span>' : '–') + '</td>'
          + '<td>' + (m.hp||'–') + '</td>'
          + '<td style="font-size:11px">' + (m.email||'–') + '</td>'
          + '<td style="color:var(--text3)">' + (m.ket||'–') + '</td>'
        + '</tr>';
      }).join('')
    + '</tbody></table>';

  body.innerHTML = html;

  // Stats
  var stats = document.createElement('div');
  stats.className = 'import-stats';
  stats.innerHTML = '<span class="import-stat">Terdeteksi: <strong>' + importPreviewData.length + ' mahasiswa</strong></span>'
    + '<span class="import-stat">Siap import: <strong style="color:var(--success)">' + ok + '</strong></span>'
    + (importPreviewData.length - ok > 0 ? '<span class="import-stat" style="color:var(--warning)">⚠️ ' + (importPreviewData.length-ok) + ' baris kosong nama</span>' : '');
  body.parentNode.insertBefore(stats, body.nextSibling);

  panel.classList.remove('hidden');
}

function applyImport() {
  if (importPreviewData.length === 0) return;
  var valid = importPreviewData.filter(function(m){ return m.nama; });
  // Append ke tabel yang sudah ada (bukan replace)
  valid.forEach(function(m){ tambahBarisMhs(m); });
  cancelImport();
  showToast('✅ ' + valid.length + ' mahasiswa berhasil diimport!', 'success');
}

function cancelImport() {
  document.getElementById('importHelperPanel').classList.add('hidden');
  document.getElementById('importHelperBody').innerHTML = '';
  importPreviewData = [];
  // Hapus stats jika ada
  var stats = document.querySelector('.import-stats');
  if (stats) stats.remove();
}

function tambahBarisMhs(data) {
  data = data || {};
  var tbody = document.getElementById('mhsInputBody');
  var rowNum = tbody.rows.length + 1;
  var tr = document.createElement('tr');
  tr.innerHTML =
    '<td class="mhs-no">'+rowNum+'</td>'+
    '<td><input type="text" placeholder="Nama lengkap" value="'+(data.nama||'')+'" /></td>'+
    '<td><input type="text" placeholder="NIM" value="'+(data.nim||'')+'" /></td>'+
    '<td><select>'+
      '<option value="">-</option>'+
      '<option value="L"'+(data.gender==='L'?' selected':'')+'>Laki-laki</option>'+
      '<option value="P"'+(data.gender==='P'?' selected':'')+'>Perempuan</option>'+
    '</select></td>'+
    '<td><input type="text" placeholder="08xx" value="'+(data.hp||'')+'" /></td>'+
    '<td><input type="email" placeholder="email@..." value="'+(data.email||'')+'" /></td>'+
    '<td><input type="text" placeholder="Keterangan" value="'+(data.ket||'')+'" /></td>'+
    '<td><button class="btn-del-row" onclick="this.closest(\'tr\').remove();renumberMhs()">✕</button></td>';
  tbody.appendChild(tr);
}

function renumberMhs() {
  document.querySelectorAll('#mhsInputBody tr').forEach(function(tr,i){
    var no=tr.querySelector('.mhs-no'); if(no) no.textContent=i+1;
  });
}

function getMhsFromTable() {
  var rows=document.querySelectorAll('#mhsInputBody tr'), result=[];
  rows.forEach(function(tr){
    var inp=tr.querySelectorAll('input,select');
    var nama=inp[0]?inp[0].value.trim():''; if(!nama) return;
    result.push({nama:nama, nim:inp[1]?inp[1].value.trim():'', gender:inp[2]?inp[2].value:'', hp:inp[3]?inp[3].value.trim():'', email:inp[4]?inp[4].value.trim():'', ket:inp[5]?inp[5].value.trim():''});
  });
  return result;
}

function saveKelas() {
  var nama=document.getElementById('kelasNama').value.trim();
  if(!nama){showToast('Nama kelas wajib diisi!','error');return;}
  var mahasiswa=getMhsFromTable();
  var data={nama:nama,mahasiswa:mahasiswa,warna:selectedColor,createdAt:Date.now()};
  var eid=document.getElementById('kelasEditId').value;
  if(eid){
    dbUpdate('kelas',eid,data).then(function(){showToast('Kelas diperbarui! ✅','success');closeModal('modalKelas');resetKelasForm();});
  } else {
    dbPush('kelas',data).then(function(){showToast('Kelas ditambahkan! 🎉','success');closeModal('modalKelas');resetKelasForm();});
  }
}

function resetKelasForm() {
  document.getElementById('kelasNama').value='';
  document.getElementById('kelasEditId').value='';
  document.getElementById('mhsInputBody').innerHTML='';
  document.getElementById('modalKelasTitle').textContent='Tambah Kelas';
  selectedColor='#6366f1';
  document.querySelectorAll('.color-opt').forEach(function(o){o.classList.remove('active');});
  document.querySelector('[data-color="#6366f1"]').classList.add('active');
  tambahBarisMhs();
}

function editKelas(id) {
  var k=appData.kelas[id]; if(!k) return;
  document.getElementById('kelasEditId').value=id;
  document.getElementById('kelasNama').value=k.nama||'';
  document.getElementById('modalKelasTitle').textContent='Edit Kelas';
  selectedColor=k.warna||'#6366f1';
  document.querySelectorAll('.color-opt').forEach(function(o){o.classList.toggle('active',o.dataset.color===selectedColor);});
  document.getElementById('mhsInputBody').innerHTML='';
  var mhs=k.mahasiswa||[];
  if(mhs.length>0){ mhs.forEach(function(m){ tambahBarisMhs(typeof m==='string'?{nama:m}:m); }); }
  else { tambahBarisMhs(); }
  openModal('modalKelas');
}

function deleteKelas(id) {
  if(!confirm('Hapus kelas ini?')) return;
  dbRemove('kelas',id).then(function(){showToast('Kelas dihapus','success');closeMhsPanel();});
}

function viewMahasiswa(id) {
  var k=appData.kelas[id]; if(!k) return;
  document.getElementById('mhsPanelTitle').textContent='Daftar Mahasiswa — '+k.nama;
  document.getElementById('mhsPanelSubtitle').textContent=(k.mahasiswa||[]).length+' mahasiswa terdaftar';
  var tbody=document.getElementById('mhsTableBody');
  var mhs=k.mahasiswa||[];
  if(mhs.length===0){
    tbody.innerHTML='<tr><td colspan="7" style="text-align:center;color:var(--text3);padding:24px">Belum ada mahasiswa</td></tr>';
  } else {
    tbody.innerHTML=mhs.map(function(m,i){
      if(typeof m==='string') m={nama:m};
      var gc=m.gender==='L'?'gender-l':m.gender==='P'?'gender-p':'';
      var gl=m.gender==='L'?'L':m.gender==='P'?'P':'–';
      return '<tr>'+
        '<td class="mhs-no">'+(i+1)+'</td>'+
        '<td style="font-weight:600">'+m.nama+'</td>'+
        '<td style="font-family:monospace;font-size:13px">'+(m.nim||'–')+'</td>'+
        '<td>'+(m.gender?'<span class="gender-badge '+gc+'">'+gl+'</span>':'–')+'</td>'+
        '<td>'+(m.hp||'–')+'</td>'+
        '<td style="font-size:12px">'+(m.email||'–')+'</td>'+
        '<td style="color:var(--text3)">'+(m.ket||'–')+'</td>'+
      '</tr>';
    }).join('');
  }
  document.getElementById('kelasMhsPanel').classList.remove('hidden');
  setTimeout(function(){document.getElementById('kelasMhsPanel').scrollIntoView({behavior:'smooth',block:'start'});},50);
}

function closeMhsPanel() {
  document.getElementById('kelasMhsPanel').classList.add('hidden');
}

function renderKelas() {
  var grid=document.getElementById('kelasGrid'), empty=document.getElementById('kelasEmpty');
  var entries=Object.entries(appData.kelas);
  if(entries.length===0){empty.classList.remove('hidden');grid.innerHTML='';return;}
  empty.classList.add('hidden');
  var html='';
  entries.forEach(function(e){
    var id=e[0],k=e[1];
    var mhs=k.mahasiswa||[];
    var lCount=mhs.filter(function(m){return typeof m==='object'&&m.gender==='L';}).length;
    var pCount=mhs.filter(function(m){return typeof m==='object'&&m.gender==='P';}).length;
    var adminBtns=isAdmin
      ? '<button class="btn-sm btn-edit" onclick="editKelas(\'' + id + '\')">✏️ Edit</button>'
        + '<button class="btn-sm btn-del" onclick="deleteKelas(\'' + id + '\')">🗑</button>'
      : '';
    html += '<div class="kelas-card">'
      + '<div class="kelas-card-top" style="background:'+(k.warna||'#6366f1')+'"></div>'
      + '<div class="kelas-card-body">'
        + '<div class="kelas-nama">'+k.nama+'</div>'
        + '<div class="kelas-meta" style="margin-top:8px">'
          + '<span class="kelas-tag">👥 '+mhs.length+' mahasiswa</span>'
          + (lCount>0?'<span class="kelas-tag" style="color:#60a5fa">♂ '+lCount+' L</span>':'')
          + (pCount>0?'<span class="kelas-tag" style="color:#f472b6">♀ '+pCount+' P</span>':'')
        + '</div>'
        + '<div class="kelas-card-actions">'
          + '<button class="btn-sm btn-view" onclick="viewMahasiswa(\'' + id + '\')">👥 Mahasiswa</button>'
          + adminBtns
        + '</div>'
      + '</div>'
    + '</div>';
  });
  grid.innerHTML = html;
}


// ============================
// JADWAL
// ============================
var DAYS = ['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];

var HCLR = {
  Senin:  {bg:'#6366f1', light:'rgba(99,102,241,0.12)',  text:'#a5b4fc'},
  Selasa: {bg:'#ec4899', light:'rgba(236,72,153,0.12)',  text:'#f9a8d4'},
  Rabu:   {bg:'#f59e0b', light:'rgba(245,158,11,0.12)',  text:'#fcd34d'},
  Kamis:  {bg:'#10b981', light:'rgba(16,185,129,0.12)',  text:'#6ee7b7'},
  Jumat:  {bg:'#3b82f6', light:'rgba(59,130,246,0.12)',  text:'#93c5fd'},
  Sabtu:  {bg:'#8b5cf6', light:'rgba(139,92,246,0.12)',  text:'#d8b4fe'},
};

function calcDurasi(mulai, selesai) {
  if(!mulai||!selesai) return '';
  var m1=mulai.split(':'), m2=selesai.split(':');
  var diff=(parseInt(m2[0])*60+parseInt(m2[1]))-(parseInt(m1[0])*60+parseInt(m1[1]));
  if(diff<=0) return '';
  var h=Math.floor(diff/60), m=diff%60;
  return h>0?(h+' jam'+(m>0?' '+m+' mnt':'')):(m+' mnt');
}

function saveJadwal() {
  var kelasId=document.getElementById('jadwalKelas').value;
  var matkul=document.getElementById('jadwalMatkul').value.trim();
  var hari=document.getElementById('jadwalHari').value;
  var mulai=document.getElementById('jadwalMulai').value;
  var selesai=document.getElementById('jadwalSelesai').value;
  if(!kelasId||!matkul||!hari||!mulai||!selesai){showToast('Kelas, matkul, hari, dan jam wajib diisi!','error');return;}
  var data={
    kelasId:kelasId, matkul:matkul, kodeMk:document.getElementById('jadwalKodeMk').value.trim(),
    dosen:document.getElementById('jadwalDosen').value.trim(), sks:document.getElementById('jadwalSks').value,
    semester:document.getElementById('jadwalSemester').value.trim(), hari:hari, mulai:mulai, selesai:selesai,
    ruangan:document.getElementById('jadwalRuangan').value.trim(), mode:document.getElementById('jadwalMode').value,
    link:document.getElementById('jadwalLink').value.trim(), catatan:document.getElementById('jadwalCatatan').value.trim(),
    createdAt:Date.now()
  };
  var eid=document.getElementById('jadwalEditId').value;
  if(eid){
    dbUpdate('jadwal',eid,data).then(function(){showToast('Jadwal diperbarui! ✅','success');closeModal('modalJadwal');resetJadwalForm();});
  } else {
    dbPush('jadwal',data).then(function(){showToast('Jadwal ditambahkan! 🎉','success');closeModal('modalJadwal');resetJadwalForm();});
  }
}

function resetJadwalForm() {
  ['jadwalKelas','jadwalMatkul','jadwalKodeMk','jadwalDosen','jadwalSks','jadwalSemester',
   'jadwalHari','jadwalMulai','jadwalSelesai','jadwalRuangan','jadwalLink','jadwalCatatan','jadwalEditId']
    .forEach(function(id){ var el=document.getElementById(id); if(el) el.value=''; });
  var modeEl=document.getElementById('jadwalMode');
  if(modeEl) modeEl.value='offline';
  document.getElementById('modalJadwalTitle').textContent='Tambah Jadwal';
}

function editJadwal(id) {
  var j=appData.jadwal[id]; if(!j) return;
  document.getElementById('jadwalEditId').value=id;
  document.getElementById('jadwalKelas').value=j.kelasId||'';
  document.getElementById('jadwalMatkul').value=j.matkul||'';
  document.getElementById('jadwalKodeMk').value=j.kodeMk||'';
  document.getElementById('jadwalDosen').value=j.dosen||'';
  document.getElementById('jadwalSks').value=j.sks||'';
  document.getElementById('jadwalSemester').value=j.semester||'';
  document.getElementById('jadwalHari').value=j.hari||'';
  document.getElementById('jadwalMulai').value=j.mulai||'';
  document.getElementById('jadwalSelesai').value=j.selesai||'';
  document.getElementById('jadwalRuangan').value=j.ruangan||'';
  document.getElementById('jadwalMode').value=j.mode||'offline';
  document.getElementById('jadwalLink').value=j.link||'';
  document.getElementById('jadwalCatatan').value=j.catatan||'';
  document.getElementById('modalJadwalTitle').textContent='Edit Jadwal';
  openModal('modalJadwal');
}

function deleteJadwal(id) {
  if(!confirm('Hapus jadwal ini?')) return;
  dbRemove('jadwal',id).then(function(){showToast('Jadwal dihapus','success');});
}

function renderJadwal() {
  var empty = document.getElementById('jadwalEmpty');
  var board = document.getElementById('jadwalBoard');
  var entries = Object.entries(appData.jadwal);

  if (entries.length === 0) {
    empty.classList.remove('hidden');
    board.style.display = 'none';
    // kosongkan semua kolom
    DAYS.forEach(function(d){ var b=document.getElementById('jbody-'+d); if(b) b.innerHTML=''; });
    return;
  }
  empty.classList.add('hidden');
  board.style.display = '';

  // Kelompokkan per hari
  var byDay = {};
  DAYS.forEach(function(d){ byDay[d]=[]; });
  entries.forEach(function(e){
    var id=e[0], j=e[1];
    if(byDay[j.hari]) byDay[j.hari].push({id:id, data:j});
  });

  DAYS.forEach(function(day) {
    var body = document.getElementById('jbody-'+day);
    if(!body) return;
    var items = byDay[day].sort(function(a,b){
      return (a.data.mulai||'').localeCompare(b.data.mulai||'');
    });

    if(items.length === 0) {
      body.innerHTML = '<div class="jadwal-empty-day">Belum ada jadwal</div>';
      return;
    }

    var hc = HCLR[day] || {bg:'#666', light:'rgba(100,100,120,0.1)', text:'#aaa'};
    body.innerHTML = items.map(function(item) {
      var id=item.id, j=item.data;
      var k = appData.kelas[j.kelasId];
      var durasi = calcDurasi(j.mulai, j.selesai);
      var modeLbl = j.mode==='online'?'💻 Online':j.mode==='hybrid'?'🔀 Hybrid':'🏫 Offline';
      var modeCls = j.mode==='online'?'jmode-online':j.mode==='hybrid'?'jmode-hybrid':'jmode-offline';

      var adminBtns = isAdmin
        ? '<div class="jcard-actions">'
            + '<button class="btn-sm btn-edit" onclick="editJadwal(\'' + id + '\')">✏️</button>'
            + '<button class="btn-sm btn-del" onclick="deleteJadwal(\'' + id + '\')">🗑</button>'
          + '</div>'
        : '';

      return '<div class="jadwal-card" style="border-left-color:' + hc.bg + '">'
        + '<div class="jcard-time">'
            + '<span class="jcard-jam">' + (j.mulai||'?') + ' – ' + (j.selesai||'?') + '</span>'
            + (durasi ? '<span class="jcard-durasi">' + durasi + '</span>' : '')
          + '</div>'
        + '<div class="jcard-matkul">' + (j.matkul||'–') + '</div>'
        + (j.kodeMk ? '<div class="jcard-kode">' + j.kodeMk + '</div>' : '')
        + (k ? '<div class="jcard-kelas">' + k.nama + '</div>' : '')
        + '<div class="jcard-meta">'
            + (j.dosen ? '<div class="jcard-meta-row">👨‍🏫 ' + j.dosen + (j.sks?' · '+j.sks+' SKS':'') + '</div>' : '')
            + (j.ruangan ? '<div class="jcard-meta-row">📍 ' + j.ruangan + '</div>' : '')
            + '<div class="jcard-meta-row"><span class="jcard-mode ' + modeCls + '">' + modeLbl + '</span></div>'
            + (j.mode!=='offline'&&j.link ? '<div class="jcard-meta-row"><a href="' + j.link + '" target="_blank" style="color:var(--accent2);font-size:11px;">🔗 Link Meet</a></div>' : '')
            + (j.catatan ? '<div class="jcard-meta-row jcard-catatan">📝 ' + j.catatan + '</div>' : '')
          + '</div>'
        + adminBtns
      + '</div>';
    }).join('');
  });
}


// ============================
// ABSENSI
// ============================
function getMhsNama(m) {
  if (typeof m === 'string') return m;
  return m.nama || '(tanpa nama)';
}

function loadMahasiswaAbsen() {
  var kelasId = document.getElementById('absenKelas').value;
  var kelas = appData.kelas[kelasId];
  var container = document.getElementById('absenMhsList');
  if (!kelas || !kelas.mahasiswa || kelas.mahasiswa.length === 0) {
    container.innerHTML = '<div style="color:var(--text3);font-size:13px;padding:8px 0">Tidak ada mahasiswa di kelas ini</div>';
    return;
  }
  container.innerHTML = kelas.mahasiswa.map(function(mhs, i) {
    var nama = getMhsNama(mhs);
    var nim = (typeof mhs === 'object' && mhs.nim) ? ' <span style="color:var(--text3);font-size:11px;">(' + mhs.nim + ')</span>' : '';
    return '<div class="absen-mhs-item">'
      + '<label for="mhs_' + i + '" style="cursor:pointer;flex:1">' + nama + nim + '</label>'
      + '<label class="absen-toggle">'
        + '<input type="checkbox" id="mhs_' + i + '" checked data-mhs="' + nama + '" />'
        + '<span class="slider"></span>'
      + '</label>'
    + '</div>';
  }).join('');
}
function saveAbsen() {
  const kelasId=document.getElementById('absenKelas').value, tanggal=document.getElementById('absenTanggal').value;
  const topik=document.getElementById('absenTopik').value.trim();
  if(!kelasId||!tanggal){ showToast('Kelas dan tanggal wajib diisi!','error'); return; }
  const kehadiran={};
  document.querySelectorAll('#absenMhsList input[type="checkbox"]').forEach(cb=>{ kehadiran[cb.dataset.mhs]=cb.checked; });
  if(Object.keys(kehadiran).length===0){ showToast('Tidak ada mahasiswa dalam kelas ini!','error'); return; }
  dbPush('absen',{kelasId,tanggal,topik:topik||'Pertemuan',kehadiran,createdAt:Date.now()})
    .then(()=>{
      showToast('Absensi disimpan! ✅','success'); closeModal('modalAbsen');
      ['absenKelas','absenTanggal','absenTopik'].forEach(id=>{ document.getElementById(id).value=''; });
      document.getElementById('absenMhsList').innerHTML='';
    });
}
function viewAbsen(id) {
  const a=appData.absen[id]; if(!a) return;
  const kelas=appData.kelas[a.kelasId], kehadiran=a.kehadiran||{};
  const hadir=Object.values(kehadiran).filter(Boolean).length, total=Object.keys(kehadiran).length;
  document.getElementById('absenDetailTitle').textContent='Absensi: '+(kelas?.nama||'Kelas');
  document.getElementById('absenDetailBody').innerHTML=`
    <div style="margin-bottom:16px">
      <div style="font-size:13px;color:var(--text2)">📅 ${formatDate(a.tanggal)} · ${a.topik}</div>
      <div style="display:flex;gap:24px;margin-top:12px">
        <div><span style="font-family:Syne;font-size:28px;font-weight:700;color:var(--success)">${hadir}</span> <span style="color:var(--text3);font-size:13px">Hadir</span></div>
        <div><span style="font-family:Syne;font-size:28px;font-weight:700;color:var(--danger)">${total-hadir}</span> <span style="color:var(--text3);font-size:13px">Tidak hadir</span></div>
        <div><span style="font-family:Syne;font-size:28px;font-weight:700;color:var(--text2)">${total}</span> <span style="color:var(--text3);font-size:13px">Total</span></div>
      </div>
    </div>
    <div class="absen-detail-mhs">
      ${Object.entries(kehadiran).map(([mhs,h])=>`
        <div class="absen-detail-item">
          <div class="status-dot ${h?'hadir':'absen'}"></div>
          <span style="flex:1;font-size:13px">${mhs}</span>
          <span style="font-size:11px;color:${h?'var(--success)':'var(--danger)'}">${h?'Hadir':'Absen'}</span>
        </div>`).join('')}
    </div>`;
  document.getElementById('modalAbsenDetail').classList.add('active');
}
function deleteAbsen(id) {
  if(!confirm('Hapus sesi absensi ini?')) return;
  dbRemove('absen',id).then(()=>showToast('Sesi absensi dihapus','success'));
}
function renderAbsen() {
  const list=document.getElementById('absenList'), empty=document.getElementById('absenEmpty');
  const entries=Object.entries(appData.absen).sort((a,b)=>(b[1].createdAt||0)-(a[1].createdAt||0));
  if(entries.length===0){ empty.classList.remove('hidden'); list.innerHTML=''; return; }
  empty.classList.add('hidden');
  list.innerHTML=entries.map(([id,a])=>{
    const k=appData.kelas[a.kelasId], c=k?.warna||'#6366f1';
    const kehadiran=a.kehadiran||{}, hadir=Object.values(kehadiran).filter(Boolean).length, total=Object.keys(kehadiran).length;
    return `<div class="absen-card">
      <div style="width:4px;align-self:stretch;border-radius:4px;background:${c};flex-shrink:0"></div>
      <div class="absen-info" style="margin-left:12px">
        <div class="absen-kelas-name">${k?.nama||'Kelas'}</div>
        <div class="absen-topik">${a.topik||'Pertemuan'}</div>
        <div class="absen-date">📅 ${formatDate(a.tanggal)}</div>
      </div>
      <div class="absen-stats">
        <div class="absen-stat"><div class="absen-stat-val hadir">${hadir}</div><div class="absen-stat-label">Hadir</div></div>
        <div class="absen-stat"><div class="absen-stat-val absen">${total-hadir}</div><div class="absen-stat-label">Absen</div></div>
        <div class="absen-stat"><div class="absen-stat-val" style="color:var(--text2)">${total}</div><div class="absen-stat-label">Total</div></div>
      </div>
      <div style="display:flex;gap:8px;flex-shrink:0">
        <button class="btn-sm btn-view" onclick="viewAbsen('${id}')">📊 Lihat</button>
        ${isAdmin?'<button class="btn-sm btn-del" onclick="deleteAbsen(\''+id+'\')">🗑</button>':''}
      </div>
    </div>`;
  }).join('');
}

// ============================
// TUGAS & KELOMPOK
// ============================
function updateTugasKelasInfo() {
  const k=appData.kelas[document.getElementById('tugasKelas').value];
  document.getElementById('tugasMatkul').value=k?.matkul||'';
  shuffledGroups=[]; document.getElementById('shuffleResult').classList.add('hidden');
}
function doShuffle() {
  const kelasId=document.getElementById('tugasKelas').value, kelas=appData.kelas[kelasId];
  if(!kelasId||!kelas){ showToast('Pilih kelas terlebih dahulu!','error'); return; }
  const mhs=(kelas.mahasiswa||[]).map(function(m){return getMhsNama(m);});
  if(mhs.length===0){ showToast('Kelas tidak memiliki mahasiswa!','error'); return; }
  const jml=parseInt(document.getElementById('tugasJmlAnggota').value)||3;
  for(let i=mhs.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [mhs[i],mhs[j]]=[mhs[j],mhs[i]]; }
  shuffledGroups=[];
  for(let i=0;i<mhs.length;i+=jml) shuffledGroups.push(mhs.slice(i,i+jml));
  renderShufflePreview();
  showToast('🔀 '+shuffledGroups.length+' kelompok berhasil dibuat!','success');
}
function renderShufflePreview() {
  const c=document.getElementById('shuffleResult');
  c.classList.remove('hidden');
  c.innerHTML='<div style="font-size:13px;font-weight:600;color:var(--text2);margin-bottom:10px">Preview '+shuffledGroups.length+' Kelompok</div>'
    +'<div class="shuffle-result-grid">'+shuffledGroups.map((g,i)=>'<div class="shuffle-group-card"><div class="shuffle-group-title">Kelompok '+(i+1)+'</div>'+g.map(m=>'<div class="shuffle-group-member">• '+m+'</div>').join('')+'</div>').join('')+'</div>'
    +'<button class="btn-shuffle" style="margin-top:12px;width:100%" onclick="doShuffle()">🔀 Acak Ulang</button>';
}
function saveTugas() {
  const nama=document.getElementById('tugasNama').value.trim(), kelasId=document.getElementById('tugasKelas').value;
  const deadline=document.getElementById('tugasDeadline').value, tipe=document.getElementById('tugasTipe').value;
  if(!nama||!kelasId||!deadline){ showToast('Nama, kelas, dan deadline wajib diisi!','error'); return; }
  const data={ nama, kelasId, deadline, tipe,
    matkul:document.getElementById('tugasMatkul').value,
    tema:document.getElementById('tugasTema').value.trim(),
    link:document.getElementById('tugasLink').value.trim(),
    kelompok:tipe==='kelompok'?shuffledGroups:[], createdAt:Date.now() };
  const eid=document.getElementById('tugasEditId').value;
  if(eid) {
    dbUpdate('tugas',eid,data).then(()=>{ showToast('Tugas diperbarui! ✅','success'); closeModal('modalTugas'); resetTugasForm(); });
  } else {
    dbPush('tugas',data).then(()=>{ showToast('Tugas disimpan! 🎉','success'); closeModal('modalTugas'); resetTugasForm(); });
  }
}
function resetTugasForm() {
  ['tugasNama','tugasKelas','tugasMatkul','tugasTema','tugasDeadline','tugasLink','tugasEditId'].forEach(id=>{ document.getElementById(id).value=''; });
  document.getElementById('tugasTipe').value='individu';
  document.getElementById('tugasJmlAnggota').value=3;
  document.getElementById('shuffleResult').classList.add('hidden');
  document.getElementById('modalTugasTitle').textContent='Tambah Tugas';
  shuffledGroups=[];
}
function editTugas(id) {
  const t=appData.tugas[id]; if(!t) return;
  document.getElementById('tugasEditId').value=id;
  document.getElementById('tugasNama').value=t.nama||'';
  document.getElementById('tugasKelas').value=t.kelasId||'';
  document.getElementById('tugasMatkul').value=t.matkul||'';
  document.getElementById('tugasTema').value=t.tema||'';
  document.getElementById('tugasDeadline').value=t.deadline||'';
  document.getElementById('tugasTipe').value=t.tipe||'individu';
  document.getElementById('tugasLink').value=t.link||'';
  document.getElementById('modalTugasTitle').textContent='Edit Tugas';
  shuffledGroups=t.kelompok||[];
  if(shuffledGroups.length>0) renderShufflePreview();
  openModal('modalTugas');
}
function deleteTugas(id) {
  if(!confirm('Hapus tugas ini?')) return;
  dbRemove('tugas',id).then(()=>showToast('Tugas dihapus','success'));
}
function renderTugas() {
  const list=document.getElementById('tugasList'), empty=document.getElementById('tugasEmpty');
  const entries=Object.entries(appData.tugas).sort((a,b)=>new Date(a[1].deadline)-new Date(b[1].deadline));
  if(entries.length===0){ empty.classList.remove('hidden'); list.innerHTML=''; return; }
  empty.classList.add('hidden');
  const now=new Date();
  list.innerHTML=entries.map(([id,t])=>{
    const k=appData.kelas[t.kelasId], dl=t.deadline?new Date(t.deadline):null;
    const isOverdue=dl&&dl<now, diff=dl?Math.ceil((dl-now)/86400000):null;
    let dlb='';
    if(dl){ if(isOverdue) dlb='<span class="badge badge-overdue">⚠️ Terlambat</span>'; else if(diff===0) dlb='<span class="badge badge-overdue">🔥 Hari ini!</span>'; else dlb='<span class="badge badge-deadline">⏰ '+formatDatetime(t.deadline)+'</span>'; }
    return '<div class="tugas-card"'+(isOverdue?' style="opacity:0.75"':'')+'>'+
      '<div class="tugas-card-header"><div>'+
        '<div class="tugas-nama">'+t.nama+'</div>'+
        '<div class="tugas-badges">'+
          (k?'<span class="badge badge-kelas">🏫 '+k.nama+'</span>':'')+
          (t.matkul?'<span class="badge badge-kelas" style="background:rgba(20,184,166,0.15);color:var(--accent2);border-color:rgba(20,184,166,0.25)">📚 '+t.matkul+'</span>':'')+
          '<span class="badge badge-tipe">'+(t.tipe==='kelompok'?'👥 Kelompok':'👤 Individu')+'</span>'+
          dlb+
        '</div></div>'+
      (isAdmin?'<div style="display:flex;gap:8px;flex-shrink:0"><button class="btn-sm btn-edit" onclick="editTugas(\''+id+'\')">✏️</button><button class="btn-sm btn-del" onclick="deleteTugas(\''+id+'\')">🗑</button></div>':'')+
      '</div>'+
      (t.tema?'<div class="tugas-tema">'+t.tema+'</div>':'')+
      (t.link?'<div style="padding:0 20px 14px"><a href="'+t.link+'" target="_blank" style="color:var(--accent2);font-size:13px">🔗 '+t.link+'</a></div>':'')+
      (t.kelompok&&t.kelompok.length>0?
        '<div class="tugas-kelompok"><div class="kelompok-title">👥 Pembagian Kelompok ('+t.kelompok.length+' kelompok)</div>'+
        '<div class="kelompok-grid">'+t.kelompok.map((g,i)=>'<div class="kelompok-item"><div class="kelompok-num">Kelompok '+(i+1)+'</div><div class="kelompok-members">'+g.map(m=>'<div class="kelompok-member">• '+m+'</div>').join('')+'</div></div>').join('')+'</div></div>':'')
      +'</div>';
  }).join('');
}

// Tugas tipe toggle
document.addEventListener('DOMContentLoaded', () => {
  const tipe = document.getElementById('tugasTipe');
  if (tipe) tipe.addEventListener('change', function(){ document.getElementById('kelompokSection').style.display=this.value==='kelompok'?'':'none'; });
});

// ============================
// UTILS
// ============================
function formatDate(str) {
  if(!str) return '–';
  return new Date(str).toLocaleDateString('id-ID',{weekday:'short',year:'numeric',month:'short',day:'numeric'});
}
function formatDatetime(str) {
  if(!str) return '–';
  const d=new Date(str);
  return d.toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'})+' '+d.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});
}
function showToast(msg, type='success') {
  const t=document.getElementById('toast');
  t.textContent=msg; t.className='toast show '+type;
  clearTimeout(t._t); t._t=setTimeout(()=>t.classList.remove('show'),3500);
}

selectedColor = "#6366f1";