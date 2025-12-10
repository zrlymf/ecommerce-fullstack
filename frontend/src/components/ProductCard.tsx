import React from 'react';
import { Link } from 'react-router-dom';

interface ProductCardProps {
  id: number;
  name: string;
  price: number;
  stock: number;
  category: string;
  imageUrl?: string;
  sku?: string; 
  user?: { storeName?: string };
}

const ProductCard: React.FC<ProductCardProps> = ({ id, name, price, stock, category, imageUrl, sku, user }) => {
  
  // Format Rupiah
  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(num);
  };

  // Logic Gambar
  const imageSrc = imageUrl 
    ? (imageUrl.startsWith('http') ? imageUrl.split(',')[0] : `http://localhost:3000${imageUrl.split(',')[0]}`)
    : 'https://via.placeholder.com/300?text=No+Image';

  const isOutOfStock = stock === 0;

  return (
    <div className="group relative h-full">
      <Link to={`/product/${id}`} className="block h-full">
        
        {/* Container Kartu */}
        <div className="bg-white rounded-[16px] border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_15px_30px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 h-full flex flex-col overflow-hidden">
          
          {/* --- BAGIAN GAMBAR --- */}
          <div className="relative w-full pt-[100%] bg-[#F8F9FB] overflow-hidden">
            <img 
              src={imageSrc} 
              alt={name} 
              className={`absolute top-0 left-0 w-full h-full object-cover transition-transform duration-700 ease-in-out group-hover:scale-110 ${isOutOfStock ? 'grayscale opacity-60' : ''}`} 
              onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/300?text=Error'; }} 
            />
            
            {/* Overlay Stok Habis */}
            {isOutOfStock && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-10 flex items-center justify-center">
                <span className="bg-[#1A1A1A] text-white text-[10px] font-bold px-3 py-1.5 rounded-full tracking-wider uppercase shadow-lg border border-white/20">
                  Habis
                </span>
              </div>
            )}
            
            {/* Badge Kategori (Kiri Atas) */}
            <span className="absolute top-3 left-3 bg-white/70 backdrop-blur-md text-[#1A1A1A] text-[10px] font-bold px-2.5 py-1 rounded-lg border border-white/50 shadow-sm z-20">
              {category}
            </span>

            <button className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 duration-300 z-30">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          {/* --- BAGIAN KONTEN --- */}
          <div className="p-4 flex flex-col flex-1 relative">
            
            {/* Nama Toko */}
            {user?.storeName && (
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className="w-4 h-4 rounded-full bg-gray-100 flex items-center justify-center text-[8px]">🏪</div>
                <span className="text-[11px] text-gray-400 font-semibold truncate">{user.storeName}</span>
              </div>
            )}

            {/* Judul Produk */}
            <h3 className="text-[14px] font-bold text-[#1A1A1A] leading-snug line-clamp-2 mb-2 group-hover:text-[#F25C05] transition-colors">
              {name}
            </h3>

            {/* --- BAGIAN BAWAH: HARGA, STOK, SKU --- */}
            <div className="mt-auto flex items-end justify-between border-t border-gray-50 pt-3">
              
              <div className="flex flex-col gap-1">
                {/* Harga */}
                <div className="text-[16px] font-extrabold text-[#F25C05] leading-none">
                  {formatRupiah(Number(price))}
                </div>
                
                {/* Stok */}
                <p className={`text-[11px] font-bold ${stock < 10 && stock > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                   {isOutOfStock ? 'Stok Habis' : `${stock} Stok`}
                </p>

                {/* 3. SKU BADGE */}
                {sku && (
                   <div className="inline-block mt-0.5">
                     <span className="text-[9px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-[4px] font-mono tracking-wide border border-gray-200">
                        SKU: {sku}
                     </span>
                   </div>
                )}
              </div>

              {/* Tombol Plus (+) */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm ${isOutOfStock ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 'bg-[#1A1A1A] text-white group-hover:bg-[#F25C05] hover:scale-110'}`}>
                <span className="text-xl leading-none mb-0.5">+</span>
              </div>
            </div>

          </div>
        </div>
      </Link>
    </div>
  );
};

export default ProductCard;