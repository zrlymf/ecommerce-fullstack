import { type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AddProduct from './pages/AddProduct';
import ProductDetail from './pages/ProductDetail';
import ShopPage from './pages/ShopPage';
import EditProduct from './pages/EditProduct';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import ManageOrders from './pages/ManageOrders';
import MyOrders from './pages/MyOrders';
import SellerAnalytics from './pages/SellerAnalytics';
import MyInventory from './pages/MyInventory';
import EditProfile from './pages/EditProfile'; 

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute><Dashboard /></ProtectedRoute>
        } />

        <Route path="/add-product" element={
          <ProtectedRoute><AddProduct /></ProtectedRoute>
        } />

        <Route path="/product/:id" element={
          <ProtectedRoute><ProductDetail /></ProtectedRoute>
        } />

        <Route path="/shop/:sellerId" element={
          <ProtectedRoute><ShopPage /></ProtectedRoute>
        } />

        <Route path="/edit-product/:id" element={
          <ProtectedRoute><EditProduct /></ProtectedRoute>
        } />
        
        <Route path="/cart" element={
          <ProtectedRoute><CartPage /></ProtectedRoute>
        } />
        
        <Route path="/checkout" element={
          <ProtectedRoute><CheckoutPage /></ProtectedRoute>
        } />

        <Route path="/manage-orders" element={
          <ProtectedRoute><ManageOrders /></ProtectedRoute>
        } />

        <Route path="/my-orders" element={
          <ProtectedRoute><MyOrders /></ProtectedRoute>
        } />

        <Route path="/seller-dashboard" element={
          <ProtectedRoute><SellerAnalytics /></ProtectedRoute>
        } />
        
        <Route path="/inventory" element={
          <ProtectedRoute><MyInventory /></ProtectedRoute>
        } />

        <Route path="/edit-profile" element={
          <ProtectedRoute><EditProfile /></ProtectedRoute>
        } />
        
      </Routes>
    </BrowserRouter>
  );
}

export default App;