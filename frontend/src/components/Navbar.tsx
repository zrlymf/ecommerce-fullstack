import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance'; 

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  
  // State untuk menyimpan jumlah keranjang
  const [cartCount, setCartCount] = useState(0); 

  // Cek halaman auth
  const isAuthPage = ['/login', '/register'].includes(location.pathname);
  const isLoggedIn = !!localStorage.getItem('token');

  const fetchCartCount = async () => {
    if (!isLoggedIn) return;

    try {
      const res = await axiosInstance.get('/cart');
      const count = res.data.items ? res.data.items.length : 0;
      setCartCount(count);
    } catch (error) {
      console.error("Gagal ambil jumlah keranjang", error);
    }
  };

  useEffect(() => {
    fetchCartCount();
  }, [location.pathname, isLoggedIn]); // Dependency: jalan kalau URL berubah atau status login berubah

  const handleSearch = (e: any) => {
    e.preventDefault();
    if (keyword.trim()) {
      navigate(`/dashboard?q=${keyword}`);
    }
  };

  const handleLogout = () => {
    if (window.confirm('Apakah Anda yakin ingin keluar?')) {
      localStorage.clear();
      navigate('/login');
    }
  };

  return (
    <nav className="w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">

          {/* 1. LOGO BRAND */}
          <Link to="/" className="text-2xl font-extrabold tracking-tighter text-[#1A1A1A] hover:opacity-80 transition">
            BELANJAIN<span className="text-[#F25C05]">.</span>
          </Link>

          {!isAuthPage && (
            <>
              {/* 2. SEARCH BAR */}
              <form onSubmit={handleSearch} className="hidden md:flex flex-1 mx-10 max-w-lg relative group">
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Mau cari apa hari ini?"
                  className="w-full bg-[#F0F0F0] text-[#1A1A1A] py-3 px-6 pl-6 pr-24 rounded-full focus:outline-none focus:ring-2 focus:ring-[#F25C05]/20 transition-all font-medium placeholder-gray-400"
                />
                <button type="submit" className="absolute right-1.5 top-1.5 bottom-1.5 bg-[#F25C05] hover:bg-[#D94E04] text-white px-6 rounded-full text-sm font-bold transition-transform active:scale-95 shadow-md shadow-orange-500/20">
                  Cari
                </button>
              </form>

              {/* 3. MENU KANAN */}
              <div className="flex items-center gap-6">
                
                {/* Ikon Keranjang */}
                <Link to="/cart" className="relative p-2 text-[#1A1A1A] hover:text-[#F25C05] transition-colors group">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  
                  {cartCount > 0 && (
                    <span className="absolute top-0 right-0 bg-[#F25C05] text-white text-[10px] font-bold h-4 w-4 flex items-center justify-center rounded-full border-2 border-white shadow-sm animate-bounce">
                      {cartCount}
                    </span>
                  )}
                </Link>

                <div className="h-6 w-[1px] bg-gray-300 hidden sm:block"></div>

                {isLoggedIn ? (
                  <div className="flex items-center gap-3">
                     <div className="hidden sm:flex flex-col items-end mr-2">
                        <span className="text-xs text-gray-500 font-bold">Halo, Kak!</span>
                     </div>
                     
                     <Link 
                        to="/edit-profile" 
                        className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 hover:bg-gray-200 text-sm font-bold text-gray-700 transition-colors"
                        title="Edit Profil"
                     >
                        <span>✏️</span>
                        <span className="hidden sm:inline">Edit</span>
                     </Link>

                     <button 
                        onClick={handleLogout}
                        className="px-4 py-2 rounded-full bg-red-50 hover:bg-red-100 text-sm font-bold text-red-600 transition-colors border border-red-100"
                        title="Keluar"
                     >
                        Logout
                     </button>
                  </div>
                ) : (
                  <div className="flex gap-3 text-sm font-bold">
                    <Link to="/login" className="px-4 py-2 text-[#1A1A1A] hover:text-[#F25C05] transition-colors">Masuk</Link>
                    <Link to="/register" className="px-5 py-2 bg-[#1A1A1A] text-white rounded-full hover:bg-black hover:shadow-lg transition-all active:scale-95">Daftar</Link>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;