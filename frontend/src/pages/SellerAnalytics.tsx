import { useEffect, useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import { useNavigate, Link } from 'react-router-dom';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Legend
} from 'recharts';
import Layout from '../components/Layout';

export default function SellerAnalytics() {
    const navigate = useNavigate();
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axiosInstance.get('/dashboard/seller')
            .then(res => {
                setStats(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                alert("Gagal memuat data analitik. Pastikan Anda adalah Seller.");
                navigate('/dashboard');
            });
    }, [navigate]);

    const formatRupiah = (num: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
    };

    if (loading) return (
        <Layout>
            <div className="flex justify-center items-center h-[50vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F25C05]"></div>
            </div>
        </Layout>
    );

    if (!stats) return <Layout><div className="text-center py-20">Data tidak tersedia.</div></Layout>;

    return (
        <Layout title="Analitik Toko">
            <div className="pb-20">

                {/* 1. GRID KARTU UTAMA */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 animate-[fadeIn_0.3s_ease-out]">

                    {/* Hari Ini */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Hari Ini</p>
                        <div className="text-2xl font-extrabold text-[#28a745]">
                            {formatRupiah(stats.revenueToday)}
                        </div>
                        <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                            <span className="font-bold text-[#333]">{stats.ordersToday}</span> Transaksi
                        </div>
                    </div>

                    {/* Minggu Ini */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Minggu Ini</p>
                        <div className="text-2xl font-extrabold text-[#17a2b8]">
                            {formatRupiah(stats.revenueThisWeek)}
                        </div>
                        <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                            <span className="font-bold text-[#333]">{stats.ordersThisWeek}</span> Transaksi
                        </div>
                    </div>

                    {/* Bulan Ini */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Bulan Ini</p>
                        <div className="text-2xl font-extrabold text-[#007bff]">
                            {formatRupiah(stats.revenueThisMonth)}
                        </div>
                        <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                            <span className="font-bold text-[#333]">{stats.ordersThisMonth}</span> Transaksi
                        </div>
                    </div>

                    {/* Total Semua */}
                    <div className="bg-[#F25C05] p-6 rounded-2xl shadow-lg shadow-orange-200 flex flex-col justify-between text-white">
                        <p className="text-xs font-bold text-white/70 uppercase tracking-widest mb-2">Total Pendapatan</p>
                        <div className="text-2xl font-extrabold text-white">
                            {formatRupiah(stats.revenueAllTime)}
                        </div>
                        <div className="mt-2 text-xs text-white/80 flex items-center gap-1">
                            Total <span className="font-bold">{stats.totalOrders}</span> Pesanan Sukses
                        </div>
                    </div>
                </div>

                {/* 2. GRID STATUS PESANAN */}
                <div className="mb-8">
                    <h3 className="text-lg font-bold text-[#1A1A1A] mb-4 flex items-center gap-2">
                        <span>📦</span> Status Pesanan
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white p-5 rounded-xl border border-yellow-100 shadow-sm flex items-center justify-between">
                            <span className="text-sm text-gray-600 font-medium">Perlu Dikirim</span>
                            <span className="text-2xl font-bold text-yellow-500">{stats.statusBreakdown.PROCESSING || 0}</span>
                        </div>
                        <div className="bg-white p-5 rounded-xl border border-blue-100 shadow-sm flex items-center justify-between">
                            <span className="text-sm text-gray-600 font-medium">Sedang Dikirim</span>
                            <span className="text-2xl font-bold text-blue-500">{stats.statusBreakdown.SHIPPED || 0}</span>
                        </div>
                        <div className="bg-white p-5 rounded-xl border border-green-100 shadow-sm flex items-center justify-between">
                            <span className="text-sm text-gray-600 font-medium">Selesai</span>
                            <span className="text-2xl font-bold text-green-500">{stats.statusBreakdown.DELIVERED || 0}</span>
                        </div>
                        <div className="bg-white p-5 rounded-xl border border-red-100 shadow-sm flex items-center justify-between">
                            <span className="text-sm text-gray-600 font-medium">Dibatalkan</span>
                            <span className="text-2xl font-bold text-red-500">{stats.statusBreakdown.CANCELLED || 0}</span>
                        </div>
                    </div>
                </div>

                {/* 3. GRAFIK & TOP PRODUK */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">

                    {/* GRAFIK */}
                    <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-[#1A1A1A] mb-6">📈 Tren Penjualan (7 Hari Terakhir)</h3>
                        <div className="h-[300px] w-full pl-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={stats.salesTrend} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />

                                    <XAxis
                                        dataKey="date"
                                        tick={{ fontSize: 11, fill: '#888' }}
                                        axisLine={false}
                                        tickLine={false}
                                        dy={10}
                                    />

                                    <YAxis
                                        tick={{ fontSize: 11, fill: '#888' }}
                                        axisLine={false}
                                        tickLine={false}
                                        tickFormatter={(value) => `${value / 1000}k`}
                                        label={{
                                            value: 'Pendapatan (Rp)',
                                            angle: -90,
                                            position: 'insideLeft',
                                            style: { textAnchor: 'middle', fill: '#aaa', fontSize: '12px' }
                                        }}
                                    />

                                    <Tooltip
                                        formatter={(value: number) => [formatRupiah(value), "Pendapatan"]}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    />

                                    <Legend verticalAlign="top" height={36} />

                                    <Line
                                        type="monotone"
                                        dataKey="amount"
                                        name="Pendapatan Harian"
                                        stroke="#F25C05"
                                        strokeWidth={3}
                                        dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                                        activeDot={{ r: 6, fill: '#F25C05' }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* TOP PRODUK */}
                    <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-[#1A1A1A] mb-6">🏆 Produk Terlaris</h3>
                        {stats.topProducts.length === 0 ? (
                            <div className="text-center py-10 text-gray-400 italic text-sm">
                                Belum ada data penjualan.
                            </div>
                        ) : (
                            <ul className="space-y-4">
                                {stats.topProducts.map((prod: any, idx: number) => (
                                    <li key={idx} className="border-b border-dashed border-gray-100 last:border-0">
                                        {/* 2. DIBUNGKUS LINK */}
                                        <Link
                                            to={`/product/${prod.id}`}
                                            className="flex justify-between items-center pb-3 hover:bg-gray-50 p-2 rounded-lg transition-colors group cursor-pointer"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${idx === 0 ? 'bg-yellow-400' : idx === 1 ? 'bg-gray-400' : idx === 2 ? 'bg-orange-400' : 'bg-gray-200 text-gray-500'}`}>
                                                    {idx + 1}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-[#1A1A1A] line-clamp-1 group-hover:text-[#F25C05] transition-colors">{prod.name}</p>
                                                    <p className="text-xs text-gray-400">{prod.sold} terjual</p>
                                                </div>
                                            </div>
                                            <div className="text-xs font-bold text-[#28a745]">
                                                {formatRupiah(prod.revenue)}
                                            </div>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {/* 4. PERINGATAN STOK */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-[#1A1A1A] mb-6 flex items-center gap-2">
                        <span>📦</span> Monitoring Stok
                    </h3>

                    {stats.lowStockProducts.length > 0 ? (
                        <div className="bg-red-50 p-6 rounded-xl border border-red-100">
                            <h4 className="text-red-600 font-bold mb-4 flex items-center gap-2">
                                <span className="animate-pulse">⚠️</span>
                                Peringatan: {stats.lowStockProducts.length} Produk Menipis (Stok &lt; 10)
                            </h4>

                            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                                {stats.lowStockProducts.map((prod: any) => (
                                    /* 3. DIBUNGKUS LINK */
                                    <Link
                                        to={`/product/${prod.id}`}
                                        key={prod.id}
                                        className="min-w-[180px] bg-white p-4 rounded-xl border border-red-200 shadow-sm flex flex-col justify-between h-24 hover:shadow-md hover:border-red-300 transition-all group cursor-pointer"
                                    >
                                        <div className="text-sm font-bold text-[#1A1A1A] line-clamp-1 group-hover:text-[#F25C05] transition-colors" title={prod.name}>
                                            {prod.name}
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <span className="text-xs text-gray-400">Sisa</span>
                                            <span className="text-2xl font-extrabold text-red-500">{prod.stock}</span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-10 bg-[#f0fff4] rounded-xl border border-[#c3e6cb]">
                            <div className="text-4xl mb-2">✅</div>
                            <h3 className="text-[#28a745] font-bold text-lg">Semua Stok Aman</h3>
                            <p className="text-gray-500 text-sm">Tidak ada produk dengan stok di bawah 10 unit.</p>
                        </div>
                    )}
                </div>

            </div>
        </Layout>
    );
}