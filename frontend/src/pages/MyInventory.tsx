import { useEffect, useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import { useNavigate, Link } from 'react-router-dom'; 
import { jwtDecode } from 'jwt-decode';
import Layout from '../components/Layout';

export default function MyInventory() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // State untuk input perubahan stok
  const [stockChanges, setStockChanges] = useState<Record<number, number>>({});

  useEffect(() => {
    fetchMyProducts();
  }, []);

  const fetchMyProducts = () => {
    const token = localStorage.getItem('token');

    if (!token) {
      alert("Sesi habis, silakan login kembali.");
      navigate('/login');
      return;
    }

    try {
      const decoded: any = jwtDecode(token);
      const sellerId = decoded.sub;

      if (!sellerId) {
        console.error("Token tidak valid: ID tidak ditemukan.");
        setLoading(false);
        return;
      }

      axiosInstance.get(`/products?sellerId=${sellerId}&limit=100&sort=newest`)
        .then(res => {
          setProducts(res.data.data);
          setLoading(false);
        })
        .catch(err => {
          console.error("Gagal ambil produk:", err);
          setLoading(false);
        });

    } catch (error) {
      console.error("Error decode token:", error);
      navigate('/login');
    }
  };

  // Handle ketik angka di input
  const handleStockInputChange = (id: number, val: string) => {
    setStockChanges(prev => ({
      ...prev,
      [id]: Number(val)
    }));
  };

  // Tombol Simpan (Update ke Server)
  const saveStock = async (id: number) => {
    const newStock = stockChanges[id];
    if (newStock === undefined) return;

    try {
      await axiosInstance.patch(`/products/${id}`, { stock: newStock });
      alert('Stok berhasil diperbarui!');

      const newChanges = { ...stockChanges };
      delete newChanges[id];
      setStockChanges(newChanges);

      fetchMyProducts();
    } catch (error) {
      alert('Gagal update stok');
    }
  };

  // Tombol Habiskan (Stok = 0)
  const markAsOutOfStock = async (id: number) => {
    if (!window.confirm("Yakin ingin mengosongkan stok produk ini?")) return;
    try {
      await axiosInstance.patch(`/products/${id}`, { stock: 0 });
      fetchMyProducts();
    } catch (error) {
      alert('Gagal update stok');
    }
  };

  if (loading) return (
    <Layout>
        <div className="flex justify-center items-center h-[50vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F25C05]"></div>
        </div>
    </Layout>
  );

  return (
    <Layout title="Manajemen Inventaris">
      
      {/* HEADER ACTION */}
      <div className="flex justify-between items-center mb-6">
         <p className="text-gray-500 text-sm">Kelola stok barang daganganmu di sini.</p>
         <button 
            onClick={() => navigate('/add-product')} 
            className="bg-[#28a745] hover:bg-[#218838] text-white px-5 py-2.5 rounded-full font-bold shadow-md transition flex items-center gap-2"
         >
            <span>➕</span> Tambah Produk
         </button>
      </div>

      {/* TABEL INVENTARIS */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
               <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wider font-bold">
                  <tr>
                     <th className="p-5">Nama Produk</th>
                     <th className="p-5">SKU</th>
                     <th className="p-5">Harga Satuan</th>
                     <th className="p-5 w-[200px]">Stok Saat Ini</th>
                     <th className="p-5 text-center">Aksi Cepat</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-100">
                  {products.length > 0 ? products.map(product => {
                     const stockVal = Number(product.stock);
                     const isLowStock = stockVal > 0 && stockVal < 10; 
                     const isOutOfStock = stockVal === 0;
                     const currentStockValue = stockChanges[product.id] !== undefined ? stockChanges[product.id] : product.stock;

                     // Fungsi Restock Cepat
                     const handleQuickRestock = async () => {
                        const input = window.prompt(`Masukkan jumlah stok baru untuk "${product.name}":`, "10");
                        if (input === null) return; 

                        const num = Number(input);
                        if (isNaN(num) || num < 0) return alert("Harap masukkan angka yang valid");

                        try {
                           await axiosInstance.patch(`/products/${product.id}`, { stock: num });
                           alert(`✅ Stok berhasil diupdate menjadi ${num}`);
                           fetchMyProducts(); 
                        } catch (error) {
                           alert('Gagal update stok');
                        }
                     };

                     return (
                        <tr key={product.id} className="hover:bg-gray-50 transition-colors group">
                           {/* NAMA PRODUK */}
                           <td className="p-5">
                              <Link 
                                to={`/product/${product.id}`}
                                className="font-bold text-[#1A1A1A] hover:text-[#F25C05] hover:underline transition-colors block mb-1"
                                title="Lihat detail produk"
                              >
                                {product.name}
                              </Link>
                              
                              {isOutOfStock ? (
                                 <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-bold rounded uppercase tracking-wide">Habis</span>
                              ) : isLowStock && (
                                 <span className="inline-block px-2 py-0.5 bg-red-50 text-red-600 text-[10px] font-bold rounded uppercase tracking-wide border border-red-100">
                                    ⚠️ Menipis
                                 </span>
                              )}
                           </td>

                           {/* SKU */}
                           <td className="p-5">
                              <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded text-xs font-mono">
                                 {product.sku}
                              </span>
                           </td>

                           {/* HARGA */}
                           <td className="p-5 font-medium text-gray-700">
                              Rp {Number(product.price).toLocaleString('id-ID')}
                           </td>

                           {/* KOLOM EDIT STOK */}
                           <td className="p-5">
                              <div className="flex items-center gap-2">
                                 <input
                                    type="number"
                                    value={currentStockValue}
                                    onChange={(e) => handleStockInputChange(product.id, e.target.value)}
                                    placeholder="0"
                                    className={`w-20 px-3 py-2 border rounded-lg font-bold text-center outline-none focus:ring-2 focus:ring-[#F25C05] transition
                                       ${isOutOfStock ? 'bg-red-50 text-red-600 border-red-200' : 'bg-white text-gray-700 border-gray-200'}
                                    `}
                                 />
                                 
                                 {/* Tombol Simpan (Hanya muncul jika diedit) */}
                                 {stockChanges[product.id] !== undefined && (
                                    <button
                                       onClick={() => saveStock(product.id)}
                                       title="Simpan Perubahan"
                                       className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg transition shadow-sm animate-bounce"
                                    >
                                       💾
                                    </button>
                                 )}
                              </div>
                           </td>

                           {/* TOMBOL AKSI CEPAT */}
                           <td className="p-5 text-center">
                              {product.stock > 0 ? (
                                 <button
                                    onClick={() => markAsOutOfStock(product.id)}
                                    className="bg-white border border-red-200 text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg text-xs font-bold transition"
                                 >
                                    Kosongkan
                                 </button>
                              ) : (
                                 <button
                                    onClick={handleQuickRestock}
                                    className="bg-[#40c057] hover:bg-[#37b24d] text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-sm transition flex items-center justify-center gap-1 mx-auto"
                                 >
                                    <span>📦</span> Isi Stok
                                 </button>
                              )}
                           </td>
                        </tr>
                     );
                  }) : (
                     <tr>
                        <td colSpan={5} className="p-16 text-center text-gray-400">
                           <div className="text-4xl mb-3">📦</div>
                           <p>Anda belum memiliki produk.</p>
                           <p className="text-xs mt-1">Mulai tambah produk untuk melihat inventaris di sini.</p>
                        </td>
                     </tr>
                  )}
               </tbody>
            </table>
         </div>
      </div>
    </Layout>
  );
}