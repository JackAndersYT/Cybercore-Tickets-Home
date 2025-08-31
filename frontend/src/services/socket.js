import { io } from 'socket.io-client';
import { API_BASE_URL } from '../config'; // 1. Importar la URL base

// 2. Usar la variable importada para la URL del socket
const socket = io(API_BASE_URL, { autoConnect: false });

export default socket;
