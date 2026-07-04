import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, query, updateDoc, doc, deleteDoc, increment, getDocs, writeBatch } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const { useState, useEffect, useMemo, useRef } = window.React;

// ==========================================
// 1. FIREBASE CONFIG (JANGAN UBAH KEY LU!)
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyDHAmtSYKLdZ-yL2ELRHTis31AwS1Ut_70",
  authDomain: "catatutang-6baef.firebaseapp.com",
  projectId: "catatutang-6baef",
  storageBucket: "catatutang-6baef.firebasestorage.app",
  messagingSenderId: "1051803957990",
  appId: "1:1051803957990:web:9781a7514cbe44ab0d1927"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});

// ==========================================
// 2. KOMPONEN UI GLOBAL (Toast, Loading, Card)
// ==========================================
const Toast = ({ message, type, onClose }) => {
  useEffect(() => { const timer = setTimeout(onClose, 3000); return () => clearTimeout(timer); }, [onClose]);
  const bg = type === 'error' ? 'bg-red-500' : 'bg-emerald-500';
  return (
    <div className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 ${bg} text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2 slide-up`}>
      <span>{message}</span>
    </div>
  );
};

const Spinner = () => (
  <svg className="animate-spin h-5 w-5 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const Card = ({ children, title }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-5 hover:shadow-md transition-shadow">
    {title && <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">{title}</h3>}
    {children}
  </div>
);

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex justify-center items-center p-4 fade-in">
      <div className="bg-white rounded-xl p-5 w-full max-w-sm">
        <h3 className="font-bold text-lg mb-2">{title}</h3>
        <p className="text-gray-600 mb-5">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200">Batal</button>
          <button onClick={() => { onConfirm(); onClose(); }} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">Ya, Hapus</button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 3. APLIKASI UTAMA
// ==========================================
const App = () => {
  const [user, setUser] = useState(null);
  const [transaksi, setTransaksi] = useState([]);
  const [hutangPiutang, setHutangPiutang] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const [toast, setToast] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const showToast = (msg, type = 'success') => setToast({ message: msg, type });

  // Sinkronisasi Data Realtime
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const qTrans = query(collection(db, "users", user.uid, "transaksi"));
    const unsubTrans = onSnapshot(qTrans, (snap) => {
      setTransaksi(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a,b) => b.tanggal?.seconds - a.tanggal?.seconds));
    });

    const qHutang = query(collection(db, "users", user.uid, "hutang_piutang"));
    const unsubHutang = onSnapshot(qHutang, (snap) => {
      setHutangPiutang(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a,b) => b.tanggal?.seconds - a.tanggal?.seconds));
    });

    return () => { unsubTrans(); unsubHutang(); };
  }, [user]);

  const handleLogin = async () => { try { await signInWithPopup(auth, provider); } catch(e) { showToast('Gagal Login', 'error'); } };
  const handleLogout = () => signOut(auth);

  if (loadingAuth) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Spinner /></div>;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-sm text-center">
          <h1 className="text-2xl font-bold text-indigo-600 mb-6">Catat Utang</h1>
          <button onClick={handleLogin} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition flex justify-center gap-2 items-center">
            Login dengan Google
          </button>
        </div>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    );
  }

  // --- LOGIKA PERHITUNGAN DASHBOARD ---
  const totalPemasukan = transaksi.filter(t => t.tipe === 'pemasukan').reduce((acc, curr) => acc + curr.nominal, 0);
  const totalPengeluaran = transaksi.filter(t => t.tipe === 'pengeluaran').reduce((acc, curr) => acc + curr.nominal, 0);
  const saldo = totalPemasukan - totalPengeluaran;
  
  const hutangAktif = hutangPiutang.filter(h => h.tipe === 'hutang' && h.status === 'aktif').reduce((acc, curr) => acc + (curr.total - curr.terbayar), 0);
  const piutangAktif = hutangPiutang.filter(h => h.tipe === 'piutang' && h.status === 'aktif').reduce((acc, curr) => acc + (curr.total - curr.terbayar), 0);

  const formatRp = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num || 0);

  return (
    <div className="max-w-md mx-auto pb-20 pt-4 px-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Halo, {user.displayName?.split(' ')[0]}</h2>
          <p className="text-sm text-gray-500">Catat keuanganmu hari ini</p>
        </div>
        <button onClick={handleLogout} className="p-2 bg-gray-100 text-gray-600 rounded-full hover:bg-red-100 hover:text-red-600 transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
        </button>
      </div>

      {/* Konten Tab */}
      <div className="animate-fade-in">
        {activeTab === 'dashboard' && <Dashboard saldo={saldo} inTotal={totalPemasukan} outTotal={totalPengeluaran} hutang={hutangAktif} piutang={piutangAktif} formatRp={formatRp} />}
        {activeTab === 'transaksi' && <TransaksiForm user={user} showToast={showToast} />}
        {activeTab === 'hutang' && <HutangForm user={user} showToast={showToast} />}
        {activeTab === 'data' && <DataList user={user} transaksi={transaksi} hutangPiutang={hutangPiutang} showToast={showToast} formatRp={formatRp} />}
        {activeTab === 'backup' && <Backup user={user} showToast={showToast} />}
      </div>

      {/* Navigasi Bawah */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around py-3 px-2 z-40 max-w-md mx-auto shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        {[
          { id: 'dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', label: 'Home' },
          { id: 'transaksi', icon: 'M12 6v6m0 0v6m0-6h6m-6 0H6', label: 'Catat' },
          { id: 'hutang', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z', label: 'Hutang' },
          { id: 'data', icon: 'M4 6h16M4 10h16M4 14h16M4 18h16', label: 'Data' },
          { id: 'backup', icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12', label: 'Backup' }
        ].map(item => (
          <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex flex-col items-center gap-1 p-2 ${activeTab === item.id ? 'text-indigo-600' : 'text-gray-400'}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon}></path></svg>
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

// ==========================================
// 4. KOMPONEN DASHBOARD
// ==========================================
const Dashboard = ({ saldo, inTotal, outTotal, hutang, piutang, formatRp }) => (
  <div className="space-y-4">
    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
      <p className="text-indigo-100 text-sm mb-1">Saldo Tersedia</p>
      <h2 className="text-3xl font-bold tracking-tight">{formatRp(saldo)}</h2>
      <div className="absolute top-0 right-0 p-4 opacity-20">
        <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
      </div>
    </div>
    
    <div className="grid grid-cols-2 gap-4">
      <Card>
        <p className="text-sm text-gray-500 mb-1">Pemasukan</p>
        <p className="text-lg font-bold text-emerald-500">{formatRp(inTotal)}</p>
      </Card>
      <Card>
        <p className="text-sm text-gray-500 mb-1">Pengeluaran</p>
        <p className="text-lg font-bold text-red-500">{formatRp(outTotal)}</p>
      </Card>
      <Card>
        <p className="text-sm text-gray-500 mb-1">Hutang (Gw minjem)</p>
        <p className="text-lg font-bold text-orange-500">{formatRp(hutang)}</p>
      </Card>
      <Card>
        <p className="text-sm text-gray-500 mb-1">Piutang (Orang minjem)</p>
        <p className="text-lg font-bold text-blue-500">{formatRp(piutang)}</p>
      </Card>
    </div>
  </div>
);

// ==========================================
// 5. KOMPONEN INPUT TRANSAKSI
// ==========================================
const TransaksiForm = ({ user, showToast }) => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ tipe: 'pengeluaran', kategori: 'Makan Minum', nominal: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nominal || form.nominal <= 0) return showToast('Nominal tidak valid!', 'error');
    setLoading(true);
    try {
      await addDoc(collection(db, "users", user.uid, "transaksi"), { ...form, nominal: Number(form.nominal), tanggal: new Date() });
      showToast('Transaksi berhasil dicatat!');
      setForm({ ...form, nominal: '' });
    } catch (e) { showToast('Gagal menyimpan', 'error'); }
    setLoading(false);
  };

  return (
    <Card title="Catat Transaksi">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Tipe</label>
          <select className="w-full p-3 border rounded-xl bg-gray-50 focus:ring-2 outline-none" value={form.tipe} onChange={e => setForm({...form, tipe: e.target.value})}>
            <option value="pengeluaran">Pengeluaran</option>
            <option value="pemasukan">Pemasukan</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Kategori</label>
          <select className="w-full p-3 border rounded-xl bg-gray-50 focus:ring-2 outline-none" value={form.kategori} onChange={e => setForm({...form, kategori: e.target.value})}>
            <option value="Makan Minum">Makan & Minum</option>
            <option value="Belanja Online">Belanja Online</option>
            <option value="Kebutuhan Harian">Kebutuhan Harian</option>
            <option value="Gaji/Fee">Gaji / Fee Desain</option>
            <option value="Lainnya">Lainnya</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Nominal (Rp)</label>
          <input type="number" className="w-full p-3 border rounded-xl bg-gray-50 focus:ring-2 outline-none" placeholder="0" value={form.nominal} onChange={e => setForm({...form, nominal: e.target.value})} />
        </div>
        <button disabled={loading} type="submit" className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 flex justify-center gap-2">
          {loading ? <Spinner /> : 'Simpan Transaksi'}
        </button>
      </form>
    </Card>
  );
};

// ==========================================
// 6. KOMPONEN INPUT HUTANG / PIUTANG
// ==========================================
const HutangForm = ({ user, showToast }) => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ tipe: 'hutang', nama: '', nominal: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nama || !form.nominal || form.nominal <= 0) return showToast('Data tidak lengkap/valid!', 'error');
    setLoading(true);
    try {
      await addDoc(collection(db, "users", user.uid, "hutang_piutang"), { 
        tipe: form.tipe, nama: form.nama, total: Number(form.nominal), terbayar: 0, status: 'aktif', tanggal: new Date(), riwayat: []
      });
      showToast('Data berhasil dicatat!');
      setForm({ ...form, nama: '', nominal: '' });
    } catch (e) { showToast('Gagal menyimpan', 'error'); }
    setLoading(false);
  };

  return (
    <Card title="Catat Hutang / Piutang">
      <form onSubmit={handleSubmit} className="space-y-4">
        <select className="w-full p-3 border rounded-xl bg-gray-50" value={form.tipe} onChange={e => setForm({...form, tipe: e.target.value})}>
          <option value="hutang">Gw Berhutang ke...</option>
          <option value="piutang">Orang Berhutang ke Gw...</option>
        </select>
        <input type="text" className="w-full p-3 border rounded-xl bg-gray-50" placeholder="Nama Orang" value={form.nama} onChange={e => setForm({...form, nama: e.target.value})} />
        <input type="number" className="w-full p-3 border rounded-xl bg-gray-50" placeholder="Total Nominal (Rp)" value={form.nominal} onChange={e => setForm({...form, nominal: e.target.value})} />
        <button disabled={loading} type="submit" className="w-full py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 flex justify-center">
          {loading ? <Spinner /> : 'Catat Data'}
        </button>
      </form>
    </Card>
  );
};

// ==========================================
// 7. KOMPONEN LIST & EDIT DATA (Transaksi & Hutang)
// ==========================================
const DataList = ({ user, transaksi, hutangPiutang, showToast, formatRp }) => {
  const [subTab, setSubTab] = useState('transaksi'); // transaksi, hutang
  const [search, setSearch] = useState('');
  const [modalHapus, setModalHapus] = useState({ isOpen: false, id: null, collection: '' });
  const [bayarId, setBayarId] = useState(null); // ID hutang yg sedang dibayar
  const [nominalBayar, setNominalBayar] = useState('');

  // Logika Filter & Search
  const filteredTrans = useMemo(() => transaksi.filter(t => t.kategori?.toLowerCase().includes(search.toLowerCase()) || t.tipe?.toLowerCase().includes(search.toLowerCase())), [transaksi, search]);
  const filteredHutang = useMemo(() => hutangPiutang.filter(h => h.nama?.toLowerCase().includes(search.toLowerCase())), [hutangPiutang, search]);

  const eksekusiHapus = async () => {
    try {
      await deleteDoc(doc(db, "users", user.uid, modalHapus.collection, modalHapus.id));
      showToast('Data terhapus!');
    } catch (e) { showToast('Gagal menghapus', 'error'); }
  };

  const bayarHutang = async (h) => {
    const bayar = Number(nominalBayar);
    const sisa = h.total - h.terbayar;
    if (!bayar || bayar <= 0 || bayar > sisa) return showToast('Nominal tidak valid!', 'error');
    
    try {
      const docRef = doc(db, "users", user.uid, "hutang_piutang", h.id);
      await updateDoc(docRef, { 
        terbayar: increment(bayar), 
        status: (h.terbayar + bayar >= h.total) ? 'lunas' : 'aktif',
        // Update tanpa menghapus struktur lama (kompatibilitas)
      });

      // Otomatis catat ke kas (Logic lama dipertahankan)
      await addDoc(collection(db, "users", user.uid, "transaksi"), {
        tipe: h.tipe === 'hutang' ? 'pengeluaran' : 'pemasukan',
        kategori: `Pembayaran ${h.tipe} - ${h.nama}`,
        nominal: bayar,
        tanggal: new Date()
      });
      
      showToast('Pembayaran dicatat & disinkronkan!');
      setBayarId(null); setNominalBayar('');
    } catch (e) { showToast('Gagal bayar', 'error'); }
  };

  return (
    <div>
      <div className="flex bg-white rounded-xl shadow-sm p-1 mb-4">
        <button onClick={() => setSubTab('transaksi')} className={`flex-1 py-2 text-sm font-medium rounded-lg ${subTab==='transaksi'?'bg-indigo-50 text-indigo-700':'text-gray-500'}`}>Transaksi</button>
        <button onClick={() => setSubTab('hutang')} className={`flex-1 py-2 text-sm font-medium rounded-lg ${subTab==='hutang'?'bg-indigo-50 text-indigo-700':'text-gray-500'}`}>Hutang/Piutang</button>
      </div>

      <input type="text" placeholder="Cari data..." className="w-full p-3 mb-4 border rounded-xl focus:ring-2 outline-none" value={search} onChange={e => setSearch(e.target.value)} />

      {subTab === 'transaksi' && (
        <div className="space-y-3">
          {filteredTrans.map(t => (
            <div key={t.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
              <div>
                <p className="font-semibold text-gray-800">{t.kategori}</p>
                <p className="text-xs text-gray-400">{new Date(t.tanggal?.seconds * 1000).toLocaleDateString()}</p>
              </div>
              <div className="text-right flex flex-col items-end gap-2">
                <span className={`font-bold ${t.tipe === 'pemasukan' ? 'text-emerald-500' : 'text-red-500'}`}>
                  {t.tipe === 'pemasukan' ? '+' : '-'}{formatRp(t.nominal)}
                </span>
                <button onClick={() => setModalHapus({ isOpen: true, id: t.id, collection: 'transaksi' })} className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded">Hapus</button>
              </div>
            </div>
          ))}
          {filteredTrans.length === 0 && <p className="text-center text-gray-400 py-4">Data tidak ditemukan</p>}
        </div>
      )}

      {subTab === 'hutang' && (
        <div className="space-y-3">
          {filteredHutang.map(h => (
            <div key={h.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between mb-2">
                <div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${h.tipe === 'hutang' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                    {h.tipe.toUpperCase()}
                  </span>
                  <p className="font-semibold mt-1">{h.nama}</p>
                  <p className="text-xs text-gray-400">{new Date(h.tanggal?.seconds * 1000).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${h.status === 'lunas' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                    {h.status.toUpperCase()}
                  </span>
                </div>
              </div>
              
              <div className="bg-gray-50 p-3 rounded-lg text-sm mb-3">
                <div className="flex justify-between"><span>Total:</span> <span className="font-semibold">{formatRp(h.total)}</span></div>
                <div className="flex justify-between text-emerald-600"><span>Terbayar:</span> <span>{formatRp(h.terbayar)}</span></div>
                <div className="flex justify-between text-red-500 border-t mt-1 pt-1"><span>Sisa:</span> <span className="font-semibold">{formatRp(h.total - h.terbayar)}</span></div>
              </div>

              {h.status !== 'lunas' && (
                bayarId === h.id ? (
                  <div className="flex gap-2">
                    <input type="number" placeholder="Nominal" className="flex-1 p-2 border rounded-lg text-sm" value={nominalBayar} onChange={e => setNominalBayar(e.target.value)} />
                    <button onClick={() => bayarHutang(h)} className="bg-indigo-600 text-white px-4 rounded-lg text-sm font-medium">Bayar</button>
                    <button onClick={() => setBayarId(null)} className="bg-gray-200 text-gray-600 px-3 rounded-lg text-sm">X</button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={() => setBayarId(h.id)} className="flex-1 bg-indigo-50 text-indigo-600 py-2 rounded-lg text-sm font-medium hover:bg-indigo-100">Catat Cicilan</button>
                    <button onClick={() => setModalHapus({ isOpen: true, id: h.id, collection: 'hutang_piutang' })} className="p-2 bg-red-50 text-red-500 rounded-lg"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                  </div>
                )
              )}
            </div>
          ))}
          {filteredHutang.length === 0 && <p className="text-center text-gray-400 py-4">Data tidak ditemukan</p>}
        </div>
      )}

      <ConfirmModal 
        isOpen={modalHapus.isOpen} 
        onClose={() => setModalHapus({ isOpen: false, id: null, collection: '' })} 
        onConfirm={eksekusiHapus}
        title="Hapus Data"
        message="Yakin mau menghapus data ini? Aksi ini tidak bisa dibatalkan lho."
      />
    </div>
  );
};

// ==========================================
// 8. KOMPONEN BACKUP DATA (Export/Import JSON)
// ==========================================
const Backup = ({ user, showToast }) => {
  const fileRef = useRef(null);
  
  const handleExport = async () => {
    try {
      const transSnap = await getDocs(collection(db, "users", user.uid, "transaksi"));
      const hutangSnap = await getDocs(collection(db, "users", user.uid, "hutang_piutang"));
      const data = {
        transaksi: transSnap.docs.map(d => d.data()),
        hutang_piutang: hutangSnap.docs.map(d => d.data())
      };
      
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_keuangan_${new Date().getTime()}.json`;
      a.click();
      showToast('Backup berhasil diunduh!');
    } catch(e) { showToast('Gagal export', 'error'); }
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result);
        const batch = writeBatch(db);
        
        // Loop penambahan data tanpa menghapus yang lama
        if(data.transaksi) data.transaksi.forEach(t => {
           const ref = doc(collection(db, "users", user.uid, "transaksi"));
           batch.set(ref, t);
        });
        if(data.hutang_piutang) data.hutang_piutang.forEach(h => {
           const ref = doc(collection(db, "users", user.uid, "hutang_piutang"));
           batch.set(ref, h);
        });
        
        await batch.commit();
        showToast('Restore data berhasil!');
      } catch(error) { showToast('File JSON tidak valid', 'error'); }
    };
    reader.readAsText(file);
    e.target.value = null; // Reset input
  };

  return (
    <Card title="Pusat Keamanan Data">
      <div className="space-y-4">
        <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 text-sm text-indigo-800">
          Export akan mengunduh semua transaksi dan catatan hutang ke format JSON.
        </div>
        <button onClick={handleExport} className="w-full py-3 bg-gray-800 text-white rounded-xl font-medium hover:bg-black transition flex justify-center items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
          Download Backup JSON
        </button>
        
        <div className="border-t my-4"></div>
        
        <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 text-sm text-amber-800">
          Import akan <b>menambahkan</b> data dari JSON ke database kamu (Data lama tidak dihapus).
        </div>
        <input type="file" accept=".json" ref={fileRef} className="hidden" onChange={handleImport} />
        <button onClick={() => fileRef.current.click()} className="w-full py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition flex justify-center items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
          Restore dari File JSON
        </button>
      </div>
    </Card>
  );
};

// Render React App
const root = window.ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);