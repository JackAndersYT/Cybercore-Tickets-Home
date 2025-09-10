import React, { useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthContext } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProtectedRoute from './components/routing/ProtectedRoute';
import MainLayout from './components/layout/MainLayout';
import RegisterTicketPage from './pages/RegisterTicketPage';
import TicketListPage from './pages/TicketListPage';
import AdminUsersPage from './pages/AdminUsersPage';
import TicketDetailPage from './pages/TicketDetailPage';
import RegisterCompanyPage from './pages/RegisterCompanyPage'; // Importar RegisterCompanyPage

function App() {
  const { isAuthenticated, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-cyan-900 min-h-screen flex items-center justify-center text-cyan-400 font-orbitron relative overflow-hidden">
          <div className="absolute inset-0">
              <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
              <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
          </div>
          <div className="relative text-center space-y-4">
              <div className="w-16 h-16 mx-auto border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
              <div className="text-xl tracking-wider">
                  Iniciando CyberCore System...
              </div>
          </div>
      </div>
    );
  }

  return (
    <>
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: '#1f2937',
            color: '#e5e7eb',
            border: '1px solid #0891b2',
          },
        }}
      />
      {/* Se elimina la etiqueta <Router> de aquí */}
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <LoginPage />} />
        <Route path="/register-company" element={<RegisterCompanyPage />} /> {/* Nueva ruta */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/tickets/register" element={<RegisterTicketPage />} />
            <Route path="/tickets" element={<TicketListPage />} />
            <Route path="/tickets/:id" element={<TicketDetailPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
          </Route>
        </Route>
      </Routes>
    </>
  );
}

export default App;