const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");
const { checkDbConnection } = require('./config/db');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const corsOptions = {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true
};
app.use(cors(corsOptions));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

app.use((req, res, next) => {
    req.io = io;
    next();
});

// Rutas
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/tickets', require('./routes/ticket.routes'));
app.use('/api/dashboard', require('./routes/dashboard.routes'));
app.use('/api/auth', require('./routes/auth.routes')); // Nueva ruta de autenticación

const ticketRooms = {};

io.on('connection', (socket) => {
    console.log(`Usuario conectado: ${socket.id}`);

    socket.on('joinTicketRoom', ({ ticketId, user }) => {
        const roomName = String(ticketId);
        socket.join(roomName);
        if (!ticketRooms[roomName]) ticketRooms[roomName] = [];
        if (!ticketRooms[roomName].some(u => u.userId === user.UserID)) {
            ticketRooms[roomName].push({ userId: user.UserID, userName: user.FullName, socketId: socket.id });
        }
        io.to(roomName).emit('roomUsersUpdate', ticketRooms[roomName]);
    });

    socket.on('leaveTicketRoom', (ticketId) => {
        const roomName = String(ticketId);
        socket.leave(roomName);
        if (ticketRooms[roomName]) {
            ticketRooms[roomName] = ticketRooms[roomName].filter(u => u.socketId !== socket.id);
            io.to(roomName).emit('roomUsersUpdate', ticketRooms[roomName]);
        }
    });

    socket.on('typing', ({ ticketId, userName }) => {
        const roomName = String(ticketId);
        socket.to(roomName).emit('userTyping', { userName });
    });

    socket.on('stopTyping', (ticketId) => {
        const roomName = String(ticketId);
        socket.to(roomName).emit('userStoppedTyping');
    });

    socket.on('disconnect', () => {
        console.log(`Usuario desconectado: ${socket.id}`);
        for (const ticketId in ticketRooms) {
            const roomName = String(ticketId);
            ticketRooms[roomName] = ticketRooms[roomName].filter(u => u.socketId !== socket.id);
            io.to(roomName).emit('roomUsersUpdate', ticketRooms[roomName]);
        }
    });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`Servidor CyberCore escuchando en el puerto ${PORT}`);
    checkDbConnection();
});
