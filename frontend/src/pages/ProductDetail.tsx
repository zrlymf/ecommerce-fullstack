import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { jwtDecode } from 'jwt-decode';
import Layout from '../components/Layout'; 

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState('');
  const [selectedVariants, setSelectedVariants] = useState<any>({});

  useEffect(() => {
    // 1. Cek Token
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        setCurrentUserId(decoded.sub);
      } catch (error) {
        console.error("Token error");
      }
    }

    // 2. Ambil Data Produk
    setLoading(true);
    axiosInstance.get(`/products/${id}`)
      .then(res => {
        setProduct(res.data);

        // SET GAMBAR PERTAMA SEBAGAI DEFAULT 
        if (res.data.imageUrl) {
          const firstImage = res.data.imageUrl.split(',')[0];
          setActiveImage(firstImage);
        }
        setLoading(false);
      })
      .catch(() => {
        alert('Produk tidak ditemukan');
        navigate('/dashboard');
      });

    // 3. AMBIL DATA REVIEW 
    axiosInstance.get(`/reviews/product/${id}`)
      .then(res => setReviews(res.data))
      .catch(err => console.error("Gagal ambil review", err));

  }, [id, navigate]);

  // Handle Pilih Varian 
  const handleVariantSelect = (key: string, value: string) => {
    setSelectedVariants((prev: any) => ({
      ...prev,
      [key]: value 
    }));
  };

  // LOGIC DELETE PRODUK (OWNER) 
  const handleDelete = async () => {
    if (confirm('Yakin ingin menghapus produk ini?')) {
      try {
        await axiosInstance.delete(`/products/${id}`);
        alert('Produk berhasil dihapus');
        navigate('/dashboard');
      } catch (error) {
        alert('Gagal menghapus produk');
      }
    }
  };

  // LOGIC ADD TO CART (CUSTOMER) 
  const handleAddToCart = async () => {
    if (product.variants) {
      const requiredKeys = Object.keys(product.variants);
      const selectedKeys = Object.keys(selectedVariants);
      const missing = requiredKeys.filter(k => !selectedKeys.includes(k));

      if (missing.length > 0) {
        alert(`Mohon pilih varian: ${missing.join(', ')}`);
        return;
      }
    }

    try {
      await axiosInstance.post('/cart', {
        productId: Number(id),
        quantity: 1,
        selectedVariant: selectedVariants
      });

      const mauLihat = confirm('✅ Berhasil masuk keranjang!\n\nLihat Keranjang sekarang?');
      if (mauLihat) {
        navigate('/cart');
      }
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.message || 'Gagal masuk keranjang.';
      alert('❌ ' + msg);
    }
  };

  if (loading || !product) {
    return (
        <Layout>
            <div className="flex justify-center items-center h-[50vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F25C05]"></div>
            </div>
        </Layout>
    );
  }

  const formatRupiah = (price: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(price);
  };

  const isOwner = currentUserId && product.userId && (currentUserId === product.userId);
  const productImages = product.imageUrl ? product.imageUrl.split(',') : [];

  // LOGIKA STOK 
  const isOutOfStock = product.stock === 0;
  const isLowStock = product.stock > 0 && product.stock < 10;

  return (
    <Layout title="Detail Produk">
      <div className="max-w-6xl mx-auto pb-20">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            
            {/* KOLOM KIRI: GALERI GAMBAR */}
            <div className="space-y-4">
                {/* Gambar Utama */}
                <div className="relative aspect-square bg-[#F8F9FB] rounded-2xl overflow-hidden border border-gray-100 flex items-center justify-center group">
                    {isOutOfStock && (
                        <div className="absolute inset-0 bg-black/50 z-10 flex items-center justify-center backdrop-blur-sm">
                            <span className="bg-white text-[#1A1A1A] px-6 py-2 rounded-full font-bold uppercase tracking-widest shadow-lg">
                                Stok Habis
                            </span>
                        </div>
                    )}
                    <img 
                        src={`http://localhost:3000${activeImage}`} 
                        alt={product.name} 
                        className={`w-full h-full object-contain p-4 transition-transform duration-500 group-hover:scale-105 ${isOutOfStock ? 'grayscale opacity-50' : ''}`}
                        onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/400?text=No+Image'; }}
                    />
                </div>

                {/* Thumbnail */}
                {productImages.length > 1 && (
                    <div className="flex gap-3 overflow-x-auto pb-2">
                        {productImages.map((url: string, idx: number) => (
                            <button 
                                key={idx} 
                                onClick={() => setActiveImage(url)}
                                className={`w-20 h-20 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${activeImage === url ? 'border-[#F25C05] opacity-100' : 'border-transparent opacity-60 hover:opacity-100'}`}
                            >
                                <img src={`http://localhost:3000${url}`} className="w-full h-full object-cover" />
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* KOLOM KANAN: INFO PRODUK */}
            <div className="flex flex-col h-full">
                
                {/* Kategori & Judul */}
                <div className="mb-6">
                    <span className="text-[#F25C05] font-bold text-sm tracking-wide uppercase bg-orange-50 px-3 py-1 rounded-full mb-3 inline-block">
                        {product.category}
                    </span>
                    <h1 className="text-3xl md:text-4xl font-extrabold text-[#1A1A1A] leading-tight mb-2">
                        {product.name}
                    </h1>
                    
                    {/* Rating */}
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <div className="flex text-yellow-400">{'⭐'.repeat(5)}</div>
                        <span>({reviews.length} Ulasan)</span>
                    </div>
                </div>

                {/* Harga */}
                <div className="mb-8 p-4 bg-[#F8F9FB] rounded-xl border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-xs text-gray-400 font-bold uppercase mb-1">Harga</p>
                        <div className={`text-3xl font-extrabold ${isOutOfStock ? 'text-gray-400 line-through' : 'text-[#F25C05]'}`}>
                            {formatRupiah(Number(product.price))}
                        </div>
                    </div>
                    {/* Stok Info */}
                    <div className="text-right">
                        <p className="text-xs text-gray-400 font-bold uppercase mb-1">Stok Tersedia</p>
                        <div className="flex items-center gap-2 justify-end">
                            <span className="font-bold text-[#1A1A1A] text-lg">{product.stock}</span>
                            {isLowStock && !isOutOfStock && <span className="text-xs text-red-500 font-bold bg-red-50 px-2 py-1 rounded animate-pulse">Segera Habis!</span>}
                        </div>
                    </div>
                </div>

                {/* Info Penjual */}
                <Link to={`/shop/${product.userId}`} className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-[#F25C05] transition-colors mb-8 group">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                        🏪
                    </div>
                    <div className="flex-1">
                        <p className="text-xs text-gray-400">Dijual oleh</p>
                        <p className="font-bold text-[#1A1A1A] text-lg group-hover:text-[#F25C05] transition-colors">
                            {product.user?.storeName || product.user?.name || 'Seller Info'}
                        </p>
                    </div>
                    <div className="text-gray-400">➔</div>
                </Link>

                {/* Varian Produk */}
                {product.variants && (
                    <div className="space-y-4 mb-8">
                        {Object.entries(product.variants).map(([key, options]: any) => (
                            <div key={key}>
                                <h4 className="text-sm font-bold text-[#1A1A1A] mb-2 capitalize">{key}:</h4>
                                <div className="flex flex-wrap gap-2">
                                    {options.map((opt: string) => (
                                        <button 
                                            key={opt}
                                            onClick={() => handleVariantSelect(key, opt)}
                                            className={`
                                                px-4 py-2 rounded-lg text-sm font-medium border transition-all
                                                ${selectedVariants[key] === opt 
                                                    ? 'border-[#F25C05] bg-[#F25C05] text-white shadow-md' 
                                                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'}
                                            `}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Deskripsi & Spesifikasi */}
                <div className="mb-8 space-y-6">
                    <div>
                        <h3 className="text-lg font-bold text-[#1A1A1A] border-b border-gray-100 pb-2 mb-3">Deskripsi Produk</h3>
                        <p className="text-gray-600 leading-relaxed whitespace-pre-line text-sm">
                            {product.description}
                        </p>
                    </div>
                    
                    {product.specifications && Object.keys(product.specifications).length > 0 && (
                        <div>
                            <h3 className="text-lg font-bold text-[#1A1A1A] border-b border-gray-100 pb-2 mb-3">Spesifikasi</h3>
                            <div className="grid grid-cols-1 gap-2">
                                {Object.entries(product.specifications).map(([key, value]: any) => (
                                    <div key={key} className="flex text-sm py-2 border-b border-dashed border-gray-100 last:border-0">
                                        <span className="w-1/3 text-gray-500 capitalize">{key}</span>
                                        <span className="w-2/3 font-medium text-[#1A1A1A]">{value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Ulasan */}
                <div className="mb-10">
                    <h3 className="text-lg font-bold text-[#1A1A1A] border-b border-gray-100 pb-2 mb-4">
                        Ulasan Pembeli <span className="text-gray-400 text-sm font-normal">({reviews.length})</span>
                    </h3>
                    
                    {reviews.length === 0 ? (
                        <p className="text-gray-400 italic text-sm">Belum ada ulasan untuk produk ini.</p>
                    ) : (
                        <div className="space-y-4 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                            {reviews.map((rev: any) => (
                                <div key={rev.id} className="bg-gray-50 p-4 rounded-xl">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <p className="font-bold text-[#1A1A1A] text-sm">{rev.user.name}</p>
                                            <div className="text-yellow-400 text-xs">{'⭐'.repeat(rev.rating)}</div>
                                        </div>
                                        <span className="text-[10px] text-gray-400">
                                            {new Date(rev.createdAt).toLocaleDateString('id-ID')}
                                        </span>
                                    </div>
                                    <p className="text-gray-600 text-sm">{rev.comment}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="mt-auto sticky bottom-0 bg-white p-4 md:p-0 border-t md:border-0 border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] md:shadow-none z-20">
                    {isOwner ? (
                        <div className="flex gap-3">
                            <Link to={`/edit-product/${product.id}`} className="flex-1">
                                <button className="w-full py-3.5 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 rounded-xl font-bold transition shadow-sm">
                                    ✏️ Edit Produk
                                </button>
                            </Link>
                            <button onClick={handleDelete} className="flex-1 py-3.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl font-bold transition shadow-sm">
                                🗑️ Hapus
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={handleAddToCart}
                            disabled={isOutOfStock}
                            className={`
                                w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all active:scale-[0.98]
                                ${isOutOfStock 
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none' 
                                    : 'bg-[#F25C05] hover:bg-[#D94E04] text-white shadow-orange-500/30'}
                            `}
                        >
                            {isOutOfStock ? '🚫 Stok Habis' : '+ Masukkan Keranjang'}
                        </button>
                    )}
                </div>

            </div>
        </div>
      </div>
    </Layout>
  );
}