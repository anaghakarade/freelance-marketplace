import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/layout/ProtectedRoute';
import { PreferenceProvider } from './components/layout/PreferenceContext';
import { I18nProvider } from './i18n/i18n';

// Public/Marketplace Pages
import Home from './pages/public/Home';
import Marketplace from './pages/marketplace/Marketplace';
import ServiceDetails from './pages/marketplace/ServiceDetails';
import SellerProfile from './pages/marketplace/SellerProfile';
import ProjectsDiscovery from './pages/marketplace/ProjectsDiscovery';
import ProjectDetails from './pages/marketplace/ProjectDetails';
import FreelancersDiscovery from './pages/marketplace/FreelancersDiscovery';
import ContractDetails from './pages/shared/ContractDetails';
import Messages from './pages/shared/Messages';

// Taxonomy & Discovery Pages
import Categories from './pages/public/Categories';
import Trending from './pages/public/Trending';
import Principles from './pages/public/Principles';
import PostProject from './pages/buyer/PostProject';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';

// Dashboard Pages
import SellerDashboard from './pages/seller/SellerDashboard';
import BuyerDashboard from './pages/buyer/BuyerDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';

// Global Styles
import './styles/global.css';
import { authService } from './services/authService';

function App() {
  // Restore JWT session from backend on application load
  useEffect(() => {
    authService.restoreSession().catch(() => {
      // Silently handle network errors on startup
    });
  }, []);

  return (
    <PreferenceProvider>
      <I18nProvider>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        
        {/* Public Routes wrapped inside Layout (Navbar & Footer) */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="marketplace" element={<Marketplace />} />
          <Route path="principles" element={<Principles />} />
          <Route path="post-project" element={<PostProject />} />
          
          {/* Specific Taxonomy Routes BEFORE dynamic category routes */}
          <Route path="categories/trending" element={<Trending />} />
          <Route path="categories" element={<Categories />} />
          <Route path="categories/:categorySlug/:subcategorySlug" element={<Marketplace />} />
          <Route path="categories/:categorySlug" element={<Marketplace />} />

          <Route path="service/:id" element={<ServiceDetails />} />
          <Route path="seller/:id" element={<SellerProfile />} />

          {/* Phase 5: Project Marketplace Routes */}
          <Route path="projects" element={<ProjectsDiscovery />} />
          <Route path="freelancers" element={<FreelancersDiscovery />} />
          <Route path="projects/:id" element={<ProjectDetails />} />

          {/* Phase 6A: Contracts & Milestones Workspace */}
          <Route path="contracts/:contractId" element={<ContractDetails />} />
          <Route path="messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
          
          {/* Auth Pages */}
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
        </Route>

        {/* Seller Dashboard Routes */}
        <Route
          path="/seller/*"
          element={
            <ProtectedRoute allowedRoles={['freelancer']}>
              <Layout>
                <SellerDashboard />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Buyer Dashboard Routes */}
        <Route
          path="/buyer/*"
          element={
            <ProtectedRoute allowedRoles={['buyer']}>
              <Layout>
                <BuyerDashboard />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Admin Dashboard Routes */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Layout>
                <AdminDashboard />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Fallback Catch All */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
        </Router>
      </I18nProvider>
    </PreferenceProvider>
  );
}

export default App;
