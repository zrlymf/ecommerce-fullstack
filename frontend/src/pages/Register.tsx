import { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import Layout from '../components/Layout';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('CUSTOMER');
  
  // State untuk Toko
  const [storeName, setStoreName] = useState('');
  const [storeLocation, setStoreLocation] = useState('');
  const [loadingLoc, setLoadingLoc] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false); 

  const [error, setError] = useState('');
  const navigate = useNavigate();

  // LOGIC LOKASI 
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation tidak didukung browser Anda');
      return;
    }
    setLoadingLoc(true);
    
    const options = {
      enableHighAccuracy: true, 
      timeout: 10000,           
      maximumAge: 0             
    };

    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;
      try {
        const res = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
        const address = res.data.display_name; 
        setStoreLocation(address); 
      } catch (err) {
        alert('Gagal mengambil alamat dari peta.');
      } finally {
        setLoadingLoc(false);
      }
    }, (err) => {
      console.error("Error Lokasi:", err);
      alert('Gagal mendeteksi lokasi. Pastikan izin lokasi browser aktif.');
      setLoadingLoc(false);
    }, options); 
  };

  // LOGIC REGISTER
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoadingSubmit(true);

    try {
      const payload: any = { name, email, password, role };
      
      if (role === 'SELLER') {
        if (!storeName || !storeLocation) {
          setError('Nama Toko dan Lokasi wajib diisi untuk penjual!');
          setLoadingSubmit(false);
          return;
        }
        payload.storeName = storeName;
        payload.storeLocation = storeLocation;
      }

      const response = await axios.post('http://localhost:3000/auth/register', payload);
      const { access_token, refresh_token } = response.data;

      localStorage.setItem('token', access_token);
      localStorage.setItem('refreshToken', refresh_token);

      alert('Registrasi Berhasil! Selamat datang.');
      navigate('/dashboard');

    } catch (err: any) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Registrasi Gagal');
    } finally {
      setLoadingSubmit(false);
    }
  };

  return (
    <Layout>
      <div className="flex justify-center items-center py-10 min-h-[80vh]">
        
        {/* KARTU FORMULIR */}
        <div className="w-full max-w-lg bg-white p-8 rounded-card shadow-soft border border-gray-100 animate-[fadeIn_0.5s_ease-out]">
          
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-[#1A1A1A]">Buat Akun Baru</h1>
            <p className="text-gray-500 mt-1">
               Daftar untuk mulai belanja atau berjualan di <span className="font-bold text-[#F25C05]">BELANJAIN</span>.
            </p>
          </div>

          {/* Pesan Error */}
          {error && (
             <div className="mb-6 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-100 flex items-center gap-2">
                ⚠️ {error}
             </div>
          )}

          <form onSubmit={handleRegister} className="flex flex-col gap-5">
            
            {/* 1. INPUT STANDARD */}
            <div>
               <label className="block text-sm font-bold text-[#1A1A1A] mb-2 ml-1">Nama Lengkap</label>
               <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#F25C05]/20 focus:border-[#F25C05] outline-none transition-all" placeholder="John Doe" required />
            </div>

            <div>
               <label className="block text-sm font-bold text-[#1A1A1A] mb-2 ml-1">Email</label>
               <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#F25C05]/20 focus:border-[#F25C05] outline-none transition-all" placeholder="email@contoh.com" required />
            </div>

            <div>
               <label className="block text-sm font-bold text-[#1A1A1A] mb-2 ml-1">Password</label>
               <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#F25C05]/20 focus:border-[#F25C05] outline-none transition-all" placeholder="••••••••" required />
            </div>

            {/* 2. PEMILIH PERAN (ROLE) */}
            <div>
               <label className="block text-sm font-bold text-[#1A1A1A] mb-3 ml-1">Saya ingin mendaftar sebagai:</label>
               <div className="grid grid-cols-2 gap-4">
                  {/* Pilihan Customer */}
                  <div 
                    onClick={() => setRole('CUSTOMER')}
                    className={`cursor-pointer border-2 rounded-xl p-4 flex flex-col items-center justify-center transition-all ${role === 'CUSTOMER' ? 'border-[#F25C05] bg-orange-50' : 'border-gray-100 hover:border-gray-300'}`}
                  >
                    <span className="text-2xl mb-1">🛍️</span>
                    <span className={`font-bold ${role === 'CUSTOMER' ? 'text-[#F25C05]' : 'text-gray-500'}`}>Pembeli</span>
                  </div>

                  {/* Pilihan Seller */}
                  <div 
                    onClick={() => setRole('SELLER')}
                    className={`cursor-pointer border-2 rounded-xl p-4 flex flex-col items-center justify-center transition-all ${role === 'SELLER' ? 'border-[#F25C05] bg-orange-50' : 'border-gray-100 hover:border-gray-300'}`}
                  >
                    <span className="text-2xl mb-1">🏪</span>
                    <span className={`font-bold ${role === 'SELLER' ? 'text-[#F25C05]' : 'text-gray-500'}`}>Penjual</span>
                  </div>
               </div>
            </div>

            {/* 3. BAGIAN KHUSUS SELLER */}
            {role === 'SELLER' && (
              <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 animate-[fadeIn_0.3s_ease-out]">
                <h4 className="font-bold text-[#F25C05] mb-4 flex items-center gap-2">
                  <span className="bg-orange-100 p-1 rounded-md">📝</span> Info Toko
                </h4>
                
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Nama Toko</label>
                    <input type="text" value={storeName} onChange={(e) => setStoreName(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-[#F25C05] outline-none bg-white" placeholder="Contoh: Toko Berkah" />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Lokasi Toko</label>
                    <textarea 
                      value={storeLocation} 
                      onChange={(e) => setStoreLocation(e.target.value)} 
                      className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-[#F25C05] outline-none bg-white min-h-[80px]" 
                      placeholder="Alamat lengkap..." 
                    />
                    
                    <button 
                      type="button" 
                      onClick={handleGetLocation} 
                      disabled={loadingLoc}
                      className="mt-2 text-xs flex items-center gap-2 bg-white border border-gray-300 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-700"
                    >
                      {loadingLoc ? (
                        <span className="animate-spin">⏳</span> 
                      ) : (
                        <span>📍</span>
                      )}
                      {loadingLoc ? 'Mendeteksi...' : 'Deteksi Lokasi Otomatis'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TOMBOL SUBMIT */}
            <button 
              type="submit" 
              disabled={loadingSubmit}
              className="mt-4 w-full bg-[#F25C05] hover:bg-[#D94E04] text-white font-bold py-3.5 rounded-full transition-all shadow-lg shadow-orange-500/20 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loadingSubmit ? 'Mendaftarkan...' : 'Buat Akun Sekarang'}
            </button>

          </form>

          <p className="text-center mt-8 text-sm text-gray-500">
            Sudah punya akun? <Link to="/login" className="text-[#F25C05] font-bold hover:underline">Masuk</Link>
          </p>

        </div>
      </div>
    </Layout>
  );
}