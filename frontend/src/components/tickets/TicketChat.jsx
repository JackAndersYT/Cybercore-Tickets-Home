import React, { useState, useEffect, useContext, useRef, useMemo } from 'react';
import { AuthContext } from '../../context/AuthContext';
import ticketService from '../../services/ticketService';
import socket from '../../services/socket';
import { Check, CheckCheck, Zap, SendHorizontal, Paperclip, X, File as FileIcon, User, Users } from 'lucide-react';
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
    ticketStatus,
    isExpanded = false,
    className = '',
    style = {},
    onlineUsers = [],
    isSocketConnected = false,
    disableSocketManagement = false
}) => {
    const isReadOnly = ticketStatus === 'Cancelado' || ticketStatus === 'Cerrado';
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

    const [localIsConnected, setLocalIsConnected] = useState(socket.connected);
    const [localOnlineUsers, setLocalOnlineUsers] = useState([]);

    const currentIsConnected = disableSocketManagement ? isSocketConnected : localIsConnected;
    const currentOnlineUsers = disableSocketManagement ? onlineUsers : localOnlineUsers;

    // Función para obtener la URL completa del archivo
    const getFullFileUrl = (url) => {
        if (!url) return '';
        if (url.startsWith('http')) return url;
        return `${API_BASE_URL}${url}`;
    };

    // Obtener el nombre del otro usuario en el chat
    const otherUserName = useMemo(() => {
        console.log('Messages for otherUserName:', messages);
        console.log('Current UserID:', user.UserID);
        if (messages.length > 0) {
            const otherMessage = messages.find(msg => msg.SenderID !== user.UserID);
            return otherMessage ? otherMessage.SenderFullName : 'Chat';
        }
        return 'Chat';
    }, [messages, user.UserID]);

    // Verificar si el otro usuario está en línea
    const isOtherUserOnline = useMemo(() => {
        return currentOnlineUsers.some(u => u.UserID !== user.UserID);
    }, [currentOnlineUsers, user.UserID]);

    const imageMessages = useMemo(() =>
        messages.filter(msg => msg.FileURL && msg.FileType.startsWith('image/'))
                .map(msg => ({
                    src: getFullFileUrl(msg.FileURL),
                    title: msg.FileName,
                    description: `Enviado por: ${msg.SenderFullName}`
                }))
    , [messages]);

    // Agrupar mensajes consecutivos del mismo usuario
    const groupedMessages = useMemo(() => {
        const groups = [];
        let currentGroup = null;

        messages.forEach(msg => {
            const msgDate = new Date(msg.SentAt);
            const msgDateStr = msgDate.toLocaleDateString();

            if (!currentGroup ||
                currentGroup.senderId !== msg.SenderID ||
                currentGroup.date !== msgDateStr ||
                (new Date(msg.SentAt) - new Date(currentGroup.messages[currentGroup.messages.length - 1].SentAt)) > 60000) {
                currentGroup = {
                    senderId: msg.SenderID,
                    senderName: msg.SenderFullName,
                    date: msgDateStr,
                    messages: [msg],
                    isOwn: msg.SenderID === user.UserID
                };
                groups.push(currentGroup);
            } else {
                currentGroup.messages.push(msg);
            }
        });

        return groups;
    }, [messages, user.UserID]);

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

    const scrollToBottom = () => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    };

    useEffect(() => {
        const roomName = String(ticketId);
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

        if (!disableSocketManagement) {
            const joinRoom = () => {
                socket.emit('joinTicketRoom', { ticketId: roomName, user });
            };

            if (!socket.connected) {
                socket.connect();
                socket.once('connect', joinRoom);
            } else {
                joinRoom();
            }

            const onConnect = () => {
                setLocalIsConnected(true);
                joinRoom();
            };

            const onDisconnect = () => {
                setLocalIsConnected(false);
            };

            socket.on('connect', onConnect);
            socket.on('disconnect', onDisconnect);

            socket.on('roomUsersUpdate', (usersInRoom) => {
                setLocalOnlineUsers(usersInRoom);
            });

            return () => {
                socket.emit('leaveTicketRoom', roomName);
                socket.off('connect', onConnect);
                socket.off('disconnect', onDisconnect);
                socket.off('roomUsersUpdate');
                socket.off('connect', joinRoom); // Clean up the 'once' listener
            };
        }
    }, [ticketId, user, disableSocketManagement]); // Updated dependencies

    useEffect(() => {
        const onNewMessage = (message) => {
            setTypingUser(null);
            setMessages(prevMessages => {
                if (prevMessages.some(m => m.MessageID === message.MessageID)) {
                    return prevMessages;
                }
                return [...prevMessages, message];
            });

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

    useEffect(() => {
        scrollToBottom();
    }, [messages, typingUser]);

    const handleTyping = () => {
        const roomName = String(ticketId);
        socket.emit('typing', { ticketId: roomName, userName: user.FullName });
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            socket.emit('stopTyping', roomName);
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
        socket.emit('stopTyping', String(ticketId));

        const formData = new FormData();
        formData.append('messagetext', newMessage);
        if (attachedFile) {
            formData.append('file', attachedFile);
        }

        const currentNewMessage = newMessage;
        const currentAttachedFile = attachedFile;
        setNewMessage('');
        setAttachedFile(null);

        try {
            const sentMessage = await ticketService.addMessage(ticketId, formData, socket.id);
            
            setMessages(prevMessages => [...prevMessages, sentMessage]);

        } catch (error) {
            console.error("Error al enviar mensaje:", error);
            setNewMessage(currentNewMessage);
            setAttachedFile(currentAttachedFile);
        }
    };

    const formatTime = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false });
    };

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return 'Hoy';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Ayer';
        } else {
            return date.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' });
        }
    };

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
                    {/* Header simplificado estilo WhatsApp */}
                    <div className="relative px-6 py-4 bg-gradient-to-r from-gray-900/90 via-gray-800/90 to-gray-900/90 border-b border-cyan-400/20 flex-shrink-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                {/* Avatar del usuario */}
                                <div className="relative">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500/30 to-purple-500/30 flex items-center justify-center border border-cyan-400/30">
                                        <User className="w-6 h-6 text-cyan-400" />
                                    </div>
                                    {isOtherUserOnline && (
                                        <>
                                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-gray-900"></div>
                                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full animate-ping opacity-75"></div>
                                        </>
                                    )}
                                </div>

                                {/* Información del usuario */}
                                <div>
                                    <h3 className="text-lg font-semibold text-white">
                                        {otherUserName}
                                    </h3>
                                    <div className="flex items-center space-x-2">
                                        {typingUser ? (
                                            <span className="text-xs text-cyan-400 font-medium animate-pulse">
                                                escribiendo...
                                            </span>
                                        ) : isOtherUserOnline ? (
                                            <span className="text-xs text-emerald-400">
                                                en línea
                                            </span>
                                        ) : (
                                            <span className="text-xs text-gray-400">
                                                Ticket #{ticketId}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Estado de conexión mejorado */}
                            {currentOnlineUsers.length > 0 && (
                                <div className="flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-slate-800/60 via-slate-700/50 to-slate-800/60 backdrop-blur-sm border border-cyan-400/40 rounded-xl shadow-lg hover:shadow-cyan-400/20 transition-all duration-300">
                                        <div className="relative">
                                            <Users className="w-4 h-4 text-cyan-400" />
                                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                                        </div>
                                        <span className="text-sm text-cyan-400 font-semibold">
                                            {currentOnlineUsers.length}
                                        </span>
                                    </div>
                            )}
                        </div>
                    </div>

                    {/* Contenedor de mensajes */}
                    <div
                        ref={chatContainerRef}
                        className="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-gray-800/50 scrollbar-thumb-cyan-500/30"
                        style={{ overflowAnchor: 'none' }}
                    >
                        <div className="px-4 py-4 space-y-4">
                            {groupedMessages.map((group, groupIndex) => {
                                const showDate = groupIndex === 0 ||
                                    groupedMessages[groupIndex - 1].date !== group.date;

                                return (
                                    <div key={`group-${groupIndex}`}>
                                        {/* Separador de fecha */}
                                        {showDate && (
                                            <div className="flex justify-center my-4">
                                                <div className="px-3 py-1 bg-gray-800/60 backdrop-blur-sm rounded-full">
                                                    <span className="text-xs text-gray-400 font-medium">
                                                        {formatDate(group.messages[0].SentAt)}
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Indicador de mensajes nuevos */}
                                        {group.messages.some(msg => msg.MessageID === firstUnreadId) && (
                                            <div className="flex items-center my-4">
                                                <div className="flex-grow h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent"></div>
                                                <div className="px-3 py-1 bg-cyan-400/10 backdrop-blur-sm rounded-full border border-cyan-400/30">
                                                    <span className="text-xs text-cyan-400 font-bold tracking-wider">MENSAJES NUEVOS</span>
                                                </div>
                                                <div className="flex-grow h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent"></div>
                                            </div>
                                        )}

                                        {/* Grupo de mensajes */}
                                        <div className={`flex ${group.isOwn ? 'justify-end' : 'justify-start'} mb-1`}>
                                            <div className={`max-w-[70%] space-y-1`}>
                                                {group.messages.map((msg, msgIndex) => (
                                                    <div key={msg.MessageID} className={`flex ${group.isOwn ? 'justify-end' : 'justify-start'}`}>
                                                        <div className={`group relative ${group.isOwn ? 'ml-12' : 'mr-12'}`}>
                                                            <div className={`relative px-4 py-2 backdrop-blur-sm transition-all duration-200 hover:scale-[1.02] ${
                                                                group.isOwn
                                                                    ? 'bg-gradient-to-br from-cyan-600/30 via-cyan-500/20 to-blue-600/30 border border-cyan-400/30 rounded-2xl rounded-br-md'
                                                                    : 'bg-gradient-to-br from-purple-800/30 via-violet-700/20 to-indigo-800/30 border border-purple-400/30 rounded-2xl rounded-bl-md'
                                                            } ${msgIndex === 0 ? (group.isOwn ? 'rounded-tr-2xl' : 'rounded-tl-2xl') : ''}
                                                               ${msgIndex === group.messages.length - 1 ? (group.isOwn ? 'rounded-br-2xl' : 'rounded-bl-2xl') : ''}`}>

                                                                {/* Archivo adjunto */}
                                                                {msg.FileURL && (
                                                                    <div className="mb-2">
                                                                        {msg.FileType.startsWith('image/') ? (
                                                                            <img
                                                                                src={getFullFileUrl(msg.FileURL)}
                                                                                alt={msg.FileName}
                                                                                className="rounded-lg max-w-full max-h-64 object-cover cursor-pointer"
                                                                                onClick={() => handleImageClick(getFullFileUrl(msg.FileURL))}
                                                                            />
                                                                        ) : (
                                                                            <a href={getFullFileUrl(msg.FileURL)} target="_blank" rel="noopener noreferrer"
                                                                               className="flex items-center space-x-2 p-2 bg-gray-700/50 rounded-lg hover:bg-gray-600/50 transition-colors">
                                                                                <FileIcon className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                                                                                <span className="text-sm text-gray-300 truncate">{msg.FileName}</span>
                                                                            </a>
                                                                        )}
                                                                    </div>
                                                                )}

                                                                {/* Texto del mensaje */}
                                                                {msg.MessageText && (
                                                                    <p className="text-white text-sm leading-relaxed break-words">
                                                                        {msg.MessageText}
                                                                    </p>
                                                                )}

                                                                {/* Hora y estado (solo en el último mensaje del grupo) */}
                                                                {msgIndex === group.messages.length - 1 && (
                                                                    <div className="flex items-center justify-end space-x-1 mt-1">
                                                                        <span className="text-xs text-gray-400">
                                                                            {formatTime(msg.SentAt)}
                                                                        </span>
                                                                        {group.isOwn && (
                                                                            <div className="flex items-center">
                                                                                {msg.IsRead ? (
                                                                                    <CheckCheck className="w-3.5 h-3.5 text-cyan-400" />
                                                                                ) : (
                                                                                    <Check className="w-3.5 h-3.5 text-gray-400" />
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Indicador de escribiendo al final */}
                            {typingUser && (
                                <div className="flex justify-start">
                                    <div className="max-w-[70%]">
                                        <div className="group relative mr-12">
                                            <div className="relative px-4 py-3 rounded-2xl rounded-bl-md bg-gradient-to-br from-purple-600/30 via-fuchsia-500/20 to-purple-700/30 border border-purple-400/30">
                                                <div className="flex items-center space-x-1">
                                                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                                                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
                                                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Barra de entrada de mensaje */}
                    <div className="relative px-4 py-3 bg-gradient-to-r from-gray-900/95 via-gray-800/95 to-gray-900/95 border-t border-cyan-400/20 flex-shrink-0">
                        {isReadOnly ? (
                            <div className="text-center py-2 text-sm text-slate-400 font-medium bg-slate-800/50 rounded-full">
                                El chat está deshabilitado para tickets en estado "{ticketStatus}".
                            </div>
                        ) : (
                            <>
                                {attachedFile && (
                                    <div className="mb-2 p-2 bg-gray-800/50 rounded-lg flex items-center justify-between">
                                        <div className="flex items-center space-x-2 overflow-hidden">
                                            {attachedFile.type.startsWith('image/') ? (
                                                <img src={URL.createObjectURL(attachedFile)} alt="preview" className="w-10 h-10 rounded object-cover" />
                                            ) : (
                                                <FileIcon className="w-8 h-8 text-cyan-400 flex-shrink-0" />
                                            )}
                                            <span className="text-sm text-gray-300 truncate">{attachedFile.name}</span>
                                        </div>
                                        <button
                                            onClick={() => setAttachedFile(null)}
                                            className="p-1 text-gray-400 hover:text-white transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}

                                <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" disabled={isReadOnly} />

                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current.click()}
                                        className="p-2.5 text-gray-400 hover:text-cyan-400 transition-colors"
                                        disabled={isReadOnly}
                                    >
                                        <Paperclip className="w-5 h-5" />
                                    </button>

                                    <div className="relative flex-1">
                                        <input
                                            type="text"
                                            value={newMessage}
                                            onChange={(e) => {
                                                setNewMessage(e.target.value);
                                                handleTyping();
                                            }}
                                            placeholder={isReadOnly ? "Chat deshabilitado" : "Escribe un mensaje..."}
                                            className="w-full px-4 py-2.5 bg-gray-800/70 backdrop-blur-sm border border-cyan-400/20 rounded-full text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400/40 focus:bg-gray-800/90 transition-all duration-200 text-sm"
                                            disabled={isReadOnly}
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isReadOnly || (!newMessage.trim() && !attachedFile)}
                                        className={`p-2.5 rounded-full transition-all duration-200 ${
                                            !isReadOnly && (newMessage.trim() || attachedFile)
                                                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:shadow-lg hover:shadow-cyan-500/25 transform hover:scale-105'
                                                : 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
                                        }`}
                                    >
                                        <SendHorizontal className="w-5 h-5" />
                                    </button>
                                </form>
                            </>
                        )}
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