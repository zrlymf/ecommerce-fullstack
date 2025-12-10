import { useEffect, useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout'; 

export default function EditProfile() {
    const navigate = useNavigate();
    const [user, setUser] = useState<any>(null);
    
    // Form States
    const [name, setName] = useState('');
    const [storeName, setStoreName] = useState('');
    const [storeLocation, setStoreLocation] = useState('');
    const [password, setPassword] = useState(''); 

    useEffect(() => {
        // Ambil data user saat ini
        axiosInstance.get('/users/profile') 
            .then(res => {
                const u = res.data;
                setUser(u);
                setName(u.name);
                setStoreName(u.storeName || '');
                setStoreLocation(u.storeLocation || '');
            })
            .catch(err => console.error(err));
    }, []);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload: any = { name };
            if (user.role === 'SELLER') {
                payload.storeName = storeName;
                payload.storeLocation = storeLocation;
            }
            if (password) payload.password = password;

            const res = await axiosInstance.patch('/users/profile', payload);
            
            // Update localStorage user data
            localStorage.setItem('user', JSON.stringify(res.data));
            
            alert("Profil berhasil diperbarui!");
            navigate('/dashboard');
        } catch (error) {
            alert("Gagal update profil.");
        }
    };

    if (!user) return (
        <Layout>
            <div className="flex justify-center items-center h-[50vh]">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#F25C05]"></div>
            </div>
        </Layout>
    );

    return (
        <Layout title="Edit Profil">
            <div className="max-w-xl mx-auto py-10">
                
                <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 animate-[fadeIn_0.3s_ease-out]">
                    
                    {/* Header Profil */}
                    <div className="flex items-center gap-4 mb-8 border-b border-gray-100 pb-6">
                        <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center text-3xl">
                            👤
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-[#1A1A1A]">{user.name}</h2>
                            <span className="inline-block mt-1 px-3 py-1 bg-gray-100 text-gray-500 text-xs font-bold rounded-full">
                                {user.role}
                            </span>
                        </div>
                    </div>
                    
                    <form onSubmit={handleUpdate} className="flex flex-col gap-6">
                        
                        {/* Data Pribadi */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Nama Lengkap</label>
                            <input 
                                value={name} 
                                onChange={e => setName(e.target.value)} 
                                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#F25C05]/20 focus:border-[#F25C05] outline-none transition-all" 
                                required 
                            />
                        </div>

                        {/* Form Khusus Seller */}
                        {user.role === 'SELLER' && (
                            <div className="bg-[#F8F9FB] p-5 rounded-lg border border-dashed border-gray-300 space-y-4">
                                <h3 className="text-sm font-bold text-[#F25C05] flex items-center gap-2">
                                    <span>🏪</span> Informasi Toko
                                </h3>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Nama Toko</label>
                                    <input 
                                        value={storeName} 
                                        onChange={e => setStoreName(e.target.value)} 
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#F25C05] outline-none bg-white" 
                                        required 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Lokasi Toko</label>
                                    <textarea 
                                        value={storeLocation} 
                                        onChange={e => setStoreLocation(e.target.value)} 
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#F25C05] outline-none bg-white min-h-[80px]" 
                                        required 
                                    />
                                </div>
                            </div>
                        )}

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                Password Baru <span className="text-gray-400 font-normal">(Opsional)</span>
                            </label>
                            <input 
                                type="password" 
                                placeholder="Biarkan kosong jika tidak ingin mengubah" 
                                value={password} 
                                onChange={e => setPassword(e.target.value)} 
                                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#F25C05]/20 focus:border-[#F25C05] outline-none transition-all" 
                            />
                        </div>

                        {/* Tombol Aksi */}
                        <div className="flex gap-4 pt-4 mt-2">
                            <button 
                                type="button" 
                                onClick={() => navigate(-1)} 
                                className="flex-1 py-3 text-gray-600 font-bold bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                            >
                                Batal
                            </button>
                            <button 
                                type="submit" 
                                className="flex-[2] py-3 text-white font-bold bg-[#F25C05] hover:bg-[#D94E04] rounded-lg shadow-lg shadow-orange-500/20 transition hover:scale-[1.02]"
                            >
                                Simpan Perubahan
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </Layout>
    );
}