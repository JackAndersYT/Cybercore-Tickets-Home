import React, { useState, useEffect, useContext } from 'react';
import socket from '../services/socket';
import { AuthContext } from '../context/AuthContext';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { 
    Activity, 
    BarChart3, 
    TrendingUp, 
    Clock, 
    CheckCircle, 
    AlertCircle,
    Zap,
    Database,
    Users,
    Ticket
} from 'lucide-react';
import dashboardService from '../services/dashboardService';
import ticketService from '../services/ticketService';
import TicketCard from '../components/tickets/TicketCard';
import { NotificationContext } from '../context/NotificationContext';

const DashboardPage = () => {
    const { user } = useContext(AuthContext);
    const [stats, setStats] = useState(null);
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const { notification } = useContext(NotificationContext);
    const [refreshKey, setRefreshKey] = useState(0);

    // --- CÓDIGO AÑADIDO PARA RESPONSIVIDAD DEL GRÁFICO ---
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        window.addEventListener('resize', handleResize);
        // Limpiar el event listener cuando el componente se desmonte
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    // --- FIN DEL CÓDIGO AÑADIDO ---

    const loadData = async () => {
        try {
            const [statsData, ticketsData] = await Promise.all([
                dashboardService.getStats(),
                ticketService.getAll()
            ]);
            setStats(statsData);
            setTickets(ticketsData.tickets || []);
        } catch (err) {
            console.error(err);
        } finally {
            if (loading) {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        loadData();
    }, [refreshKey]); // Depend on refreshKey

    useEffect(() => {
        const handleTicketCreated = (data) => {
            if (user?.Role === 'Administrador' || (data.assignedToArea && user?.Area === data.assignedToArea)) {
                setRefreshKey(prevKey => prevKey + 1);
            }
        };

        const handleTicketUpdated = () => {
            setRefreshKey(prevKey => prevKey + 1);
        };

        socket.on('ticketCreated', handleTicketCreated);
        socket.on('ticketUpdated', handleTicketUpdated);

        return () => {
            socket.off('ticketCreated', handleTicketCreated);
            socket.off('ticketUpdated', handleTicketUpdated);
        };
    }, [user]);

    useEffect(() => {
        if (notification) {
            loadData();
        }
    }, [notification]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-96">
                <div className="text-center space-y-6">
                    {/* Loader mejorado */}
                    <div className="relative mx-auto w-24 h-24">
                        <div className="absolute inset-0 border-4 border-slate-700/30 rounded-full"></div>
                        <div className="absolute inset-2 border-4 border-r-cyan-400 border-t-indigo-400 border-l-transparent border-b-transparent rounded-full animate-spin"></div>
                        <div className="absolute inset-4 bg-gradient-to-r from-cyan-400 to-indigo-500 rounded-full flex items-center justify-center shadow-lg">
                            <BarChart3 className="w-8 h-8 text-slate-900 animate-pulse" />
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <div className="text-xl font-semibold bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">
                            Cargando Dashboard
                        </div>
                        <div className="text-sm text-slate-400 tracking-wide">
                            Procesando datos del sistema...
                        </div>
                    </div>
                    
                    <div className="flex justify-center space-x-1">
                        {[...Array(4)].map((_, i) => (
                            <div
                                key={i}
                                className="w-2 h-2 bg-gradient-to-r from-cyan-400 to-indigo-400 rounded-full animate-bounce"
                                style={{animationDelay: `${i * 0.15}s`}}
                            />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="flex items-center justify-center min-h-96">
                <div className="text-center space-y-4 p-8">
                    <div className="relative mx-auto w-16 h-16">
                        <div className="absolute inset-0 bg-red-400/20 rounded-full blur-lg animate-pulse"></div>
                        <div className="relative w-16 h-16 bg-slate-800 border-2 border-red-400/40 rounded-full flex items-center justify-center">
                            <AlertCircle className="w-8 h-8 text-red-400" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="text-lg font-semibold text-red-400">Error al cargar estadísticas</div>
                        <div className="text-sm text-slate-400">No se pudieron obtener los datos del dashboard</div>
                    </div>
                </div>
            </div>
        );
    }

    const pieData = [
        { name: 'Abiertos/En Revisión', value: stats.totalVsOpen.openTickets || 0 },
        { name: 'Resueltos/Cerrados', value: (stats.totalVsOpen.total - stats.totalVsOpen.openTickets) || 0 },
    ];
    
    const ticketFlowData = [
        { 
            name: 'Realizados', 
            value: stats.ticketFlow.realizados,
            fill: '#06b6d4',
            icon: CheckCircle
        },
        { 
            name: 'Recibidos', 
            value: stats.ticketFlow.recibidos,
            fill: '#8b5cf6',
            icon: Clock
        },
    ];

    return (
        <div className="space-y-8">
            {/* Header del Dashboard rediseñado */}
            <div className="relative">
                <div className="flex items-center space-x-6 mb-6">
                    <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-indigo-500 rounded-2xl blur-lg opacity-60 animate-pulse"></div>
                        <div className="relative w-16 h-16 bg-gradient-to-br from-slate-800 to-slate-900 p-4 rounded-2xl border border-cyan-400/40">
                            <BarChart3 className="w-8 h-8 text-cyan-400" />
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-slate-900">
                                <div className="w-full h-full bg-emerald-400 rounded-full animate-ping"></div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex-1">
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
                            Panel de Control
                        </h1>
                        <div className="flex items-center space-x-3 mt-2">
                            <div className="flex items-center space-x-2">
                                <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
                                <span className="text-sm text-slate-400 uppercase tracking-wider">Sistema Activo</span>
                            </div>
                            <div className="w-1 h-1 bg-slate-500 rounded-full"></div>
                            <span className="text-xs text-slate-500 font-mono">
                                {new Date().toLocaleDateString('es-ES', { 
                                    weekday: 'long', 
                                    year: 'numeric', 
                                    month: 'long', 
                                    day: 'numeric' 
                                })}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Línea divisoria con efecto */}
                <div className="h-px bg-gradient-to-r from-transparent via-slate-600/50 to-transparent"></div>
            </div>
        
            {/* Grid principal mejorado */}
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
                
                {/* Gráfico principal - mejorado */}
                <div className="xl:col-span-3 order-2 xl:order-1">
                    {/* ---- CAMBIO 1: ALTURA RESPONSIVA ---- */}
                    <div className="relative group h-96 xl:h-full">
                        {/* Fondo con glassmorphism */}
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-800/40 to-slate-900/40 rounded-3xl backdrop-blur-xl"></div>
                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/5 to-indigo-400/5 rounded-3xl"></div>
                        <div className="absolute inset-0 border border-slate-600/30 rounded-3xl group-hover:border-cyan-400/40 transition-colors duration-500"></div>
                        
                        {/* ---- CAMBIO 2: PADDING RESPONSIVO ---- */}
                        <div className="relative h-full p-4 sm:p-8 flex flex-col">
                            {/* Header del gráfico */}
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center space-x-4">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-indigo-500 rounded-xl blur-md opacity-50"></div>
                                        <div className="relative w-12 h-12 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl flex items-center justify-center border border-cyan-400/30">
                                            <TrendingUp className="w-6 h-6 text-cyan-400" />
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-white">Flujo de Tickets</h3>
                                        <p className="text-sm text-slate-400">Análisis de rendimiento</p>
                                    </div>
                                </div>
                                
                                <div className="flex space-x-2">
                                    <div className="w-3 h-3 bg-cyan-400 rounded-full animate-pulse"></div>
                                    <div className="w-3 h-3 bg-indigo-400 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
                                </div>
                            </div>

                            <div className="flex-1 min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    {/* ---- CAMBIO 3: MÁRGENES DINÁMICOS ---- */}
                                    <BarChart 
                                        data={ticketFlowData} 
                                        margin={isMobile ? 
                                            { top: 20, right: 20, left: 5, bottom: 5 } : 
                                            { top: 20, right: 10, left: 10, bottom: 10 }
                                        }
                                        barSize={isMobile ? 80 : 200}
                                    >
                                        <defs>
                                            <linearGradient id="realizadosGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#06b6d4" stopOpacity={1}/>
                                                <stop offset="100%" stopColor="#0891b2" stopOpacity={0.6}/>
                                            </linearGradient>
                                            <linearGradient id="recibidosGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1}/>
                                                <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.6}/>
                                            </linearGradient>
                                            <filter id="shadow">
                                                <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000" floodOpacity="0.3"/>
                                            </filter>
                                        </defs>
                                        <XAxis 
                                            dataKey="name" 
                                            stroke="#64748b" 
                                            fontSize={14}
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#64748b' }}
                                        />
                                        <YAxis 
                                            stroke="#64748b" 
                                            fontSize={12}
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#64748b' }}
                                        />
                                        <Tooltip 
                                            contentStyle={{ 
                                                backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                                                border: '1px solid rgba(34, 197, 94, 0.3)',
                                                borderRadius: '12px',
                                                backdropFilter: 'blur(16px)',
                                                fontSize: '14px',
                                                color: '#e2e8f0',
                                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                                            }}
                                            cursor={{ fill: 'rgba(34, 197, 94, 0.1)' }}
                                        />
                                        <Bar 
                                            dataKey="value" 
                                            radius={[8, 8, 0, 0]}
                                            filter="url(#shadow)"
                                        >
                                            {ticketFlowData.map((entry, index) => (
                                                <Cell 
                                                    key={`cell-${index}`} 
                                                    fill={entry.name === 'Realizados' ? 'url(#realizadosGradient)' : 'url(#recibidosGradient)'} 
                                                />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Panel lateral con métricas */}
                <div className="xl:col-span-2 order-1 xl:order-2 flex flex-col gap-8">
                    
                    {/* Tarjetas de métricas principales */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-6">
                        
                        {/* Total de tickets */}
                        <div className="relative group">
                            <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/20 to-blue-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                            <div className="relative bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl p-6 rounded-2xl border border-slate-600/30 hover:border-cyan-400/40 transition-all duration-500">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center">
                                            <Database className="w-5 h-5 text-slate-900" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-medium text-slate-300">Total Tickets</h4>
                                            <p className="text-xs text-slate-500">Sistema completo</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-bold text-cyan-400 font-mono">
                                            {stats.totalVsOpen.total}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full animate-pulse"></div>
                                </div>
                            </div>
                        </div>

                        {/* Tickets abiertos */}
                        <div className="relative group">
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/20 to-teal-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                            <div className="relative bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl p-6 rounded-2xl border border-slate-600/30 hover:border-emerald-400/40 transition-all duration-500">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center">
                                            <Clock className="w-5 h-5 text-slate-900" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-medium text-slate-300">Tickets Abiertos</h4>
                                            <p className="text-xs text-slate-500">Pendientes</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-bold text-emerald-400 font-mono">
                                            {stats.totalVsOpen.openTickets}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-500">
                                        {stats.totalVsOpen.total > 0 ? 
                                            Math.round((stats.totalVsOpen.openTickets / stats.totalVsOpen.total) * 100) : 0
                                        }% del total
                                    </span>
                                    <div className="flex space-x-1">
                                        <div className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse"></div>
                                        <div className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                                        <div className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="relative group flex-1">
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl blur-xl opacity-60 group-hover:opacity-80 transition-all duration-500"></div>
                        <div className="relative h-full bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl p-6 rounded-2xl border border-slate-600/30 hover:border-purple-400/40 transition-all duration-500 min-h-80 flex flex-col">
                            
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-pink-500 rounded-xl flex items-center justify-center">
                                        <Activity className="w-5 h-5 text-slate-900" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white">Estado General</h3>
                                        <p className="text-sm text-slate-400">Abiertos vs. Cerrados</p>
                                    </div>
                                </div>
                                
                                <div className="flex items-center space-x-2">
                                    <Zap className="w-4 h-4 text-purple-400 animate-pulse" />
                                    <span className="text-xs text-slate-400 uppercase tracking-wider">En vivo</span>
                                </div>
                            </div>

                            <div className="flex-1 min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart 
                                        data={pieData} 
                                        margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                                    >
                                        <defs>
                                            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.8}/>
                                                <stop offset="50%" stopColor="#8b5cf6" stopOpacity={0.6}/>
                                                <stop offset="100%" stopColor="#ec4899" stopOpacity={0.3}/>
                                            </linearGradient>
                                            <filter id="glow">
                                                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                                                <feMerge> 
                                                    <feMergeNode in="coloredBlur"/>
                                                    <feMergeNode in="SourceGraphic"/>
                                                </feMerge>
                                            </filter>
                                        </defs>
                                        <XAxis 
                                            dataKey="name" 
                                            stroke="#9ca3af" 
                                            fontSize={12}
                                            axisLine={false}
                                            tickLine={false}
                                            interval={0}
                                        />
                                        <YAxis 
                                            stroke="#9ca3af" 
                                            fontSize={12}
                                            axisLine={false}
                                            tickLine={false}
                                            width={40}
                                        />
                                        <Tooltip 
                                            contentStyle={{ 
                                                backgroundColor: 'rgba(17, 24, 39, 0.95)', 
                                                border: '1px solid #8b5cf6',
                                                borderRadius: '12px',
                                                backdropFilter: 'blur(8px)',
                                                fontSize: '14px'
                                            }} 
                                        />
                                        <Area 
                                            type="monotone" 
                                            dataKey="value" 
                                            stroke="#06b6d4" 
                                            strokeWidth={3}
                                            fill="url(#areaGradient)"
                                            filter="url(#glow)"
                                            dot={{ 
                                                fill: '#06b6d4', 
                                                strokeWidth: 2, 
                                                r: 6 
                                            }}
                                            activeDot={{ 
                                                r: 8, 
                                                stroke: '#06b6d4', 
                                                strokeWidth: 2, 
                                                fill: '#0891b2' 
                                            }}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sección de tickets recientes completamente rediseñada */}
            <div className="space-y-6">
                {/* Header de la sección */}
                <div className="relative">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <div className="relative">
                                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/30 to-purple-400/30 rounded-xl blur-lg"></div>
                                <div className="relative w-12 h-12 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl flex items-center justify-center border border-cyan-400/30">
                                    <Ticket className="w-6 h-6 text-cyan-400" />
                                </div>
                            </div>
                            
                            <div>
                                <h2 className="text-2xl font-bold text-white">Tickets Recientes</h2>
                                <div className="flex items-center space-x-2 mt-1">
                                    <span className="text-sm text-slate-400">Últimas actualizaciones</span>
                                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                            <div className="text-right">
                                <div className="text-lg font-bold text-cyan-400 font-mono">
                                    {tickets.length}
                                </div>
                                <div className="text-xs text-slate-500 uppercase tracking-wider">
                                    Tickets
                                </div>
                            </div>
                            <div className="w-px h-8 bg-gradient-to-b from-transparent via-slate-600 to-transparent"></div>
                            <Activity className="w-5 h-5 text-emerald-400 animate-pulse" />
                        </div>
                    </div>
                </div>
                
                {tickets.length === 0 ? (
                    <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-700/20 to-slate-800/20 rounded-2xl blur-xl"></div>
                        <div className="relative bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-xl border border-slate-600/30 rounded-2xl p-12 text-center">
                            
                            <div className="relative mx-auto w-20 h-20 mb-6">
                                <div className="absolute inset-0 bg-slate-600/20 rounded-full blur-lg"></div>
                                <div className="relative w-20 h-20 bg-gradient-to-br from-slate-700 to-slate-800 rounded-full flex items-center justify-center border border-slate-600/50">
                                    <Ticket className="w-10 h-10 text-slate-400" />
                                </div>
                            </div>
                            
                            <h3 className="text-xl font-semibold text-slate-300 mb-2">No hay tickets disponibles</h3>
                            <p className="text-slate-500 mb-6">Los nuevos tickets aparecerán aquí cuando sean creados</p>
                            
                            <div className="flex justify-center space-x-2">
                                {[...Array(3)].map((_, i) => (
                                    <div
                                        key={i}
                                        className="w-2 h-2 bg-slate-500/60 rounded-full animate-pulse"
                                        style={{animationDelay: `${i * 0.3}s`}}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-800/20 to-slate-900/20 rounded-2xl"></div>
                        <div className="relative p-6 rounded-2xl border border-slate-600/20">
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-3 gap-6">
                                {tickets.slice(0, 6).map((ticket, index) => (
                                    <div 
                                        key={ticket.TicketID} 
                                        className="transform hover:scale-101 transition-all duration-300 hover:z-8 relative"
                                        style={{
                                            animationDelay: `${index * 100}ms`
                                        }}
                                    >
                                        <div className="animate-fade-in-up">
                                            <TicketCard ticket={ticket} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Animaciones CSS personalizadas */}
            <style jsx>{`
                @keyframes fade-in-up {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                .animate-fade-in-up {
                    animation: fade-in-up 0.6s ease-out forwards;
                }
                
                @keyframes float-gentle {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-5px); }
                }
                
                .animate-float-gentle {
                    animation: float-gentle 3s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};

export default DashboardPage;