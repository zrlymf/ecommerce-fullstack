import { useEffect, useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import Layout from '../components/Layout';
import ProductCard from '../components/ProductCard';

interface Product {
  id: number;
  name: string;
  description: string;
  price: string;
  stock: number;
  category: string;
  sku: string;
  imageUrl: string;
  user?: { storeName?: string, name?: string };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // State Filter
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [products, setProducts] = useState<Product[]>([]);

  // State Search 
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

  // User & Modal State 
  const [userRole, setUserRole] = useState('');
  const [userName, setUserName] = useState('Kak');
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeStoreName, setUpgradeStoreName] = useState('');
  const [upgradeStoreLoc, setUpgradeStoreLoc] = useState('');
  const [loadingLoc, setLoadingLoc] = useState(false);

  // Data Kategori dengan Icon SVG Otomatis
  const categoriesData = [
    {
      name: 'Semua', value: '',
      image: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%23F25C05"/><path d="M30 30h15v15H30zm25 0h15v15H55zm-25 25h15v15H30zm25 0h15v15H55z" fill="white"/></svg>`
    },
    {
      name: 'Elektronik', value: 'Elektronik',
      image: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%23F25C05"/><rect x="35" y="25" width="30" height="50" rx="4" fill="white"/><circle cx="50" cy="65" r="3" fill="%23F25C05"/></svg>`
    },
    {
      name: 'Fashion', value: 'Fashion',
      image: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%23F25C05"/><path d="M30 35 L40 25 L50 35 L60 25 L70 35 V75 H30 Z" fill="white"/></svg>`
    },
    {
      name: 'Makanan', value: 'Makanan',
      image: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%23F25C05"/><path d="M30 50 A20 20 0 0 1 70 50 L70 55 H30 Z M30 60 H70 V70 A5 5 0 0 1 65 75 H35 A5 5 0 0 1 30 70 Z" fill="white"/></svg>`
    },
    {
      name: 'Olahraga', value: 'Olahraga',
      image: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%23F25C05"/><circle cx="50" cy="50" r="20" fill="white"/><circle cx="50" cy="50" r="15" fill="%23F25C05"/><path d="M50 35 L50 65 M35 50 L65 50" stroke="white" stroke-width="4"/></svg>`
    },
    {
      name: 'Buku', value: 'Buku',
      image: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%23F25C05"/><path d="M30 40 Q50 40 50 50 Q50 40 70 40 V70 Q50 70 50 80 Q50 70 30 70 Z" fill="white"/></svg>`
    },
    {
      name: 'Kesehatan', value: 'Kesehatan',
      image: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%23F25C05"/><path d="M45 30 H55 V45 H70 V55 H55 V70 H45 V55 H30 V45 H45 Z" fill="white"/></svg>`
    },
    {
      name: 'Perabotan', value: 'Perlengkapan Rumah',
      image: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%23F25C05"/><path d="M30 50 L50 30 L70 50 V70 H30 Z" fill="white"/></svg>`
    },
  ];

  // Sinkronisasi Pencarian Header 
  useEffect(() => {
    const queryFromNavbar = searchParams.get('q');
    if (queryFromNavbar) {
      setSearch(queryFromNavbar);
    }
  }, [searchParams]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user'); // 1. Cek apakah ada data update di localStorage

    if (!token) {
      navigate('/login');
    } else {
      try {
        const decoded: any = jwtDecode(token);
        setUserRole(decoded.role);
        setCurrentUserId(decoded.sub);

        // 2. Prioritaskan data dari localStorage ('user')
        if (savedUser) {
          const parsedUser = JSON.parse(savedUser);
          setUserName(parsedUser.name || decoded.name || 'Kak');

          // Update role juga kalau-kalau berubah jadi Seller
          if (parsedUser.role) setUserRole(parsedUser.role);
        } else {
          // Kalau tidak ada data tersimpan, pakai data dari token
          if (decoded.name) setUserName(decoded.name);
        }

      } catch (error) {
        navigate('/login');
      }
      fetchProducts();
    }
  }, [navigate, search, category, minPrice, maxPrice, sortBy, page]);

  // --- API FUNCTIONS ---
  const fetchProducts = async () => {
    try {
      const response = await axiosInstance.get('/products', {
        params: { search, category, minPrice, maxPrice, sort: sortBy, page, limit: 10 }
      });
      setProducts(response.data.data);
      setTotalPages(response.data.meta.last_page);
    } catch (error) {
      console.error("Gagal ambil data:", error);
    }
  };

  // --- UPGRADE SELLER LOGIC ---
  const getUpgradeLoc = () => {
    if (!navigator.geolocation) return alert('Browser tidak support');
    setLoadingLoc(true);
    const options = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 };

    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
        const data = await res.json();
        setUpgradeStoreLoc(data.display_name);
      } catch (err) { alert('Gagal ambil lokasi'); }
      finally { setLoadingLoc(false); }
    }, () => { alert('Gagal. Pastikan GPS aktif.'); setLoadingLoc(false); }, options);
  };

  const submitUpgrade = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await axiosInstance.patch('/auth/upgrade-seller', {
        storeName: upgradeStoreName, storeLocation: upgradeStoreLoc
      });
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('refreshToken', response.data.refresh_token);
      alert('Selamat! Anda sekarang adalah Seller. Silakan upload produk.');
      setShowUpgradeModal(false);
      window.location.reload();
    } catch (error) { alert('Gagal upgrade akun.'); }
  };

  // --- UI COMPONENTS ---
  const ActionButton = ({ to, icon, label, color = "bg-white", textColor = "text-gray-700", border = "border-gray-200" }: any) => (
    <Link to={to} className={`flex flex-col items-center justify-center p-4 rounded-xl shadow-sm border ${border} ${color} hover:shadow-md hover:scale-105 transition-all duration-200 group`}>
      <span className="text-2xl mb-2 group-hover:-translate-y-1 transition-transform">{icon}</span>
      <span className={`text-xs font-bold ${textColor} text-center`}>{label}</span>
    </Link>
  );

  return (
    <Layout title="Dashboard Toko">

      {/* 1. SECTION: MENU & PROFILE */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">

        {/* KARTU PROFIL (Kiri) */}
        <div className="lg:col-span-1 bg-white p-6 rounded-card shadow-soft border border-gray-100 flex flex-col justify-center text-center">

          <div className="w-16 h-16 bg-orange-100 text-[#F25C05] text-3xl flex items-center justify-center rounded-full mx-auto mb-4">
            👋
          </div>

          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Selamat Datang,</p>
            {/* Menampilkan Nama User */}
            <h2 className="text-2xl font-extrabold text-[#1A1A1A] capitalize">
              Halo, {userName}
            </h2>
            <div className="mt-2 inline-block px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold border border-gray-200">
              {userRole}
            </div>
          </div>

        </div>

        {/* GRID TOMBOL MENU */}
        <div className="lg:col-span-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 h-full">

            {/* MENU CUSTOMER */}
            {userRole === 'CUSTOMER' && (
              <>
                <ActionButton to="/cart" icon="🛒" label="Keranjang" />
                <ActionButton to="/my-orders" icon="🧾" label="Pesanan Saya" />
              </>
            )}

            {/* MENU SELLER */}
            {userRole === 'SELLER' && (
              <>
                <ActionButton to="/manage-orders" icon="📦" label="Kelola Pesanan" border="border-purple-100" />
                <ActionButton to="/inventory" icon="📋" label="Inventaris" border="border-teal-100" />
                <ActionButton to="/seller-dashboard" icon="📊" label="Analitik" border="border-yellow-100" />
                <button
                  onClick={() => currentUserId && navigate(`/shop/${currentUserId}`)}
                  className="flex flex-col items-center justify-center p-4 rounded-xl shadow-sm border border-gray-200 bg-white hover:shadow-md hover:scale-105 transition-all group"
                >
                  <span className="text-2xl mb-2">🏪</span>
                  <span className="text-xs font-bold text-gray-700">Toko Saya</span>
                </button>
              </>
            )}

            <div className="col-span-2 sm:col-span-1">
              {userRole === 'SELLER' ? (
                <Link to="/add-product" className="h-full flex flex-col items-center justify-center p-4 rounded-xl shadow-md bg-[#F25C05] hover:bg-[#D94E04] text-white hover:scale-105 transition-all">
                  <span className="text-2xl mb-1">➕</span>
                  <span className="text-xs font-bold">Produk Baru</span>
                </Link>
              ) : (
                <button onClick={() => setShowUpgradeModal(true)} className="w-full h-full flex flex-col items-center justify-center p-4 rounded-xl shadow-md bg-[#F25C05] hover:bg-[#D94E04] text-white hover:scale-105 transition-all">
                  <span className="text-2xl mb-1">🏪</span>
                  <span className="text-xs font-bold">Buka Toko</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. SECTION: FILTER & CONTROL BAR */}
      <div className="bg-white p-5 rounded-card shadow-soft border border-gray-100 mb-8">
        <div className="flex flex-col gap-4">

          {/* A. SEARCH BAR */}
          <div className="w-full relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <span className="text-gray-400 text-lg">🔍</span>
            </div>
            <input
              type="text"
              placeholder="Cari nama produk apa saja..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#F25C05]/20 focus:border-[#F25C05] outline-none text-sm transition-all font-medium"
            />
          </div>

          {/* B. KARTU KATEGORI */}
          <div>
            <h3 className="text-lg font-extrabold text-[#1A1A1A] mb-4">Kategori Populer</h3>

            {/* Container Scrollable ke samping */}
            <div className="flex gap-4 overflow-x-auto py-4 scrollbar-hide -mx-1 px-1">
              {categoriesData.map((cat) => {
                const isSelected = category === cat.value;
                return (
                  <button
                    key={cat.name}
                    onClick={() => setCategory(cat.value)}
                    className={`flex-shrink-0 w-32 p-3 rounded-2xl border transition-all flex flex-col items-center justify-center gap-3 group relative overflow-hidden
                      ${isSelected
                        ? 'border-[#F25C05] bg-orange-50 shadow-md transform scale-105'
                        : 'border-gray-100 bg-white hover:border-gray-300 hover:shadow-lg hover:-translate-y-1'}`}
                  >
                    {/* Gambar Icon SVG */}
                    <div className="w-14 h-14 rounded-xl overflow-hidden shadow-sm relative group-hover:scale-110 transition-transform duration-300">
                      <img
                        src={cat.image}
                        alt={cat.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Teks Nama & Jumlah */}
                    <div className="text-center w-full">
                      <p className={`text-sm font-bold truncate ${isSelected ? 'text-[#F25C05]' : 'text-gray-700'}`}>
                        {cat.name}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filter Harga, Sort, dan Reset */}
          <div className="flex flex-col md:flex-row gap-3 justify-between items-center border-t border-gray-100 pt-4">

            {/* Range Harga */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <span className="text-xs font-bold text-gray-500 mr-1">Harga:</span>
              <input type="number" placeholder="Min" value={minPrice} onChange={e => setMinPrice(e.target.value)} className="w-24 px-3 py-2 bg-white border border-gray-200 rounded-md text-sm outline-none focus:border-[#F25C05]" />
              <span className="text-gray-400">-</span>
              <input type="number" placeholder="Max" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} className="w-24 px-3 py-2 bg-white border border-gray-200 rounded-md text-sm outline-none focus:border-[#F25C05]" />
            </div>

            {/* Sort & Reset */}
            <div className="flex gap-3 w-full md:w-auto items-center flex-wrap">

              {/* Tombol-tombol Sorting */}
              <div className="flex gap-2 flex-wrap">
                {[
                  { label: "📦 Default", value: "" },
                  { label: "📅 Terbaru", value: "newest" },
                  { label: "💰 Termurah", value: "price_asc" },
                  { label: "💎 Termahal", value: "price_desc" },
                  { label: "⏳ Terlama", value: "oldest" },
                ].map(option => {
                  const active = sortBy === option.value;
                  return (
                    <button
                      key={option.value}
                      onClick={() => {
                        setSortBy(option.value);
                        setPage(1); // reset ke halaman pertama
                      }}
                      className={`px-3 py-2 rounded-lg text-sm font-bold border transition-all
            ${active
                          ? "bg-[#F25C05] text-white border-[#F25C05] shadow-md"
                          : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"}
          `}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>

              {/* Tombol Reset */}
              <button
                onClick={() => {
                  setSearch('');
                  setCategory('');
                  setMinPrice('');
                  setMaxPrice('');
                  setSortBy(''); // kembali ke stok terbanyak
                  setPage(1);
                  navigate('/dashboard');
                }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-md 
               text-sm font-bold transition flex items-center gap-2 border border-gray-200"
              >
                🔄 Reset
              </button>

            </div>

          </div>
        </div>
      </div>

      {/* 3. SECTION: PRODUCT GRID */}
      {products.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 animate-[fadeIn_0.5s_ease-out]">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              id={product.id}
              name={product.name}
              price={Number(product.price)}
              stock={product.stock}
              category={product.category}
              imageUrl={product.imageUrl}
              user={product.user}
              sku={product.sku}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-card border border-dashed border-gray-300">
          <div className="text-6xl mb-4 opacity-20">🔍</div>
          <h3 className="text-lg font-bold text-gray-700">Produk tidak ditemukan</h3>
          <p className="text-gray-500 text-sm">Coba ganti kata kunci atau reset filter.</p>
        </div>
      )}

      {/* 4. SECTION: PAGINATION */}
      <div className="flex justify-center items-center gap-4 mt-12 mb-8">
        <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-gray-200 hover:bg-[#F25C05] hover:text-white hover:border-[#F25C05] disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-gray-400 transition-all shadow-sm">
          ←
        </button>
        <span className="text-sm font-bold text-[#1A1A1A] bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100">
          Halaman {page} / {totalPages}
        </span>
        <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-gray-200 hover:bg-[#F25C05] hover:text-white hover:border-[#F25C05] disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-gray-400 transition-all shadow-sm">
          →
        </button>
      </div>

      {/* 5. MODAL UPGRADE */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white w-full max-w-md p-8 rounded-card shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#F25C05] to-orange-400"></div>

            <h2 className="text-2xl font-extrabold text-[#1A1A1A] mb-2 text-center">Mulai Berjualan</h2>
            <p className="text-center text-gray-500 mb-8 text-sm">Lengkapi data toko Anda untuk bergabung.</p>

            <form onSubmit={submitUpgrade} className="flex flex-col gap-5">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5 uppercase tracking-wide">Nama Toko</label>
                <input
                  value={upgradeStoreName} onChange={e => setUpgradeStoreName(e.target.value)}
                  required placeholder="Contoh: Toko Maju Jaya"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#F25C05]/20 focus:border-[#F25C05] outline-none transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5 uppercase tracking-wide">Alamat Toko</label>
                <textarea
                  value={upgradeStoreLoc} onChange={e => setUpgradeStoreLoc(e.target.value)}
                  required placeholder="Alamat lengkap..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#F25C05]/20 focus:border-[#F25C05] outline-none min-h-[80px] transition-all"
                />
                <button type="button" onClick={getUpgradeLoc} disabled={loadingLoc} className="mt-2 text-xs flex items-center gap-1.5 text-[#F25C05] hover:text-[#D94E04] font-bold transition-colors">
                  {loadingLoc ? <span className="animate-spin">⏳</span> : <span>📍</span>}
                  {loadingLoc ? 'Mendeteksi Lokasi...' : 'Gunakan Lokasi Saya Saat Ini'}
                </button>
              </div>

              <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setShowUpgradeModal(false)} className="flex-1 py-3 text-gray-600 font-bold bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors">
                  Batal
                </button>
                <button type="submit" className="flex-1 py-3 text-white font-bold bg-[#F25C05] hover:bg-[#D94E04] rounded-xl shadow-lg shadow-orange-500/20 transition-all hover:scale-[1.02]">
                  Buka Toko 🚀
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </Layout>
  );
}