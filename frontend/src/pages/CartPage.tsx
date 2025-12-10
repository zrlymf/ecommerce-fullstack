import { useEffect, useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout'; 

export default function CartPage() {
  const navigate = useNavigate(); 
  
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedItems, setSelectedItems] = useState<number[]>([]);

  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    try {
      const res = await axiosInstance.get('/cart');
      setCartItems(res.data.items || []);
      setLoading(false);
    } catch (error) {
      console.error("Gagal ambil keranjang", error);
      setLoading(false);
    }
  };

  // FITUR UPDATE QUANTITY
  const updateQty = async (itemId: number, newQty: number) => {
    if (newQty < 1) return;
    try {
      // Optimistic Update 
      setCartItems(prev => prev.map(item => item.id === itemId ? {...item, quantity: newQty} : item));
      
      // Request ke Backend
      await axiosInstance.patch(`/cart/${itemId}`, { quantity: newQty });
    } catch (error) {
      fetchCart();
    }
  };

  // FITUR HAPUS ITEM
  const removeItem = async (itemId: number) => {
    if (!confirm("Hapus barang ini?")) return;
    try {
      await axiosInstance.delete(`/cart/${itemId}`);
      setCartItems(prev => prev.filter(item => item.id !== itemId));
      setSelectedItems(prev => prev.filter(id => id !== itemId));
    } catch (error) {
      alert("Gagal hapus item");
    }
  };

  // LOGIKA CHECKBOX
  const toggleSelect = (itemId: number) => {
    if (selectedItems.includes(itemId)) {
      setSelectedItems(selectedItems.filter(id => id !== itemId));
    } else {
      setSelectedItems([...selectedItems, itemId]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedItems.length === cartItems.length) {
      setSelectedItems([]); 
    } else {
      setSelectedItems(cartItems.map(item => item.id)); 
    }
  };

  // HITUNG TOTAL HARGA
  const totalPrice = cartItems
    .filter(item => selectedItems.includes(item.id))
    .reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

  // LOGIKA CHECKOUT
  const handleCheckout = () => {
    if (selectedItems.length === 0) {
      alert("Silakan pilih minimal 1 barang untuk checkout!");
      return;
    }
    
    const itemsToCheckout = cartItems.filter(item => selectedItems.includes(item.id));
    
    navigate('/checkout', { 
      state: { 
        items: itemsToCheckout,
        total: totalPrice 
      } 
    });
  };

  // GROUPING PER TOKO
  const groupedItems = cartItems.reduce((acc: any, item: any) => {
    const storeName = item.product.user.storeName || item.product.user.name;
    if (!acc[storeName]) acc[storeName] = [];
    acc[storeName].push(item);
    return acc;
  }, {});

  const formatRupiah = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);

  if (loading) return (
    <Layout>
        <div className="flex justify-center items-center h-[50vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F25C05]"></div>
        </div>
    </Layout>
  );

  return (
    <Layout title="Keranjang Belanja">
      <div className="pb-32"> 
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex items-center justify-between">
           <div className="flex items-center gap-3">
              <span className="text-2xl">🛒</span>
              <div>
                 <h2 className="text-lg font-bold text-[#1A1A1A]">Daftar Belanjaan</h2>
                 <p className="text-xs text-gray-500">Ada {cartItems.length} barang di keranjangmu</p>
              </div>
           </div>
        </div>

        {/* TABEL HEADER */}
        <div className="hidden md:grid grid-cols-12 gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4 text-sm font-bold text-gray-500 sticky top-24 z-10">
          <div className="col-span-6 flex items-center gap-4">
             <input 
                type="checkbox" 
                checked={selectedItems.length === cartItems.length && cartItems.length > 0} 
                onChange={toggleSelectAll} 
                className="w-4 h-4 accent-[#F25C05] cursor-pointer"
             />
             <span>Produk</span>
          </div>
          <div className="col-span-2 text-center">Harga Satuan</div>
          <div className="col-span-2 text-center">Kuantitas</div>
          <div className="col-span-1 text-center">Total</div>
          <div className="col-span-1 text-center">Aksi</div>
        </div>

        {/* ITEM LIST */}
        {Object.keys(groupedItems).length === 0 ? (
           <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
              <div className="text-6xl mb-4 opacity-20">🛍️</div>
              <h3 className="text-lg font-bold text-gray-700">Keranjang Masih Kosong</h3>
              <Link to="/dashboard" className="mt-4 px-6 py-2 bg-[#F25C05] text-white rounded-full font-bold hover:bg-[#D94E04] transition">
                 Mulai Belanja
              </Link>
           </div>
        ) : (
          Object.keys(groupedItems).map(storeName => (
            <div key={storeName} className="bg-white mb-6 rounded-xl border border-gray-100 shadow-sm overflow-hidden animate-[fadeIn_0.3s_ease-out]">
              
              {/* HEADER TOKO */}
              <div className="p-4 bg-[#F8F9FB] border-b border-gray-100 flex items-center gap-3">
                <input type="checkbox" 
                  className="w-4 h-4 accent-[#F25C05] cursor-pointer"
                  checked={groupedItems[storeName].every((i:any) => selectedItems.includes(i.id))}
                  onChange={() => {
                    const ids = groupedItems[storeName].map((i:any) => i.id);
                    const allSelected = ids.every((id:number) => selectedItems.includes(id));
                    if (allSelected) {
                      setSelectedItems(prev => prev.filter(id => !ids.includes(id)));
                    } else {
                      setSelectedItems(prev => [...new Set([...prev, ...ids])]);
                    }
                  }}
                />
                <div className="flex items-center gap-2">
                    <span className="text-lg">🏪</span>
                    <span className="font-bold text-[#1A1A1A] text-sm">{storeName}</span>
                    <span className="text-xs text-gray-400 bg-white px-2 py-0.5 rounded border border-gray-200">Official Store</span>
                </div>
              </div>

              {/* LIST BARANG */}
              {groupedItems[storeName].map((item: any) => (
                <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-5 items-center border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                  
                  {/* Kolom 1: Checkbox & Info Produk */}
                  <div className="col-span-12 md:col-span-6 flex gap-4">
                     <div className="flex items-center">
                        <input 
                            type="checkbox" 
                            checked={selectedItems.includes(item.id)} 
                            onChange={() => toggleSelect(item.id)} 
                            className="w-4 h-4 accent-[#F25C05] cursor-pointer"
                        />
                     </div>
                     
                     <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                        <img 
                            src={`http://localhost:3000${item.product.imageUrl ? item.product.imageUrl.split(',')[0] : ''}`} 
                            alt={item.product.name}
                            className="w-full h-full object-cover"
                        />
                     </div>

                     <div className="flex flex-col justify-center">
                       <Link to={`/product/${item.product.id}`} className="font-bold text-[#1A1A1A] text-sm line-clamp-2 hover:text-[#F25C05] transition mb-1">
                         {item.product.name}
                       </Link>

                       {/* Tampilkan Varian */}
                       {item.selectedVariant && (
                           <div className="flex flex-wrap gap-1 mt-1">
                              {Object.entries(item.selectedVariant).map(([k, v]) => (
                                <span key={k} className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                                    {String(k)}: {String(v)}
                                </span>
                              ))}
                           </div>
                       )}
                     </div>
                  </div>

                  {/* Kolom 2: Harga Satuan */}
                  <div className="col-span-6 md:col-span-2 text-left md:text-center">
                     <span className="md:hidden text-xs text-gray-400 block">Harga:</span>
                     <span className="text-sm font-medium text-gray-700">{formatRupiah(item.product.price)}</span>
                  </div>

                  {/* Kolom 3: Kuantitas (Stepper) */}
                  <div className="col-span-6 md:col-span-2 flex justify-start md:justify-center items-center">
                    <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden bg-white shadow-sm">
                        <button 
                            onClick={() => updateQty(item.id, item.quantity - 1)} 
                            disabled={item.quantity <= 1} 
                            className="w-8 h-8 flex items-center justify-center bg-gray-50 hover:bg-gray-200 disabled:opacity-50 text-gray-600 transition"
                        >-</button>
                        <input 
                            value={item.quantity} 
                            readOnly 
                            className="w-10 h-8 text-center text-sm font-bold text-[#1A1A1A] outline-none" 
                        />
                        <button 
                            onClick={() => updateQty(item.id, item.quantity + 1)} 
                            className="w-8 h-8 flex items-center justify-center bg-gray-50 hover:bg-gray-200 text-gray-600 transition"
                        >+</button>
                    </div>
                  </div>

                  {/* Kolom 4: Subtotal */}
                  <div className="col-span-6 md:col-span-1 text-left md:text-center">
                    <span className="md:hidden text-xs text-gray-400 block">Total:</span>
                    <span className="text-[#F25C05] font-bold text-sm">
                      {formatRupiah(item.product.price * item.quantity)}
                    </span>
                  </div>

                  {/* Kolom 5: Aksi (Hapus) */}
                  <div className="col-span-6 md:col-span-1 text-right md:text-center">
                    <button 
                        onClick={() => removeItem(item.id)} 
                        className="text-gray-400 hover:text-red-500 transition-colors p-2"
                        title="Hapus barang"
                    >
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                       </svg>
                    </button>
                  </div>

                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* FOOTER CHECKOUT FIXED */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] p-4 md:px-8 z-40 animate-[fadeIn_0.5s_ease-out]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            
            {/* Kiri: Pilih Semua */}
            <div className="flex items-center gap-3 w-full md:w-auto">
               <input 
                  type="checkbox" 
                  checked={selectedItems.length > 0 && selectedItems.length === cartItems.length} 
                  onChange={toggleSelectAll} 
                  className="w-5 h-5 accent-[#F25C05] cursor-pointer"
               />
               <span className="text-sm font-medium text-gray-600">Pilih Semua ({cartItems.length})</span>
            </div>

            {/* Kanan: Total & Tombol */}
            <div className="flex items-center justify-between w-full md:w-auto gap-6">
               <div className="text-right">
                  <p className="text-xs text-gray-500">Total ({selectedItems.length} produk):</p>
                  <p className="text-xl md:text-2xl font-extrabold text-[#F25C05]">{formatRupiah(totalPrice)}</p>
               </div>
               
               <button 
                 onClick={handleCheckout} 
                 className="bg-[#F25C05] hover:bg-[#D94E04] text-white px-8 py-3 rounded-full font-bold shadow-lg shadow-orange-500/30 transition-all hover:scale-105 active:scale-95"
               >
                 Checkout Sekarang
               </button>
            </div>
        </div>
      </div>
    </Layout>
  );
}