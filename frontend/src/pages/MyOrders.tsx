import { useEffect, useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import { useNavigate, Link } from 'react-router-dom'; 
import Layout from '../components/Layout';

export default function MyOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State Filter Status, Pagination, & tanggal
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showDateFilter, setShowDateFilter] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, page, startDate, endDate]); 

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/orders/my-orders', {
        params: {
          status: statusFilter,
          page: page,
          limit: 5,
          startDate: startDate || undefined,
          endDate: endDate || undefined
        }
      });

      if (res.data && Array.isArray(res.data.data)) {
          setOrders(res.data.data);
          setTotalPages(res.data.meta.last_page);
      } else {
          setOrders([]);
      }
      
    } catch (error) {
      console.error("Gagal ambil order:", error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: number) => {
    if (!window.confirm("Yakin ingin membatalkan pesanan ini? Stok akan dikembalikan.")) return;
    try {
        await axiosInstance.patch(`/orders/${orderId}/cancel`);
        alert("✅ Pesanan berhasil dibatalkan.");
        fetchOrders(); 
    } catch (error: any) {
        const msg = error.response?.data?.message || "Gagal membatalkan pesanan.";
        alert("❌ " + msg);
    }
  };

  const handleReceiveOrder = async (orderId: number) => {
    if (!window.confirm("Apakah barang sudah sampai dan sesuai pesanan?")) return;
    try {
        await axiosInstance.patch(`/orders/${orderId}/receive`);
        alert("🎉 Terima kasih! Pesanan selesai.");
        fetchOrders();
    } catch (error: any) {
        const msg = error.response?.data?.message || "Gagal konfirmasi pesanan.";
        alert("❌ " + msg);
    }
  };

  const handleReview = async (productId: number) => {
    const ratingStr = prompt("Beri bintang (1-5):", "5");
    if (!ratingStr) return;
    const rating = parseInt(ratingStr);
    
    if (isNaN(rating) || rating < 1 || rating > 5) return alert("Rating harus angka 1-5");

    const comment = prompt("Tulis ulasan Anda:", "Barang bagus, pengiriman cepat!");
    if (!comment) return;

    try {
        await axiosInstance.post('/reviews', {
            productId,
            rating,
            comment
        });
        alert("Terima kasih atas ulasan Anda! ⭐");
        fetchOrders(); 
    } catch (error: any) {
        const msg = error.response?.data?.message || "Gagal kirim ulasan";
        alert("❌ " + msg);
    }
  };

  const clearDateFilter = () => {
    setStartDate('');
    setEndDate('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return '#ffc107'; 
      case 'PROCESSING': return '#17a2b8'; 
      case 'SHIPPED': return '#007bff'; 
      case 'DELIVERED': return '#28a745'; 
      case 'CANCELLED': return '#dc3545'; 
      default: return '#6c757d';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'PROCESSING': return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case 'SHIPPED': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'DELIVERED': return 'bg-green-100 text-green-800 border-green-200';
      case 'CANCELLED': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('id-ID', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    });
  };

  const formatRupiah = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);

  if (loading) return (
    <Layout>
        <div className="flex justify-center items-center h-[50vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F25C05]"></div>
        </div>
    </Layout>
  );

  return (
    <Layout title="Pesanan Saya">
      <div className="pb-20"> 
        
        {/* HEADER AREA */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div className="flex gap-2 w-full overflow-x-auto pb-2 scrollbar-hide">
                {['ALL', 'PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map(tab => (
                    <button 
                        key={tab}
                        onClick={() => { setStatusFilter(tab); setPage(1); }} 
                        className={`
                            px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border
                            ${statusFilter === tab 
                                ? 'bg-[#F25C05] text-white border-[#F25C05] shadow-md' 
                                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}
                        `}
                    >
                        {tab === 'ALL' ? 'Semua' : tab}
                    </button>
                ))}
            </div>
            
            <button 
                onClick={() => setShowDateFilter(!showDateFilter)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 transition"
            >
                <span>📅</span> Filter Tanggal
            </button>
        </div>

        {/* AREA FILTER TANGGAL */}
        {showDateFilter && (
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-wrap items-center gap-4 animate-[fadeIn_0.2s_ease-out]">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-500">Dari:</span>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#F25C05]" />
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-500">Sampai:</span>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#F25C05]" />
                </div>
                {(startDate || endDate) && (
                    <button onClick={clearDateFilter} className="text-xs font-bold text-red-500 hover:underline">
                        Reset
                    </button>
                )}
            </div>
        )}

        {/* LIST PESANAN */}
        {orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
                <div className="text-5xl mb-4 opacity-20">🧾</div>
                <h3 className="text-lg font-bold text-gray-700">Belum ada pesanan.</h3>
                <button onClick={() => navigate('/dashboard')} className="mt-4 text-[#F25C05] font-bold hover:underline">
                    Mulai Belanja
                </button>
            </div>
        ) : (
            <div className="grid gap-6">
                {orders.map(order => (
                    <div 
                        key={order.id} 
                        className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
                        style={{ borderLeft: `4px solid ${getStatusColor(order.status)}` }}
                    >
                        
                        {/* HEADER PESANAN */}
                        <div className="p-5 border-b border-gray-50 bg-[#F8F9FB] flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-extrabold text-[#1A1A1A]">#{order.orderNumber}</span>
                                    <span className="text-xs text-gray-400">|</span>
                                    <span className="text-xs text-gray-500">{formatDate(order.createdAt)}</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-extrabold tracking-wide uppercase border ${getStatusBadgeClass(order.status)}`}>
                                    {order.status}
                                </span>
                            </div>
                        </div>

                        {/* LIST BARANG */}
                        <div className="p-5 space-y-4">
                            {order.items.map((item: any) => (
                                <div key={item.id} className="flex gap-4 items-center">
                                    
                                    {/* 2. GAMBAR SEKARANG BISA DIKLIK */}
                                    <Link 
                                        to={`/product/${item.product.id}`}
                                        className="w-16 h-16 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 hover:opacity-80 transition block"
                                    >
                                        <img 
                                            src={`http://localhost:3000${item.product.imageUrl ? item.product.imageUrl.split(',')[0] : ''}`} 
                                            className="w-full h-full object-cover"
                                            onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/60?text=IMG'; }}
                                            alt={item.product.name}
                                        />
                                    </Link>
                                    
                                    <div className="flex-1 min-w-0">
                                        {/* 3. NAMA PRODUK SEKARANG BISA DIKLIK */}
                                        <Link 
                                            to={`/product/${item.product.id}`}
                                            className="text-sm font-bold text-[#1A1A1A] truncate hover:text-[#F25C05] transition-colors block"
                                        >
                                            {item.product.name}
                                        </Link>
                                        
                                        {/* VARIAN */}
                                        {item.selectedVariant && (
                                            <div className="text-xs text-blue-600 bg-blue-50 inline-block px-2 py-0.5 rounded mt-1 font-medium border border-blue-100">
                                                {Object.entries(item.selectedVariant).map(([k, v]) => `${k}: ${v}`).join(' | ')}
                                            </div>
                                        )}

                                        <p className="text-xs text-gray-500 mt-1">
                                            {item.quantity} x {formatRupiah(Number(item.price))}
                                        </p>
                                    </div>

                                    {/* TOMBOL REVIEW */}
                                    {order.status === 'DELIVERED' && (
                                        <button 
                                            onClick={() => handleReview(item.product.id)}
                                            className="px-3 py-1.5 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-lg text-xs font-bold hover:bg-yellow-100 transition whitespace-nowrap"
                                        >
                                            ⭐ Nilai
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* FOOTER TOTAL & AKSI */}
                        <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div>
                                <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Total Belanja</span>
                                <div className="text-lg font-extrabold text-[#F25C05]">
                                    {formatRupiah(Number(order.totalPrice))}
                                </div>
                            </div>

                            <div className="flex gap-3 w-full sm:w-auto">
                                {order.status === 'PENDING' && (
                                    <button 
                                        onClick={() => handleCancelOrder(order.id)}
                                        className="flex-1 sm:flex-none px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg text-xs font-bold hover:bg-red-50 transition shadow-sm"
                                    >
                                        🚫 Batalkan Pesanan
                                    </button>
                                )}
                                {order.status === 'SHIPPED' && (
                                    <button 
                                        onClick={() => handleReceiveOrder(order.id)}
                                        className="flex-1 sm:flex-none px-5 py-2 bg-[#28a745] text-white rounded-lg text-xs font-bold hover:bg-[#218838] transition shadow-md shadow-green-200 flex items-center justify-center gap-2"
                                    >
                                        📦 Pesanan Diterima
                                    </button>
                                )}
                            </div>
                        </div>

                    </div>
                ))}
            </div>
        )}

        {/* PAGINATION */}
        {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-10">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-gray-200 hover:bg-[#F25C05] hover:text-white disabled:opacity-50 transition-all shadow-sm">←</button>
                <span className="text-sm font-bold text-[#1A1A1A] bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100">Halaman {page} / {totalPages}</span>
                <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-gray-200 hover:bg-[#F25C05] hover:text-white disabled:opacity-50 transition-all shadow-sm">→</button>
            </div>
        )}

      </div>
    </Layout>
  );
}