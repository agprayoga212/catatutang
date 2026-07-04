import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, query, updateDoc, doc, increment } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// TODO: Ganti dengan Config dari Firebase Console lu
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

let currentUser = null;

// Registrasi Service Worker untuk PWA
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}

// Elemen DOM
const loginSec = document.getElementById('login-section');
const appSec = document.getElementById('app-section');
const userName = document.getElementById('user-name');
const listHutang = document.getElementById('list-hutang');

// --- LOGIKA AUTENTIKASI (GOOGLE SYNC) ---
document.getElementById('login-btn').addEventListener('click', () => {
  signInWithPopup(auth, provider).catch(err => console.error(err));
});

document.getElementById('logout-btn').addEventListener('click', () => {
  signOut(auth);
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    loginSec.classList.add('hidden');
    appSec.classList.remove('hidden');
    userName.innerText = user.displayName;
    muatDataHutang();
  } else {
    currentUser = null;
    loginSec.classList.remove('hidden');
    appSec.classList.add('hidden');
  }
});

// --- LOGIKA PEMASUKAN & PENGELUARAN ---
document.getElementById('simpan-transaksi').addEventListener('click', async () => {
  const tipe = document.getElementById('tipe-transaksi').value;
  const kategori = document.getElementById('kategori').value;
  const nominal = Number(document.getElementById('nominal').value);

  if (!nominal) return alert("Masukkan nominal!");

  await addDoc(collection(db, "users", currentUser.uid, "transaksi"), {
    tipe, kategori, nominal, tanggal: new Date()
  });
  
  alert('Transaksi berhasil disimpan ke Google Cloud!');
  document.getElementById('nominal').value = '';
});

// --- LOGIKA HUTANG & PIUTANG TERSTRUKTUR ---
document.getElementById('simpan-hutang').addEventListener('click', async () => {
  const tipe = document.getElementById('tipe-hutang').value;
  const nama = document.getElementById('nama-orang').value;
  const nominal = Number(document.getElementById('nominal-hutang').value);

  if (!nama || !nominal) return alert("Lengkapi data!");

  // Struktur rapi: Total hutang dicatat, jumlah yang sudah dibayar diset 0.
  await addDoc(collection(db, "users", currentUser.uid, "hutang_piutang"), {
    tipe, nama, total: nominal, terbayar: 0, status: 'aktif', tanggal: new Date()
  });

  document.getElementById('nama-orang').value = '';
  document.getElementById('nominal-hutang').value = '';
});

// Memuat data hutang/piutang secara realtime dari sinkronisasi Firestore
function muatDataHutang() {
  const q = query(collection(db, "users", currentUser.uid, "hutang_piutang"));
  
  onSnapshot(q, (snapshot) => {
    listHutang.innerHTML = '';
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.status === 'lunas') return; // Sembunyikan yang sudah lunas

      const li = document.createElement('li');
      let teks = data.tipe === 'hutang' ? `Gw hutang ke ${data.nama}` : `${data.nama} hutang ke gw`;
      let sisa = data.total - data.terbayar;
      
      li.innerHTML = `
        <strong>${teks}</strong><br>
        Total: Rp${data.total} | Terbayar: Rp${data.terbayar} | Sisa: Rp${sisa} <br>
        <input type="number" id="bayar-${docSnap.id}" placeholder="Nominal bayar cicilan">
        <button onclick="bayarHutang('${docSnap.id}', ${sisa}, '${data.tipe}')">Catat Pembayaran</button>
        <hr>
      `;
      listHutang.appendChild(li);
    });
  });
}

// Global function agar bisa dipanggil dari HTML
window.bayarHutang = async (id, sisa, tipe) => {
  const nominalBayar = Number(document.getElementById(`bayar-${id}`).value);
  if (!nominalBayar || nominalBayar > sisa) return alert('Nominal tidak valid atau melebihi sisa!');

  const docRef = doc(db, "users", currentUser.uid, "hutang_piutang", id);
  
  // Update jumlah terbayar. Jika lunas, update statusnya.
  await updateDoc(docRef, {
    terbayar: increment(nominalBayar),
    status: (nominalBayar === sisa) ? 'lunas' : 'aktif'
  });

  // Otomatis catat di arus kas (Bila bayar hutang = uang keluar, bila terima piutang = uang masuk)
  await addDoc(collection(db, "users", currentUser.uid, "transaksi"), {
    tipe: tipe === 'hutang' ? 'pengeluaran' : 'pemasukan',
    kategori: `Pembayaran ${tipe}`,
    nominal: nominalBayar,
    tanggal: new Date()
  });

  alert('Pembayaran berhasil dicatat & disinkronkan!');
};