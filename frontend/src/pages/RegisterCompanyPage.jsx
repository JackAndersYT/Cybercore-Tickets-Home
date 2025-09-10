import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building, User, Lock, Mail, Activity, Eye, EyeOff } from 'lucide-react';
import api from '../services/api';

const RegisterCompanyPage = () => {
    const [companyName, setCompanyName] = useState('');
    const [adminFullName, setAdminFullName] = useState('');
    const [adminUsername, setAdminUsername] = useState('');
    const [adminPassword, setAdminPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setPasswordError('');
        setSuccessMessage('');
        
        if (adminPassword !== confirmPassword) {
            setPasswordError('Las contraseñas no coinciden.');
            return;
        }

        setLoading(true);
        try {
            const response = await api.post('/auth/register-company', {
                companyName,
                adminFullName,
                adminUsername,
                adminPassword,
            });

            setSuccessMessage(response.data.msg || 'Empresa y usuario administrador registrados con éxito!');
            // navigate('/login'); // Redirigir al login tras el registro - maybe after a delay or user action

        } catch (err) {
            setError(err.response?.data?.msg || 'Error al registrar la empresa. Inténtelo de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 min-h-screen flex items-center justify-center text-slate-200 p-4 relative overflow-hidden">
            {/* Background effects - similar to LoginPage */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -left-40 w-80 h-80 bg-cyan-400/3 rounded-full blur-3xl animate-float"></div>
                <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-400/3 rounded-full blur-3xl animate-float-delayed"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-400/2 rounded-full blur-3xl"></div>
                
                {/* Grid */}
                <div className="absolute inset-0 opacity-[0.02]" 
                     style={{
                         backgroundImage: `radial-gradient(circle at 1px 1px, rgba(99, 102, 241, 0.3) 1px, transparent 0)`,
                         backgroundSize: '30px 30px'
                     }}>
                </div>
            </div>

            {/* Floating particles */}
            <div className="absolute inset-0 pointer-events-none">
                {[...Array(15)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-1 h-1 bg-cyan-400/20 rounded-full animate-pulse"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 3}s`,
                            animationDuration: `${2 + Math.random() * 3}s`
                        }}
                    />
                ))}
            </div>

            <div className="relative w-full max-w-md">
                {/* Main container with glassmorphism */}
                <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/10 via-indigo-400/10 to-purple-400/10 rounded-3xl blur-xl opacity-60 group-hover:opacity-80 transition-all duration-500"></div>
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-slate-800/85 to-slate-900/90 rounded-3xl"></div>
                    <div className="absolute inset-0 backdrop-blur-xl rounded-3xl"></div>
                    <div className="absolute inset-0 border border-slate-600/40 rounded-3xl"></div>
                    
                    <div className="relative p-10 space-y-8">
                        
                        {/* Header */}
                        <div className="text-center space-y-6">
                            <div className="relative inline-block">
                                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-indigo-500 rounded-xl blur-lg animate-pulse opacity-60"></div>
                                <div className="relative w-16 h-16 bg-gradient-to-r from-cyan-400 to-indigo-500 rounded-xl flex items-center justify-center mx-auto">
                                    <Building className="w-8 h-8 text-slate-900" />
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent tracking-wider">
                                    Registrar Empresa
                                </h1>
                                <p className="text-sm text-slate-400 uppercase tracking-widest font-medium">
                                    Crea tu cuenta de empresa
                                </p>
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="relative group">
                                <div className="absolute inset-0 bg-gradient-to-r from-red-400/20 to-pink-400/20 rounded-xl blur-md"></div>
                                <div className="relative p-4 bg-slate-800/60 border border-red-400/40 rounded-xl backdrop-blur-sm">
                                    <div className="flex items-center space-x-3">
                                        <div className="relative">
                                            <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                                            <div className="absolute inset-0 bg-red-400 rounded-full animate-ping opacity-30"></div>
                                        </div>
                                        <span className="text-sm text-red-300 font-medium">{error}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Success Message */}
                        {successMessage && (
                            <div className="relative group">
                                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 to-teal-400/20 rounded-xl blur-md"></div>
                                <div className="relative p-4 bg-slate-800/60 border border-emerald-400/40 rounded-xl backdrop-blur-sm">
                                    <div className="flex items-center space-x-3">
                                        <div className="relative">
                                            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                                            <div className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-30"></div>
                                        </div>
                                        <span className="text-sm text-emerald-300 font-medium">{successMessage}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <form className="space-y-6" onSubmit={handleSubmit}>
                            {/* Company Name */}
                            <div className="space-y-3">
                                <label className="text-sm font-medium text-slate-300 flex items-center space-x-2">
                                    <Building className="w-4 h-4 text-cyan-400" />
                                    <span>Nombre de la Empresa</span>
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 to-indigo-400/20 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                                    <input
                                        id="companyName"
                                        name="companyName"
                                        type="text"
                                        required
                                        value={companyName}
                                        onChange={(e) => setCompanyName(e.target.value)}
                                        className="relative w-full px-4 py-3 bg-slate-800/60 backdrop-blur-sm border border-slate-600/40 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/40 transition-all duration-300 hover:border-slate-500/60 hover:bg-slate-700/40"
                                        placeholder="Ej. Mi Gran Empresa S.A."
                                    />
                                </div>
                            </div>

                            {/* Admin Full Name */}
                            <div className="space-y-3">
                                <label className="text-sm font-medium text-slate-300 flex items-center space-x-2">
                                    <User className="w-4 h-4 text-cyan-400" />
                                    <span>Nombre Completo del Administrador</span>
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 to-indigo-400/20 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                                    <input
                                        id="adminFullName"
                                        name="adminFullName"
                                        type="text"
                                        required
                                        value={adminFullName}
                                        onChange={(e) => setAdminFullName(e.target.value)}
                                        className="relative w-full px-4 py-3 bg-slate-800/60 backdrop-blur-sm border border-slate-600/40 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/40 transition-all duration-300 hover:border-slate-500/60 hover:bg-slate-700/40"
                                        placeholder="Ej. Juan Pérez"
                                    />
                                </div>
                            </div>

                            {/* Admin Username */}
                            <div className="space-y-3">
                                <label className="text-sm font-medium text-slate-300 flex items-center space-x-2">
                                    <Mail className="w-4 h-4 text-cyan-400" />
                                    <span>Nombre de Usuario (Único)</span>
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 to-indigo-400/20 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                                    <input
                                        id="adminUsername"
                                        name="adminUsername"
                                        type="text"
                                        required
                                        value={adminUsername}
                                        onChange={(e) => setAdminUsername(e.target.value)}
                                        className="relative w-full px-4 py-3 bg-slate-800/60 backdrop-blur-sm border border-slate-600/40 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/40 transition-all duration-300 hover:border-slate-500/60 hover:bg-slate-700/40"
                                        placeholder="Ej. admin.miempresa"
                                    />
                                </div>
                            </div>

                            {/* Admin Password */}
                            <div className="space-y-3">
                                <label className="text-sm font-medium text-slate-300 flex items-center space-x-2">
                                    <Lock className="w-4 h-4 text-cyan-400" />
                                    <span>Contraseña</span>
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 to-indigo-400/20 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                                    <input
                                        id="adminPassword"
                                        name="adminPassword"
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        value={adminPassword}
                                        onChange={(e) => setAdminPassword(e.target.value)}
                                        className="relative w-full px-4 py-3 pr-12 bg-slate-800/60 backdrop-blur-sm border border-slate-600/40 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/40 transition-all duration-300 hover:border-slate-500/60 hover:bg-slate-700/40"
                                        placeholder="••••••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-slate-400 hover:text-cyan-300 transition-colors duration-200 hover:bg-slate-700/40 rounded-lg"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="w-4 h-4" />
                                        ) : (
                                            <Eye className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Confirm Password */}
                            <div className="space-y-3">
                                <label className="text-sm font-medium text-slate-300 flex items-center space-x-2">
                                    <Lock className="w-4 h-4 text-cyan-400" />
                                    <span>Confirmar Contraseña</span>
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 to-indigo-400/20 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                                    <input
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="relative w-full px-4 py-3 pr-12 bg-slate-800/60 backdrop-blur-sm border border-slate-600/40 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/40 transition-all duration-300 hover:border-slate-500/60 hover:bg-slate-700/40"
                                        placeholder="••••••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-slate-400 hover:text-cyan-300 transition-colors duration-200 hover:bg-slate-700/40 rounded-lg"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="w-4 h-4" />
                                        ) : (
                                            <Eye className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                                {passwordError && <p className="text-sm text-red-400 mt-1">{passwordError}</p>}
                            </div>

                            {/* Submit Button */}
                            <div className="pt-4">
                                <div className="relative group">
                                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-indigo-500 rounded-xl blur-md opacity-60 group-hover:opacity-100 transition-all duration-300"></div>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="relative w-full py-4 px-6 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold rounded-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-60 disabled:scale-100 disabled:cursor-not-allowed border border-cyan-400/20 hover:border-cyan-400/40 shadow-lg shadow-cyan-500/20"
                                    >
                                        <div className="flex items-center justify-center space-x-3">
                                            {loading ? (
                                                <div className="relative w-5 h-5">
                                                    <div className="absolute inset-0 border-2 border-white/20 rounded-full"></div>
                                                    <div className="absolute inset-0 border-2 border-t-white rounded-full animate-spin"></div>
                                                </div>
                                            ) : (
                                                <Activity className="w-5 h-5" />
                                            )}
                                            <span className="tracking-wide font-medium">
                                                {loading ? 'Registrando...' : 'Registrar Empresa'}
                                            </span>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </form>

                        {/* Back to Login Link */}
                        <div className="pt-6 text-center">
                            <Link to="/login" className="text-sm text-slate-400 hover:text-cyan-400 transition-colors duration-200">
                                ¿Ya tienes una cuenta? Inicia Sesión
                            </Link>
                        </div>

                    </div>
                </div>
            </div>

            {/* Animation styles - similar to LoginPage */}
            <style jsx>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0px) rotate(0deg); }
                    33% { transform: translateY(-10px) rotate(1deg); }
                    66% { transform: translateY(5px) rotate(-1deg); }
                }
                
                @keyframes float-delayed {
                    0%, 100% { transform: translateY(0px) rotate(0deg); }
                    33% { transform: translateY(8px) rotate(-1deg); }
                    66% { transform: translateY(-6px) rotate(1deg); }
                }
                
                .animate-float {
                    animation: float 8s ease-in-out infinite;
                }
                
                .animate-float-delayed {
                    animation: float-delayed 10s ease-in-out infinite;
                    animation-delay: 2s;
                }
            `}</style>
        </div>
    );
};

export default RegisterCompanyPage;