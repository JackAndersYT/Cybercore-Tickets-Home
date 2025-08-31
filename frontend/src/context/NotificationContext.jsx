import React, { createContext, useEffect, useContext, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import socket from '../services/socket';
import { AuthContext } from './AuthContext';
import toast from 'react-hot-toast';
import { MessageSquare, X } from 'lucide-react';

export const NotificationContext = createContext();

// Se quita el 'export' de aquí
const NotificationProvider = ({ children }) => {
    const { isAuthenticated, user } = useContext(AuthContext);
    const [notification, setNotification] = useState(null);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (isAuthenticated && user) {
            if (!socket.connected) {
                socket.connect();
            }
            
            const handleTicketUpdate = (data) => {
                setNotification({ ...data, timestamp: new Date().getTime() });

                const isOnTicketPage = location.pathname.startsWith('/tickets/');
                const currentTicketId = isOnTicketPage ? location.pathname.split('/')[2] : null;

                if (data.senderId !== user.UserID && String(data.ticketId) !== currentTicketId) {
                    toast.custom((t) => (
                        <div
                            className={`${
                                t.visible ? 'animate-enter' : 'animate-leave'
                            } max-w-md w-full bg-gray-800/80 backdrop-blur-lg shadow-lg rounded-2xl pointer-events-auto flex ring-1 ring-cyan-500/50`}
                        >
                            <div 
                                className="flex-1 w-0 p-4 cursor-pointer hover:bg-gray-700/20 rounded-l-2xl transition-colors"
                                onClick={() => {
                                    navigate(`/tickets/${data.ticketId}`);
                                    toast.dismiss(t.id);
                                }}
                            >
                                <div className="flex items-start">
                                    <div className="flex-shrink-0 pt-0.5">
                                        <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full flex items-center justify-center">
                                            <MessageSquare className="w-6 h-6 text-white" />
                                        </div>
                                    </div>
                                    <div className="ml-3 flex-1">
                                        <p className="text-sm font-medium text-cyan-300">
                                            Nuevo mensaje de {data.senderName}
                                        </p>
                                        <p className="mt-1 text-sm text-gray-400 truncate">
                                            En ticket: "{data.title}"
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center border-l border-gray-600 flex-shrink-0">
                                <button
                                    onClick={(e) => toast.remove(t.id)}
                                    className="p-4 hover:bg-red-500/10 hover:text-red-400 text-gray-400 rounded-r-2xl transition-all duration-200 focus:outline-none"
                                    aria-label="Cerrar notificación"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ), {
                        duration: 6000,
                    });
                }
            };

            socket.on('ticketUpdate', handleTicketUpdate);

            return () => {
                socket.off('ticketUpdate', handleTicketUpdate);
                if (socket.connected) {
                    socket.disconnect();
                }
            };
        }
    }, [isAuthenticated, user, navigate, location]);

    return (
        <NotificationContext.Provider value={{ notification }}>
            {children}
        </NotificationContext.Provider>
    );
};

// Se añade el export por defecto al final del archivo
export default NotificationProvider;
