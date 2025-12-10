import { useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';
import { calculateRate } from '../utils/shippingHelper';
import Layout from '../components/Layout'; 

export default function CheckoutPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  
  const itemsToBuy = state?.items || [];
  const productSubtotal = state?.total || 0;

  // Form Data
  const [addressDetail, setAddressDetail] = useState('');
  const [city, setCity] = useState('Jakarta'); 
  const [loading, setLoading] = useState(false);
  
  // State Ongkir
  const [shippingCost, setShippingCost] = useState(0);
  
  // State Metode Pembayaran
  const [paymentMethod, setPaymentMethod] = useState('Transfer Bank');

  // Daftar Opsi Pembayaran
  const PAYMENT_OPTIONS = [
    "COD (Bayar di Tempat)",
    "Transfer Bank",
    "Kartu Kredit/Debit",
    "Bayar Tunai di Agen",
    "QRIS"
  ];

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      let totalCalculatedOngkir = 0;
      const uniqueStores = new Map();
      itemsToBuy.forEach((item: any) => {
        const sellerId = item.product.userId;
        if (!uniqueStores.has(sellerId)) {
          uniqueStores.set(sellerId, item.product.user);
        }
      });

      uniqueStores.forEach((seller: any) => {
        const sellerAddress = seller.storeLocation || ''; 
        const rate = calculateRate(sellerAddress, city);
        totalCalculatedOngkir += rate;
      });

      setShippingCost(totalCalculatedOngkir);
      setLoading(false);
    }, 500); 

    return () => clearTimeout(timer);
  }, [city, itemsToBuy]);

  const grandTotal = productSubtotal + shippingCost;

  // Grouping items
  const groupedItems = itemsToBuy.reduce((acc: any, item: any) => {
    const storeName = item.product.user.storeName || item.product.user.name;
    const storeLoc = item.product.user.storeLocation || 'Lokasi tidak diketahui';
    
    if (!acc[storeName]) acc[storeName] = { items: [], location: storeLoc };
    acc[storeName].items.push(item);
    return acc;
  }, {});

  const formatRupiah = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(num);

  // HANDLE PLACE ORDER 
  const handlePlaceOrder = async () => {
    if (!addressDetail.trim()) return alert("Mohon isi detail alamat pengiriman!");
    
    setLoading(true);
    try {
      const cartItemIds = itemsToBuy.map((item: any) => item.id);
      const fullAddress = `${addressDetail}, ${city}`;

      const res = await axiosInstance.post('/orders', {
        shippingAddress: fullAddress,
        cartItemIds: cartItemIds,
        shippingCost: shippingCost,
        paymentMethod: paymentMethod 
      });

      // FIX: Menangani Response Array (Split Order)
      const createdOrders = res.data;
      let orderNumbersStr = '';

      if (Array.isArray(createdOrders)) {
          // Jika backend mengembalikan array (karena split order)
          orderNumbersStr = createdOrders.map((o: any) => o.orderNumber).join(', ');
      } else {
          // Fallback jika backend mengembalikan single object
          orderNumbersStr = createdOrders.orderNumber;
      }

      alert(`✅ Pesanan Berhasil Dibuat!\nMetode Bayar: ${paymentMethod}\nNomor Order: ${orderNumbersStr}\n\n(Cek 'Pesanan Saya' untuk detail status)`);
      
      // Redirect ke halaman List Pesanan (My Orders) agar user bisa melihat semua resi
      navigate('/my-orders'); 
    } catch (error: any) {
      console.error(error);
      alert('Gagal membuat pesanan: ' + (error.response?.data?.message || 'Error'));
    } finally {
      setLoading(false);
    }
  };
  // --------------------------------

  const citiesList = [
    'Ambon', 'Balikpapan', 'Banda Aceh', 'Bandar Lampung', 'Bandung', 'Banjarmasin', 
    'Batam', 'Bekasi', 'Bengkulu', 'Bogor', 'Cirebon', 'Denpasar', 'Depok', 
    'Gorontalo', 'Jakarta', 'Jambi', 'Jayapura', 'Kendari', 'Kupang', 
    'Makassar', 'Malang', 'Manado', 'Mataram', 'Medan', 'Padang', 'Palangkaraya', 
    'Palembang', 'Palu', 'Pekanbaru', 'Pontianak', 'Samarinda', 'Semarang', 
    'Sidoarjo', 'Solo', 'Sorong', 'Surabaya', 'Tangerang', 'Yogyakarta'
  ].sort();

  if (itemsToBuy.length === 0) {
    return (
        <Layout>
            <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                <div className="text-6xl mb-4 opacity-20">🛒</div>
                <h2 className="text-xl font-bold text-gray-700">Tidak ada barang untuk dibayar.</h2>
                <button onClick={() => navigate('/cart')} className="mt-4 text-[#F25C05] font-bold hover:underline">
                    Kembali ke Keranjang
                </button>
            </div>
        </Layout>
    );
  }

  return (
    <Layout title="Pengiriman & Pembayaran">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-32 lg:pb-10">
        
        {/* KOLOM KIRI (Alamat & Produk) */}
        <div className="lg:col-span-2 space-y-6">
            
            {/* 1. ALAMAT PENGIRIMAN */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-[#F25C05]">
                <h3 className="text-lg font-bold text-[#F25C05] mb-4 flex items-center gap-2">
                    <span>📍</span> Alamat Pengiriman
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Kota Tujuan</label>
                        <select 
                            value={city} onChange={e => setCity(e.target.value)} 
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#F25C05]/20 focus:border-[#F25C05] bg-white outline-none"
                        >
                            {citiesList.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Detail Alamat (Jalan, No. Rumah, RT/RW)</label>
                        <input 
                            type="text" 
                            placeholder="Contoh: Jl. Mawar No. 5" 
                            value={addressDetail} onChange={e => setAddressDetail(e.target.value)} 
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#F25C05]/20 focus:border-[#F25C05] outline-none"
                        />
                    </div>
                </div>
            </div>

            {/* 2. RINCIAN PRODUK (Per Toko) */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-[#1A1A1A] mb-4">Rincian Pesanan</h3>
                
                {Object.keys(groupedItems).map((storeName, idx) => {
                    const storeData = groupedItems[storeName];
                    const ratePerStore = calculateRate(storeData.location, city);
                    
                    return (
                        <div key={storeName} className={`mb-6 ${idx !== 0 ? 'pt-6 border-t border-dashed border-gray-200' : ''}`}>
                            <div className="flex justify-between items-center mb-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">🏪</span>
                                    <div>
                                        <p className="font-bold text-sm text-[#1A1A1A]">{storeName}</p>
                                        <p className="text-xs text-gray-400">{storeData.location}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-500">Ongkir</p>
                                    <p className="text-sm font-bold text-[#F25C05]">{formatRupiah(ratePerStore)}</p>
                                </div>
                            </div>

                            {/* List Item per Toko */}
                            <div className="space-y-3">
                                {storeData.items.map((item: any) => (
                                    <div key={item.id} className="flex gap-4 p-3 bg-[#F8F9FB] rounded-lg border border-gray-100">
                                        <img 
                                            src={`http://localhost:3000${item.product.imageUrl ? item.product.imageUrl.split(',')[0] : ''}`} 
                                            className="w-16 h-16 object-cover rounded-md border border-gray-200 bg-white"
                                            alt={item.product.name}
                                        />
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-[#1A1A1A] line-clamp-1">{item.product.name}</p>
                                            
                                            {/* Varian */}
                                            {item.selectedVariant && (
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {Object.entries(item.selectedVariant).map(([k, v]) => (
                                                        <span key={k} className="text-[10px] text-gray-500 bg-white px-1.5 py-0.5 rounded border border-gray-200">
                                                            {String(k)}: {String(v)}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                            
                                            <div className="flex justify-between mt-2 items-end">
                                                <p className="text-xs text-gray-500">{item.quantity} x {formatRupiah(item.product.price)}</p>
                                                <p className="text-sm font-bold text-[#1A1A1A]">{formatRupiah(item.product.price * item.quantity)}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* 3. METODE PEMBAYARAN */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-[#1A1A1A] mb-4">Pilih Pembayaran</h3>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {PAYMENT_OPTIONS.map(method => (
                        <button 
                            key={method}
                            onClick={() => setPaymentMethod(method)}
                            className={`p-3 rounded-lg border text-sm font-medium transition-all text-left flex items-center justify-between
                                ${paymentMethod === method 
                                    ? 'border-[#F25C05] bg-orange-50 text-[#F25C05]' 
                                    : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                                }
                            `}
                        >
                            {method}
                            {paymentMethod === method && <span>✓</span>}
                        </button>
                    ))}
                </div>

                {paymentMethod.includes('COD') && (
                    <div className="mt-4 p-3 bg-yellow-50 text-yellow-700 text-xs rounded-lg border border-yellow-100 flex gap-2">
                        <span>💡</span>
                        Bayar tunai ke kurir saat barang sampai. Pastikan ada orang di rumah ya!
                    </div>
                )}
            </div>

        </div>

        {/* KOLOM KANAN (Ringkasan Pembayaran) */}
        <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 sticky top-24">
                <h3 className="text-lg font-bold text-[#1A1A1A] mb-4 pb-4 border-b border-gray-100">
                    Ringkasan Belanja
                </h3>

                <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-sm text-gray-600">
                        <span>Total Harga Barang</span>
                        <span>{formatRupiah(productSubtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                        <span>Total Ongkos Kirim</span>
                        <span>{loading ? '...' : formatRupiah(shippingCost)}</span>
                    </div>
                    <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                        <span className="font-bold text-[#1A1A1A]">Total Tagihan</span>
                        <span className="text-xl font-extrabold text-[#F25C05]">
                            {loading ? '...' : formatRupiah(grandTotal)}
                        </span>
                    </div>
                </div>

                <button 
                    onClick={handlePlaceOrder} 
                    disabled={loading}
                    className="w-full py-4 bg-[#F25C05] hover:bg-[#D94E04] text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                >
                    {loading ? (
                        <>
                            <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                            Memproses...
                        </>
                    ) : (
                        'Buat Pesanan Sekarang'
                    )}
                </button>

                <p className="text-[10px] text-gray-400 text-center mt-4">
                    Dengan melanjutkan, Anda menyetujui Syarat & Ketentuan BELANJAIN.
                </p>
            </div>
        </div>

      </div>
    </Layout>
  );
}