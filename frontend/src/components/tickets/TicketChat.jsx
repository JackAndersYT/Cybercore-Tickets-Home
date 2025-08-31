import React, { useState, useEffect, useContext, useRef, useMemo } from 'react';
import { AuthContext } from '../../context/AuthContext';
import ticketService from '../../services/ticketService';
import socket from '../../services/socket';
import { Check, CheckCheck, Zap, SendHorizontal, Paperclip, X, File as FileIcon } from 'lucide-react';
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import { API_BASE_URL } from '../../config'; 
import Captions from "yet-another-react-lightbox/plugins/captions";
import Download from "yet-another-react-lightbox/plugins/download";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/plugins/captions.css";
import "yet-another-react-lightbox/plugins/thumbnails.css";

const TicketChat = ({ 
    ticketId, 
    isExpanded = false, 
    className = '', 
    style = {},
    // Props controladas por el padre
    onlineUsers = [],
    isSocketConnected = false,
    disableSocketManagement = false
}) => {
    const chatContainerRef = useRef(null);
    const { user } = useContext(AuthContext);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [typingUser, setTypingUser] = useState(null);
    const [firstUnreadId, setFirstUnreadId] = useState(null);
    const typingTimeoutRef = useRef(null);
    
    const [attachedFile, setAttachedFile] = useState(null);
    const fileInputRef = useRef(null);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [imageIndex, setImageIndex] = useState(0);
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    // *** REMOVER ESTADO LOCAL DE SOCKET - USAR SOLO LAS PROPS DEL PADRE ***
    // Estado local solo se usa si no está deshabilitado
    const [localIsConnected, setLocalIsConnected] = useState(socket.connected);
    const [localOnlineUsers, setLocalOnlineUsers] = useState([]);
    
    // Determinar qué estado usar
    const currentIsConnected = disableSocketManagement ? isSocketConnected : localIsConnected;
    const currentOnlineUsers = disableSocketManagement ? onlineUsers : localOnlineUsers;

    const imageMessages = useMemo(() => 
        messages.filter(msg => msg.FileURL && msg.FileType.startsWith('image/'))
                .map(msg => ({ 
                    src: msg.FileURL, 
                    title: msg.FileName,
                    description: `Enviado por: ${msg.SenderFullName}`
                }))
    , [messages]);

    const handleImageClick = (clickedImageUrl) => {
        const index = imageMessages.findIndex(img => img.src === clickedImageUrl);
        if (index !== -1) {
            setImageIndex(index);
            setLightboxOpen(true);
        }
    };

    const handlePaste = (e) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile();
                setAttachedFile(file);
                break;
            }
        }
    };

    // Función para scroll suave solo para nuevos mensajes
    const scrollToBottomSmooth = () => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTo({
                top: chatContainerRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    };

    useEffect(() => {
        const loadAndMarkMessages = async () => {
            const data = await ticketService.getMessages(ticketId);
            setMessages(data);

            const firstUnread = data.find(m => !m.IsRead && m.SenderID !== user.UserID);
            if (firstUnread) {
                setFirstUnreadId(firstUnread.MessageID);
                await ticketService.markAsRead(ticketId);
            }
            
            setIsInitialLoad(false);
        };

        loadAndMarkMessages();

        // *** SOLO CONFIGURAR SOCKET SI NO SE ESTÁ DESHABILITANDO LA GESTIÓN LOCAL ***
        if (!disableSocketManagement) {
            console.log('[CHAT] Setting up local socket management');
            // Configurar gestión local del socket
            if (!socket.connected) {
                socket.connect();
            } else {
                // Si ya está conectado, unirse inmediatamente
                socket.emit('joinTicketRoom', { ticketId, user });
            }
            
            const onConnect = () => {
                console.log('[CHAT] Socket connected locally');
                setLocalIsConnected(true);
                socket.emit('joinTicketRoom', { ticketId, user });
            };
            
            const onDisconnect = () => {
                console.log('[CHAT] Socket disconnected locally');
                setLocalIsConnected(false);
            };

            socket.on('connect', onConnect);
            socket.on('disconnect', onDisconnect);

            socket.on('roomUsersUpdate', (usersInRoom) => {
                console.log('[CHAT] Local room users update:', usersInRoom);
                setLocalOnlineUsers(usersInRoom);
            });
            
            // Cleanup para gestión local de socket
            return () => {
                console.log('[CHAT] Cleaning up local socket management');
                socket.emit('leaveTicketRoom', ticketId);
                socket.off('connect', onConnect);
                socket.off('disconnect', onDisconnect);
                socket.off('roomUsersUpdate');
            };
        } else {
            console.log('[CHAT] Using parent socket management - no local setup needed');
        }
    }, [ticketId, user.UserID, disableSocketManagement, user]);

    // Effect separado para los listeners de mensajes (siempre activos)
    useEffect(() => {
        const onNewMessage = (message) => {
            setTypingUser(null);
            setMessages(prevMessages => [...prevMessages, message]);
            if (message.SenderID !== user.UserID) {
                ticketService.markAsRead(ticketId);
            }
        };
        
        const onUserTyping = ({ userName }) => setTypingUser(userName);
        const onUserStoppedTyping = () => setTypingUser(null);
        const onMessagesRead = ({ readerId }) => {
            if (readerId !== user.UserID) {
                setMessages(prev => prev.map(msg => ({ ...msg, IsRead: true })));
            }
        };

        socket.on('newMessage', onNewMessage);
        socket.on('userTyping', onUserTyping);
        socket.on('userStoppedTyping', onUserStoppedTyping);
        socket.on('messagesRead', onMessagesRead);
        
        window.addEventListener('paste', handlePaste);

        return () => {
            socket.off('newMessage', onNewMessage);
            socket.off('userTyping', onUserTyping);
            socket.off('userStoppedTyping', onUserStoppedTyping);
            socket.off('messagesRead', onMessagesRead);
            window.removeEventListener('paste', handlePaste);
        };
    }, [ticketId, user.UserID]);

    // Effect para scroll solo en nuevos mensajes (después de la carga inicial)
    useEffect(() => {
        if (!isInitialLoad && messages.length > 0) {
            scrollToBottomSmooth();
        }
    }, [messages, typingUser, isInitialLoad]);

    const handleTyping = () => {
        socket.emit('typing', { ticketId, userName: user.FullName });
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            socket.emit('stopTyping', ticketId);
        }, 2000);
    };

    const handleFileChange = (e) => {
        if (e.target.files[0]) {
            setAttachedFile(e.target.files[0]);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (newMessage.trim() === '' && !attachedFile) return;

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        socket.emit('stopTyping', ticketId);

        const formData = new FormData();
        formData.append('messageText', newMessage);
        if (attachedFile) {
            formData.append('file', attachedFile);
        }

        try {
            await ticketService.addMessage(ticketId, formData);
            setNewMessage('');
            setAttachedFile(null);
        } catch (error) {
            console.error("Error al enviar mensaje:", error);
        }
    };

    // Determinar la altura del contenedor principal
    const containerHeight = isExpanded ? 'h-full' : 'h-[62vh]';
    const containerStyle = isExpanded ? { height: '100%', ...style } : style;

    return (
        <>
            <div className={`relative ${containerHeight} flex flex-col ${className}`} style={containerStyle}>
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-40 -right-40 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
                </div>

                <div className={`relative bg-gray-900/70 backdrop-blur-xl border border-cyan-400/20 ${isExpanded ? 'rounded-none' : 'rounded-2xl'} overflow-hidden shadow-2xl flex flex-col h-full`}>
                    <div className="relative px-6 py-4 bg-gradient-to-r from-gray-900/90 via-gray-800/90 to-gray-900/90 border-b border-cyan-400/20 flex-shrink-0">
    <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
            <div className="relative">
                <Zap className="w-6 h-6 text-cyan-400" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-400 rounded-full animate-ping opacity-75"></div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-400 rounded-full"></div>
            </div>
            <div>
                <h3 className="text-xl font-bold font-mono bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                    Chat Interno
                </h3>
                <div className="text-xs text-gray-400 mt-0.5 flex items-center space-x-3">
                    <span>Ticket #{ticketId}</span>
                    <span className="text-gray-600">|</span>
                    
                    {/* Indicador de usuarios en línea mejorado */}
                    <div className="flex items-center space-x-2">
                        <div className="relative group">
                            <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
                                currentOnlineUsers.length > 1 
                                    ? 'bg-emerald-400 shadow-emerald-400/50 shadow-sm animate-pulse' 
                                    : 'bg-gray-500'
                            }`}></div>
                            {currentOnlineUsers.length > 1 && (
                                <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-400 animate-ping opacity-30"></div>
                            )}
                        </div>
                        <span className={`font-medium transition-colors duration-300 ${
                            currentOnlineUsers.length > 1 ? 'text-emerald-400' : 'text-gray-500'
                        }`}>
                            {currentOnlineUsers.length} {currentOnlineUsers.length === 1 ? 'usuario' : 'usuarios'}
                        </span>
                    </div>

                    <span className="text-gray-600">|</span>

                    {/* Indicador de conexión estético */}
                    <div className="flex items-center space-x-2">
                        <div className="relative group cursor-help" title={`Estado: ${currentIsConnected ? 'Conectado' : 'Desconectado'}`}>
                            <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
                                currentIsConnected 
                                    ? 'bg-cyan-400 shadow-cyan-400/50 shadow-sm' 
                                    : 'bg-red-500 shadow-red-500/50 shadow-sm'
                            }`}></div>
                            {currentIsConnected && (
                                <div className="absolute inset-0 w-2 h-2 rounded-full bg-cyan-400 animate-ping opacity-20"></div>
                            )}
                        </div>
                        <span className={`text-xs font-medium transition-colors duration-300 ${
                            currentIsConnected ? 'text-cyan-400' : 'text-red-400'
                        }`}>
                            {currentIsConnected ? 'Conectado' : 'Sin conexión'}
                        </span>
                    </div>
                    
                </div>
            </div>
        </div>
        
        {/* Opcional: Indicador visual más prominente del estado de conexión */}
        <div className="flex items-center space-x-2">
            <div className={`relative px-3 py-1 rounded-full text-xs font-medium transition-all duration-300 ${
                currentIsConnected 
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                    : 'bg-red-500/20 text-red-300 border border-red-500/30'
            }`}>
                <div className={`absolute inset-0 rounded-full blur-sm ${
                    currentIsConnected ? 'bg-emerald-400/10' : 'bg-red-400/10'
                } animate-pulse`}></div>
                <span className="relative flex items-center space-x-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${
                        currentIsConnected ? 'bg-emerald-400' : 'bg-red-400'
                    }`}></div>
                    <span className="uppercase tracking-wider">
                        {currentIsConnected ? 'Online' : 'Offline'}
                    </span>
                </span>
            </div>
        </div>
    </div>
</div>

                    {/* Contenedor de chat con flex-col-reverse para comportamiento tipo WhatsApp */}
                    <div 
                        ref={chatContainerRef} 
                        className="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-gray-800/50 scrollbar-thumb-cyan-500/30 min-h-0"
                        style={{ 
                            display: 'flex',
                            flexDirection: 'column-reverse',
                            maxHeight: isExpanded ? 'calc(100% - 120px)' : 'auto'
                        }}
                    >
                        {/* Contenedor interno para mantener el orden correcto de los mensajes */}
                        <div className="px-6 py-4 space-y-4" style={{ 
                            display: 'flex',
                            flexDirection: 'column'
                        }}>
                            
                            {/* Indicador de typing siempre al final (que aparece primero por el reverse) */}
                            {typingUser && (
                                <div className="flex justify-start">
                                    <div className="group relative max-w-md">
                                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-purple-500/20 animate-pulse blur-sm"></div>
                                        <div className="relative p-4 rounded-2xl bg-gradient-to-br from-gray-700/60 via-gray-600/50 to-purple-700/30 border border-purple-400/40 backdrop-blur-sm">
                                            <div className="flex items-center space-x-2 mb-2">
                                                <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></div>
                                                <p className="font-bold text-purple-300 text-sm">{typingUser}</p>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <span className="text-gray-300 text-sm">está escribiendo</span>
                                                <div className="flex space-x-1">
                                                    <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></span>
                                                    <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
                                                    <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Mensajes en orden correcto */}
                            {messages.map(msg => (
                                <React.Fragment key={msg.MessageID}>
                                    {msg.MessageID === firstUnreadId && (
                                        <div className="flex items-center my-6">
                                            <div className="flex-grow h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent"></div>
                                            <div className="relative px-4 py-1 bg-cyan-400/10 backdrop-blur-sm rounded-full border border-cyan-400/30">
                                                <span className="text-xs text-cyan-400 font-bold tracking-wider">MENSAJES NUEVOS</span>
                                                <div className="absolute inset-0 bg-cyan-400/5 rounded-full animate-pulse"></div>
                                            </div>
                                            <div className="flex-grow h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent"></div>
                                        </div>
                                    )}
                                    
                                    <div className={`flex ${msg.SenderID === user.UserID ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`group relative max-w-md`}>
                                            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-500/0 via-cyan-500/10 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"></div>
                                            <div className={`relative p-4 rounded-2xl backdrop-blur-sm transition-all duration-300 group-hover:scale-[1.02] ${
                                                msg.SenderID === user.UserID 
                                                    ? 'bg-gradient-to-br from-cyan-600/30 via-cyan-500/20 to-blue-600/30 border border-cyan-400/40 shadow-lg shadow-cyan-500/10' 
                                                    : 'bg-gradient-to-br from-gray-700/40 via-gray-600/30 to-gray-700/40 border border-gray-500/30 shadow-lg shadow-gray-500/10'
                                            }`}>
                                                <div className="flex items-center space-x-2 mb-2">
                                                    <div className={`w-2 h-2 rounded-full ${msg.SenderID === user.UserID ? 'bg-cyan-400' : 'bg-purple-400'} animate-pulse`}></div>
                                                    <p className={`font-bold text-sm ${msg.SenderID === user.UserID ? 'text-cyan-300' : 'text-purple-300'}`}>
                                                        {msg.SenderFullName}
                                                    </p>
                                                </div>
                                                
                                                {msg.FileURL && (
                                                    <div className="my-2">
                                                        {msg.FileType.startsWith('image/') ? (
                                                            <img 
                                                                src={msg.FileURL} 
                                                                alt={msg.FileName} 
                                                                className="rounded-lg max-w-xs max-h-64 object-cover cursor-pointer" 
                                                                onClick={() => handleImageClick(msg.FileURL)}
                                                            />
                                                        ) : (
                                                            <a href={msg.FileURL} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2 p-2 bg-gray-700/50 rounded-lg hover:bg-gray-600/50">
                                                                <FileIcon className="w-6 h-6 text-cyan-400" />
                                                                <span className="text-sm text-gray-300 truncate">{msg.FileName}</span>
                                                            </a>
                                                        )}
                                                    </div>
                                                )}

                                                {msg.MessageText && <p className="text-white leading-relaxed">{msg.MessageText}</p>}
                                                
                                                <div className="flex items-center justify-end space-x-2 mt-2">
                                                    <p className="text-xs text-gray-400 font-mono">
                                                        {(() => {
                                                            const timeMatch = msg.SentAt.match(/T(\d{2}):(\d{2})/);
                                                            if (timeMatch) {
                                                                return `${timeMatch[1]}:${timeMatch[2]}`;
                                                            }
                                                            return 'Hora no disponible';
                                                        })()}
                                                    </p>
                                                    {msg.SenderID === user.UserID && (
                                                        <div className="flex items-center">
                                                            {msg.IsRead ? (
                                                                <CheckCheck className="w-4 h-4 text-cyan-400 animate-pulse" /> 
                                                            ) : (
                                                                <Check className="w-4 h-4 text-gray-500" />
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </React.Fragment>
                            ))}
                        </div>
                    </div>

                    <div className="relative px-6 py-4 bg-gradient-to-r from-gray-900/95 via-gray-800/95 to-gray-900/95 border-t border-cyan-400/20 flex-shrink-0">
                        {attachedFile && (
                            <div className="mb-3 p-2 bg-gray-800/50 rounded-lg flex items-center justify-between">
                                <div className="flex items-center space-x-2 overflow-hidden">
                                    {attachedFile.type.startsWith('image/') ? (
                                        <img src={URL.createObjectURL(attachedFile)} alt="preview" className="w-10 h-10 rounded object-cover" />
                                    ) : (
                                        <FileIcon className="w-8 h-8 text-cyan-400 flex-shrink-0" />
                                    )}
                                    <span className="text-sm text-gray-300 truncate">{attachedFile.name}</span>
                                </div>
                                <button onClick={() => setAttachedFile(null)} className="p-1 text-gray-400 hover:text-white">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        )}
                        
                        <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                            <button 
                                type="button" 
                                onClick={() => fileInputRef.current.click()}
                                className="group relative p-3 bg-gray-700/50 text-gray-300 rounded-xl hover:text-white transition-all duration-300 flex-shrink-0"
                            >
                                <Paperclip className="w-6 h-6" />
                            </button>

                            <div className="relative flex-1">
                                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 rounded-xl blur-sm"></div>
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => {
                                        setNewMessage(e.target.value);
                                        handleTyping();
                                    }}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(e)}
                                    placeholder="Escribe tu mensaje..."
                                    className="relative w-full px-4 py-3 bg-gray-800/70 backdrop-blur-sm border border-cyan-400/30 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400/60 focus:bg-gray-800/90 transition-all duration-300 font-medium"
                                />
                                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-400/0 via-cyan-400/5 to-purple-400/0 opacity-0 focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                            </div>
                            
                            <button 
                                type="submit" 
                                className="group relative p-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-cyan-500/25 transition-all duration-300 transform hover:scale-105 flex-shrink-0"
                            >
                                <SendHorizontal className="w-6 h-6" />
                            </button>
                        </form>
                    </div>
                </div>
            </div>
            
            <Lightbox
                open={lightboxOpen}
                close={() => setLightboxOpen(false)}
                slides={imageMessages}
                index={imageIndex}
                plugins={[Captions, Download, Thumbnails, Zoom]}
                styles={{ container: { backgroundColor: "rgba(0, 0, 0, .8)", backdropFilter: "blur(8px)" } }}
                zoom={{
                    maxZoomPixelRatio: 3,
                    doubleClickDelay: 300,
                }}
                thumbnails={{
                    border: 0,
                    borderRadius: 8,
                }}
                captions={{
                    descriptionTextAlign: "center",
                }}
            />
        </>
    );
};

export default TicketChat;