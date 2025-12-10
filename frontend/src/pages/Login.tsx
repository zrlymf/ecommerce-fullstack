import { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import Layout from '../components/Layout';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await axios.post('http://localhost:3000/auth/login', {
                email: email,
                password: password,
            });

            const { access_token, refresh_token } = response.data;

            localStorage.setItem('token', access_token);
            localStorage.setItem('refreshToken', refresh_token);

            alert('Login Berhasil!');
            navigate('/dashboard');

        } catch (err: any) {
            setError(err.response?.data?.message || 'Email atau password salah.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout>
            
            <div className="flex flex-col items-center justify-center min-h-[70vh]">
                
                {/* Kartu Login */}
                <div className="w-full max-w-md bg-white p-8 rounded-card shadow-soft border border-gray-100 animate-[fadeIn_0.5s_ease-out]">
                    
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-extrabold text-[#1A1A1A] mb-2">
                            Selamat Datang
                        </h1>
                        <p className="text-gray-500 text-sm">
                            Masuk untuk mengakses akun <span className="font-bold text-[#F25C05]">BELANJAIN</span> Anda.
                        </p>
                    </div>

                    {/* Pesan Error */}
                    {error && (
                        <div className="mb-6 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-100 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="flex flex-col gap-5">
                        
                        {/* Input Email */}
                        <div>
                            <label className="block text-sm font-bold text-[#1A1A1A] mb-2 ml-1">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="nama@email.com"
                                className="w-full px-4 py-3 rounded-lg border border-gray-200 text-[#1A1A1A] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F25C05]/20 focus:border-[#F25C05] transition-all"
                                required
                            />
                        </div>

                        {/* Input Password */}
                        <div>
                            <div className="flex justify-between items-center mb-2 ml-1">
                                <label className="block text-sm font-bold text-[#1A1A1A]">Password</label>
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full px-4 py-3 rounded-lg border border-gray-200 text-[#1A1A1A] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F25C05]/20 focus:border-[#F25C05] transition-all"
                                required
                            />
                        </div>

                        {/* Tombol Login */}
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="mt-2 w-full bg-[#F25C05] hover:bg-[#D94E04] text-white font-bold py-3.5 rounded-full transition-all shadow-lg shadow-orange-500/20 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Memproses...
                                </>
                            ) : (
                                "Masuk Sekarang"
                            )}
                        </button>
                    </form>

                    {/* Footer Link */}
                    <p className="text-center mt-8 text-sm text-gray-500">
                        Belum punya akun?{' '}
                        <Link to="/register" className="text-[#F25C05] font-bold hover:underline transition">
                            Daftar di sini
                        </Link>
                    </p>
                </div>
            </div>
        </Layout>
    );
}