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

// const corsOptions = {
//     origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
//     credentials: true
// };
// app.use(cors(corsOptions));

const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
    req.io = io;
    next();
});

app.use('/api/users', require('./routes/user.routes'));
app.use('/api/tickets', require('./routes/ticket.routes'));
app.use('/api/dashboard', require('./routes/dashboard.routes'));
// En backend/src/index.js, debajo de app.use(express.json());
app.use('/uploads', express.static('uploads'));

const ticketRooms = {};

io.on('connection', (socket) => {
    console.log(`Usuario conectado: ${socket.id}`);

    socket.on('joinTicketRoom', ({ ticketId, user }) => {
        socket.join(ticketId);
        
        if (!ticketRooms[ticketId]) {
            ticketRooms[ticketId] = [];
        }
        if (!ticketRooms[ticketId].some(u => u.userId === user.UserID)) {
            ticketRooms[ticketId].push({ userId: user.UserID, userName: user.FullName, socketId: socket.id });
        }

        io.to(ticketId).emit('roomUsersUpdate', ticketRooms[ticketId]);
        console.log(`Usuarios en ticket ${ticketId}:`, ticketRooms[ticketId].map(u=>u.userName));
    });

    // --- INICIO DE LA MODIFICACIÓN ---
    // Nuevo evento para cuando un usuario sale de la vista del chat
    socket.on('leaveTicketRoom', (ticketId) => {
        socket.leave(ticketId);
        if (ticketRooms[ticketId]) {
            // Eliminar al usuario de la sala
            ticketRooms[ticketId] = ticketRooms[ticketId].filter(u => u.socketId !== socket.id);
            // Notificar a los usuarios restantes
            io.to(ticketId).emit('roomUsersUpdate', ticketRooms[ticketId]);
            console.log(`Usuario ${socket.id} salió de la sala del ticket ${ticketId}`);
        }
    });
    // --- FIN DE LA MODIFICACIÓN ---

    socket.on('typing', ({ ticketId, userName }) => {
        socket.to(ticketId).emit('userTyping', { userName });
    });

    socket.on('stopTyping', (ticketId) => {
        socket.to(ticketId).emit('userStoppedTyping');
    });

    socket.on('disconnect', () => {
        console.log(`Usuario desconectado: ${socket.id}`);
        for (const ticketId in ticketRooms) {
            const userIndex = ticketRooms[ticketId].findIndex(u => u.socketId === socket.id);
            if (userIndex !== -1) {
                ticketRooms[ticketId].splice(userIndex, 1);
                io.to(ticketId).emit('roomUsersUpdate', ticketRooms[ticketId]);
                console.log(`Usuarios restantes en ticket ${ticketId}:`, ticketRooms[ticketId].map(u=>u.userName));
                break;
            }
        }
    });
});

server.listen(PORT, () => {
    console.log(`Servidor CyberCore escuchando en el puerto ${PORT}`);
    checkDbConnection();
});
