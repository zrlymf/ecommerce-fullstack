import { useState } from 'react';
import axiosInstance from '../api/axiosInstance'; 
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout'; // Pakai Layout biar seragam

export default function AddProduct() {
  const navigate = useNavigate();
  
  // State Data Produk Standar
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [category, setCategory] = useState('');
  
  // State Spesifikasi 
  const [specs, setSpecs] = useState<{ key: string; value: string }[]>([{ key: '', value: '' }]);

  // State Varian 
  const [variants, setVariants] = useState([{ name: '', options: '' }]);

  // State File & Preview
  const [files, setFiles] = useState<FileList | null>(null); 
  const [previews, setPreviews] = useState<string[]>([]);
  
  // State UI
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // HANDLER FILE 
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(e.target.files);
      const newPreviews = Array.from(e.target.files).map(file => URL.createObjectURL(file));
      setPreviews(newPreviews);
    }
  };

  // HANDLER SPESIFIKASI
  const addSpecRow = () => setSpecs([...specs, { key: '', value: '' }]);
  const removeSpecRow = (index: number) => {
    const newSpecs = [...specs]; newSpecs.splice(index, 1); setSpecs(newSpecs);
  };
  const handleSpecChange = (index: number, field: 'key' | 'value', val: string) => {
    const newSpecs = [...specs]; newSpecs[index][field] = val; setSpecs(newSpecs);
  };

  // VARIAN
  const addVariantRow = () => setVariants([...variants, { name: '', options: '' }]);
  const removeVariantRow = (index: number) => {
    const newV = [...variants]; newV.splice(index, 1); setVariants(newV);
  };
  const handleVariantChange = (index: number, field: 'name' | 'options', val: string) => {
    const newV: any = [...variants]; newV[index][field] = val; setVariants(newV);
  };

  // SUBMIT DATA
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!files || files.length === 0) {
      setError('Wajib upload minimal 1 gambar!');
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('description', description);
      formData.append('price', price);
      formData.append('stock', stock);
      formData.append('category', category);
      
      // 1. Proses Spesifikasi
      const specsObject: any = {};
      specs.forEach(item => {
        if (item.key && item.value) specsObject[item.key] = item.value;
      });
      formData.append('specifications', JSON.stringify(specsObject));

      // 2. PROSES VARIAN KE JSON
      const variantsObject: any = {};
      variants.forEach(v => {
        if (v.name && v.options) {
            const opts = v.options.split(',').map(o => o.trim()).filter(o => o !== '');
            if (opts.length > 0) variantsObject[v.name] = opts;
        }
      });
      
      // Kirim hanya jika ada isinya
      if (Object.keys(variantsObject).length > 0) {
          formData.append('variants', JSON.stringify(variantsObject));
      }

      // Append Gambar
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]); 
      }

      await axiosInstance.post('/products', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      alert('Produk Berhasil Ditambahkan!');
      navigate('/dashboard'); 

    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Gagal upload produk');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Jual Produk Baru">
      <div className="max-w-4xl mx-auto pb-20">
        
        {/* Error Alert */}
        {error && (
           <div className="mb-6 bg-red-50 text-red-600 px-4 py-3 rounded-xl border border-red-100 flex items-center gap-2 animate-[shake_0.3s_ease-in-out]">
              <span className="text-xl">⚠️</span>
              {error}
           </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
          
          {/* 1. INFORMASI PRODUK */}
          <div className="bg-white p-6 md:p-8 rounded-card shadow-sm border border-gray-100">
             <h3 className="text-lg font-bold text-[#1A1A1A] mb-6 flex items-center gap-2">
                <span className="bg-orange-100 text-[#F25C05] p-2 rounded-lg text-xl">📝</span> 
                Informasi Dasar
             </h3>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                   <label className="block text-sm font-bold text-gray-700 mb-2">Nama Produk</label>
                   <input 
                      placeholder="Contoh: Sepatu Lari Nike" 
                      value={name} onChange={e => setName(e.target.value)} required 
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#F25C05]/20 focus:border-[#F25C05] outline-none transition-all"
                   />
                </div>

                <div className="md:col-span-2">
                   <label className="block text-sm font-bold text-gray-700 mb-2">Deskripsi Produk</label>
                   <textarea 
                      placeholder="Jelaskan produkmu secara detail..." 
                      value={description} onChange={e => setDescription(e.target.value)} required 
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#F25C05]/20 focus:border-[#F25C05] outline-none min-h-[120px] transition-all"
                   />
                </div>

                <div>
                   <label className="block text-sm font-bold text-gray-700 mb-2">Kategori</label>
                   <select value={category} onChange={e => setCategory(e.target.value)} required className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#F25C05]/20 focus:border-[#F25C05] outline-none cursor-pointer bg-white">
                      <option value="">-- Pilih Kategori --</option>
                      <option value="Elektronik">Elektronik</option>
                      <option value="Fashion">Fashion</option>
                      <option value="Makanan">Makanan</option>
                      <option value="Olahraga">Olahraga</option>
                      <option value="Buku">Buku</option>
                      <option value="Kesehatan">Kesehatan</option>
                      <option value="Perlengkapan Rumah">Perlengkapan Rumah</option>
                   </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Harga (Rp)</label>
                      <input type="number" placeholder="0" value={price} onChange={e => setPrice(e.target.value)} required className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#F25C05]/20 focus:border-[#F25C05] outline-none" />
                   </div>
                   <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Stok</label>
                      <input type="number" placeholder="0" value={stock} onChange={e => setStock(e.target.value)} required className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#F25C05]/20 focus:border-[#F25C05] outline-none" />
                   </div>
                </div>
             </div>
          </div>

          {/* 2. UPLOAD FOTO */}
          <div className="bg-white p-6 md:p-8 rounded-card shadow-sm border border-gray-100">
             <h3 className="text-lg font-bold text-[#1A1A1A] mb-6 flex items-center gap-2">
                <span className="bg-blue-100 text-blue-600 p-2 rounded-lg text-xl">📸</span> 
                Foto Produk
             </h3>

             <label className="border-2 border-dashed border-blue-200 bg-blue-50 hover:bg-blue-100 rounded-xl p-8 text-center cursor-pointer transition-colors block">
                <div className="text-4xl mb-3">📤</div>
                <p className="text-blue-600 font-bold mb-1">Klik untuk Upload Foto</p>
                <p className="text-xs text-blue-400">Bisa pilih banyak sekaligus (JPG/PNG/WEBP)</p>
                <input type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden" />
             </label>

             {previews.length > 0 && (
                <div className="mt-6 flex gap-4 overflow-x-auto pb-2">
                   {previews.map((src, index) => (
                      <div key={index} className="relative group flex-shrink-0">
                         <img src={src} alt="Preview" className="w-24 h-24 object-cover rounded-lg border border-gray-200 shadow-sm" />
                         <div className="absolute inset-0 bg-black/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      </div>
                   ))}
                </div>
             )}
          </div>

          {/* 3. VARIAN PRODUK */}
          <div className="bg-white p-6 md:p-8 rounded-card shadow-sm border border-gray-100">
             <h3 className="text-lg font-bold text-[#1A1A1A] mb-2 flex items-center gap-2">
                <span className="bg-yellow-100 text-yellow-600 p-2 rounded-lg text-xl">🎨</span> 
                Varian Produk
             </h3>
             <p className="text-sm text-gray-500 mb-6">Wajib diisi jika produk punya pilihan (Warna, Ukuran, dll).</p>

             <div className="space-y-4">
                {variants.map((v, index) => (
                   <div key={index} className="flex gap-3 items-start">
                      <div className="flex-1">
                         <input placeholder="Nama (Contoh: Warna)" value={v.name} onChange={(e) => handleVariantChange(index, 'name', e.target.value)} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#F25C05] outline-none text-sm" />
                      </div>
                      <div className="flex-[2]">
                         <input placeholder="Pilihan (Contoh: Merah, Biru, Hijau)" value={v.options} onChange={(e) => handleVariantChange(index, 'options', e.target.value)} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#F25C05] outline-none text-sm" />
                      </div>
                      {variants.length > 1 && (
                         <button type="button" onClick={() => removeVariantRow(index)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition">✕</button>
                      )}
                   </div>
                ))}
             </div>
             
             <button type="button" onClick={addVariantRow} className="mt-4 text-sm font-bold text-[#F25C05] hover:bg-orange-50 px-4 py-2 rounded-lg transition border border-dashed border-[#F25C05]">
                + Tambah Varian Lain
             </button>
          </div>

          {/* 4. SPESIFIKASI */}
          <div className="bg-white p-6 md:p-8 rounded-card shadow-sm border border-gray-100">
             <h3 className="text-lg font-bold text-[#1A1A1A] mb-6 flex items-center gap-2">
                <span className="bg-green-100 text-green-600 p-2 rounded-lg text-xl">⚙️</span> 
                Spesifikasi
             </h3>

             <div className="space-y-4">
                {specs.map((spec, index) => (
                   <div key={index} className="flex gap-3 items-start">
                      <div className="flex-1">
                         <input placeholder="Label (Contoh: Bahan)" value={spec.key} onChange={(e) => handleSpecChange(index, 'key', e.target.value)} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#F25C05] outline-none text-sm bg-gray-50" />
                      </div>
                      <div className="flex-1">
                         <input placeholder="Nilai (Contoh: Katun 100%)" value={spec.value} onChange={(e) => handleSpecChange(index, 'value', e.target.value)} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#F25C05] outline-none text-sm bg-gray-50" />
                      </div>
                      {specs.length > 1 && (
                         <button type="button" onClick={() => removeSpecRow(index)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition">✕</button>
                      )}
                   </div>
                ))}
             </div>

             <button type="button" onClick={addSpecRow} className="mt-4 text-sm font-bold text-gray-500 hover:bg-gray-100 px-4 py-2 rounded-lg transition border border-dashed border-gray-300">
                + Tambah Baris Spesifikasi
             </button>
          </div>

          {/* TOMBOL AKSI */}
          <div className="flex gap-4 pt-4 border-t border-gray-200">
             <button type="button" onClick={() => navigate('/dashboard')} className="flex-1 py-4 text-gray-600 font-bold bg-gray-100 hover:bg-gray-200 rounded-xl transition">
                Batal
             </button>
             <button type="submit" disabled={loading} className="flex-[2] py-4 text-white font-bold bg-[#F25C05] hover:bg-[#D94E04] rounded-xl shadow-lg shadow-orange-500/30 transition disabled:opacity-70 disabled:cursor-not-allowed">
                {loading ? 'Sedang Mengupload...' : 'Simpan Produk Sekarang 🚀'}
             </button>
          </div>

        </form>
      </div>
    </Layout>
  );
}