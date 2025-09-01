import React from 'react';
import { Link } from 'react-router-dom';
import { Bell, AlertCircle, Clock, CheckCircle, Archive } from 'lucide-react';

const TicketCard = ({ ticket }) => {
    const getStatusInfo = (status) => {
        switch (status) {
            case 'Abierto':
                return { 
                    text: 'Abierto', 
                    style: 'from-red-500 to-orange-500', 
                    Icon: AlertCircle,
                    glowColor: 'from-red-400/20 to-orange-400/20'
                };
            case 'En Revisión':
                return { 
                    text: 'En Revisión', 
                    style: 'from-yellow-500 to-amber-500', 
                    Icon: Clock,
                    glowColor: 'from-yellow-400/20 to-amber-400/20'
                };
            case 'Resuelto':
                return { 
                    text: 'Resuelto', 
                    style: 'from-green-500 to-emerald-500', 
                    Icon: CheckCircle,
                    glowColor: 'from-green-400/20 to-emerald-400/20'
                };
            case 'Cerrado':
                return { 
                    text: 'Cerrado', 
                    style: 'from-gray-600 to-gray-500', 
                    Icon: Archive,
                    glowColor: 'from-gray-400/20 to-gray-500/20'
                };
            default:
                return { 
                    text: status, 
                    style: 'from-slate-600 to-slate-500', 
                    Icon: null,
                    glowColor: 'from-slate-400/20 to-slate-500/20'
                };
        }
    };

    const statusInfo = getStatusInfo(ticket.Status);
    const StatusIcon = statusInfo.Icon;

    return (
        <Link to={`/tickets/${ticket.TicketID}`} className="block relative group h-full">
            {/* Fondo con efecto de brillo sutil al hover */}
            <div className={`absolute inset-0 bg-gradient-to-br ${statusInfo.glowColor} rounded-2xl blur-xl opacity-0 group-hover:opacity-40 transition-all duration-500`}></div>
            
            {/* Contenedor principal con glassmorphism */}
            <div className="relative h-full bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl border border-slate-600/30 hover:border-cyan-400/40 rounded-2xl p-6 transition-all duration-500 hover:transform hover:scale-[1.02] shadow-xl hover:shadow-2xl flex flex-col justify-between group-hover:border-opacity-60">
                
                {/* Efecto de gradiente sutil en el fondo */}
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/3 to-purple-400/3 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <div className="relative z-10">
                    {/* Header del ticket */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                            {/* Indicador animado */}
                            <div className="relative">
                                <div className="w-3 h-3 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full"></div>
                                <div className="absolute inset-0 w-3 h-3 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full animate-ping opacity-75"></div>
                            </div>
                            <span className="text-xs font-medium text-cyan-300 tracking-wider uppercase">
                                Ticket #{ticket.TicketID}
                            </span>
                        </div>
                        
                        {/* Badge de estado mejorado */}
                        <div className="relative group/status">
                            <div className={`absolute inset-0 bg-gradient-to-r ${statusInfo.style} rounded-full blur-md opacity-30 group-hover/status:opacity-40 transition-opacity duration-300`}></div>
                            <div className={`relative px-3 py-1.5 bg-gradient-to-r ${statusInfo.style} rounded-full text-white text-xs font-bold flex items-center space-x-1.5 shadow-lg flex-shrink-0 border border-white/20`}>
                                {StatusIcon && <StatusIcon className="w-3.5 h-3.5" />}
                                <span>{statusInfo.text}</span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Contenido del ticket */}
                    <div className="space-y-4">
                        <h4 className="font-bold text-white text-lg line-clamp-2 leading-tight group-hover:text-cyan-300 transition-colors duration-300">
                            {ticket.Title || 'Ticket sin título'}
                        </h4>
                        <p className="text-slate-400 text-sm line-clamp-2 leading-relaxed group-hover:text-slate-300 transition-colors duration-300">
                            {ticket.Description || 'Sin descripción disponible'}
                        </p>
                    </div>
                </div>
                
                {/* Footer del ticket */}
                <div className="relative z-10 flex items-center justify-between pt-4 mt-4">
                    {/* Línea divisoria con gradiente */}
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-600/50 to-transparent"></div>
                    
                    <div className="flex items-center space-x-3">
                        {/* Notificaciones no leídas */}
                        {ticket.unreadCount > 0 && (
                            <div className="relative flex items-center justify-center">
                                <div className="absolute inset-0 bg-red-400/20 rounded-full blur-md animate-pulse"></div>
                                <div className="relative flex items-center justify-center">
                                    <Bell className="w-4 h-4 text-red-400" />
                                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-gradient-to-r from-red-500 to-red-600 text-white text-[10px] items-center justify-center font-bold border border-red-300/50">
                                            {ticket.unreadCount}
                                        </span>
                                    </span>
                                </div>
                            </div>
                        )}
                        
                        {/* Fecha con formato mejorado */}
                        <div className="flex items-center space-x-2">
                            <div className="w-1 h-1 bg-slate-500 rounded-full"></div>
                            <span className="text-xs text-slate-500 font-mono">
                                {new Date(ticket.CreatedAt).toLocaleDateString('es-ES', { 
                                    day: 'numeric', 
                                    month: 'short', 
                                    year: 'numeric' 
                                })}
                            </span>
                        </div>
                    </div>
                    
                    {/* Call to action mejorado */}
                    <div className="relative group/cta">
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-400/10 to-pink-400/10 rounded-lg blur-md opacity-0 group-hover/cta:opacity-100 transition-opacity duration-300"></div>
                        <div className="relative flex items-center space-x-2 px-3 py-1.5 bg-gradient-to-r from-slate-700/50 to-slate-800/50 rounded-lg border border-slate-600/30 group-hover/cta:border-purple-400/40 transition-all duration-300">
                            <span className="text-xs bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent font-medium group-hover:animate-pulse">
                                Ver detalles
                            </span>
                            <div className="w-4 h-4 flex items-center justify-center">
                                <div className="w-1 h-1 bg-purple-400 rounded-full group-hover:animate-bounce"></div>
                                <div className="w-1 h-1 bg-purple-400 rounded-full ml-0.5 group-hover:animate-bounce" style={{animationDelay: '0.1s'}}></div>
                                <div className="w-1 h-1 bg-purple-400 rounded-full ml-0.5 group-hover:animate-bounce" style={{animationDelay: '0.2s'}}></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Animaciones CSS personalizadas */}
            <style jsx>{`
                .line-clamp-2 {
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }
                
                @keyframes gentle-float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-2px); }
                }
                
                .group:hover .animate-gentle-float {
                    animation: gentle-float 2s ease-in-out infinite;
                }
                
                @keyframes subtle-glow {
                    0%, 100% { box-shadow: 0 0 20px rgba(6, 182, 212, 0.1); }
                    50% { box-shadow: 0 0 30px rgba(6, 182, 212, 0.2); }
                }
                
                .group:hover {
                    animation: subtle-glow 2s ease-in-out infinite;
                }
            `}</style>
        </Link>
    );
};

export default TicketCard;