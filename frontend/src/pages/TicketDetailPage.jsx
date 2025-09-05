import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ticketService from '../services/ticketService';
import { AuthContext } from '../context/AuthContext';
import Modal from '/src/components/ui/Modal.jsx';
import TicketChat from '../components/tickets/TicketChat';
import socket from '../services/socket';
import { Bell, FileText, User, Calendar, Building, Settings, CheckCircle, AlertCircle, Maximize2, X, MessageCircle, Shield, Activity, Zap, Edit, Clock, Trash2 } from 'lucide-react';

const TicketDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const [ticket, setTicket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [newStatus, setNewStatus] = useState('');
    const [isChatExpanded, setIsChatExpanded] = useState(false);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editFormData, setEditFormData] = useState({ title: '', description: '' });
    const [editFormErrors, setEditFormErrors] = useState({});
    const [editLoading, setEditLoading] = useState(false);

    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [cancelLoading, setCancelLoading] = useState(false);

    const [onlineUsers, setOnlineUsers] = useState([]);
    const [isSocketConnected, setIsSocketConnected] = useState(socket.connected);
    const [isJoinedToRoom, setIsJoinedToRoom] = useState(false);

    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const fetchTicket = async () => {
        try {
            const data = await ticketService.getById(id);
            setTicket(data);
            setNewStatus(data.Status);
            setEditFormData({ title: data.Title, description: data.Description });
        } catch (err) {
            setError(err.response?.data?.msg || 'No se pudo cargar el ticket.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setLoading(true);
        fetchTicket();
    }, [id]);

    // Mejorar el manejo del scroll cuando el chat está expandido
    useEffect(() => {
        if (isChatExpanded && isMobile) {
            // Prevenir scroll del body y forzar altura completa
            document.body.style.overflow = 'hidden';
            document.body.style.height = '100vh';
            document.documentElement.style.height = '100vh';
            
            return () => {
                document.body.style.overflow = 'unset';
                document.body.style.height = 'auto';
                document.documentElement.style.height = 'auto';
            };
        }
    }, [isChatExpanded, isMobile]);

    useEffect(() => {
        if (!ticket || !user) return;

        const joinTicketRoom = () => {
            if (!isJoinedToRoom && socket.connected) {
                console.log(`[PARENT] Joining room for ticket ${id}`);
                socket.emit('joinTicketRoom', { ticketId: id, user });
                setIsJoinedToRoom(true);
            }
        };

        const leaveTicketRoom = () => {
            if (isJoinedToRoom) {
                console.log(`[PARENT] Leaving room for ticket ${id}`);
                socket.emit('leaveTicketRoom', id);
                setIsJoinedToRoom(false);
            }
        };

        if (!socket.connected) {
            socket.connect();
        } else {
            joinTicketRoom();
        }
        
        const onConnect = () => {
            console.log('[PARENT] Socket connected');
            setIsSocketConnected(true);
            joinTicketRoom();
        };
        
        const onDisconnect = () => {
            console.log('[PARENT] Socket disconnected');
            setIsSocketConnected(false);
            setIsJoinedToRoom(false);
        };

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);

        const handleRoomUsersUpdate = (usersInRoom) => {
            console.log('[PARENT] Room users update:', usersInRoom);
            setOnlineUsers(usersInRoom);
        };

        socket.on('roomUsersUpdate', handleRoomUsersUpdate);

        return () => {
            leaveTicketRoom();
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('roomUsersUpdate', handleRoomUsersUpdate);
        };
    }, [id, ticket, user, isJoinedToRoom]);

    const handleStatusUpdate = async () => {
        try {
            const response = await ticketService.updateStatus(id, newStatus);
            setSuccess(response.msg);
            fetchTicket(); 
        } catch (err) {
            setError(err.response?.data?.msg || 'No se pudo actualizar el estado.');
        }
    };

    const handleEditClick = () => {
        setEditFormErrors({});
        setIsEditModalOpen(true);
    };

    const handleEditFormChange = (e) => {
        const { name, value } = e.target;
        setEditFormData(prev => ({ ...prev, [name]: value }));
        setEditFormErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[name];
            return newErrors;
        });
    };

    const handleUpdateTicket = async (e) => {
        e.preventDefault();
        setEditFormErrors({});
        setEditLoading(true);
        try {
            const response = await ticketService.update(id, editFormData);
            setSuccess(response.msg);
            setIsEditModalOpen(false);
            fetchTicket();
        } catch (err) {
            setEditFormErrors({ form: err.response?.data?.msg || 'Error al actualizar.' });
        } finally {
            setEditLoading(false);
        }
    };

    const handleCancelClick = () => {
        setIsCancelModalOpen(true);
    };

    const handleConfirmCancel = async () => {
        setCancelLoading(true);
        try {
            await ticketService.cancel(id);
            navigate('/tickets');
        } catch (err) {
            setError(err.response?.data?.msg || 'No se pudo cancelar el ticket.');
            setIsCancelModalOpen(false);
        } finally {
            setCancelLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-96">
                <div className="text-center space-y-6">
                    <div className="relative mx-auto w-24 h-24">
                        <div className="absolute inset-0 border-4 border-slate-700/30 rounded-full"></div>
                        <div className="absolute inset-2 border-4 border-r-cyan-400 border-t-indigo-400 border-l-transparent border-b-transparent rounded-full animate-spin"></div>
                        <div className="absolute inset-4 bg-gradient-to-r from-cyan-400 to-indigo-500 rounded-full flex items-center justify-center shadow-lg">
                            <FileText className="w-8 h-8 text-slate-900 animate-pulse" />
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <div className="text-xl font-semibold bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">
                            Cargando Ticket
                        </div>
                        <div className="text-sm text-slate-400 tracking-wide">
                            Obteniendo información del sistema...
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

    if (error && !ticket) {
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
                        <div className="text-lg font-semibold text-red-400">Error al cargar ticket</div>
                        <div className="text-sm text-slate-400">{error}</div>
                    </div>
                </div>
            </div>
        );
    }

    if (!ticket) return null;

    const canEditTicket = user && ticket && ticket.Status === 'Abierto' && (ticket.CreatedByUserID === user.UserID || user.Role === 'Administrador');
    const canCancelTicket = canEditTicket;
    const canUpdateStatus = user && 
                            (user.Area === 'Soporte' || user.Area === 'Contabilidad') && 
                            ticket.AssignedToArea === user.Area;

    const statusOptions = ['Abierto', 'En Revisión', 'Resuelto'];

    const getStatusColor = (status) => {
        switch(status) {
            case 'Abierto': return { style: 'from-red-500 to-pink-500', Icon: AlertCircle };
            case 'En Revisión': return { style: 'from-yellow-500 to-orange-500', Icon: Clock };
            case 'Resuelto': return { style: 'from-emerald-500 to-teal-500', Icon: CheckCircle };
            case 'Cerrado': return { style: 'from-slate-500 to-slate-400', Icon: Shield };
            default: return { style: 'from-cyan-500 to-indigo-500', Icon: Zap };
        }
    };

    const StatusBadge = React.memo(({status}) => {
        const { style, Icon } = getStatusColor(status);
        return (
            <div className={`px-4 py-2 bg-gradient-to-r ${style} text-white font-bold rounded-xl shadow-lg text-sm sm:text-base flex items-center space-x-2`}>
                <Icon className="w-4 h-4" />
                <span>{status}</span>
            </div>
        );
    });

    // Componente del chat expandido para móvil - CORREGIDO PARA OCUPAR TODA LA PANTALLA
    const ExpandedChatModal = () => (
        <div className="fixed top-0 left-0 right-0 bottom-0 z-50 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 flex flex-col md:hidden"
             style={{ 
                 //height: '100vh', 
                 height: '100dvh', // Usa dynamic viewport height para móviles modernos
                 width: '100vw',
                 position: 'fixed',
                 top: 0,
                 left: 0
             }}>
            {/* Efectos de fondo en modal */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -left-40 w-80 h-80 bg-cyan-400/3 rounded-full blur-3xl animate-float"></div>
                <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-400/3 rounded-full blur-3xl animate-float-delayed"></div>
            </div>

            {/* Header fijo - optimizado para móvil */}
            <div className="relative flex-shrink-0 flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-900/95 via-slate-800/95 to-slate-900/95 border-b border-cyan-400/20 backdrop-blur-sm">
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 to-indigo-400/20 rounded-xl blur-md"></div>
                        <div className="relative p-2 bg-slate-800/60 backdrop-blur-sm border border-slate-600/40 rounded-xl">
                            <MessageCircle className="w-5 h-5 text-cyan-400" />
                        </div>
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent truncate">
                            Chat - Ticket #{id}
                        </h3>
                        <p className="text-xs text-slate-400 truncate tracking-wide">{ticket.Title}</p>
                    </div>
                </div>
                <button
                    onClick={() => setIsChatExpanded(false)}
                    className="relative group p-2 bg-slate-800/60 backdrop-blur-sm border border-slate-600/40 text-slate-300 rounded-xl hover:text-white hover:border-slate-500/60 transition-all duration-300 flex-shrink-0 ml-2"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-red-400/20 to-pink-400/20 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                    <X className="relative w-6 h-6" />
                </button>
            </div>

            {/* Contenedor del chat que ocupa el resto del espacio disponible */}
            <div className="relative flex-1 min-h-0 w-full overflow-hidden">
                <TicketChat 
                    ticketId={id} 
                    ticketStatus={ticket.Status}
                    isExpanded={true}
                    onlineUsers={onlineUsers}
                    isSocketConnected={isSocketConnected}
                    disableSocketManagement={true}
                />
            </div>
        </div>
    );

    return (
        <div className="space-y-8">
            {/* Header del Ticket - estilo Dashboard original */}
            <div className="relative">
                <div className="flex items-center space-x-6 mb-6">
                    <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-indigo-500 rounded-2xl blur-lg opacity-60 animate-pulse"></div>
                        <div className="relative w-16 h-16 bg-gradient-to-br from-slate-800 to-slate-900 p-4 rounded-2xl border border-cyan-400/40">
                            <FileText className="w-8 h-8 text-cyan-400" />
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-slate-900">
                                <div className="w-full h-full bg-emerald-400 rounded-full animate-ping"></div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex-1">
                        <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
                            {ticket.Title}
                        </h1>
                        <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-3 mt-2">
                            <div className="flex items-center space-x-2">
                                <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
                                <span className="text-sm text-slate-400 uppercase tracking-wider">Ticket #{id}</span>
                            </div>
                            <div className="hidden sm:block w-1 h-1 bg-slate-500 rounded-full"></div>
                            <span className="text-xs text-slate-500 font-mono">
                                {new Date(ticket.CreatedAt).toLocaleDateString('es-ES', { 
                                    weekday: 'short', 
                                    year: 'numeric', 
                                    month: 'short', 
                                    day: 'numeric' 
                                })}
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-3">
                        <StatusBadge status={ticket.Status} />
                        
                        {/* Botones de acción */}
                        <div className="flex items-center space-x-2">
                            {canEditTicket && (
                                <button 
                                    onClick={handleEditClick}
                                    className="flex items-center justify-center space-x-2 h-10 px-3 sm:px-4 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 hover:from-amber-500/30 hover:to-yellow-500/30 border border-amber-400/40 hover:border-amber-400/60 rounded-xl text-amber-300 hover:text-amber-200 transition-all duration-300 hover:scale-105 backdrop-blur-sm"
                                    title="Editar ticket"
                                >
                                    <Edit className="w-4 h-4 flex-shrink-0" />
                                    <span className="hidden sm:inline text-sm font-medium whitespace-nowrap">Editar</span>
                                </button>
                            )}
                            
                            {canCancelTicket && (
                                <button 
                                    onClick={handleCancelClick}
                                    className="flex items-center justify-center space-x-2 h-10 px-3 sm:px-4 bg-gradient-to-r from-red-500/20 to-rose-500/20 hover:from-red-500/30 hover:to-rose-500/30 border border-red-400/40 hover:border-red-400/60 rounded-xl text-red-300 hover:text-red-200 transition-all duration-300 hover:scale-105 backdrop-blur-sm"
                                    title="Cancelar ticket"
                                >
                                    <Trash2 className="w-4 h-4 flex-shrink-0"/>
                                    <span className="hidden sm:inline text-sm font-medium whitespace-nowrap">Cancelar</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Línea divisoria con efecto */}
                <div className="h-px bg-gradient-to-r from-transparent via-slate-600/50 to-transparent"></div>
            </div>

            {/* Mensajes de estado */}
            {success && (
                <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 to-green-400/20 rounded-2xl blur-md opacity-60"></div>
                    <div className="relative p-4 bg-slate-800/60 backdrop-blur-sm border border-emerald-400/40 rounded-2xl">
                        <div className="flex items-center space-x-3">
                            <CheckCircle className="w-5 h-5 text-emerald-400" />
                            <span className="text-emerald-300 font-medium tracking-wide">{success}</span>
                        </div>
                    </div>
                </div>
            )}

            {error && (
                <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-red-400/20 to-pink-400/20 rounded-2xl blur-md opacity-60"></div>
                    <div className="relative p-4 bg-slate-800/60 backdrop-blur-sm border border-red-400/40 rounded-2xl">
                        <div className="flex items-center space-x-3">
                            <AlertCircle className="w-5 h-5 text-red-400" />
                            <span className="text-red-300 font-medium tracking-wide">{error}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Layout principal responsivo */}
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
                
                {/* Área principal - Chat con responsividad CORREGIDA */}
                <div className="xl:col-span-3 order-2 xl:order-1">
                    <div className="relative group">
                        {/* Fondo con glassmorphism */}
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-800/40 to-slate-900/40 rounded-3xl backdrop-blur-xl"></div>
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-400/5 to-cyan-400/5 rounded-3xl"></div>
                        <div className="absolute inset-0 border border-slate-600/30 rounded-3xl group-hover:border-purple-400/40 transition-colors duration-500"></div>
                        
                        {/* ALTURA RESPONSIVA CORREGIDA */}
                        <div className="relative p-4 sm:p-8 flex flex-col h-96 lg:h-[500px] xl:h-full">
                            {/* Header del chat */}
                            <div className="flex items-center justify-between mb-4 sm:mb-8 flex-shrink-0">
                                <div className="flex items-center space-x-4">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-cyan-500 rounded-xl blur-md opacity-50"></div>
                                        <div className="relative w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl flex items-center justify-center border border-purple-400/30">
                                            <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-lg sm:text-xl font-bold text-white">Chat del Ticket</h3>
                                        <p className="text-xs sm:text-sm text-slate-400">
                                            {isMobile ? 'Toca expandir para chatear' : 'Comunicación en tiempo real'}
                                        </p>
                                    </div>
                                </div>
                                
                                <div className="flex items-center space-x-3">
                                    {/* Botón expandir chat - visible solo en móvil/tablet */}
                                    <button
                                        onClick={() => setIsChatExpanded(true)}
                                        className="lg:hidden p-2 bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 hover:from-cyan-500/30 hover:to-indigo-500/30 border border-cyan-400/40 hover:border-cyan-400/60 text-cyan-400 rounded-xl transition-all duration-300 hover:scale-105 backdrop-blur-sm"
                                        title="Expandir chat"
                                    >
                                        <Maximize2 className="w-5 h-5" />
                                    </button>
                                    <div className="hidden sm:flex space-x-2">
                                        <div className="w-3 h-3 bg-purple-400 rounded-full animate-pulse"></div>
                                        <div className="w-3 h-3 bg-cyan-400 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
                                    </div>
                                </div>
                            </div>

                            {/* Contenedor del chat con altura dinámica */}
                            <div className="flex-1 min-h-0 overflow-hidden">
                                {isMobile ? (
                                    // En móvil: mostrar solo preview del chat con mensaje para expandir
                                    <div className="h-full flex flex-col items-center justify-center space-y-4 text-center px-4">
                                        <div className="relative">
                                            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 to-indigo-400/20 rounded-full blur-lg"></div>
                                            <div className="relative w-16 h-16 bg-slate-800/60 backdrop-blur-sm border border-cyan-400/40 rounded-full flex items-center justify-center">
                                                <MessageCircle className="w-8 h-8 text-cyan-400 animate-pulse" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <h4 className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">
                                                Chat disponible
                                            </h4>
                                            <p className="text-sm text-slate-400">
                                                Toca el botón de expandir para abrir el chat completo
                                            </p>
                                            <div className="flex items-center justify-center space-x-2 mt-4">
                                                <div className="flex items-center space-x-1">
                                                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                                                    <span className="text-xs text-emerald-400 font-medium">
                                                        {onlineUsers.length} usuario{onlineUsers.length !== 1 ? 's' : ''} conectado{onlineUsers.length !== 1 ? 's' : ''}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    // En desktop: mostrar chat completo
                                    <TicketChat 
                                        ticketId={id}
                                        ticketStatus={ticket.Status}
                                        onlineUsers={onlineUsers}
                                        isSocketConnected={isSocketConnected}
                                        disableSocketManagement={true}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Panel lateral con información */}
                <div className="xl:col-span-2 order-1 xl:order-2 flex flex-col gap-8">
                    <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/20 to-blue-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                        <div className="relative bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl p-6 rounded-2xl border border-slate-600/30 hover:border-cyan-400/40 transition-all duration-500">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center">
                                        <FileText className="w-5 h-5 text-slate-900" />
                                    </div>
                                    <div>
                                        <h4 className="text-base sm:text-lg font-medium text-slate-300">Descripción</h4>
                                        <p className="text-xs text-slate-500">Información detallada</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-600/30 rounded-xl p-4">
                                <p className="text-slate-300 whitespace-pre-wrap leading-relaxed text-sm sm:text-base">{ticket.Description}</p>
                            </div>
                        </div>
                    </div>
                    
                    {/* Información del ticket */}
                    <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/20 to-blue-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                        <div className="relative bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl p-6 rounded-2xl border border-slate-600/30 hover:border-emerald-400/40 transition-all duration-500">
                                
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center">
                                            <Settings className="w-5 h-5 text-slate-900" />
                                        </div>
                                        <div>
                                            <h4 className="text-base sm:text-lg font-medium text-slate-300">Información</h4>
                                            <p className="text-xs text-slate-500">Detalles del sistema</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-slate-600/30">
                                        <div className="flex items-center space-x-2">
                                            <User className="w-4 h-4 text-cyan-400" />
                                            <span className="text-sm text-slate-400">Creado por</span>
                                        </div>
                                        <span className="text-sm sm:text-base font-medium text-white">{ticket.CreatedByFullName}</span>
                                    </div>

                                    <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-slate-600/30">
                                        <div className="flex items-center space-x-2">
                                            <Building className="w-4 h-4 text-emerald-400" />
                                            <span className="text-sm text-slate-400">Área asignada</span>
                                        </div>
                                        <span className="text-sm sm:text-base font-medium text-white">{ticket.AssignedToArea}</span>
                                    </div>

                                    <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-slate-600/30">
                                        <div className="flex items-center space-x-2">
                                            <Calendar className="w-4 h-4 text-yellow-400" />
                                            <span className="text-sm text-slate-400">Fecha de creación</span>
                                        </div>
                                        <span className="text-sm sm:text-base font-medium text-white font-mono">
                                            {new Date(ticket.CreatedAt).toLocaleDateString('es-ES')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Control de estado */}
                        {canUpdateStatus && ticket.Status !== 'Cerrado' && ticket.Status !== 'Cancelado' && (
                            <div className="relative group flex-1">
                                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl blur-xl opacity-60 group-hover:opacity-80 transition-all duration-500"></div>
                                <div className="relative bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl p-6 rounded-2xl border border-slate-600/30 hover:border-purple-400/40 transition-all duration-500">
                                    
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-pink-500 rounded-xl flex items-center justify-center">
                                                <Settings className="w-5 h-5 text-slate-900" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-medium text-slate-300">Control de Estado</h4>
                                                <p className="text-xs text-slate-500">Gestión del ticket</p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center space-x-2">
                                            <Zap className="w-4 h-4 text-purple-400 animate-pulse" />
                                            <span className="text-xs text-slate-400 uppercase tracking-wider">Activo</span>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-2">Estado actual</label>
                                            <select
                                                value={newStatus}
                                                onChange={(e) => setNewStatus(e.target.value)}
                                                className="w-full px-4 py-3 bg-slate-800/60 backdrop-blur-sm border border-slate-600/40 rounded-xl text-white focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20 transition-all duration-300 hover:border-slate-500/60 hover:bg-slate-700/40"
                                            >
                                                {statusOptions.map(status => (
                                                    <option key={status} value={status} className="bg-slate-800">
                                                        {status}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        
                                        <button
                                            onClick={handleStatusUpdate}
                                            disabled={loading || newStatus === ticket.Status}
                                            className="w-full py-4 px-6 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold rounded-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-60 disabled:scale-100 disabled:cursor-not-allowed border border-cyan-400/20 hover:border-cyan-400/40 shadow-lg shadow-cyan-500/20"
                                        >
                                            <div className="flex items-center justify-center space-x-3">
                                                {loading ? (
                                                    <>
                                                        <div className="relative w-5 h-5">
                                                            <div className="absolute inset-0 border-2 border-white/20 rounded-full"></div>
                                                            <div className="absolute inset-0 border-2 border-t-white rounded-full animate-spin"></div>
                                                        </div>
                                                        <span>Procesando...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <CheckCircle className="w-5 h-5" />
                                                        <span>Actualizar Estado</span>
                                                    </>
                                                )}
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

            {/* Modal de chat expandido - CORREGIDO PARA OCUPAR TODA LA PANTALLA */}
            {isChatExpanded && <ExpandedChatModal />}

            {/* Modal de edición */}
            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Editar Información del Ticket">
                <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-800/40 to-slate-900/40 rounded-3xl backdrop-blur-xl"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/5 to-indigo-400/5 rounded-3xl"></div>
                    <div className="absolute inset-0 border border-slate-600/30 rounded-3xl"></div>
                    <div className="relative p-6">
                        <form onSubmit={handleUpdateTicket} className="space-y-6">
                            {editFormErrors.form && (
                                <div className="relative group">
                                    <div className="absolute inset-0 bg-gradient-to-r from-red-400/20 to-pink-400/20 rounded-xl blur-md opacity-60"></div>
                                    <div className="relative p-4 bg-slate-800/60 backdrop-blur-sm border border-red-400/40 rounded-xl">
                                        <div className="flex items-center space-x-3">
                                            <AlertCircle className="w-5 h-5 text-red-400" />
                                            <span className="text-red-300 font-medium">{editFormErrors.form}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-cyan-400">Título del Ticket</label>
                                <input
                                    type="text"
                                    name="title"
                                    value={editFormData.title}
                                    onChange={handleEditFormChange}
                                    required
                                    className="w-full px-4 py-3 bg-slate-800/50 backdrop-blur-sm border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20 transition-all duration-300"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-cyan-400">Descripción Detallada</label>
                                <textarea
                                    name="description"
                                    rows="6"
                                    value={editFormData.description}
                                    onChange={handleEditFormChange}
                                    required
                                    className="w-full px-4 py-3 bg-slate-800/50 backdrop-blur-sm border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20 transition-all duration-300 resize-none"
                                />
                            </div>

                            <div className="flex justify-end pt-4 space-x-4">
                                <button 
                                    type="button" 
                                    onClick={() => setIsEditModalOpen(false)} 
                                    className="px-6 py-3 bg-slate-700/50 text-slate-300 rounded-xl hover:bg-slate-600/50 hover:text-white transition-all duration-300 font-medium"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={editLoading}
                                    className="relative px-8 py-3 bg-gradient-to-r from-cyan-500 to-indigo-500 text-white font-bold rounded-xl hover:shadow-2xl hover:shadow-cyan-500/25 transition-all duration-300 transform hover:scale-105 disabled:opacity-50"
                                >
                                    <div className="flex items-center justify-center space-x-2">
                                        {editLoading ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                <span>Guardando...</span>
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle className="w-5 h-5" />
                                                <span>Guardar Cambios</span>
                                            </>
                                        )}
                                    </div>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </Modal>

            {/* Modal de cancelación */}
            <Modal isOpen={isCancelModalOpen} onClose={() => setIsCancelModalOpen(false)} title="Confirmar Cancelación">
                <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-800/40 to-slate-900/40 rounded-3xl backdrop-blur-xl"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-red-400/5 to-pink-500/5 rounded-3xl"></div>
                    <div className="absolute inset-0 border border-slate-600/30 rounded-3xl"></div>
                    <div className="relative p-6 text-center space-y-6">
                        <div className="relative mx-auto w-16 h-16">
                            <div className="absolute inset-0 bg-red-400/20 rounded-full blur-lg animate-pulse"></div>
                            <div className="relative w-16 h-16 bg-slate-800 border-2 border-red-400/40 rounded-full flex items-center justify-center">
                                <Trash2 className="w-8 h-8 text-red-400" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <p className="text-slate-300 text-lg">
                                ¿Estás seguro de que deseas cancelar este ticket?
                            </p>
                            <p className="text-red-400 font-medium">
                                Esta acción cambiará el estado a "Cancelado" y no se podrá deshacer.
                            </p>
                        </div>
                        <div className="flex justify-center space-x-4 pt-4">
                            <button 
                                onClick={() => setIsCancelModalOpen(false)} 
                                className="px-6 py-3 bg-slate-700/50 text-slate-300 rounded-xl hover:bg-slate-600/50 hover:text-white transition-all duration-300 font-medium"
                            >
                                No, volver
                            </button>
                            <button 
                                onClick={handleConfirmCancel} 
                                disabled={cancelLoading}
                                className="relative px-6 py-3 bg-gradient-to-r from-red-600 to-red-500 text-white font-bold rounded-xl hover:shadow-2xl hover:shadow-red-500/25 transition-all duration-300 transform hover:scale-105 disabled:opacity-50"
                            >
                                <div className="flex items-center justify-center space-x-2">
                                    {cancelLoading ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            <span>Cancelando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="w-5 h-5" />
                                            <span>Sí, cancelar ticket</span>
                                        </>
                                    )}
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
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
                
                @keyframes float-gentle {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-5px); }
                }
                
                .animate-float-gentle {
                    animation: float-gentle 3s ease-in-out infinite;
                }

                @keyframes float {
                    0%, 100% { transform: translateY(0px) rotate(0deg); }
                    50% { transform: translateY(-10px) rotate(5deg); }
                }
                
                @keyframes float-delayed {
                    0%, 100% { transform: translateY(0px) rotate(0deg); }
                    50% { transform: translateY(-15px) rotate(-5deg); }
                }
                
                .animate-float {
                    animation: float 6s ease-in-out infinite;
                }
                
                .animate-float-delayed {
                    animation: float-delayed 8s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};

export default TicketDetailPage;