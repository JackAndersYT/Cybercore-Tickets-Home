import React, { useState, useEffect, useContext } from 'react';
import socket from '../services/socket'; // Import socket
import ticketService from '../services/ticketService';
import TicketCard from '../components/tickets/TicketCard';
import { NotificationContext } from '../context/NotificationContext';
import { AuthContext } from '../context/AuthContext';
import Modal from '../components/ui/Modal';
import { ArrowLeft, ArrowRight, Search, ChevronDown, RotateCcw, Filter, Ticket, Zap, Calendar, FileText, Plus, Users, CheckCircle, AlertCircle, Activity, Shield } from 'lucide-react';

const TicketListPage = () => {
    const { user } = useContext(AuthContext);
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { notification } = useContext(NotificationContext);
    
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    
    const [filters, setFilters] = useState({
        searchTerm: '',
        status: 'Todos',
        dateFrom: '',
        dateTo: '',
    });
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [refreshKey, setRefreshKey] = useState(0); // State to trigger refresh

    // Estados para el modal de registro
    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
    const [registerFormData, setRegisterFormData] = useState({
        title: '',
        description: '',
        assignedtoarea: ''
    });
    const [registerFormErrors, setRegisterFormErrors] = useState({});
    const [registerLoading, setRegisterLoading] = useState(false);

    const fetchTickets = async (page, currentFilters) => {
        try {
            setLoading(true);
            const data = await ticketService.getAll(page, currentFilters);
            setTickets(data.tickets);
            setTotalPages(data.totalPages);
            setCurrentPage(data.currentPage);
        } catch (err) {
            setError('No se pudieron cargar los tickets.');
        } finally {
            setLoading(false);
        }
    };
    
    // Debounce para el término de búsqueda
    useEffect(() => {
        const timerId = setTimeout(() => {
            setDebouncedSearchTerm(filters.searchTerm);
        }, 300);
        return () => clearTimeout(timerId);
    }, [filters.searchTerm]);

    // Efecto principal que maneja filtros, paginación y refresco por socket
    useEffect(() => {
        const hasActiveFilters = debouncedSearchTerm !== '' || 
                                filters.status !== 'Todos' || 
                                filters.dateFrom !== '' || 
                                filters.dateTo !== '';
        
        if (hasActiveFilters && currentPage !== 1) {
            setCurrentPage(1);
            return;
        }
        
        fetchTickets(currentPage, { ...filters, searchTerm: debouncedSearchTerm });
    }, [debouncedSearchTerm, filters.status, filters.dateFrom, filters.dateTo, currentPage, refreshKey]); // Added refreshKey

    // Efecto para escuchar eventos de socket
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
    }, [user]); // Depend on user to access their role and area

    // Refrescar cuando hay notificaciones (del NotificationContext)
    useEffect(() => {
        if (notification) {
            fetchTickets(currentPage, { ...filters, searchTerm: debouncedSearchTerm });
        }
    }, [notification]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleClearFilters = () => {
        setFilters({ searchTerm: '', status: 'Todos', dateFrom: '', dateTo: '' });
    };

    const handlePageChange = (newPage) => {
        if (newPage > 0 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    // Funciones para el modal de registro
    const getAreaOptions = () => {
        if (!user) return [];
        if (user.Area === 'Contabilidad') {
            return ['Soporte'];
        }
        return ['Soporte', 'Contabilidad'];
    };

    const handleRegisterClick = () => {
        setRegisterFormErrors({});
        setIsRegisterModalOpen(true);
    };

    const handleCloseRegisterModal = () => {
        setIsRegisterModalOpen(false);
        setRegisterFormData({ title: '', description: '', assignedtoarea: '' });
        setRegisterFormErrors({});
    };

    const handleRegisterFormChange = (e) => {
        const { name, value } = e.target;
        setRegisterFormData(prev => ({ ...prev, [name]: value }));
        setRegisterFormErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[name];
            return newErrors;
        });
    };

    const handleRegisterTicket = async (e) => {
        e.preventDefault();
        setRegisterFormErrors({});
        setRegisterLoading(true);

        try {
            await ticketService.create(registerFormData);
            handleCloseRegisterModal();
            setError('');
            // Always refresh for the user who created the ticket.
            // Others (admins, assigned area) will be updated via socket.
            fetchTickets(1, { ...filters, searchTerm: debouncedSearchTerm });
        } catch (err) {
            const apiError = err.response?.data?.msg || 'Error al registrar el ticket.';
            setRegisterFormErrors({ form: apiError });
        } finally {
            setRegisterLoading(false);
        }
    };

    if (loading && tickets.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-96">
                <div className="text-center space-y-6">
                    <div className="relative mx-auto w-24 h-24">
                        <div className="absolute inset-0 border-4 border-slate-700/30 rounded-full"></div>
                        <div className="absolute inset-2 border-4 border-r-cyan-400 border-t-indigo-400 border-l-transparent border-b-transparent rounded-full animate-spin"></div>
                        <div className="absolute inset-4 bg-gradient-to-r from-cyan-400 to-indigo-500 rounded-full flex items-center justify-center shadow-lg">
                            <Ticket className="w-8 h-8 text-slate-900 animate-pulse" />
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <div className="text-xl font-semibold bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">
                            Cargando Tickets
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

    if (error) {
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
                        <div className="text-lg font-semibold text-red-400">{error}</div>
                        <div className="text-sm text-slate-400">No se pudieron cargar los datos</div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header rediseñado - estilo MainLayout */}
            <div className="relative">
    {/* Layout Desktop */}
    <div className="hidden sm:flex items-center space-x-6 mb-6">
        <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-indigo-500 rounded-2xl blur-lg opacity-60 animate-pulse"></div>
            <div className="relative w-16 h-16 bg-gradient-to-br from-slate-800 to-slate-900 p-4 rounded-2xl border border-cyan-400/40">
                <Ticket className="w-8 h-8 text-cyan-400" />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-slate-900">
                    <div className="w-full h-full bg-emerald-400 rounded-full animate-ping"></div>
                </div>
            </div>
        </div>
        
        <div className="flex-1">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
                Gestión de Tickets
            </h1>
            <div className="flex items-center space-x-3 mt-2">
                <div className="flex items-center space-x-2">
                    <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
                    <span className="text-sm text-slate-400 uppercase tracking-wider">Sistema Activo</span>
                </div>
                <div className="w-1 h-1 bg-slate-500 rounded-full"></div>
                <span className="text-xs text-slate-500 font-mono">
                    {tickets.length} ticket{tickets.length !== 1 ? 's' : ''} encontrados
                </span>
            </div>
        </div>

        <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 to-teal-400/20 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
            <button 
                onClick={handleRegisterClick}
                className="relative flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold rounded-xl transition-all duration-300 hover:scale-105 border border-emerald-400/20 hover:border-emerald-400/40"
            >
                <Plus className="w-5 h-5" />
                <span>Nuevo Ticket</span>
            </button>
        </div>
    </div>

    {/* Layout Mobile */}
    <div className="sm:hidden space-y-4 mb-6">
        <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
                <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-indigo-500 rounded-xl blur-lg opacity-60 animate-pulse"></div>
                    <div className="relative w-12 h-12 bg-gradient-to-br from-slate-800 to-slate-900 p-3 rounded-xl border border-cyan-400/40">
                        <Ticket className="w-6 h-6 text-cyan-400" />
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-900">
                            <div className="w-full h-full bg-emerald-400 rounded-full animate-ping"></div>
                        </div>
                    </div>
                </div>
                
                <div>
                    <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
                        Gestión de Tickets
                    </h1>
                    <div className="flex items-center space-x-2 mt-1">
                        <Activity className="w-3 h-3 text-emerald-400 animate-pulse" />
                        <span className="text-xs text-slate-400 uppercase tracking-wider">Sistema Activo</span>
                    </div>
                </div>
            </div>

            <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 to-teal-400/20 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                <button 
                    onClick={handleRegisterClick}
                    className="relative flex items-center justify-center w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold rounded-xl transition-all duration-300 hover:scale-105 border border-emerald-400/20 hover:border-emerald-400/40"
                >
                    <Plus className="w-5 h-5" />
                </button>
            </div>
        </div>

        <div className="text-center">
            <span className="text-xs text-slate-500 font-mono">
                {tickets.length} ticket{tickets.length !== 1 ? 's' : ''} encontrados
            </span>
        </div>
    </div>

    <div className="h-px bg-gradient-to-r from-transparent via-slate-600/50 to-transparent"></div>
</div>

            {/* Panel de filtros rediseñado - estilo MainLayout */}
            <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-800/40 to-slate-900/40 rounded-3xl backdrop-blur-xl"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400/5 to-pink-400/5 rounded-3xl"></div>
                <div className="absolute inset-0 border border-slate-600/30 rounded-3xl group-hover:border-purple-400/40 transition-colors duration-500"></div>
                
                <div className="relative p-6">
                    <div className="flex items-center space-x-4 mb-6">
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-500 rounded-xl blur-md opacity-50"></div>
                            <div className="relative w-12 h-12 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl flex items-center justify-center border border-purple-400/30">
                                <Filter className="w-6 h-6 text-purple-400" />
                            </div>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white">Filtros de Búsqueda</h3>
                            <p className="text-sm text-slate-400">Personaliza la vista de tickets</p>
                        </div>
                        <div className="flex space-x-2 ml-auto">
                            <div className="w-3 h-3 bg-purple-400 rounded-full animate-pulse"></div>
                            <div className="w-3 h-3 bg-pink-400 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                        {/* Campo de búsqueda */}
                        <div className="md:col-span-2 xl:col-span-2">
                            <label className="text-sm font-medium text-slate-300 mb-2 flex items-center space-x-2">
                                <Search className="w-4 h-4 text-cyan-400" />
                                <span>Buscar Ticket</span>
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 to-blue-400/20 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                                <input 
                                    type="text"
                                    name="searchTerm"
                                    placeholder="Título del ticket..."
                                    value={filters.searchTerm}
                                    onChange={handleFilterChange}
                                    className="relative w-full px-4 py-3 bg-slate-800/60 backdrop-blur-sm border border-slate-600/40 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/40 transition-all duration-300"
                                />
                            </div>
                        </div>

                        {/* Selector de estado */}
                        <div>
                            <label className="text-sm font-medium text-slate-300 mb-2 flex items-center space-x-2">
                                <CheckCircle className="w-4 h-4 text-emerald-400" />
                                <span>Estado</span>
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 to-teal-400/20 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                                <select 
                                    name="status" 
                                    value={filters.status} 
                                    onChange={handleFilterChange} 
                                    className="relative w-full px-4 py-3 bg-slate-800/60 backdrop-blur-sm border border-slate-600/40 rounded-xl text-white appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400/40 transition-all duration-300"
                                >
                                    <option value="Todos" className="bg-slate-800">Todos</option>
                                    <option value="Abierto" className="bg-slate-800">Abierto</option>
                                    <option value="En Revisión" className="bg-slate-800">En Revisión</option>
                                    <option value="Resuelto" className="bg-slate-800">Resuelto</option>
                                    <option value="Cerrado" className="bg-slate-800">Cerrado</option>
                                    <option value="Cancelado" className="bg-slate-800">Cancelado</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400 pointer-events-none"/>
                            </div>
                        </div>

                        {/* Fecha desde */}
                        <div>
                            <label className="text-sm font-medium text-slate-300 mb-2 flex items-center space-x-2">
                                <Calendar className="w-4 h-4 text-yellow-400" />
                                <span>Desde</span>
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 to-orange-400/20 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                                <input 
                                    type="date" 
                                    name="dateFrom" 
                                    value={filters.dateFrom} 
                                    onChange={handleFilterChange} 
                                    className="relative w-full px-4 py-3 bg-slate-800/60 backdrop-blur-sm border border-slate-600/40 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/40 transition-all duration-300"
                                />
                            </div>
                        </div>

                        {/* Fecha hasta */}
                        <div>
                            <label className="text-sm font-medium text-slate-300 mb-2 flex items-center space-x-2">
                                <Calendar className="w-4 h-4 text-orange-400" />
                                <span>Hasta</span>
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-0 bg-gradient-to-r from-orange-400/20 to-red-400/20 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                                <input 
                                    type="date" 
                                    name="dateTo" 
                                    value={filters.dateTo} 
                                    onChange={handleFilterChange} 
                                    className="relative w-full px-4 py-3 bg-slate-800/60 backdrop-blur-sm border border-slate-600/40 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400/40 transition-all duration-300"
                                />
                            </div>
                        </div>

                        {/* Botón limpiar */}
                        <div className="flex items-end">
                            <div className="relative group w-full">
                                <div className="absolute inset-0 bg-gradient-to-r from-slate-600/20 to-slate-500/20 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                <button 
                                    onClick={handleClearFilters} 
                                    className="relative w-full px-4 py-3 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-600/40 hover:border-slate-500/60 rounded-xl text-slate-300 hover:text-white transition-all duration-300 flex items-center justify-center space-x-2"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                    <span className="hidden sm:inline">Limpiar</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Contenido principal */}
            {tickets.length === 0 ? (
                <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-800/40 to-slate-900/40 rounded-3xl backdrop-blur-xl"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-600/5 to-slate-700/5 rounded-3xl"></div>
                    <div className="absolute inset-0 border border-slate-600/30 rounded-3xl"></div>
                    
                    <div className="relative p-12 text-center">
                        <div className="relative mx-auto w-20 h-20 mb-6">
                            <div className="absolute inset-0 bg-slate-600/20 rounded-full blur-lg"></div>
                            <div className="relative w-20 h-20 bg-gradient-to-br from-slate-700 to-slate-800 rounded-full flex items-center justify-center border border-slate-600/50">
                                <Ticket className="w-10 h-10 text-slate-400" />
                            </div>
                        </div>
                        
                        <h3 className="text-xl font-semibold text-slate-300 mb-2">No hay tickets disponibles</h3>
                        <p className="text-slate-500 mb-6">No se encontraron tickets que coincidan con los filtros</p>
                        
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tickets.map((ticket, index) => (
                        <div 
                            key={ticket.TicketID} 
                            className="transform hover:scale-101 transition-all duration-300"
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
            )}

            {/* Paginación rediseñada - estilo MainLayout */}
            {totalPages > 1 && (
                <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-800/40 to-slate-900/40 rounded-3xl backdrop-blur-xl"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/5 to-purple-400/5 rounded-3xl"></div>
                    <div className="absolute inset-0 border border-slate-600/30 rounded-3xl group-hover:border-cyan-400/40 transition-colors duration-500"></div>
                    
                    <div className="relative p-6">
                        <div className="flex items-center justify-between">
                            {/* Botón anterior */}
                            <div className="relative group">
                                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 to-blue-400/20 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                                <button
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className="relative flex items-center space-x-2 px-4 py-2 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-600/40 hover:border-cyan-400/40 rounded-xl text-slate-300 hover:text-cyan-300 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ArrowLeft className="w-5 h-5" />
                                    <span className="hidden sm:inline">Anterior</span>
                                </button>
                            </div>

                            {/* Información central */}
                            <div className="flex items-center space-x-6">
                                <div className="text-center">
                                    <div className="text-lg font-bold text-cyan-400 font-mono">
                                        {currentPage} de {totalPages}
                                    </div>
                                    <div className="text-xs text-slate-500 uppercase tracking-wider">
                                        Páginas
                                    </div>
                                </div>
                                
                                {/* Indicadores de página */}
                                <div className="hidden md:flex items-center space-x-2">
                                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                        const page = i + 1;
                                        const isActive = page === currentPage;
                                        return (
                                            <button
                                                key={page}
                                                onClick={() => handlePageChange(page)}
                                                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                                                    isActive 
                                                        ? 'bg-gradient-to-r from-cyan-400 to-purple-400 scale-125' 
                                                        : 'bg-slate-600/50 hover:bg-slate-500/70'
                                                }`}
                                            />
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Botón siguiente */}
                            <div className="relative group">
                                <div className="absolute inset-0 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                                <button
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    className="relative flex items-center space-x-2 px-4 py-2 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-600/40 hover:border-purple-400/40 rounded-xl text-slate-300 hover:text-purple-300 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <span className="hidden sm:inline">Siguiente</span>
                                    <ArrowRight className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal para registrar nuevo ticket - estilo mejorado */}
            <Modal isOpen={isRegisterModalOpen} onClose={handleCloseRegisterModal} title="Registrar Nuevo Ticket">
                <form onSubmit={handleRegisterTicket} className="space-y-6">
                    {registerFormErrors.form && (
                        <div className="relative group">
                            <div className="absolute inset-0 bg-gradient-to-r from-red-400/20 to-pink-400/20 rounded-xl blur-md"></div>
                            <div className="relative p-4 bg-slate-800/60 border border-red-400/40 rounded-xl backdrop-blur-sm">
                                <div className="flex items-center space-x-3">
                                    <div className="relative">
                                        <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                                        <div className="absolute inset-0 bg-red-400 rounded-full animate-ping opacity-30"></div>
                                    </div>
                                    <span className="text-sm text-red-300 font-medium">{registerFormErrors.form}</span>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* Campo Título */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-slate-300 flex items-center space-x-2">
                            <FileText className="w-4 h-4 text-cyan-400" />
                            <span>Título del Ticket</span>
                        </label>
                        <div className="relative group">
                            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 to-blue-400/20 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                            <input
                                type="text"
                                name="title"
                                value={registerFormData.title}
                                onChange={handleRegisterFormChange}
                                required
                                placeholder="Título descriptivo del problema..."
                                className="relative w-full px-4 py-3 bg-slate-800/60 backdrop-blur-sm border border-slate-600/40 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/40 transition-all duration-300"
                            />
                        </div>
                    </div>

                    {/* Campo Descripción */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-slate-300 flex items-center space-x-2">
                            <FileText className="w-4 h-4 text-cyan-400" />
                            <span>Descripción</span>
                        </label>
                        <div className="relative group">
                            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 to-blue-400/20 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                            <textarea
                                name="description"
                                rows="5"
                                value={registerFormData.description}
                                onChange={handleRegisterFormChange}
                                required
                                placeholder="Describe detalladamente el problema o solicitud..."
                                className="relative w-full px-4 py-3 bg-slate-800/60 backdrop-blur-sm border border-slate-600/40 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/40 transition-all duration-300 resize-none"
                            />
                        </div>
                    </div>

                    {/* Campo Área Asignada */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-slate-300 flex items-center space-x-2">
                            <Users className="w-4 h-4 text-cyan-400" />
                            <span>Asignar a Área</span>
                        </label>
                        <div className="relative group">
                            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 to-blue-400/20 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                            <select
                                name="assignedtoarea"
                                value={registerFormData.assignedtoarea}
                                onChange={handleRegisterFormChange}
                                required
                                className="relative w-full px-4 py-3 bg-slate-800/60 backdrop-blur-sm border border-slate-600/40 rounded-xl text-white appearance-none focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/40 transition-all duration-300"
                            >
                                <option value="" disabled className="bg-slate-800">
                                    Seleccione un área responsable...
                                </option>
                                {getAreaOptions().map(option => (
                                    <option key={option} value={option} className="bg-slate-800">
                                        {option}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-cyan-400 pointer-events-none" />
                        </div>
                    </div>

                    {/* Botones de acción */}
                    <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4 pt-6">
                        <div className="relative group">
                            <div className="absolute inset-0 bg-gradient-to-r from-slate-600/20 to-slate-500/20 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <button 
                                type="button" 
                                onClick={handleCloseRegisterModal}
                                className="relative w-full sm:w-auto px-6 py-3 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-600/40 hover:border-slate-500/60 rounded-xl text-slate-300 hover:text-white transition-all duration-300"
                            >
                                Cancelar
                            </button>
                        </div>
                        
                        <div className="relative group">
                            <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 to-teal-400/20 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                            <button
                                type="submit"
                                disabled={registerLoading}
                                className="relative w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold rounded-xl transition-all duration-300 hover:scale-105 disabled:opacity-60 disabled:scale-100 disabled:cursor-not-allowed border border-emerald-400/20 hover:border-emerald-400/40"
                            >
                                <div className="flex items-center justify-center space-x-2">
                                    {registerLoading ? (
                                        <>
                                            <div className="relative w-5 h-5">
                                                <div className="absolute inset-0 border-2 border-white/20 rounded-full"></div>
                                                <div className="absolute inset-0 border-2 border-t-white rounded-full animate-spin"></div>
                                            </div>
                                            <span>Registrando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="w-5 h-5" />
                                            <span>Registrar Ticket</span>
                                        </>
                                    )}
                                </div>
                            </button>
                        </div>
                    </div>
                </form>
            </Modal>

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
            `}</style>
        </div>
    );
};

export default TicketListPage;