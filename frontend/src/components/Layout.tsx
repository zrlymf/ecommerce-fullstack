import React from 'react';
import Navbar from './Navbar';
import { useLocation, useNavigate } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
}

const Layout: React.FC<LayoutProps> = ({ children, title }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const hideBackButtonPaths = ['/login', '/register', '/dashboard', '/'];
  const showBackButton = !hideBackButtonPaths.includes(location.pathname);

  return (
    <div className="min-h-screen flex flex-col font-sans text-dark bg-[#F8F9FB]">
      
      {/* 1. NAVBAR */}
      <div className="sticky top-0 z-50 w-full backdrop-blur-md bg-white/80 border-b border-gray-200 shadow-sm">
        <Navbar />
      </div>

      {/* 2. KONTEN UTAMA */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-[fadeIn_0.5s_ease-out]">
        
        {/* TOMBOL KEMBALI KE DASHBOARD */}
        {showBackButton && (
          <div className="mb-6">
            <button 
              onClick={() => navigate('/dashboard')} 
              className="group flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-[#F25C05] transition-colors"
            >
              <span className="bg-white border border-gray-200 rounded-full w-8 h-8 flex items-center justify-center shadow-sm group-hover:border-[#F25C05] group-hover:bg-[#F25C05] group-hover:text-white transition-all">
                ←
              </span>
              Kembali ke Dashboard
            </button>
          </div>
        )}

        {/* JUDUL HALAMAN */}
        {title && (
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[#1A1A1A]">{title}</h1>
            <div className="h-1 w-20 bg-[#F25C05] mt-2 rounded-full"></div> 
          </div>
        )}

        {/* KONTEN ASLI HALAMAN */}
        {children}
      </main>

      {/* 3. FOOTER */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto py-8 px-4 text-center">
          <p className="text-sm text-gray-500 font-medium">
            © 2025 <span className="text-[#F25C05] font-bold">BELANJAIN</span>. 
            All rights reserved.
          </p>
        </div>
      </footer>
      
    </div>
  );
};

export default Layout;