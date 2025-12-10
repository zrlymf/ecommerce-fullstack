import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import Layout from '../components/Layout'; 

export default function EditProduct() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // State Form Dasar
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [category, setCategory] = useState('');

  // State Varian & Spesifikasi
  const [specs, setSpecs] = useState<{ key: string; value: string }[]>([]);
  const [variants, setVariants] = useState<{ name: string; options: string }[]>([]);

  const [loading, setLoading] = useState(true);

  // 1. AMBIL DATA LAMA & KONVERSI FORMATNYA
  useEffect(() => {
    axiosInstance.get(`/products/${id}`)
      .then(res => {
        const p = res.data;
        setName(p.name);
        setDescription(p.description);
        setPrice(p.price);
        setStock(p.stock);
        setCategory(p.category);

        // A. Transformasi Varian 
        if (p.variants) {
          const variantArray = Object.entries(p.variants).map(([key, val]: any) => ({
            name: key,
            options: Array.isArray(val) ? val.join(', ') : val
          }));
          setVariants(variantArray);
        }

        // B. Transformasi Spesifikasi
        if (p.specifications) {
            const specArray = Object.entries(p.specifications).map(([key, val]: any) => ({
                key: key,
                value: val
            }));
            setSpecs(specArray);
        }

        setLoading(false);
      })
      .catch(() => {
        alert('Error ambil data');
        navigate('/dashboard');
      });
  }, [id, navigate]);

  const addVariantRow = () => setVariants([...variants, { name: '', options: '' }]);
  const removeVariantRow = (index: number) => {
    const newV = [...variants]; newV.splice(index, 1); setVariants(newV);
  };
  const handleVariantChange = (index: number, field: 'name' | 'options', val: string) => {
    const newV: any = [...variants]; newV[index][field] = val; setVariants(newV);
  };

  const addSpecRow = () => setSpecs([...specs, { key: '', value: '' }]);
  const removeSpecRow = (index: number) => {
    const newSpecs = [...specs]; newSpecs.splice(index, 1); setSpecs(newSpecs);
  };
  const handleSpecChange = (index: number, field: 'key' | 'value', val: string) => {
    const newSpecs = [...specs]; newSpecs[index][field] = val; setSpecs(newSpecs);
  };

  // UPDATE DATA 
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // 1. Siapkan Object Varian 
      const variantsObject: any = {};
      variants.forEach(v => {
        if (v.name && v.options) {
            const opts = v.options.split(',').map(o => o.trim()).filter(o => o !== '');
            if (opts.length > 0) variantsObject[v.name] = opts;
        }
      });

      // 2. Siapkan Object Spesifikasi
      const specsObject: any = {};
      specs.forEach(item => {
        if (item.key && item.value) specsObject[item.key] = item.value;
      });

      // 3. Kirim via PATCH
      await axiosInstance.patch(`/products/${id}`, {
        name, 
        description, 
        category,
        price: Number(price), 
        stock: Number(stock),
        variants: variantsObject,        
        specifications: specsObject      
      });

      alert('Update Berhasil!');
      navigate(`/product/${id}`); 
    } catch (error) {
      console.error(error);
      alert('Gagal update produk');
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
    <Layout title="Edit Produk">
      <div className="max-w-4xl mx-auto pb-20">
        
        <form onSubmit={handleUpdate} className="flex flex-col gap-8">
          
          {/* 1. INFORMASI PRODUK */}
          <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-100 animate-[fadeIn_0.3s_ease-out]">
             <h3 className="text-lg font-bold text-[#1A1A1A] mb-6 flex items-center gap-2">
                <span className="bg-blue-100 text-blue-600 p-2 rounded-lg text-xl">📝</span> 
                Informasi Utama
             </h3>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                   <label className="block text-sm font-bold text-gray-700 mb-2">Nama Produk</label>
                   <input 
                      value={name} onChange={e => setName(e.target.value)} 
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#F25C05]/20 focus:border-[#F25C05] outline-none transition-all"
                   />
                </div>

                <div className="md:col-span-2">
                   <label className="block text-sm font-bold text-gray-700 mb-2">Deskripsi</label>
                   <textarea 
                      value={description} onChange={e => setDescription(e.target.value)} 
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#F25C05]/20 focus:border-[#F25C05] outline-none min-h-[120px] transition-all"
                   />
                </div>

                <div>
                   <label className="block text-sm font-bold text-gray-700 mb-2">Kategori</label>
                   <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#F25C05]/20 focus:border-[#F25C05] outline-none bg-white cursor-pointer">
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
                      <input type="number" value={price} onChange={e => setPrice(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#F25C05]/20 focus:border-[#F25C05] outline-none" />
                   </div>
                   <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Stok</label>
                      <input type="number" value={stock} onChange={e => setStock(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#F25C05]/20 focus:border-[#F25C05] outline-none" />
                   </div>
                </div>
             </div>
          </div>

          {/* 2. EDITOR VARIAN */}
          <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-100">
             <h3 className="text-lg font-bold text-[#1A1A1A] mb-2 flex items-center gap-2">
                <span className="bg-yellow-100 text-yellow-600 p-2 rounded-lg text-xl">🎨</span> 
                Edit Varian
             </h3>
             <p className="text-sm text-gray-500 mb-6">Ubah varian produk jika diperlukan.</p>

             <div className="space-y-4">
                {variants.map((v, index) => (
                   <div key={index} className="flex gap-3 items-start animate-[fadeIn_0.2s_ease-out]">
                      <div className="flex-1">
                         <input placeholder="Nama (Warna)" value={v.name} onChange={(e) => handleVariantChange(index, 'name', e.target.value)} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#F25C05] outline-none text-sm" />
                      </div>
                      <div className="flex-[2]">
                         <input placeholder="Pilihan (Merah, Biru)" value={v.options} onChange={(e) => handleVariantChange(index, 'options', e.target.value)} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#F25C05] outline-none text-sm" />
                      </div>
                      <button type="button" onClick={() => removeVariantRow(index)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition">✕</button>
                   </div>
                ))}
             </div>
             
             <button type="button" onClick={addVariantRow} className="mt-4 text-sm font-bold text-[#F25C05] hover:bg-orange-50 px-4 py-2 rounded-lg transition border border-dashed border-[#F25C05]">
                + Tambah Varian
             </button>
          </div>

          {/* 3. EDITOR SPESIFIKASI */}
          <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-100">
             <h3 className="text-lg font-bold text-[#1A1A1A] mb-6 flex items-center gap-2">
                <span className="bg-green-100 text-green-600 p-2 rounded-lg text-xl">⚙️</span> 
                Edit Spesifikasi
             </h3>

             <div className="space-y-4">
                {specs.map((spec, index) => (
                   <div key={index} className="flex gap-3 items-start animate-[fadeIn_0.2s_ease-out]">
                      <div className="flex-1">
                         <input placeholder="Label (Bahan)" value={spec.key} onChange={(e) => handleSpecChange(index, 'key', e.target.value)} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#F25C05] outline-none text-sm bg-gray-50" />
                      </div>
                      <div className="flex-1">
                         <input placeholder="Nilai (Katun)" value={spec.value} onChange={(e) => handleSpecChange(index, 'value', e.target.value)} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#F25C05] outline-none text-sm bg-gray-50" />
                      </div>
                      <button type="button" onClick={() => removeSpecRow(index)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition">✕</button>
                   </div>
                ))}
             </div>

             <button type="button" onClick={addSpecRow} className="mt-4 text-sm font-bold text-gray-500 hover:bg-gray-100 px-4 py-2 rounded-lg transition border border-dashed border-gray-300">
                + Tambah Spesifikasi
             </button>
          </div>

          {/* TOMBOL AKSI */}
          <div className="flex gap-4 pt-4 border-t border-gray-200 sticky bottom-0 bg-[#F8F9FB] pb-4 z-10">
             <button type="button" onClick={() => navigate(-1)} className="flex-1 py-4 text-gray-600 font-bold bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition shadow-sm">
                Batal
             </button>
             <button type="submit" className="flex-[2] py-4 text-white font-bold bg-[#F25C05] hover:bg-[#D94E04] rounded-xl shadow-lg shadow-orange-500/20 transition hover:scale-[1.01] active:scale-[0.99]">
                Simpan Perubahan 💾
             </button>
          </div>

        </form>
      </div>
    </Layout>
  );
}