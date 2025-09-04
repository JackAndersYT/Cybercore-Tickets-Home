import React, { useContext, useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { 
    Menu, 
    X, 
    BarChart3, 
    Users, 
    Ticket, 
    LogOut,
    Activity,
    Shield,
    Zap,
    Settings
} from 'lucide-react';

const MainLayout = () => {
    const { user, logout } = useContext(AuthContext);
    console.log('User object in MainLayout:', user);
    const location = useLocation();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Detectar si es móvil
    useEffect(() => {
        const checkIsMobile = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            if (mobile) {
                setSidebarCollapsed(true);
            }
        };

        checkIsMobile();
        window.addEventListener('resize', checkIsMobile);
        return () => window.removeEventListener('resize', checkIsMobile);
    }, []);

    // Cerrar menú móvil al cambiar de ruta
    useEffect(() => {
        setMobileMenuOpen(false);
    }, [location.pathname]);

    // Renderiza un estado de carga si el usuario aún no está disponible
    if (!user) {
        return (
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 min-h-screen flex items-center justify-center text-cyan-300 relative overflow-hidden">
                {/* Efectos de fondo mejorados */}
                <div className="absolute inset-0">
                    <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-cyan-400/8 rounded-full blur-3xl animate-float"></div>
                    <div className="absolute bottom-1/3 right-1/3 w-80 h-80 bg-indigo-400/8 rounded-full blur-3xl animate-float-delayed"></div>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-400/5 rounded-full blur-3xl animate-pulse"></div>
                </div>
                
                <div className="relative text-center space-y-6 px-4">
                    {/* Logo de carga mejorado */}
                    <div className="relative mx-auto w-20 h-20">
                        <div className="absolute inset-0 border-4 border-cyan-300/20 rounded-full"></div>
                        <div className="absolute inset-2 border-4 border-r-cyan-400 border-t-indigo-400 border-l-transparent border-b-transparent rounded-full animate-spin"></div>
                        <div className="absolute inset-4 bg-gradient-to-r from-cyan-400 to-indigo-400 rounded-full flex items-center justify-center">
                            <Activity className="w-6 h-6 text-slate-900 animate-pulse" />
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <div className="text-2xl font-bold tracking-wider bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">
                            CyberCore
                        </div>
                        <div className="text-sm text-slate-400 tracking-widest uppercase">
                            Iniciando sistema...
                        </div>
                    </div>
                    
                    {/* Indicador de progreso */}
                    <div className="flex justify-center space-x-1">
                        {[...Array(4)].map((_, i) => (
                            <div
                                key={i}
                                className="w-2 h-2 bg-gradient-to-r from-cyan-400 to-indigo-400 rounded-full animate-pulse"
                                style={{animationDelay: `${i * 0.3}s`}}
                            />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    const isAdminOrSupport = user.Role === 'Administrador' || user.Area === 'Soporte';

    const navItems = [
        { path: '/', name: 'Dashboard', icon: BarChart3, color: 'from-cyan-400 to-blue-500' },
        ...(isAdminOrSupport ? [{ 
            path: '/admin/users', 
            name: 'Usuarios', 
            icon: Users, 
            color: 'from-purple-400 to-pink-500' 
        }] : []),
        { path: '/tickets', name: 'Tickets', icon: Ticket, color: 'from-emerald-400 to-teal-500' }        
    ];

    const isActiveRoute = (path) => {
        return location.pathname === path;
    };

    const toggleMobileMenu = () => {
        setMobileMenuOpen(!mobileMenuOpen);
    };
    
    return (
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 h-screen text-slate-200 flex relative overflow-hidden">
            {/* Efectos de fondo globales sutiles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -left-40 w-80 h-80 bg-cyan-400/3 rounded-full blur-3xl animate-float"></div>
                <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-400/3 rounded-full blur-3xl animate-float-delayed"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-400/2 rounded-full blur-3xl"></div>
                
                {/* Grid sutil */}
                <div className="absolute inset-0 opacity-[0.02]" 
                     style={{
                         backgroundImage: `radial-gradient(circle at 1px 1px, rgba(99, 102, 241, 0.3) 1px, transparent 0)`,
                         backgroundSize: '30px 30px'
                     }}>
                </div>
            </div>

            {/* Overlay para móvil */}
            {mobileMenuOpen && (
                <div 
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar rediseñado */}
            <aside className={`
                ${isMobile ? 
                    `fixed left-0 top-0 h-full z-50 transform transition-all duration-500 ease-out w-80 ${
                        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
                    }` : 
                    `${sidebarCollapsed ? 'w-20' : 'w-80'} transition-all duration-500 ease-out relative z-30`
                }
            `}>
                {/* Fondo del sidebar con glassmorphism */}
                <div className="absolute inset-0">
                    <div className="absolute inset-0 bg-gradient-to-b from-slate-900/90 via-slate-800/85 to-slate-900/90"></div>
                    <div className="absolute inset-0 backdrop-blur-xl"></div>
                    <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-cyan-500/30 to-transparent"></div>
                </div>
                
                <div className="relative h-full p-6 flex flex-col">
                    
                    {/* Header del sidebar mejorado */}
                    <div className={`flex items-center ${sidebarCollapsed && !isMobile ? 'justify-center' : 'justify-between'} mb-8`}>
                        <div className={`${sidebarCollapsed && !isMobile ? 'hidden' : 'block'} transition-all duration-500`}>
                            <div className="flex items-center space-x-3">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-indigo-500 rounded-xl blur-md animate-pulse"></div>
                                    <div className="relative w-10 h-10 bg-gradient-to-r from-cyan-400 to-indigo-500 rounded-xl flex items-center justify-center">
                                        <Shield className="w-6 h-6 text-slate-900" />
                                    </div>
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">
                                        CyberCore
                                    </h2>
                                    <p className="text-xs text-slate-400 uppercase tracking-wider">Support System</p>
                                </div>
                            </div>
                        </div>
                        
                        {/* Botón de toggle mejorado */}
                        <button
                            onClick={isMobile ? toggleMobileMenu : () => setSidebarCollapsed(!sidebarCollapsed)}
                            className="group relative"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 to-indigo-400/20 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                            <div className="relative w-12 h-12 flex items-center justify-center rounded-xl bg-slate-800/60 hover:bg-slate-700/60 border border-slate-600/40 hover:border-cyan-400/40 transition-all duration-300 hover:scale-105">
                                {isMobile ? (
                                    <X className="text-cyan-400 w-5 h-5 transition-transform duration-300" />
                                ) : (
                                    <Menu className="text-cyan-400 w-5 h-5 transition-transform duration-300 group-hover:rotate-180" />
                                )}
                            </div>
                        </button>
                    </div>

                    {/* Navegación mejorada */}
                    <nav className={`flex-1 space-y-2 ${sidebarCollapsed && !isMobile ? 'flex flex-col items-center' : ''}`}>
                        {navItems.map((item, index) => {
                            const Icon = item.icon;
                            const isActive = isActiveRoute(item.path);
                            
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={`
                                        relative group block overflow-hidden rounded-xl transition-all duration-500 hover:scale-[1.02]
                                        ${sidebarCollapsed && !isMobile ? 'w-12 h-12' : 'p-4'}
                                        ${isActive ? 'bg-gradient-to-r from-slate-800/80 to-slate-700/60' : 'hover:bg-slate-800/40'}
                                    `}
                                    style={{
                                        animationDelay: `${index * 100}ms`
                                    }}
                                >
                                    {/* Efecto de brillo para item activo */}
                                    {isActive && (
                                        <div className={`absolute inset-0 bg-gradient-to-r ${item.color} opacity-10 rounded-xl`}></div>
                                    )}
                                    
                                    {/* Borde lateral para item activo */}
                                    {isActive && (
                                        <div className={`absolute left-0 top-2 bottom-2 w-1 bg-gradient-to-b ${item.color} rounded-r-full`}></div>
                                    )}
                                    
                                    <div className={`
                                        relative z-10 flex items-center
                                        ${sidebarCollapsed && !isMobile ? 'justify-center h-full' : 'space-x-4'}
                                    `}>
                                        {/* Icono */}
                                        <div className={`
                                            relative flex items-center justify-center
                                            ${sidebarCollapsed && !isMobile ? 'w-6 h-6' : 'w-8 h-8'}
                                        `}>
                                            <div className={`
                                                absolute inset-0 rounded-lg transition-all duration-300
                                                ${isActive ? 
                                                    `bg-gradient-to-r ${item.color} opacity-20` : 
                                                    'bg-slate-700/20 group-hover:bg-slate-600/30'
                                                }
                                            `}></div>
                                            <Icon className={`
                                                relative z-10 transition-all duration-300
                                                ${sidebarCollapsed && !isMobile ? 'w-5 h-5' : 'w-5 h-5'}
                                                ${isActive ? 
                                                    'text-cyan-300' : 
                                                    'text-slate-400 group-hover:text-cyan-300'
                                                }
                                            `} />
                                        </div>
                                        
                                        {/* Texto */}
                                        <div className={`
                                            ${sidebarCollapsed && !isMobile ? 'hidden' : 'block'} 
                                            transition-all duration-500
                                        `}>
                                            <span className={`
                                                font-medium transition-colors duration-300
                                                ${isActive ? 
                                                    'text-white' : 
                                                    'text-slate-300 group-hover:text-white'
                                                }
                                            `}>
                                                {item.name}
                                            </span>
                                        </div>
                                        
                                        {/* Indicador de estado activo */}
                                        {isActive && !(sidebarCollapsed && !isMobile) && (
                                            <div className="ml-auto">
                                                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Tooltip para modo colapsado */}
                                    {sidebarCollapsed && !isMobile && (
                                        <div className="absolute left-full ml-3 px-3 py-2 bg-slate-800 text-cyan-300 text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap z-50 border border-slate-600/50">
                                            <div className="absolute -left-1 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-slate-800 border-l border-b border-slate-600/50 rotate-45"></div>
                                            {item.name}
                                        </div>
                                    )}
                                    
                                    {/* Efecto hover */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/0 via-cyan-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl"></div>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Footer del sidebar mejorado */}
                    {!(sidebarCollapsed && !isMobile) && (
                        <div className="pt-6 border-t border-slate-700/50">
                            <div className="text-center space-y-3">
                                <div className="flex items-center justify-center space-x-2">
                                    <Zap className="w-4 h-4 text-cyan-400 animate-pulse" />
                                    <div className="text-xs text-slate-400 tracking-widest uppercase font-medium">
                                        CyberCore v2.0
                                    </div>
                                </div>
                                <div className="flex justify-center space-x-1">
                                    {[...Array(5)].map((_, i) => (
                                        <div
                                            key={i}
                                            className="w-1 h-1 bg-cyan-400/60 rounded-full animate-pulse"
                                            style={{animationDelay: `${i * 0.2}s`}}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </aside>

            {/* Contenido Principal */}
            <div className="flex-1 flex flex-col relative z-10 min-w-0">
                {/* Header rediseñado para móvil */}
                <header className="relative">
                    <div className="absolute inset-0">
                        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-2xl"></div>
                        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent"></div>
                    </div>
                    
                    <div className="relative p-4 sm:p-6">
                        {/* Layout diferente para móvil y desktop */}
                        {isMobile ? (
                            // Layout móvil - Vertical
                            <div className="flex items-center justify-between w-full">
    {/* --- LADO IZQUIERDO: MENÚ Y LOGO --- */}
    <div className="flex items-center space-x-3">
        <button
            onClick={toggleMobileMenu}
            className="relative group flex-shrink-0"
        >
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 to-indigo-400/20 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800/60 hover:bg-slate-700/60 border border-slate-600/40 hover:border-cyan-400/40 transition-all duration-300">
                <Menu className="text-cyan-400 w-4 h-4 transition-transform duration-300 group-hover:scale-110" />
            </div>
        </button>
        
        <div className="relative flex-shrink-0">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-indigo-500 rounded-full blur-lg animate-pulse opacity-60"></div>
            <div className="relative w-10 h-10 bg-gradient-to-r from-cyan-400 to-indigo-500 rounded-full flex items-center justify-center">
                <Activity className="w-5 h-5 text-slate-900" />
            </div>
        </div>
    </div>

    {/* --- LADO DERECHO: USUARIO Y LOGOUT --- */}
    <div className="flex items-center space-x-3">
        <div className="min-w-0 text-right">
            <p className="font-semibold text-white text-sm truncate max-w-28">
                {user.FullName}
            </p>
            <p className="text-xs bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent font-medium truncate uppercase">
                {user.Area}
            </p>
        </div>
        
        <div className="relative group flex-shrink-0">
            <div className="absolute inset-0 bg-gradient-to-r from-red-400/20 to-pink-400/20 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
            <button 
                onClick={logout}
                className="relative w-10 h-10 flex items-center justify-center bg-slate-800/60 hover:bg-slate-700/60 border border-slate-600/40 hover:border-red-400/40 rounded-xl text-slate-300 hover:text-red-300 transition-all duration-300 hover:scale-105"
            >
                <LogOut className="w-4 h-4" />
            </button>
        </div>
    </div>
</div>
                        ) : (
                            // Layout desktop - Horizontal
                            <div className="flex justify-between items-center">
                                {/* Logo y título del header */}
                                <div className="flex items-center space-x-4 flex-1 min-w-0">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-indigo-500 rounded-full blur-lg animate-pulse opacity-60"></div>
                                        <div className="relative w-12 h-12 bg-gradient-to-r from-cyan-400 to-indigo-500 rounded-full flex items-center justify-center">
                                            <Activity className="w-6 h-6 text-slate-900" />
                                        </div>
                                    </div>
                                    
                                    <div className="min-w-0 flex-1">
                                        <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent truncate">
                                            CyberCore Support
                                        </h1>
                                        <p className="text-sm text-slate-400 tracking-wide">
                                            Sistema de Gestión Avanzado
                                        </p>
                                    </div>
                                </div>
                                
                                {/* Panel de usuario */}
                                <div className="flex items-center space-x-4">
                                    {/* Info del usuario */}
                                    <div className="text-right min-w-0">
                                        <p className="font-semibold text-white text-lg truncate max-w-40 lg:max-w-none">
                                            {user.FullName}
                                        </p>
                                        <div className="flex items-center justify-end space-x-2">
                                            <div className="relative">
                                                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                                                <div className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-20"></div>
                                            </div>
                                            <p className="text-sm bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent font-medium truncate uppercase tracking-wide">
                                                {user.Area}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    {/* Botón de logout */}
                                    <div className="relative group">
                                        <div className="absolute inset-0 bg-gradient-to-r from-red-400/20 to-pink-400/20 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                                        <button 
                                            onClick={logout}
                                            className="relative flex items-center space-x-2 px-4 py-2 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-600/40 hover:border-red-400/40 rounded-xl text-slate-300 hover:text-red-300 transition-all duration-300 hover:scale-105"
                                        >
                                            <LogOut className="w-4 h-4" />
                                            <span className="text-sm font-medium">Cerrar Sesión</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </header>

                {/* Área de contenido principal */}
                <main className="flex-1 overflow-y-auto relative">
                    {/* Contenedor con glassmorphism sutil */}
                    <div className="p-6 lg:p-8 min-h-full">
                        <div className="relative min-h-full">
                            <div className="absolute inset-0 bg-slate-800/5 rounded-2xl backdrop-blur-sm"></div>
                            <div className="relative z-10 p-1">
                                <Outlet />
                            </div>
                        </div>
                    </div>
                </main>
            </div>
            
            {/* Estilos de animación personalizados */}
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

export default MainLayout;