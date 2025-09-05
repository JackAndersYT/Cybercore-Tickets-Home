import { io } from 'socket.io-client';
import { API_BASE_URL } from '../config';

// Explicitly specify WebSocket transport and disable polling
const socket = io(API_BASE_URL, {
  autoConnect: false,
  transports: ['websocket'],
});

export default socket;
