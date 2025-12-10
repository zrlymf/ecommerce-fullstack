import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import Layout from '../components/Layout';
import ProductCard from '../components/ProductCard';

export default function ShopPage() {
  const { sellerId } = useParams();
  
  // STATE DATA
  const [products, setProducts] = useState<any[]>([]);
  const [shopName, setShopName] = useState('Memuat Toko...');
  const [shopLocation, setShopLocation] = useState('');
  const [loading, setLoading] = useState(true);

  // STATE FILTER
  const [keyword, setKeyword] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState(''); 

  useEffect(() => {
    setLoading(true);
    
    // Kirim semua parameter filter ke backend
    axiosInstance.get('/products', {
        params: {
            sellerId: sellerId, 
            search: keyword,
            category: categoryFilter,
            minPrice: minPrice,
            maxPrice: maxPrice,
            sort: sortBy
        }
    })
      .then(res => {
        setProducts(res.data.data);

        // Set Info Toko 
        if (res.data.data.length > 0) {
          const firstProduct = res.data.data[0];
          setShopName(firstProduct.user?.storeName || firstProduct.user?.name || 'Toko Official');
          setShopLocation(firstProduct.user?.storeLocation || 'Lokasi tidak diketahui');
        } else if (!keyword && !categoryFilter && !minPrice && !maxPrice) {
             setShopName('Toko Tidak Ditemukan');
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setShopName('Error Memuat Data');
        setLoading(false);
      });
  }, [sellerId, keyword, categoryFilter, minPrice, maxPrice, sortBy]);

  // UTILS
  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("🔗 Link toko berhasil disalin!");
  };

  const handleChat = () => {
    const phoneNumber = "6282257159558";
    const message = `Halo Admin ${shopName}, saya mau tanya produk di toko Anda.`;
    window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <Layout title={shopName}>
      <div className="pb-20">

        {/* 1. HEADER TOKO */}
        <div className="relative bg-gradient-to-r from-[#F25C05] to-orange-400 rounded-2xl p-6 md:p-10 mb-8 shadow-lg text-white overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -mr-16 -mt-16 pointer-events-none"></div>
             <div className="absolute bottom-0 left-0 w-40 h-40 bg-black opacity-5 rounded-full -ml-10 -mb-10 pointer-events-none"></div>

             <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                <div className="w-28 h-28 bg-white rounded-full flex-shrink-0 flex items-center justify-center text-5xl shadow-xl border-4 border-white/40 text-[#F25C05]">🏪</div>
                <div className="text-center md:text-left flex-1 min-w-0">
                    <h1 className="text-3xl md:text-4xl font-extrabold truncate">{shopName}</h1>
                    <p className="text-white/90 text-sm mt-2 flex items-center justify-center md:justify-start gap-2">
                        <span>📍 {shopLocation}</span>
                    </p>
                </div>
                <div className="flex gap-3">
                    <button onClick={handleChat} className="bg-white text-[#F25C05] px-6 py-2.5 rounded-xl font-bold shadow-md hover:bg-gray-50 transition active:scale-95 flex items-center gap-2">
                        <span>💬</span> Chat
                    </button>
                    <button onClick={handleShare} className="bg-white/20 text-white border border-white/40 px-6 py-2.5 rounded-xl font-bold hover:bg-white/30 transition active:scale-95 flex items-center gap-2">
                        <span>🔗</span> Share
                    </button>
                </div>
             </div>
        </div>

        {/* 2. SECTION FILTER & CONTROL BAR */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm mb-6">
            
            {/* Baris 1: Search & Kategori */}
            <div className="flex flex-col md:flex-row gap-4 mb-4 pb-4 border-b border-gray-100">
                <div className="flex-1 relative">
                    <span className="absolute left-3 top-3.5 text-gray-400">🔍</span>
                    <input 
                        type="text" 
                        placeholder={`Cari produk di ${shopName}...`}
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#F25C05] outline-none text-sm font-medium"
                    />
                </div>
                <select 
                    value={categoryFilter} 
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full md:w-64 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#F25C05] cursor-pointer font-medium"
                >
                    <option value="">📂 Semua Kategori</option>
                    <option value="Elektronik">Elektronik</option>
                    <option value="Fashion">Fashion</option>
                    <option value="Makanan">Makanan</option>
                    <option value="Olahraga">Olahraga</option>
                    <option value="Buku">Buku</option>
                    <option value="Kesehatan">Kesehatan</option>
                    <option value="Perlengkapan Rumah">Perabotan</option>
                </select>
            </div>

            {/* Baris 2: Price Range & Sorting Buttons */}
            <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
                
                {/* Range Harga */}
                <div className="flex items-center gap-2 w-full md:w-auto">
                   <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded">Harga</span>
                   <input type="number" placeholder="Min" value={minPrice} onChange={e => setMinPrice(e.target.value)} className="w-24 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-[#F25C05]" />
                   <span className="text-gray-400">-</span>
                   <input type="number" placeholder="Max" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} className="w-24 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-[#F25C05]" />
                </div>

                {/* BAGIAN YANG ANDA MINTA */}
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
                          onClick={() => setSortBy(option.value)}
                          className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all
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

                  {/* Tombol Reset (Disesuaikan untuk Halaman Toko) */}
                  <button
                    onClick={() => {
                      setKeyword('');
                      setCategoryFilter('');
                      setMinPrice('');
                      setMaxPrice('');
                      setSortBy('');
                    }}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs font-bold transition flex items-center gap-2 border border-gray-200"
                  >
                    🔄 Reset
                  </button>

                </div>

            </div>
        </div>

        {/* 3. HASIL PRODUK */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-6 border-b border-gray-200 pb-4">
            <h2 className="text-xl font-bold text-[#1A1A1A] border-l-4 border-[#F25C05] pl-3">
              Etalase Toko
            </h2>
            <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {products.length} Barang
            </span>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 animate-pulse">
               {[...Array(5)].map((_, i) => <div key={i} className="bg-gray-200 h-64 rounded-xl"></div>)}
            </div>
          ) : (
            <>
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
                      sku={product.sku}
                      user={product.user}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
                  <div className="text-6xl mb-4 opacity-20">🕵️‍♀️</div>
                  <h3 className="text-lg font-bold text-gray-700">Produk tidak ditemukan.</h3>
                  <p className="text-gray-500 text-sm mt-1">Coba ubah kata kunci atau reset filter.</p>
                  <button onClick={() => {setKeyword(''); setCategoryFilter(''); setMinPrice(''); setMaxPrice(''); setSortBy('');}} className="mt-4 text-[#F25C05] font-bold text-sm hover:underline">
                    Reset Filter
                  </button>
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </Layout>
  );
}