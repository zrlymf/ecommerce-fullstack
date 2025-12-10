import { useEffect, useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import Layout from '../components/Layout';
import { Link } from 'react-router-dom'; 

export default function ManageOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL'); 

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/orders/manage');
      if (Array.isArray(res.data)) {
        setOrders(res.data);
      } else {
        setOrders([]);
      }
      setLoading(false);
    } catch (error) {
      console.error("Gagal ambil data pesanan:", error);
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId: number, newStatus: string) => {
    const msg = newStatus === 'CANCELLED'
      ? "Yakin ingin menolak pesanan ini? Stok akan dikembalikan."
      : `Ubah status pesanan menjadi ${newStatus}?`;

    if (!window.confirm(msg)) return;

    try {
      await axiosInstance.patch(`/orders/${orderId}/status`, { status: newStatus });
      alert(`Status berhasil diubah menjadi ${newStatus}`);
      fetchOrders();
    } catch (error) {
      console.error(error);
      alert('Gagal update status.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return '#ffc107'; // Kuning
      case 'PROCESSING': return '#17a2b8'; // Biru Muda
      case 'SHIPPED': return '#6f42c1'; // Ungu
      case 'DELIVERED': return '#28a745'; // Hijau
      case 'CANCELLED': return '#dc3545'; // Merah
      default: return '#6c757d';
    }
  };

  // Helper untuk warna badge yang lebih soft (Tailwind classes)
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'PROCESSING': return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case 'SHIPPED': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'DELIVERED': return 'bg-green-100 text-green-800 border-green-200';
      case 'CANCELLED': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatRupiah = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('id-ID', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    });
  };

  // Filter List berdasarkan Tab
  const filteredOrders = activeTab === 'ALL' ? orders : orders.filter(o => o.status === activeTab);

  if (loading) return (
    <Layout>
        <div className="flex justify-center items-center h-[50vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F25C05]"></div>
        </div>
    </Layout>
  );

  return (
    <Layout title="Kelola Pesanan Masuk">
      <div className="pb-20">
        
        {/* TABS NAVIGASI */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          {['ALL', 'PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`
                px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border
                ${activeTab === tab 
                    ? 'bg-[#F25C05] text-white border-[#F25C05] shadow-md' 
                    : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}
              `}
            >
              {tab === 'ALL' ? 'Semua Pesanan' : tab}
            </button>
          ))}
        </div>

        {/* LIST PESANAN */}
        {filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
            <div className="text-5xl mb-4 opacity-20">📦</div>
            <h3 className="text-lg font-bold text-gray-700">Tidak ada pesanan di status ini.</h3>
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredOrders.map(order => (
              <div 
                key={order.id} 
                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
                style={{ borderLeft: `4px solid ${getStatusColor(order.status)}` }} // Accent color di kiri
              >

                {/* HEADER KARTU */}
                <div className="p-5 border-b border-gray-50 bg-[#F8F9FB] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-gray-400">Order ID:</span>
                        <span className="text-sm font-bold text-[#1A1A1A]">#{order.orderNumber}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span>👤 {order.user?.name || 'Unknown'}</span>
                      <span className="text-gray-300">|</span>
                      <span className="text-xs">📍 {order.shippingAddress || '-'}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-extrabold tracking-wide uppercase border ${getStatusBadgeClass(order.status)}`}>
                      {order.status}
                    </span>
                    <div className="text-[10px] text-gray-400 mt-1.5 font-medium italic">
                      {order.status === 'PENDING' && `Dibuat: ${formatDate(order.createdAt)}`}
                      {order.status === 'PROCESSING' && `Diproses: ${formatDate(order.processedAt)}`}
                      {order.status === 'SHIPPED' && `Dikirim: ${formatDate(order.shippedAt)}`}
                      {order.status === 'DELIVERED' && `Selesai: ${formatDate(order.deliveredAt)}`}
                      {order.status === 'CANCELLED' && `Dibatalkan: ${formatDate(order.cancelledAt)}`}
                    </div>
                  </div>
                </div>

                {/* LIST BARANG */}
                <div className="p-5 space-y-4">
                  {order.items.map((item: any) => (
                    <div key={item.id} className="flex gap-4 items-center">
                      
                      {/* Link ke Detail Produk */}
                      <Link to={`/product/${item.product.id}`} className="block flex-shrink-0">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 hover:opacity-80 transition">
                          <img
                            src={`http://localhost:3000${item.product.imageUrl ? item.product.imageUrl.split(',')[0] : ''}`}
                            className="w-full h-full object-cover"
                            onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/50?text=IMG'; }}
                            alt={item.product.name}
                          />
                        </div>
                      </Link>
                      
                      <div className="flex-1 min-w-0">
                        <Link to={`/product/${item.product.id}`} className="text-sm font-bold text-[#1A1A1A] truncate hover:text-[#F25C05] transition-colors">
                            {item.product.name}
                        </Link>
                        
                        {/* VARIAN */}
                        {item.selectedVariant && (
                          <div className="text-xs text-blue-600 bg-blue-50 inline-block px-2 py-0.5 rounded mt-1 font-medium">
                            {Object.entries(item.selectedVariant).map(([k, v]) => `${k}: ${v}`).join(' | ')}
                          </div>
                        )}
                      </div>

                      <div className="text-right">
                        <p className="text-xs text-gray-500">x{item.quantity}</p>
                        <p className="text-sm font-bold text-[#1A1A1A]">{formatRupiah(Number(item.price) * item.quantity)}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* FOOTER ACTIONS */}
                <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                  
                  {/* Total Pendapatan */}
                  <div className="text-center md:text-left">
                    <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Total Pendapatan</span>
                    <div className="text-xl font-extrabold text-[#28a745]">
                      {formatRupiah(Number(order.totalPrice))}
                    </div>
                  </div>

                  {/* Tombol Aksi */}
                  <div className="flex gap-3">
                    {order.status === 'PENDING' && (
                      <>
                        <button 
                            onClick={() => handleUpdateStatus(order.id, 'CANCELLED')} 
                            className="px-4 py-2 rounded-lg text-xs font-bold text-red-600 bg-white border border-red-200 hover:bg-red-50 transition shadow-sm"
                        >
                            ❌ Tolak
                        </button>
                        <button 
                            onClick={() => handleUpdateStatus(order.id, 'PROCESSING')} 
                            className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-cyan-500 hover:bg-cyan-600 transition shadow-md shadow-cyan-200"
                        >
                            ⚙️ Proses Pesanan
                        </button>
                      </>
                    )}
                    
                    {order.status === 'PROCESSING' && (
                      <button 
                        onClick={() => handleUpdateStatus(order.id, 'SHIPPED')} 
                        className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 transition shadow-md shadow-purple-200 flex items-center gap-2"
                      >
                        🚚 Kirim Barang
                      </button>
                    )}

                    {order.status === 'SHIPPED' && (
                      <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-2 rounded-lg border border-blue-100">
                        ⏳ Menunggu konfirmasi customer...
                      </span>
                    )}

                    {(order.status === 'DELIVERED') && (
                      <span className="text-xs font-bold text-green-600 bg-green-50 px-3 py-2 rounded-lg border border-green-100 flex items-center gap-1">
                        ✅ Transaksi Selesai
                      </span>
                    )}

                    {(order.status === 'CANCELLED') && (
                      <span className="text-xs font-bold text-red-500 bg-red-50 px-3 py-2 rounded-lg border border-red-100">
                        🚫 Dibatalkan
                      </span>
                    )}
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}