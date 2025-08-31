import React, { useState, useEffect, useContext } from 'react';
import { useParams } from 'react-router-dom';
import ticketService from '../services/ticketService';
import { AuthContext } from '../context/AuthContext';
import Modal from '/src/components/ui/Modal.jsx';
import TicketChat from '../components/tickets/TicketChat';
import socket from '../services/socket';
import { Bell, FileText, User, Calendar, Building, Settings, CheckCircle, AlertCircle, Maximize2, X, MessageCircle, Shield, Activity, Zap,Edit, Clock, Trash2 } from 'lucide-react';

const TicketDetailPage = () => {
    const { id } = useParams();
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

    useEffect(() => {
        if (isChatExpanded) {
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = 'unset';
            };
        }
    }, [isChatExpanded]);

    useEffect(() => {
        if (!ticket || !user) return;

        // Funciones para manejar la sala
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

        // Conectar socket si no está conectado
        if (!socket.connected) {
            socket.connect();
        } else {
            // Si ya está conectado, unirse inmediatamente
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

        // Manejar actualización de usuarios en línea
        const handleRoomUsersUpdate = (usersInRoom) => {
            console.log('[PARENT] Room users update:', usersInRoom);
            setOnlineUsers(usersInRoom);
        };

        socket.on('roomUsersUpdate', handleRoomUsersUpdate);

        return () => {
            // Salir de la sala del ticket
            leaveTicketRoom();
            
            // Remover listeners
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
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 min-h-screen flex items-center justify-center text-slate-200 relative overflow-hidden">
                {/* Efectos de fondo globales */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-40 -left-40 w-80 h-80 bg-cyan-400/3 rounded-full blur-3xl animate-float"></div>
                    <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-400/3 rounded-full blur-3xl animate-float-delayed"></div>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-400/2 rounded-full blur-3xl"></div>
                    
                    <div className="absolute inset-0 opacity-[0.02]" 
                         style={{
                             backgroundImage: `radial-gradient(circle at 1px 1px, rgba(99, 102, 241, 0.3) 1px, transparent 0)`,
                             backgroundSize: '30px 30px'
                         }}>
                    </div>
                </div>

                {/* Partículas flotantes */}
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

                <div className="flex items-center justify-center">
                    <div className="relative">
                        <div className="w-20 h-20 border-4 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin"></div>
                        <div className="absolute inset-0 w-20 h-20 border-4 border-transparent border-r-indigo-400 rounded-full animate-spin" style={{animationDirection: 'reverse'}}></div>
                    </div>
                    <p className="ml-4 text-xl text-cyan-400 font-medium tracking-wide">Cargando ticket...</p>
                </div>

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
    }

    if (error && !ticket) {
        return (
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 min-h-screen flex items-center justify-center text-slate-200 p-4 relative overflow-hidden">
                {/* Efectos de fondo globales */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-40 -left-40 w-80 h-80 bg-cyan-400/3 rounded-full blur-3xl animate-float"></div>
                    <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-400/3 rounded-full blur-3xl animate-float-delayed"></div>
                </div>

                <div className="max-w-md mx-auto">
                    <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-red-400/20 to-pink-400/20 rounded-3xl blur-xl opacity-60"></div>
                        <div className="relative bg-gradient-to-br from-slate-900/90 via-slate-800/85 to-slate-900/90 backdrop-blur-xl border border-slate-600/40 rounded-3xl p-8">
                            <div className="flex items-center space-x-3 mb-4">
                                <AlertCircle className="w-6 h-6 text-red-400" />
                                <h3 className="text-lg font-bold text-red-300">Error del Sistema</h3>
                            </div>
                            <p className="text-slate-300">{error}</p>
                        </div>
                    </div>
                </div>

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

    const StatusBadge = ({status}) => {
        const { style, Icon } = getStatusColor(status);
        return (
            <div className={`px-4 py-2 bg-gradient-to-r ${style} text-white font-bold rounded-xl shadow-lg text-sm sm:text-base flex items-center space-x-2`}>
                <Icon className="w-4 h-4" />
                <span>{status}</span>
            </div>
        );
    };

    // Componente del chat expandido para móvil
    const ExpandedChatModal = () => (
        <div className="fixed inset-0 z-50 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 flex flex-col md:hidden">
            {/* Efectos de fondo en modal */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -left-40 w-80 h-80 bg-cyan-400/3 rounded-full blur-3xl animate-float"></div>
                <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-400/3 rounded-full blur-3xl animate-float-delayed"></div>
            </div>

            <div className="relative flex-shrink-0 flex items-center justify-between px-4 h-16 bg-gradient-to-r from-slate-900/95 via-slate-800/95 to-slate-900/95 border-b border-cyan-400/20 backdrop-blur-sm">
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
            <div className="relative flex-1 min-h-0">
                {/* *** PASAR ESTADO DEL PADRE SIN GESTIÓN DE SOCKET PROPIA *** */}
                <TicketChat 
                    ticketId={id} 
                    isExpanded={true}
                    onlineUsers={onlineUsers}
                    isSocketConnected={isSocketConnected}
                    disableSocketManagement={true}
                />
            </div>
        </div>
    );

    return (
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 min-h-screen text-slate-200 relative overflow-hidden">
            {/* Efectos de fondo globales - igual que LoginPage */}
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

            {/* Partículas flotantes sutiles */}
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

            <div className="relative h-full flex flex-col p-4 lg:p-6">
                {/* Header del Ticket - estilo CyberCore */}
                <div className="flex-shrink-0 mb-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                        <div className="flex items-center space-x-4">
                            <div className="relative inline-block">
                                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 to-indigo-400/20 rounded-2xl blur-lg animate-pulse opacity-60"></div>
                                <div className="relative w-16 h-16 bg-gradient-to-r from-cyan-400/10 to-indigo-500/10 backdrop-blur-sm border border-cyan-400/30 rounded-2xl flex items-center justify-center">
                                    <FileText className="w-8 h-8 text-cyan-400" />
                                </div>
                            </div>
                            
                            <div>
                                <h2 className="text-2xl lg:text-4xl font-bold bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent tracking-wider">
                                    {ticket.Title}
                                </h2>
                                <div className="flex items-center space-x-3 mt-2">
                                    <span className="text-sm text-slate-400 tracking-wide">ID: {ticket.TicketID}</span>
                                    <div className="flex items-center space-x-1">
                                        <div className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse"></div>
                                        <span className="text-xs text-slate-500 uppercase tracking-widest">Sistema Activo</span>
                                    </div>
                                </div>
                                <p className="text-slate-400 text-sm mt-1 tracking-wide">Sistema de Gestión Avanzada</p>
                            </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                            <StatusBadge status={ticket.Status} />
                            
                            {/* Botones de acción - Responsive */}
                            <div className="flex items-center space-x-2">
                                {/* Botón de edición */}
                                {canEditTicket && (
                                    <div className="relative group">
                                        <div className="absolute inset-0 bg-gradient-to-r from-amber-400/20 to-yellow-400/20 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                                        <button 
                                            onClick={handleEditClick}
                                            className="relative flex items-center justify-center space-x-2 h-10 px-3 sm:px-4 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 hover:from-amber-500/30 hover:to-yellow-500/30 border border-amber-400/40 hover:border-amber-400/60 rounded-xl text-amber-300 hover:text-amber-200 transition-all duration-300 hover:scale-105 backdrop-blur-sm"
                                            title="Editar ticket"
                                        >
                                            <Edit className="w-4 h-4 flex-shrink-0" />
                                            <span className="hidden sm:inline text-sm font-medium whitespace-nowrap">Editar</span>
                                        </button>
                                    </div>
                                )}
                                
                                {/* Botón de cancelar */}
                                {canCancelTicket && (
                                     <div className="relative group">
                                        <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-rose-500/20 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                                        <button 
                                            onClick={handleCancelClick}
                                            className="relative flex items-center justify-center space-x-2 h-10 px-3 sm:px-4 bg-gradient-to-r from-red-500/20 to-rose-500/20 hover:from-red-500/30 hover:to-rose-500/30 border border-red-400/40 hover:border-red-400/60 rounded-xl text-red-300 hover:text-red-200 transition-all duration-300 hover:scale-105 backdrop-blur-sm"
                                            title="Cancelar ticket"
                                        >
                                            <Trash2 className="w-4 h-4 flex-shrink-0"/>
                                            <span className="hidden sm:inline text-sm font-medium whitespace-nowrap">Cancelar</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>

                    {/* Mensajes de estado */}
                    {success && (
                        <div className="mt-6 relative group">
                            <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 to-green-400/20 rounded-2xl blur-md opacity-60"></div>
                            <div className="relative p-4 bg-slate-800/60 backdrop-blur-sm border border-emerald-400/40 rounded-2xl">
                                <div className="flex items-center space-x-3">
                                    <div className="relative">
                                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                                        <div className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-30"></div>
                                    </div>
                                    <span className="text-emerald-300 font-medium tracking-wide">{success}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="mt-6 relative group">
                            <div className="absolute inset-0 bg-gradient-to-r from-red-400/20 to-pink-400/20 rounded-2xl blur-md opacity-60"></div>
                            <div className="relative p-4 bg-slate-800/60 backdrop-blur-sm border border-red-400/40 rounded-2xl">
                                <div className="flex items-center space-x-3">
                                    <div className="relative">
                                        <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                                        <div className="absolute inset-0 bg-red-400 rounded-full animate-ping opacity-30"></div>
                                    </div>
                                    <span className="text-red-300 font-medium tracking-wide">{error}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Layout responsivo */}
                <div className="flex-grow min-h-0">
                    {/* Desktop Layout */}
                    <div className="hidden lg:grid lg:grid-cols-3 gap-6 h-full">
                        <div className="lg:col-span-2 flex flex-col gap-6 min-h-0">
                            {/* Descripción del Ticket */}
                            <div className="relative flex-shrink-0 group">
                                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/10 via-indigo-400/10 to-purple-400/10 rounded-3xl blur-xl opacity-60 group-hover:opacity-80 transition-all duration-500"></div>
                                <div className="relative bg-gradient-to-br from-slate-900/90 via-slate-800/85 to-slate-900/90 backdrop-blur-xl border border-slate-600/40 rounded-3xl p-6">
                                    <div className="flex items-center space-x-3 mb-4">
                                        <div className="relative">
                                            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 to-indigo-400/20 rounded-xl blur-md"></div>
                                            <div className="relative p-2 bg-slate-800/60 backdrop-blur-sm border border-slate-600/40 rounded-xl">
                                                <FileText className="w-5 h-5 text-cyan-400" />
                                            </div>
                                        </div>
                                        <h3 className="text-lg font-bold text-cyan-400 tracking-wide">Descripción del Ticket</h3>
                                        <div className="flex items-center space-x-1 ml-auto">
                                            <Activity className="w-4 h-4 text-indigo-400 animate-pulse" />
                                            <span className="text-xs text-slate-400 uppercase tracking-widest">Activo</span>
                                        </div>
                                    </div>
                                    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-600/30 rounded-xl p-4">
                                        <p className="text-slate-300 whitespace-pre-wrap leading-relaxed tracking-wide">{ticket.Description}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Chat */}
                            <div className="relative flex-grow min-h-0 group">
                                <div className="absolute inset-0 bg-gradient-to-r from-purple-400/10 via-indigo-400/10 to-cyan-400/10 rounded-3xl blur-xl opacity-60 group-hover:opacity-80 transition-all duration-500"></div>
                                <div className="relative bg-gradient-to-br from-slate-900/90 via-slate-800/85 to-slate-900/90 backdrop-blur-xl border border-slate-600/40 rounded-3xl overflow-hidden h-full">
                                    <TicketChat ticketId={id} />
                                </div>
                            </div>
                        </div>

                        {/* Panel de Detalles - Desktop */}
                        <div className="lg:col-span-1">
                            <div className="sticky top-6">
                                <div className="relative group">
                                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-400/10 to-purple-400/10 rounded-3xl blur-xl opacity-60 group-hover:opacity-80 transition-all duration-500"></div>
                                    <div className="relative bg-gradient-to-br from-slate-900/90 via-slate-800/85 to-slate-900/90 backdrop-blur-xl border border-slate-600/40 rounded-3xl p-6">
                                        <div className="flex items-center space-x-3 mb-6">
                                            <div className="relative">
                                                <div className="absolute inset-0 bg-gradient-to-r from-indigo-400/20 to-purple-400/20 rounded-xl blur-md"></div>
                                                <div className="relative p-2 bg-slate-800/60 backdrop-blur-sm border border-slate-600/40 rounded-xl">
                                                    <Settings className="w-5 h-5 text-indigo-400" />
                                                </div>
                                            </div>
                                            <h3 className="text-lg font-bold text-indigo-400 tracking-wide">Información del Sistema</h3>
                                        </div>
                                        
                                        <div className="space-y-4">
                                            <div className="relative group">
                                                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/10 to-indigo-400/10 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                                                <div className="relative bg-slate-800/50 backdrop-blur-sm border border-slate-600/30 rounded-xl p-4">
                                                    <div className="flex items-center space-x-2 mb-2">
                                                        <User className="w-4 h-4 text-cyan-400" />
                                                        <span className="text-sm font-semibold text-cyan-400 tracking-wide">Creado por</span>
                                                    </div>
                                                    <p className="text-white tracking-wide">{ticket.CreatedByFullName}</p>
                                                </div>
                                            </div>

                                            <div className="relative group">
                                                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/10 to-cyan-400/10 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                                                <div className="relative bg-slate-800/50 backdrop-blur-sm border border-slate-600/30 rounded-xl p-4">
                                                    <div className="flex items-center space-x-2 mb-2">
                                                        <Building className="w-4 h-4 text-emerald-400" />
                                                        <span className="text-sm font-semibold text-emerald-400 tracking-wide">Área Asignada</span>
                                                    </div>
                                                    <p className="text-white tracking-wide">{ticket.AssignedToArea}</p>
                                                </div>
                                            </div>

                                            <div className="relative group">
                                                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/10 to-orange-400/10 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                                                <div className="relative bg-slate-800/50 backdrop-blur-sm border border-slate-600/30 rounded-xl p-4">
                                                    <div className="flex items-center space-x-2 mb-2">
                                                        <Calendar className="w-4 h-4 text-yellow-400" />
                                                        <span className="text-sm font-semibold text-yellow-400 tracking-wide">Fecha de Creación</span>
                                                    </div>
                                                    <p className="text-white text-sm tracking-wide">{new Date(ticket.CreatedAt).toLocaleString()}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {canUpdateStatus && ticket.Status !== 'Cerrado' && (
                                            <div className="border-t border-slate-700/50 pt-6 mt-6">
                                                <h4 className="text-lg font-bold text-cyan-400 mb-4 flex items-center space-x-3 tracking-wide">
                                                    <div className="relative">
                                                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 to-indigo-400/20 rounded-lg blur-sm"></div>
                                                        <Settings className="relative w-4 h-4" />
                                                    </div>
                                                    <span>Control de Estado</span>
                                                </h4>
                                                
                                                <div className="space-y-4">
                                                    <div className="relative group">
                                                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/10 to-indigo-400/10 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                                                        <select
                                                            value={newStatus}
                                                            onChange={(e) => setNewStatus(e.target.value)}
                                                            className="relative w-full px-4 py-3 bg-slate-800/60 backdrop-blur-sm border border-slate-600/40 rounded-xl text-white focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20 transition-all duration-300 hover:border-slate-500/60 hover:bg-slate-700/40 tracking-wide"
                                                        >
                                                            {statusOptions.map(status => (
                                                                <option key={status} value={status} className="bg-slate-800">
                                                                    {status}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    
                                                    <div className="relative group">
                                                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-indigo-500 rounded-xl blur-md opacity-60 group-hover:opacity-100 transition-all duration-300"></div>
                                                        <button
                                                            onClick={handleStatusUpdate}
                                                            disabled={loading || newStatus === ticket.Status}
                                                            className="relative w-full py-4 px-6 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold rounded-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-60 disabled:scale-100 disabled:cursor-not-allowed border border-cyan-400/20 hover:border-cyan-400/40 shadow-lg shadow-cyan-500/20 tracking-wide"
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
                            </div>
                        </div>
                    </div>

                    {/* Mobile Layout */}
                    <div className="lg:hidden flex flex-col space-y-6 h-full">
                        {/* Descripción */}
                        <div className="relative flex-shrink-0 group">
                            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/10 via-indigo-400/10 to-purple-400/10 rounded-2xl blur-xl opacity-60 group-hover:opacity-80 transition-all duration-500"></div>
                            <div className="relative bg-gradient-to-br from-slate-900/90 via-slate-800/85 to-slate-900/90 backdrop-blur-xl border border-slate-600/40 rounded-2xl p-4">
                                <div className="flex items-center space-x-3 mb-3">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 to-indigo-400/20 rounded-lg blur-sm"></div>
                                        <div className="relative p-2 bg-slate-800/60 backdrop-blur-sm border border-slate-600/40 rounded-lg">
                                            <FileText className="w-4 h-4 text-cyan-400" />
                                        </div>
                                    </div>
                                    <h3 className="text-base font-bold text-cyan-400 tracking-wide">Descripción</h3>
                                    <div className="flex items-center space-x-1 ml-auto">
                                        <div className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse"></div>
                                        <span className="text-xs text-slate-400 uppercase tracking-widest">Activo</span>
                                    </div>
                                </div>
                                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-600/30 rounded-xl p-3">
                                    <p className="text-slate-300 text-sm leading-relaxed tracking-wide">{ticket.Description}</p>
                                </div>
                            </div>
                        </div>

                        {/* Información del Ticket */}
                        <div className="relative flex-shrink-0 group">
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-400/10 to-purple-400/10 rounded-2xl blur-xl opacity-60 group-hover:opacity-80 transition-all duration-500"></div>
                            <div className="relative bg-gradient-to-br from-slate-900/90 via-slate-800/85 to-slate-900/90 backdrop-blur-xl border border-slate-600/40 rounded-2xl p-4">
                                <div className="flex items-center space-x-3 mb-4">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-400/20 to-purple-400/20 rounded-lg blur-sm"></div>
                                        <div className="relative p-2 bg-slate-800/60 backdrop-blur-sm border border-slate-600/40 rounded-lg">
                                            <Settings className="w-4 h-4 text-indigo-400" />
                                        </div>
                                    </div>
                                    <h3 className="text-base font-bold text-indigo-400 tracking-wide">Información del Sistema</h3>
                                </div>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="relative group">
                                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/10 to-indigo-400/10 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                                        <div className="relative bg-slate-800/50 backdrop-blur-sm border border-slate-600/30 rounded-xl p-3">
                                            <div className="flex items-center space-x-2 mb-2">
                                                <User className="w-3 h-3 text-cyan-400" />
                                                <span className="text-xs font-semibold text-cyan-400 tracking-wide">Creado por</span>
                                            </div>
                                            <p className="text-white text-sm tracking-wide">{ticket.CreatedByFullName}</p>
                                        </div>
                                    </div>

                                    <div className="relative group">
                                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/10 to-cyan-400/10 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                                        <div className="relative bg-slate-800/50 backdrop-blur-sm border border-slate-600/30 rounded-xl p-3">
                                            <div className="flex items-center space-x-2 mb-2">
                                                <Building className="w-3 h-3 text-emerald-400" />
                                                <span className="text-xs font-semibold text-emerald-400 tracking-wide">Área</span>
                                            </div>
                                            <p className="text-white text-sm tracking-wide">{ticket.AssignedToArea}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-3 relative group">
                                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/10 to-orange-400/10 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                                    <div className="relative bg-slate-800/50 backdrop-blur-sm border border-slate-600/30 rounded-xl p-3">
                                        <div className="flex items-center space-x-2 mb-2">
                                            <Calendar className="w-3 h-3 text-yellow-400" />
                                            <span className="text-xs font-semibold text-yellow-400 tracking-wide">Fecha de Creación</span>
                                        </div>
                                        <p className="text-white text-sm tracking-wide">{new Date(ticket.CreatedAt).toLocaleString()}</p>
                                    </div>
                                </div>

                                {canUpdateStatus && ticket.Status !== 'Cerrado' && (
                                    <div className="border-t border-slate-700/50 pt-4 mt-4">
                                        <h4 className="text-base font-bold text-cyan-400 mb-3 flex items-center space-x-3 tracking-wide">
                                            <div className="relative">
                                                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 to-indigo-400/20 rounded-lg blur-sm"></div>
                                                <Settings className="relative w-3 h-3" />
                                            </div>
                                            <span>Control de Estado</span>
                                        </h4>
                                        
                                        <div className="space-y-3">
                                            <div className="relative group">
                                                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/10 to-indigo-400/10 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                                                <select
                                                    value={newStatus}
                                                    onChange={(e) => setNewStatus(e.target.value)}
                                                    className="relative w-full px-3 py-2 bg-slate-800/60 backdrop-blur-sm border border-slate-600/40 rounded-xl text-white text-sm focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20 transition-all duration-300 hover:border-slate-500/60 hover:bg-slate-700/40 tracking-wide"
                                                >
                                                    {statusOptions.map(status => (
                                                        <option key={status} value={status} className="bg-slate-800">
                                                            {status}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            
                                            <div className="relative group">
                                                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-indigo-500 rounded-xl blur-md opacity-60 group-hover:opacity-100 transition-all duration-300"></div>
                                                <button
                                                    onClick={handleStatusUpdate}
                                                    disabled={loading || newStatus === ticket.Status}
                                                    className="relative w-full px-4 py-2 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold rounded-xl transition-all duration-300 text-sm disabled:opacity-60 disabled:cursor-not-allowed border border-cyan-400/20 hover:border-cyan-400/40 shadow-lg shadow-cyan-500/20 tracking-wide"
                                                >
                                                    <div className="relative flex items-center justify-center space-x-2">
                                                        {loading ? (
                                                            <>
                                                                <div className="relative w-4 h-4">
                                                                    <div className="absolute inset-0 border-2 border-white/20 rounded-full"></div>
                                                                    <div className="absolute inset-0 border-2 border-t-white rounded-full animate-spin"></div>
                                                                </div>
                                                                <span>Procesando...</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <CheckCircle className="w-4 h-4" />
                                                                <span>Actualizar</span>
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

                        {/* Chat completo con botón expandir */}
                        <div className="relative flex-grow min-h-0 group">
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-400/10 via-indigo-400/10 to-cyan-400/10 rounded-2xl blur-xl opacity-60 group-hover:opacity-80 transition-all duration-500"></div>
                            <div className="relative bg-gradient-to-br from-slate-900/90 via-slate-800/85 to-slate-900/90 backdrop-blur-xl border border-slate-600/40 rounded-2xl overflow-hidden h-full flex flex-col">
                                <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-slate-700/50">
                                    <div className="flex items-center space-x-3">
                                        <div className="relative">
                                            <div className="absolute inset-0 bg-gradient-to-r from-purple-400/20 to-cyan-400/20 rounded-lg blur-sm"></div>
                                            <div className="relative p-2 bg-slate-800/60 backdrop-blur-sm border border-slate-600/40 rounded-lg">
                                                <MessageCircle className="w-4 h-4 text-purple-400" />
                                            </div>
                                        </div>
                                        <h3 className="text-base font-bold text-purple-400 tracking-wide">Chat del Sistema</h3>
                                        <div className="flex items-center space-x-1">
                                            <div className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse"></div>
                                            <span className="text-xs text-slate-400 uppercase tracking-widest">Online</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setIsChatExpanded(true)}
                                        className="group relative p-2 bg-slate-800/60 backdrop-blur-sm border border-slate-600/40 text-cyan-400 rounded-xl hover:border-slate-500/60 hover:bg-slate-700/40 transition-all duration-300"
                                        title="Expandir chat a pantalla completa"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/10 to-purple-400/10 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                                        <Maximize2 className="relative w-4 h-4" />
                                    </button>
                                </div>
                                
                                {/* Chat ocupando todo el espacio disponible - ACTUALIZADO */}
                                <div className="flex-1 min-h-0">
                                    <TicketChat 
                                        ticketId={id}
                                        onlineUsers={onlineUsers}
                                        isSocketConnected={isSocketConnected}
                                        disableSocketManagement={true}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal de chat expandido */}
            {isChatExpanded && <ExpandedChatModal />}
            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Editar Información del Ticket">
                <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-800/40 to-slate-900/40 rounded-3xl backdrop-blur-xl"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/5 to-indigo-400/5 rounded-3xl"></div>
                    <div className="absolute inset-0 border border-slate-600/30 rounded-3xl"></div>
                    <div className="relative p-6">
                        <form onSubmit={handleUpdateTicket} className="space-y-6">
                            {editFormErrors.form && (
                                <div className="p-4 bg-gradient-to-r from-red-900/50 to-red-800/50 border border-red-500/50 rounded-xl">
                                    <div className="flex items-center space-x-2">
                                        <AlertCircle className="w-5 h-5 text-red-400" />
                                        <p className="text-red-300 text-sm font-medium">{editFormErrors.form}</p>
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
                                    className="w-full px-4 py-3 bg-slate-800/50 backdrop-blur-sm border border-slate-600/50 rounded-xl text-white placeholder-slate-400 transition-all duration-300 resize-none"
                                />
                            </div>

                            <div className="flex justify-end pt-4 space-x-4">
                                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-6 py-3 bg-slate-700/50 text-slate-300 rounded-xl hover:bg-slate-600/50 hover:text-white transition-all duration-300 font-medium">
                                    Cancelar
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={editLoading}
                                    className="group relative px-8 py-3 bg-gradient-to-r from-cyan-500 to-indigo-500 text-white font-bold rounded-xl hover:shadow-2xl hover:shadow-cyan-500/25 transition-all duration-300 transform hover:scale-105 disabled:opacity-50"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-indigo-400 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"></div>
                                    <div className="relative flex items-center justify-center space-x-2">
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
            <Modal isOpen={isCancelModalOpen} onClose={() => setIsCancelModalOpen(false)} title="Confirmar Cancelación">
                <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-800/40 to-slate-900/40 rounded-3xl backdrop-blur-xl"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-red-400/5 to-pink-500/5 rounded-3xl"></div>
                    <div className="absolute inset-0 border border-slate-600/30 rounded-3xl"></div>
                    <div className="relative p-6 text-center space-y-6">
                         <div className="relative mx-auto w-16 h-16">
                            <div className="absolute inset-0 bg-red-500/20 rounded-full blur-lg"></div>
                            <div className="relative w-16 h-16 bg-gradient-to-br from-red-500/20 to-pink-600/20 rounded-full flex items-center justify-center border border-red-500/50">
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
                            <button onClick={() => setIsCancelModalOpen(false)} className="px-6 py-3 bg-slate-700/50 text-slate-300 rounded-xl hover:bg-slate-600/50 hover:text-white transition-all duration-300 font-medium">
                                No, volver
                            </button>
                            <button 
                                onClick={handleConfirmCancel} 
                                disabled={cancelLoading}
                                className="group relative px-6 py-3 bg-gradient-to-r from-red-600 to-red-500 text-white font-bold rounded-xl hover:shadow-2xl hover:shadow-red-500/25 transition-all duration-300 transform hover:scale-105"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-red-400 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"></div>
                                <div className="relative flex items-center justify-center space-x-2">
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

            {/* Estilos de animación personalizados - iguales al LoginPage */}
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

export default TicketDetailPage;