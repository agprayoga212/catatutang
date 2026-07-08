import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const { useState, useEffect, useMemo, useRef } = window.React;

// ==========================================
// 1. SUPABASE CONFIG
// ==========================================
// Ambil 2 nilai ini dari: Supabase Dashboard -> Project Settings -> API
// - Project URL
// - anon / public key
// Aman untuk ditaruh di client (sama seperti Firebase apiKey), karena akses
// data sebenarnya dibatasi oleh Row Level Security (RLS) di sisi database.
const supabaseUrl = 'https://jvjslgttadrtopudoalp.supabase.co';
const supabaseAnonKey = 'sb_publishable_Wg3Czeef7BG-0DYU8g-zxg_w9FvbWoo';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});

// ==========================================
// 2. KOMPONEN UI GLOBAL (Toast, Loading, Card, helper kecil)
// ==========================================
const Toast = ({ message, type, onClose }) => {
  useEffect(() => { const timer = setTimeout(onClose, 3000); return () => clearTimeout(timer); }, [onClose]);
  const isError = type === 'error';
  return (
    <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 ${isError ? 'bg-brick-700' : 'bg-ledger-800'} text-white pl-3 pr-4 py-2.5 rounded-full shadow-nav z-50 flex items-center gap-2 slide-up max-w-[90vw]`}>
      <span className={`w-5 h-5 shrink-0 rounded-full flex items-center justify-center ${isError ? 'bg-brick-500' : 'bg-moss-500'}`}>
        {isError ? (
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
        ) : (
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
        )}
      </span>
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
};

const Spinner = ({ className = "h-5 w-5" }) => (
  <svg className={`animate-spin ${className} inline-block`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const Card = ({ children, title }) => (
  <div className="bg-white rounded-2xl shadow-soft hover:shadow-soft-lg border border-stone-100 p-5 mb-5 transition-shadow">
    {title && <h3 className="font-display text-lg font-semibold text-stone-800 mb-4 pb-2 border-b border-stone-100">{title}</h3>}
    {children}
  </div>
);

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-50 flex justify-center items-center p-4 fade-in">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-nav">
        <div className="w-10 h-10 rounded-full bg-brick-50 text-brick-600 flex items-center justify-center mb-3">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        </div>
        <h3 className="font-display font-semibold text-lg mb-1.5 text-stone-800">{title}</h3>
        <p className="text-stone-500 text-sm mb-6">{message}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2.5 text-stone-500 bg-stone-100 rounded-xl font-medium text-sm hover:bg-stone-200 transition focus:outline-none focus:ring-2 focus:ring-stone-300">Batal</button>
          <button onClick={() => { onConfirm(); onClose(); }} className="px-4 py-2.5 bg-brick-600 text-white rounded-xl font-medium text-sm hover:bg-brick-700 transition focus:outline-none focus:ring-2 focus:ring-brick-300">Ya, Hapus</button>
        </div>
      </div>
    </div>
  );
};

// Toggle 2 opsi (pengganti <select> untuk pilihan biner) - dipakai di beberapa form
const SegmentToggle = ({ options, value, onChange }) => (
  <div className="flex bg-stone-100 rounded-xl p-1 gap-1">
    {options.map(opt => (
      <button
        key={opt.value}
        type="button"
        onClick={() => onChange(opt.value)}
        className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-ledger-200 ${value === opt.value ? 'bg-white text-ledger-700 shadow-soft' : 'text-stone-400 hover:text-stone-600'}`}
      >
        {opt.label}
      </button>
    ))}
  </div>
);

// Baris rincian bergaya buku kas: label ...... nilai
const LedgerRow = ({ label, value, valueClass = '', bold = false }) => (
  <div className="flex items-end gap-2">
    <span className="text-stone-500 shrink-0">{label}</span>
    <span className="flex-1 border-b border-dotted border-stone-300 mb-1"></span>
    <span className={`font-mono shrink-0 ${bold ? 'font-bold' : 'font-medium'} ${valueClass}`}>{value}</span>
  </div>
);

// Tampilan kosong yang lebih ramah dari sekadar teks
const EmptyState = ({ text }) => (
  <div className="text-center py-10">
    <div className="w-12 h-12 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto mb-3">
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V7a2 2 0 00-2-2H6a2 2 0 00-2 2v6m16 0v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4m16 0H4" /></svg>
    </div>
    <p className="text-stone-400 text-sm">{text}</p>
  </div>
);

// Ambil inisial 2 huruf dari nama kategori, untuk chip kecil di daftar transaksi
const kategoriInisial = (kategori = '') => {
  const words = kategori.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return kategori.slice(0, 2).toUpperCase();
};

// Kategori bawaan (dipakai untuk seeding pertama kali per akun, kalau user belum pernah punya kategori sendiri)
const DEFAULT_KATEGORI = {
  pengeluaran: ['Konsumsi', 'Belanja Online', 'Kebutuhan Harian', 'Lainnya'],
  pemasukan: ['Gaji/Fee', 'Lainnya']
};

// Helper: apply 1 event realtime (INSERT/UPDATE/DELETE) ke sebuah array state, lalu sort ulang
const applyRealtimeChange = (setter, sortFn) => (payload) => {
  setter(prev => {
    let next;
    if (payload.eventType === 'INSERT') {
      next = prev.some(x => x.id === payload.new.id) ? prev : [...prev, payload.new];
    } else if (payload.eventType === 'UPDATE') {
      next = prev.map(x => x.id === payload.new.id ? payload.new : x);
    } else if (payload.eventType === 'DELETE') {
      next = prev.filter(x => x.id !== payload.old.id);
    } else {
      next = prev;
    }
    return sortFn ? [...next].sort(sortFn) : next;
  });
};

const byTanggalDesc = (a, b) => new Date(b.tanggal) - new Date(a.tanggal);
const byUrutanAsc = (a, b) => (a.urutan ?? 0) - (b.urutan ?? 0);

// ==========================================
// 3. APLIKASI UTAMA
// ==========================================
const App = () => {
  const [user, setUser] = useState(null);
  const [transaksi, setTransaksi] = useState([]);
  const [hutangPiutang, setHutangPiutang] = useState([]);
  const [kategoriList, setKategoriList] = useState([]);
  const [riwayatCicilan, setRiwayatCicilan] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');

  const [toast, setToast] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // authMode: 'login' | 'daftar' | 'lupa'
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ email: '', password: '' });
  const [authLoading, setAuthLoading] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const showToast = (msg, type = 'success') => setToast({ message: msg, type });

  // Deteksi redirect dari link "Lupa Password" (Supabase mengirim event PASSWORD_RECOVERY)
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setIsRecovery(true);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // Cek sesi login yang sedang aktif + dengerin perubahan auth (login/logout, termasuk redirect balik dari Google)
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      setLoadingAuth(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, []);

  // Sinkronisasi Data Realtime
  useEffect(() => {
    if (!user) {
      setTransaksi([]); setHutangPiutang([]); setKategoriList([]); setRiwayatCicilan([]);
      return;
    }

    let active = true;

    const load = async () => {
      const [transRes, hutangRes, kategoriRes, riwayatRes] = await Promise.all([
        supabase.from('transaksi').select('*').eq('user_id', user.id).order('tanggal', { ascending: false }),
        supabase.from('hutang_piutang').select('*').eq('user_id', user.id).order('tanggal', { ascending: false }),
        supabase.from('kategori').select('*').eq('user_id', user.id).order('urutan', { ascending: true }),
        supabase.from('riwayat_cicilan').select('*').eq('user_id', user.id).order('tanggal', { ascending: false }),
      ]);
      if (!active) return;

      setTransaksi(transRes.data || []);
      setHutangPiutang(hutangRes.data || []);
      setRiwayatCicilan(riwayatRes.data || []);

      if (!kategoriRes.data || kategoriRes.data.length === 0) {
        // Seeding kategori default sekali di awal, khusus untuk akun ini
        const rows = [];
        Object.entries(DEFAULT_KATEGORI).forEach(([tipe, list]) => {
          list.forEach((nama, i) => rows.push({ user_id: user.id, nama, tipe, urutan: i }));
        });
        const { data: seeded } = await supabase.from('kategori').insert(rows).select();
        if (active) setKategoriList(seeded || []);
      } else {
        setKategoriList(kategoriRes.data);
      }
    };
    load();

    const channel = supabase
      .channel(`data-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transaksi', filter: `user_id=eq.${user.id}` }, applyRealtimeChange(setTransaksi, byTanggalDesc))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hutang_piutang', filter: `user_id=eq.${user.id}` }, applyRealtimeChange(setHutangPiutang, byTanggalDesc))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kategori', filter: `user_id=eq.${user.id}` }, applyRealtimeChange(setKategoriList, byUrutanAsc))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'riwayat_cicilan', filter: `user_id=eq.${user.id}` }, applyRealtimeChange(setRiwayatCicilan, byTanggalDesc))
      .subscribe();

    return () => { active = false; supabase.removeChannel(channel); };
  }, [user]);

  // Daftar akun baru (email + password), lalu Supabase otomatis kirim email konfirmasi (magic link)
  const handleSignUp = async (e) => {
    e.preventDefault();
    const email = authForm.email.trim();
    const password = authForm.password;
    if (!email) return showToast('Masukin email dulu!', 'error');
    if (!password || password.length < 6) return showToast('Password minimal 6 karakter!', 'error');
    setAuthLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin + window.location.pathname }
    });
    setAuthLoading(false);
    if (error) return showToast(error.message === 'User already registered' ? 'Email sudah terdaftar, coba login' : 'Gagal mendaftar', 'error');
    setConfirmationSent(true);
  };

  // Login pakai email + password
  const handleLogin = async (e) => {
    e.preventDefault();
    const email = authForm.email.trim();
    const password = authForm.password;
    if (!email || !password) return showToast('Email & password wajib diisi!', 'error');
    setAuthLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setAuthLoading(false);
    if (error) {
      if (error.message.includes('Email not confirmed')) return showToast('Email belum dikonfirmasi. Cek inbox kamu ya!', 'error');
      return showToast('Email atau password salah', 'error');
    }
  };

  // Lupa password: kirim email berisi link reset
  const handleLupaPassword = async (e) => {
    e.preventDefault();
    const email = authForm.email.trim();
    if (!email) return showToast('Masukin email dulu!', 'error');
    setAuthLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname
    });
    setAuthLoading(false);
    if (error) return showToast('Gagal mengirim email reset', 'error');
    setResetSent(true);
  };

  // Set password baru setelah user tap link reset dari email (mode recovery)
  const handleSetNewPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) return showToast('Password minimal 6 karakter!', 'error');
    setAuthLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setAuthLoading(false);
    if (error) return showToast('Gagal mengubah password', 'error');
    showToast('Password berhasil diubah! Silakan lanjut.');
    setIsRecovery(false);
    setNewPassword('');
  };

  const handleLogout = () => supabase.auth.signOut();

  if (loadingAuth) return (
    <div className="min-h-screen flex items-center justify-center bg-ledger-900">
      <Spinner className="h-8 w-8 text-ledger-200" />
    </div>
  );

  if (!user || isRecovery) {
    // Mode khusus: user baru saja tap link "Lupa Password" dari email → minta password baru
    if (isRecovery) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-ledger-900 relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
          <div className="w-full max-w-sm text-center relative">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-brass-400 flex items-center justify-center shadow-nav">
              <span className="font-display font-bold text-2xl text-ledger-900">Rp</span>
            </div>
            <h1 className="font-display text-2xl font-semibold text-white mb-2">Buat Password Baru</h1>
            <p className="text-ledger-200 text-sm mb-8">Masukkan password baru untuk akun kamu.</p>
            <form onSubmit={handleSetNewPassword} className="space-y-3 text-left">
              <input
                type="password"
                required
                placeholder="Password baru (min. 6 karakter)"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full p-3.5 rounded-2xl bg-white/10 border border-white/20 text-white placeholder-ledger-300 outline-none focus:ring-2 focus:ring-white/40 transition"
              />
              <button disabled={authLoading} type="submit" className="w-full py-3.5 bg-white text-stone-700 rounded-2xl font-semibold hover:bg-stone-50 transition flex justify-center gap-2 items-center shadow-nav disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-white/50">
                {authLoading ? <Spinner className="h-5 w-5" /> : 'Simpan Password Baru'}
              </button>
            </form>
          </div>
          {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
      );
    }

    const updateAuthField = (field) => (e) => setAuthForm(f => ({ ...f, [field]: e.target.value }));
    const gantiMode = (mode) => {
      setAuthMode(mode);
      setConfirmationSent(false);
      setResetSent(false);
      setAuthForm({ email: authForm.email, password: '' });
    };

    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-ledger-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
        <div className="w-full max-w-sm text-center relative">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-brass-400 flex items-center justify-center shadow-nav">
            <span className="font-display font-bold text-2xl text-ledger-900">Rp</span>
          </div>
          <h1 className="font-display text-3xl font-semibold text-white mb-2">Catat Utang</h1>
          <p className="text-ledger-200 text-sm mb-8">Kas harian, hutang, dan piutang — semua rapi dalam satu catatan.</p>

          {/* --- KONFIRMASI EMAIL SETELAH DAFTAR --- */}
          {confirmationSent ? (
            <div className="bg-white/10 border border-white/20 rounded-2xl p-5 text-left">
              <p className="text-white font-semibold mb-1">Cek email kamu 📩</p>
              <p className="text-ledger-200 text-sm mb-4">Kami udah kirim link konfirmasi ke <span className="font-semibold text-white">{authForm.email}</span>. Buka email itu, tap link-nya buat konfirmasi akun, terus balik lagi ke sini buat login.</p>
              <button onClick={() => gantiMode('login')} className="text-xs text-ledger-200 underline hover:text-white transition">Sudah konfirmasi? Login sekarang</button>
            </div>

          /* --- KONFIRMASI EMAIL RESET PASSWORD TERKIRIM --- */
          ) : resetSent ? (
            <div className="bg-white/10 border border-white/20 rounded-2xl p-5 text-left">
              <p className="text-white font-semibold mb-1">Cek email kamu 📩</p>
              <p className="text-ledger-200 text-sm mb-4">Link reset password sudah dikirim ke <span className="font-semibold text-white">{authForm.email}</span>. Tap link itu untuk bikin password baru.</p>
              <button onClick={() => gantiMode('login')} className="text-xs text-ledger-200 underline hover:text-white transition">Kembali ke Login</button>
            </div>

          /* --- FORM LUPA PASSWORD --- */
          ) : authMode === 'lupa' ? (
            <form onSubmit={handleLupaPassword} className="space-y-3 text-left">
              <input
                type="email"
                required
                placeholder="Alamat email kamu"
                value={authForm.email}
                onChange={updateAuthField('email')}
                className="w-full p-3.5 rounded-2xl bg-white/10 border border-white/20 text-white placeholder-ledger-300 outline-none focus:ring-2 focus:ring-white/40 transition"
              />
              <button disabled={authLoading} type="submit" className="w-full py-3.5 bg-white text-stone-700 rounded-2xl font-semibold hover:bg-stone-50 transition flex justify-center gap-2 items-center shadow-nav disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-white/50">
                {authLoading ? <Spinner className="h-5 w-5" /> : 'Kirim Link Reset Password'}
              </button>
              <p className="text-center">
                <button type="button" onClick={() => gantiMode('login')} className="text-ledger-300 text-xs underline hover:text-white transition">Kembali ke Login</button>
              </p>
            </form>

          /* --- FORM LOGIN / DAFTAR --- */
          ) : (
            <form onSubmit={authMode === 'daftar' ? handleSignUp : handleLogin} className="space-y-3 text-left">
              <input
                type="email"
                required
                placeholder="Alamat email kamu"
                value={authForm.email}
                onChange={updateAuthField('email')}
                className="w-full p-3.5 rounded-2xl bg-white/10 border border-white/20 text-white placeholder-ledger-300 outline-none focus:ring-2 focus:ring-white/40 transition"
              />
              <input
                type="password"
                required
                placeholder="Password"
                value={authForm.password}
                onChange={updateAuthField('password')}
                className="w-full p-3.5 rounded-2xl bg-white/10 border border-white/20 text-white placeholder-ledger-300 outline-none focus:ring-2 focus:ring-white/40 transition"
              />

              {authMode === 'login' && (
                <p className="text-right">
                  <button type="button" onClick={() => gantiMode('lupa')} className="text-ledger-300 text-xs underline hover:text-white transition">Lupa password?</button>
                </p>
              )}

              <button disabled={authLoading} type="submit" className="w-full py-3.5 bg-white text-stone-700 rounded-2xl font-semibold hover:bg-stone-50 transition flex justify-center gap-2 items-center shadow-nav disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-white/50">
                {authLoading ? <Spinner className="h-5 w-5" /> : (authMode === 'daftar' ? 'Daftar Akun Baru' : 'Masuk')}
              </button>

              <p className="text-ledger-300 text-xs pt-2">
                {authMode === 'daftar' ? (
                  <>Sudah punya akun? <button type="button" onClick={() => gantiMode('login')} className="underline font-semibold text-white">Login di sini</button></>
                ) : (
                  <>Belum punya akun? <button type="button" onClick={() => gantiMode('daftar')} className="underline font-semibold text-white">Daftar dulu</button></>
                )}
              </p>
            </form>
          )}
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

  const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email;

  return (
    <div className="max-w-md mx-auto pb-32 pt-6 px-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-ledger-700 flex items-center justify-center shrink-0">
            <span className="font-display font-bold text-sm text-brass-300">Rp</span>
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold text-stone-800 leading-tight">Halo, {displayName?.split(' ')[0]}</h2>
            <p className="text-sm text-stone-400">Catat keuanganmu hari ini</p>
          </div>
        </div>
        <button onClick={handleLogout} className="p-2.5 bg-white border border-stone-200 text-stone-500 rounded-full hover:bg-brick-50 hover:text-brick-600 hover:border-brick-200 transition shadow-soft focus:outline-none focus:ring-2 focus:ring-stone-300">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
        </button>
      </div>

      {/* Konten Tab */}
      <div key={activeTab} className="fade-in">
        {activeTab === 'dashboard' && <Dashboard saldo={saldo} inTotal={totalPemasukan} outTotal={totalPengeluaran} hutang={hutangAktif} piutang={piutangAktif} formatRp={formatRp} />}
        {activeTab === 'transaksi' && <TransaksiForm user={user} showToast={showToast} kategoriList={kategoriList} />}
        {activeTab === 'hutang' && <HutangPage user={user} showToast={showToast} hutangPiutang={hutangPiutang} riwayatCicilan={riwayatCicilan} formatRp={formatRp} />}
        {activeTab === 'riwayat' && <RiwayatList user={user} transaksi={transaksi} showToast={showToast} formatRp={formatRp} />}
        {activeTab === 'backup' && <Backup user={user} showToast={showToast} />}
      </div>

      {/* Navigasi Bawah */}
      <div
        className="fixed left-4 right-4 max-w-md mx-auto bg-ledger-900 flex justify-around py-2 px-2 z-40 rounded-2xl shadow-nav"
        style={{ bottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        {[
          { id: 'dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', label: 'Home' },
          { id: 'transaksi', icon: 'M12 6v6m0 0v6m0-6h6m-6 0H6', label: 'Catat' },
          { id: 'hutang', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z', label: 'Hutang' },
          { id: 'riwayat', icon: 'M4 6h16M4 10h16M4 14h16M4 18h16', label: 'Riwayat' },
          { id: 'backup', icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12', label: 'Backup' }
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl transition ${activeTab === item.id ? 'bg-white/10 text-brass-300' : 'text-ledger-300/60 hover:text-ledger-100'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon}></path></svg>
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
    <div className="torn-edge bg-ledger-700 rounded-t-2xl pt-6 px-6 pb-9 text-white relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '16px 16px' }}></div>
      <div className="relative">
        <p className="text-ledger-200 text-xs font-semibold uppercase tracking-wider mb-2">Saldo Tersedia</p>
        <h2 className="font-mono text-4xl font-bold tracking-tight">{formatRp(saldo)}</h2>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-3">
      <div className="stagger-item bg-white rounded-2xl shadow-soft border border-stone-100 p-4" style={{ animationDelay: '40ms' }}>
        <div className="w-8 h-8 rounded-full bg-moss-100 text-moss-600 flex items-center justify-center mb-2.5">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19V5m0 0l-6 6m6-6l6 6" /></svg>
        </div>
        <p className="text-xs text-stone-400 mb-0.5">Pemasukan</p>
        <p className="font-mono text-base font-bold text-moss-600 truncate">{formatRp(inTotal)}</p>
      </div>
      <div className="stagger-item bg-white rounded-2xl shadow-soft border border-stone-100 p-4" style={{ animationDelay: '90ms' }}>
        <div className="w-8 h-8 rounded-full bg-brick-100 text-brick-600 flex items-center justify-center mb-2.5">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 5v14m0 0l-6-6m6 6l6-6" /></svg>
        </div>
        <p className="text-xs text-stone-400 mb-0.5">Pengeluaran</p>
        <p className="font-mono text-base font-bold text-brick-600 truncate">{formatRp(outTotal)}</p>
      </div>
      <div className="stagger-item bg-white rounded-2xl shadow-soft border border-stone-100 p-4" style={{ animationDelay: '140ms' }}>
        <div className="w-8 h-8 rounded-full bg-brass-100 text-brass-600 flex items-center justify-center mb-2.5">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>
        </div>
        <p className="text-xs text-stone-400 mb-0.5">Hutang (Gw minjem)</p>
        <p className="font-mono text-base font-bold text-brass-600 truncate">{formatRp(hutang)}</p>
      </div>
      <div className="stagger-item bg-white rounded-2xl shadow-soft border border-stone-100 p-4" style={{ animationDelay: '190ms' }}>
        <div className="w-8 h-8 rounded-full bg-petrol-100 text-petrol-600 flex items-center justify-center mb-2.5">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6M9 8h6M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
        </div>
        <p className="text-xs text-stone-400 mb-0.5">Piutang (Orang minjem)</p>
        <p className="font-mono text-base font-bold text-petrol-600 truncate">{formatRp(piutang)}</p>
      </div>
    </div>
  </div>
);

// ==========================================
// 5. KOMPONEN INPUT TRANSAKSI
// ==========================================
const TransaksiForm = ({ user, showToast, kategoriList }) => {
  const [loading, setLoading] = useState(false);
  const [showKelola, setShowKelola] = useState(false);
  const [form, setForm] = useState({ tipe: 'pengeluaran', kategori: '', nominal: '' });

  // Kategori sesuai tipe yang lagi aktif, urut sesuai urutan custom
  const kategoriTersedia = useMemo(
    () => kategoriList.filter(k => k.tipe === form.tipe).sort((a, b) => (a.urutan ?? 0) - (b.urutan ?? 0)),
    [kategoriList, form.tipe]
  );

  // Kalau kategori yang lagi kepilih nggak ada di daftar tipe aktif (misal abis ganti tipe, atau kategori dihapus), auto-pilih yang pertama
  useEffect(() => {
    const masihAda = kategoriTersedia.some(k => k.nama === form.kategori);
    if (!masihAda && kategoriTersedia.length > 0) {
      setForm(f => ({ ...f, kategori: kategoriTersedia[0].nama }));
    }
  }, [kategoriTersedia]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nominal || form.nominal <= 0) return showToast('Nominal tidak valid!', 'error');
    if (!form.kategori) return showToast('Pilih kategori dulu!', 'error');
    setLoading(true);
    try {
      const { error } = await supabase.from('transaksi').insert({
        user_id: user.id,
        tipe: form.tipe,
        kategori: form.kategori,
        nominal: Number(form.nominal),
      });
      if (error) throw error;
      showToast('Transaksi berhasil dicatat!');
      setForm({ ...form, nominal: '' });
    } catch (e) { showToast('Gagal menyimpan', 'error'); }
    setLoading(false);
  };

  return (
    <Card title="Catat Transaksi">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-stone-500 mb-1.5 font-medium">Tipe</label>
          <SegmentToggle
            options={[{ value: 'pengeluaran', label: 'Pengeluaran' }, { value: 'pemasukan', label: 'Pemasukan' }]}
            value={form.tipe}
            onChange={(v) => setForm({ ...form, tipe: v })}
          />
        </div>
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="block text-sm text-stone-500 font-medium">Kategori</label>
            <button type="button" onClick={() => setShowKelola(true)} className="text-xs font-semibold text-ledger-600 hover:text-ledger-800 transition flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              Kelola
            </button>
          </div>
          {kategoriTersedia.length === 0 ? (
            <p className="text-sm text-stone-400 italic p-3 bg-stone-50 rounded-xl border border-stone-200">Belum ada kategori. Tap "Kelola" untuk menambah.</p>
          ) : (
            <select className="w-full p-3 border border-stone-200 rounded-xl bg-stone-50 focus:ring-2 focus:ring-ledger-200 focus:border-ledger-300 outline-none transition" value={form.kategori} onChange={e => setForm({...form, kategori: e.target.value})}>
              {kategoriTersedia.map(k => <option key={k.id} value={k.nama}>{k.nama}</option>)}
            </select>
          )}
        </div>
        <div>
          <label className="block text-sm text-stone-500 mb-1.5 font-medium">Nominal (Rp)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-mono text-sm">Rp</span>
            <input type="number" className="w-full p-3 pl-10 border border-stone-200 rounded-xl bg-stone-50 focus:ring-2 focus:ring-ledger-200 focus:border-ledger-300 outline-none font-mono transition" placeholder="0" value={form.nominal} onChange={e => setForm({...form, nominal: e.target.value})} />
          </div>
        </div>
        <button disabled={loading} type="submit" className="w-full py-3.5 bg-ledger-700 text-white rounded-xl font-bold hover:bg-ledger-800 transition flex justify-center gap-2 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-ledger-300">
          {loading ? <Spinner /> : 'Simpan Transaksi'}
        </button>
      </form>

      {showKelola && <KategoriManager user={user} showToast={showToast} kategoriList={kategoriList} onClose={() => setShowKelola(false)} />}
    </Card>
  );
};

// ==========================================
// 5b. KOMPONEN KELOLA KATEGORI (CRUD + Drag & Drop Reorder)
// ==========================================
const KategoriManager = ({ user, showToast, kategoriList, onClose }) => {
  const [tab, setTab] = useState('pengeluaran');
  const [namaBaru, setNamaBaru] = useState('');
  const [saving, setSaving] = useState(false);
  const [modalHapus, setModalHapus] = useState({ isOpen: false, id: null });
  const dragId = useRef(null);
  const [dragOverId, setDragOverId] = useState(null);

  const list = useMemo(
    () => kategoriList.filter(k => k.tipe === tab).sort((a, b) => (a.urutan ?? 0) - (b.urutan ?? 0)),
    [kategoriList, tab]
  );

  const tambahKategori = async () => {
    const nama = namaBaru.trim();
    if (!nama) return;
    if (list.some(k => k.nama.toLowerCase() === nama.toLowerCase())) return showToast('Kategori sudah ada!', 'error');
    setSaving(true);
    try {
      const urutanBaru = list.length > 0 ? Math.max(...list.map(k => k.urutan ?? 0)) + 1 : 0;
      const { error } = await supabase.from('kategori').insert({ user_id: user.id, nama, tipe: tab, urutan: urutanBaru });
      if (error) throw error;
      setNamaBaru('');
    } catch (e) { showToast('Gagal menambah kategori', 'error'); }
    setSaving(false);
  };

  const hapusKategori = async () => {
    try {
      const { error } = await supabase.from('kategori').delete().eq('id', modalHapus.id);
      if (error) throw error;
      showToast('Kategori dihapus');
    } catch (e) { showToast('Gagal menghapus', 'error'); }
  };

  const renameKategori = async (k, namaBaruInput) => {
    if (!namaBaruInput.trim() || namaBaruInput === k.nama) return;
    try {
      const { error } = await supabase.from('kategori').update({ nama: namaBaruInput.trim() }).eq('id', k.id);
      if (error) throw error;
    } catch (e) { showToast('Gagal mengubah nama', 'error'); }
  };

  // Simpan urutan baru ke Supabase setelah drag selesai (satu request upsert)
  const simpanUrutan = async (arr) => {
    try {
      const updates = arr.map((k, i) => ({ id: k.id, user_id: user.id, nama: k.nama, tipe: k.tipe, urutan: i }));
      const { error } = await supabase.from('kategori').upsert(updates);
      if (error) throw error;
    } catch (e) { showToast('Gagal menyimpan urutan', 'error'); }
  };

  const handleDrop = (targetId) => {
    if (dragId.current === null || dragId.current === targetId) { setDragOverId(null); return; }
    const arr = [...list];
    const fromIdx = arr.findIndex(k => k.id === dragId.current);
    const toIdx = arr.findIndex(k => k.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [moved] = arr.splice(fromIdx, 1);
    arr.splice(toIdx, 0, moved);
    dragId.current = null;
    setDragOverId(null);
    simpanUrutan(arr);
  };

  return (
    <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-50 flex justify-center items-end sm:items-center p-0 sm:p-4 fade-in" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-sm shadow-nav max-h-[85vh] flex flex-col slide-up" onClick={e => e.stopPropagation()}>
        <div className="p-5 pb-3 shrink-0">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-display font-semibold text-lg text-stone-800">Kelola Kategori</h3>
            <button onClick={onClose} className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <SegmentToggle
            options={[{ value: 'pengeluaran', label: 'Pengeluaran' }, { value: 'pemasukan', label: 'Pemasukan' }]}
            value={tab}
            onChange={setTab}
          />
        </div>

        <div className="px-5 overflow-y-auto flex-1">
          <p className="text-xs text-stone-400 mb-2">Tahan lalu geser <span className="inline-block">☰</span> untuk mengubah urutan.</p>
          <div className="space-y-2 pb-3">
            {list.map(k => (
              <div
                key={k.id}
                draggable
                onDragStart={() => { dragId.current = k.id; }}
                onDragOver={(e) => { e.preventDefault(); setDragOverId(k.id); }}
                onDragLeave={() => setDragOverId(prev => prev === k.id ? null : prev)}
                onDrop={() => handleDrop(k.id)}
                className={`flex items-center gap-2 bg-stone-50 border rounded-xl p-2.5 transition ${dragOverId === k.id ? 'border-ledger-400 bg-ledger-50' : 'border-stone-200'}`}
              >
                <span className="cursor-grab active:cursor-grabbing text-stone-400 px-1 select-none touch-none">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M7 4a1 1 0 11-2 0 1 1 0 012 0zM7 10a1 1 0 11-2 0 1 1 0 012 0zM7 16a1 1 0 11-2 0 1 1 0 012 0zM15 4a1 1 0 11-2 0 1 1 0 012 0zM15 10a1 1 0 11-2 0 1 1 0 012 0zM15 16a1 1 0 11-2 0 1 1 0 012 0z" /></svg>
                </span>
                <input
                  type="text"
                  defaultValue={k.nama}
                  onBlur={(e) => renameKategori(k, e.target.value)}
                  className="flex-1 min-w-0 bg-transparent text-sm font-medium text-stone-700 outline-none focus:bg-white focus:ring-2 focus:ring-ledger-200 rounded-lg px-2 py-1 transition"
                />
                <button onClick={() => setModalHapus({ isOpen: true, id: k.id })} className="text-brick-500 hover:text-brick-700 bg-brick-50 hover:bg-brick-100 p-1.5 rounded-md transition shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
              </div>
            ))}
            {list.length === 0 && <p className="text-sm text-stone-400 italic text-center py-4">Belum ada kategori {tab}.</p>}
          </div>
        </div>

        <div className="p-5 pt-3 border-t border-stone-100 shrink-0">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder={`Kategori ${tab} baru...`}
              value={namaBaru}
              onChange={e => setNamaBaru(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); tambahKategori(); } }}
              className="flex-1 p-3 border border-stone-200 rounded-xl bg-stone-50 focus:ring-2 focus:ring-ledger-200 focus:border-ledger-300 outline-none text-sm transition"
            />
            <button disabled={saving} onClick={tambahKategori} className="px-4 bg-ledger-700 text-white rounded-xl font-bold hover:bg-ledger-800 transition disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-ledger-300">
              {saving ? <Spinner className="h-4 w-4" /> : 'Tambah'}
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={modalHapus.isOpen}
        onClose={() => setModalHapus({ isOpen: false, id: null })}
        onConfirm={hapusKategori}
        title="Hapus Kategori"
        message="Yakin mau menghapus kategori ini? Transaksi lama yang sudah pakai kategori ini tidak akan berubah."
      />
    </div>
  );
};

// ==========================================
// 6. KOMPONEN INPUT HUTANG / PIUTANG
// ==========================================
const HutangForm = ({ user, showToast, onSaved }) => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ tipe: 'hutang', nama: '', nominal: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nama || !form.nominal || form.nominal <= 0) return showToast('Data tidak lengkap/valid!', 'error');
    setLoading(true);
    try {
      const { error } = await supabase.from('hutang_piutang').insert({
        user_id: user.id, tipe: form.tipe, nama: form.nama, total: Number(form.nominal), terbayar: 0, status: 'aktif'
      });
      if (error) throw error;
      showToast('Data berhasil dicatat!');
      setForm({ ...form, nama: '', nominal: '' });
      if (onSaved) onSaved();
    } catch (e) { showToast('Gagal menyimpan', 'error'); }
    setLoading(false);
  };

  return (
    <Card title="Catat Hutang / Piutang">
      <form onSubmit={handleSubmit} className="space-y-4">
        <SegmentToggle
          options={[{ value: 'hutang', label: 'Gw Berhutang' }, { value: 'piutang', label: 'Orang Berhutang' }]}
          value={form.tipe}
          onChange={(v) => setForm({ ...form, tipe: v })}
        />
        <input type="text" className="w-full p-3 border border-stone-200 rounded-xl bg-stone-50 focus:ring-2 focus:ring-ledger-200 focus:border-ledger-300 outline-none transition" placeholder="Nama Orang" value={form.nama} onChange={e => setForm({...form, nama: e.target.value})} />
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-mono text-sm">Rp</span>
          <input type="number" className="w-full p-3 pl-10 border border-stone-200 rounded-xl bg-stone-50 focus:ring-2 focus:ring-ledger-200 focus:border-ledger-300 outline-none font-mono transition" placeholder="Total Nominal" value={form.nominal} onChange={e => setForm({...form, nominal: e.target.value})} />
        </div>
        <button disabled={loading} type="submit" className="w-full py-3.5 bg-ledger-700 text-white rounded-xl font-bold hover:bg-ledger-800 transition flex justify-center gap-2 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-ledger-300">
          {loading ? <Spinner /> : 'Catat Data'}
        </button>
      </form>
    </Card>
  );
};

// ==========================================
// 6b. HALAMAN HUTANG (Form + List + Cicilan digabung jadi satu tab)
// ==========================================
const HutangPage = ({ user, showToast, hutangPiutang, riwayatCicilan, formatRp }) => {
  const [subTab, setSubTab] = useState('catat'); // 'catat' = catat/bayar hutang, 'tambah' = tambah daftar hutang baru
  const [search, setSearch] = useState('');
  const [modalHapus, setModalHapus] = useState({ isOpen: false, id: null });
  const [expandedId, setExpandedId] = useState(null);
  const [nominalBayar, setNominalBayar] = useState('');
  const [metodeBayar, setMetodeBayar] = useState('transfer');

  const filteredHutang = useMemo(
    () => hutangPiutang.filter(h => h.nama?.toLowerCase().includes(search.toLowerCase())),
    [hutangPiutang, search]
  );

  const eksekusiHapus = async () => {
    try {
      const { error } = await supabase.from('hutang_piutang').delete().eq('id', modalHapus.id);
      if (error) throw error;
      showToast('Data terhapus!');
    } catch (e) { showToast('Gagal menghapus', 'error'); }
  };

  const bayarHutang = async (h) => {
    const bayar = Number(nominalBayar);
    const sisa = h.total - h.terbayar;
    if (!bayar || bayar <= 0 || bayar > sisa) return showToast('Nominal tidak valid / melebih sisa!', 'error');
    const metodeLabel = metodeBayar === 'transfer' ? 'TF' : 'Cash';

    try {
      const { data: trans, error: errTrans } = await supabase
        .from('transaksi')
        .insert({
          user_id: user.id,
          tipe: h.tipe === 'hutang' ? 'pengeluaran' : 'pemasukan',
          kategori: `Pembayaran ${h.tipe} - ${h.nama} (${metodeLabel})`,
          nominal: bayar,
        })
        .select()
        .single();
      if (errTrans) throw errTrans;

      const { error: errRiwayat } = await supabase.from('riwayat_cicilan').insert({
        user_id: user.id, hutang_id: h.id, trans_id: trans.id, nominal: bayar, metode: metodeBayar,
      });
      if (errRiwayat) throw errRiwayat;

      const newTerbayar = h.terbayar + bayar;
      const { error: errUpdate } = await supabase
        .from('hutang_piutang')
        .update({ terbayar: newTerbayar, status: newTerbayar >= h.total ? 'lunas' : 'aktif' })
        .eq('id', h.id);
      if (errUpdate) throw errUpdate;

      showToast('Pembayaran dicatat & disinkronkan ke kas!');
      setNominalBayar('');
      setMetodeBayar('transfer');
    } catch (e) { showToast('Gagal bayar', 'error'); }
  };

  const hapusRiwayat = async (h, item) => {
    if (!window.confirm('Yakin mau hapus riwayat cicilan ini? Saldo utang dan kas utama akan disesuaikan kembali.')) return;

    try {
      const newTerbayar = h.terbayar - item.nominal;
      const { error: errUpdate } = await supabase
        .from('hutang_piutang')
        .update({ terbayar: newTerbayar, status: newTerbayar >= h.total ? 'lunas' : 'aktif' })
        .eq('id', h.id);
      if (errUpdate) throw errUpdate;

      const { error: errDelRiwayat } = await supabase.from('riwayat_cicilan').delete().eq('id', item.id);
      if (errDelRiwayat) throw errDelRiwayat;

      if (item.trans_id) {
        await supabase.from('transaksi').delete().eq('id', item.trans_id);
      }

      showToast('Riwayat berhasil dihapus!');
    } catch (e) { showToast('Gagal menghapus riwayat', 'error'); }
  };

  return (
    <div>
      <div className="mb-4">
        <SegmentToggle
          options={[{ value: 'catat', label: 'Catat / Bayar' }, { value: 'tambah', label: 'Tambah Daftar' }]}
          value={subTab}
          onChange={setSubTab}
        />
      </div>

      {subTab === 'tambah' ? (
        <HutangForm user={user} showToast={showToast} onSaved={() => setSubTab('catat')} />
      ) : (
        <>
          <div className="relative mt-1 mb-4">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input type="text" placeholder="Cari nama..." className="w-full p-3 pl-10 border border-stone-200 rounded-xl bg-white focus:ring-2 focus:ring-ledger-200 focus:border-ledger-300 outline-none transition" value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          <div className="space-y-3">
            {filteredHutang.map((h, i) => {
              const riwayatH = riwayatCicilan.filter(r => r.hutang_id === h.id);
              return (
              <div key={h.id} className="stagger-item bg-white p-4 rounded-2xl shadow-soft border border-stone-100" style={{ animationDelay: `${Math.min(i, 8) * 35}ms` }}>
                <div className="flex justify-between mb-3">
                  <div>
                    <span className={`text-[11px] px-2 py-1 rounded-full font-bold ${h.tipe === 'hutang' ? 'bg-brass-100 text-brass-700' : 'bg-petrol-100 text-petrol-700'}`}>
                      {h.tipe.toUpperCase()}
                    </span>
                    <p className="font-display font-semibold mt-1.5 text-stone-800">{h.nama}</p>
                    <p className="text-xs text-stone-400">{new Date(h.tanggal).toLocaleDateString('id-ID')}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-[11px] px-2 py-1 rounded-full font-bold ${h.status === 'lunas' ? 'bg-moss-100 text-moss-700' : 'bg-stone-100 text-stone-500'}`}>
                      {h.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="bg-stone-50 p-3.5 rounded-xl text-sm mb-3 space-y-1.5">
                  <LedgerRow label="Total" value={formatRp(h.total)} />
                  <LedgerRow label="Terbayar" value={formatRp(h.terbayar)} valueClass="text-moss-600" />
                  <div className="border-t border-stone-200 pt-1.5">
                    <LedgerRow label="Sisa" value={formatRp(h.total - h.terbayar)} valueClass="text-brick-600" bold />
                  </div>
                </div>

                <button
                  onClick={() => setExpandedId(expandedId === h.id ? null : h.id)}
                  className="w-full text-center text-sm text-ledger-700 font-semibold py-2.5 bg-ledger-50 rounded-xl hover:bg-ledger-100 transition flex justify-center items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-ledger-200"
                >
                  {expandedId === h.id ? 'Tutup Detail' : 'Lihat & Catat Cicilan'}
                  <svg className={`w-4 h-4 transform transition-transform ${expandedId === h.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </button>

                {expandedId === h.id && (
                  <div className="mt-3 border-t border-stone-100 pt-3 fade-in">

                    {h.status !== 'lunas' && (
                      <div className="mb-4 space-y-2">
                        <SegmentToggle
                          options={[{ value: 'tunai', label: 'Tunai' }, { value: 'transfer', label: 'Transfer' }]}
                          value={metodeBayar}
                          onChange={setMetodeBayar}
                        />
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-mono text-sm">Rp</span>
                            <input type="number" placeholder="Nominal Cicilan" className="w-full p-2.5 pl-9 border border-stone-200 bg-white rounded-lg text-sm outline-none focus:ring-2 focus:ring-ledger-200 font-mono" value={nominalBayar} onChange={e => setNominalBayar(e.target.value)} />
                          </div>
                          <button onClick={() => bayarHutang(h)} className="bg-ledger-700 text-white px-5 rounded-lg text-sm font-bold hover:bg-ledger-800 transition focus:outline-none focus:ring-2 focus:ring-ledger-300">Bayar</button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <p className="text-xs font-bold text-stone-400 uppercase tracking-wide">Riwayat Cicilan</p>
                      {riwayatH.length === 0 ? (
                        <p className="text-xs text-stone-400 italic">Belum ada riwayat cicilan dicatat.</p>
                      ) : (
                        riwayatH.map(r => (
                          <div key={r.id} className="flex justify-between items-center bg-stone-50 p-2.5 rounded-lg border border-stone-100">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-stone-700 font-mono">{formatRp(r.nominal)}</p>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${r.metode === 'transfer' ? 'bg-petrol-100 text-petrol-700' : 'bg-moss-100 text-moss-700'}`}>
                                  {r.metode === 'transfer' ? 'TF' : 'Cash'}
                                </span>
                              </div>
                              <p className="text-[10px] text-stone-400">{new Date(r.tanggal).toLocaleDateString('id-ID')}</p>
                            </div>
                            <button onClick={() => hapusRiwayat(h, r)} className="text-brick-500 hover:text-brick-700 bg-brick-100 p-1.5 rounded-md transition" title="Hapus cicilan ini">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-stone-100 flex justify-end">
                      <button onClick={() => setModalHapus({ isOpen: true, id: h.id })} className="text-xs text-brick-600 font-semibold flex items-center gap-1 hover:text-brick-700 px-2.5 py-1.5 bg-white border border-brick-200 rounded-lg transition">
                        Hapus Seluruh Data Ini
                      </button>
                    </div>
                  </div>
                )}
              </div>
              );
            })}
            {filteredHutang.length === 0 && <EmptyState text="Belum ada data hutang/piutang" />}
          </div>
        </>
      )}

      <ConfirmModal
        isOpen={modalHapus.isOpen}
        onClose={() => setModalHapus({ isOpen: false, id: null })}
        onConfirm={eksekusiHapus}
        title="Hapus Data"
        message="Yakin mau menghapus data ini? Aksi ini tidak bisa dibatalkan lho."
      />
    </div>
  );
};

// ==========================================
// 7. KOMPONEN RIWAYAT (List & Hapus Transaksi Kas)
// ==========================================
const RiwayatList = ({ user, transaksi, showToast, formatRp }) => {
  const [search, setSearch] = useState('');
  const [modalHapus, setModalHapus] = useState({ isOpen: false, id: null });

  const filteredTrans = useMemo(
    () => transaksi.filter(t => t.kategori?.toLowerCase().includes(search.toLowerCase()) || t.tipe?.toLowerCase().includes(search.toLowerCase())),
    [transaksi, search]
  );

  const eksekusiHapus = async () => {
    try {
      const { error } = await supabase.from('transaksi').delete().eq('id', modalHapus.id);
      if (error) throw error;
      showToast('Data terhapus!');
    } catch (e) { showToast('Gagal menghapus', 'error'); }
  };

  return (
    <div>
      <div className="relative mb-4">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        <input type="text" placeholder="Cari transaksi..." className="w-full p-3 pl-10 border border-stone-200 rounded-xl bg-white focus:ring-2 focus:ring-ledger-200 focus:border-ledger-300 outline-none transition" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="space-y-3">
        {filteredTrans.map((t, i) => (
          <div key={t.id} className="stagger-item bg-white p-4 rounded-2xl shadow-soft border border-stone-100 flex justify-between items-center" style={{ animationDelay: `${Math.min(i, 8) * 35}ms` }}>
            <div className="flex items-center gap-3 min-w-0">
              <span className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold font-display ${t.tipe === 'pemasukan' ? 'bg-moss-100 text-moss-700' : 'bg-brick-100 text-brick-700'}`}>
                {kategoriInisial(t.kategori)}
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-stone-800 truncate">{t.kategori}</p>
                <p className="text-xs text-stone-400">{new Date(t.tanggal).toLocaleDateString('id-ID')}</p>
              </div>
            </div>
            <div className="text-right flex flex-col items-end gap-1.5 shrink-0 pl-2">
              <span className={`font-mono font-bold text-sm ${t.tipe === 'pemasukan' ? 'text-moss-600' : 'text-brick-600'}`}>
                {t.tipe === 'pemasukan' ? '+' : '-'}{formatRp(t.nominal)}
              </span>
              <button onClick={() => setModalHapus({ isOpen: true, id: t.id })} className="text-[11px] text-brick-500 bg-brick-50 px-2 py-0.5 rounded-md hover:bg-brick-100 transition">Hapus</button>
            </div>
          </div>
        ))}
        {filteredTrans.length === 0 && <EmptyState text="Belum ada transaksi tercatat" />}
      </div>

      <ConfirmModal
        isOpen={modalHapus.isOpen}
        onClose={() => setModalHapus({ isOpen: false, id: null })}
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
      const [transRes, hutangRes] = await Promise.all([
        supabase.from('transaksi').select('*').eq('user_id', user.id),
        supabase.from('hutang_piutang').select('*').eq('user_id', user.id),
      ]);
      if (transRes.error) throw transRes.error;
      if (hutangRes.error) throw hutangRes.error;

      const data = { transaksi: transRes.data, hutang_piutang: hutangRes.data };

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

        // Loop penambahan data tanpa menghapus yang lama.
        // id lama dibuang supaya Postgres men-generate id baru (hindari bentrok primary key).
        if (data.transaksi?.length) {
          const rows = data.transaksi.map(({ id, user_id, ...rest }) => ({ ...rest, user_id: user.id }));
          const { error } = await supabase.from('transaksi').insert(rows);
          if (error) throw error;
        }
        if (data.hutang_piutang?.length) {
          const rows = data.hutang_piutang.map(({ id, user_id, ...rest }) => ({ ...rest, user_id: user.id }));
          const { error } = await supabase.from('hutang_piutang').insert(rows);
          if (error) throw error;
        }

        showToast('Restore data berhasil!');
      } catch(error) { showToast('File JSON tidak valid / gagal restore', 'error'); }
    };
    reader.readAsText(file);
    e.target.value = null; // Reset input
  };

  return (
    <Card title="Pusat Keamanan Data">
      <div className="space-y-4">
        <div className="p-4 bg-ledger-50 rounded-xl border border-ledger-100 text-sm text-ledger-800">
          Export akan mengunduh semua transaksi dan catatan hutang ke format JSON.
        </div>
        <button onClick={handleExport} className="w-full py-3.5 bg-ledger-900 text-white rounded-xl font-bold hover:bg-black transition flex justify-center items-center gap-2 focus:outline-none focus:ring-2 focus:ring-ledger-300">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
          Download Backup JSON
        </button>

        <div className="border-t border-stone-100 my-4"></div>

        <div className="p-4 bg-brass-50 rounded-xl border border-brass-100 text-sm text-brass-800">
          Import akan <b>menambahkan</b> data dari JSON ke database kamu (Data lama tidak dihapus). Catatan cicilan (riwayat) tidak ikut ter-restore lewat cara ini.
        </div>
        <input type="file" accept=".json" ref={fileRef} className="hidden" onChange={handleImport} />
        <button onClick={() => fileRef.current.click()} className="w-full py-3.5 bg-white border-2 border-stone-200 text-stone-700 rounded-xl font-bold hover:bg-stone-50 transition flex justify-center items-center gap-2 focus:outline-none focus:ring-2 focus:ring-stone-300">
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