import React from 'react';
import { Link } from 'react-router-dom';
import { Bell, AlertCircle, Clock, CheckCircle, Archive } from 'lucide-react';

const TicketCard = ({ ticket }) => {
    const getStatusInfo = (status) => {
        switch (status) {
            case 'Abierto':
                return { text: 'Abierto', style: 'from-red-500 to-orange-500', Icon: AlertCircle };
            case 'En Revisión':
                return { text: 'En Revisión', style: 'from-yellow-500 to-amber-500', Icon: Clock };
            case 'Resuelto':
                return { text: 'Resuelto', style: 'from-green-500 to-emerald-500', Icon: CheckCircle };
            case 'Cerrado':
                return { text: 'Cerrado', style: 'from-gray-600 to-gray-500', Icon: Archive };
            default:
                return { text: status, style: 'from-gray-700 to-gray-600', Icon: null };
        }
    };

    const statusInfo = getStatusInfo(ticket.Status);
    const StatusIcon = statusInfo.Icon;

    return (
        <Link to={`/tickets/${ticket.TicketID}`} className="block relative group h-full">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-2xl blur-xl opacity-60 group-hover:opacity-80 transition-opacity duration-300"></div>
            <div className="relative h-full bg-gray-900/80 backdrop-blur-sm border border-cyan-400/30 hover:border-cyan-400/50 rounded-2xl p-6 transition-all duration-300 hover:transform hover:scale-[1.02] shadow-xl hover:shadow-2xl flex flex-col justify-between">
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full animate-pulse"></div>
                            <span className="text-xs font-medium text-cyan-300 tracking-wider">TICKET #{ticket.TicketID}</span>
                        </div>
                        <div className={`px-3 py-1.5 bg-gradient-to-r ${statusInfo.style} rounded-full text-white text-xs font-bold flex items-center space-x-1.5 shadow-lg flex-shrink-0`}>
                            {StatusIcon && <StatusIcon className="w-3.5 h-3.5" />}
                            <span>{statusInfo.text}</span>
                        </div>
                    </div>
                    
                    <div className="space-y-3">
                        <h4 className="font-bold text-white text-lg line-clamp-2 leading-tight group-hover:text-cyan-300 transition-colors duration-300">
                            {ticket.Title || 'Ticket sin título'}
                        </h4>
                         <p className="text-gray-400 text-sm line-clamp-2 leading-relaxed">
                            {ticket.Description || 'Sin descripción disponible'}
                        </p>
                    </div>
                </div>
                
                <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-700/50">
                    <div className="flex items-center space-x-2">
                        {ticket.unreadCount > 0 && (
                            <div className="relative flex items-center justify-center mr-2">
                                <Bell className="w-4 h-4 text-red-400 animate-bounce" />
                                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 text-white text-[10px] items-center justify-center">{ticket.unreadCount}</span>
                                </span>
                            </div>
                        )}
                        <span className="text-xs text-gray-500">
                            {new Date(ticket.CreatedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                    </div>
                    <div className="text-right">
                        <span className="text-xs bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent font-medium group-hover:animate-pulse">
                            Ver detalles →
                        </span>
                    </div>
                </div>
            </div>
        </Link>
    );
};

export default TicketCard;
