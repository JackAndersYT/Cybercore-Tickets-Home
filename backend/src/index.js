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

const ticketRooms = {};

io.on('connection', (socket) => {
    console.log(`Usuario conectado: ${socket.id}`);

    socket.on('joinTicketRoom', ({ ticketId, user }) => {
        socket.join(ticketId);
        if (!ticketRooms[ticketId]) ticketRooms[ticketId] = [];
        if (!ticketRooms[ticketId].some(u => u.userId === user.UserID)) {
            ticketRooms[ticketId].push({ userId: user.UserID, userName: user.FullName, socketId: socket.id });
        }
        io.to(ticketId).emit('roomUsersUpdate', ticketRooms[ticketId]);
    });

    socket.on('leaveTicketRoom', (ticketId) => {
        socket.leave(ticketId);
        if (ticketRooms[ticketId]) {
            ticketRooms[ticketId] = ticketRooms[ticketId].filter(u => u.socketId !== socket.id);
            io.to(ticketId).emit('roomUsersUpdate', ticketRooms[ticketId]);
        }
    });

    socket.on('typing', ({ ticketId, userName }) => {
        socket.to(ticketId).emit('userTyping', { userName });
    });

    socket.on('stopTyping', (ticketId) => {
        socket.to(ticketId).emit('userStoppedTyping');
    });

    socket.on('disconnect', () => {
        console.log(`Usuario desconectado: ${socket.id}`);
        for (const ticketId in ticketRooms) {
            ticketRooms[ticketId] = ticketRooms[ticketId].filter(u => u.socketId !== socket.id);
            io.to(ticketId).emit('roomUsersUpdate', ticketRooms[ticketId]);
        }
    });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`Servidor CyberCore escuchando en el puerto ${PORT}`);
    checkDbConnection();
});
