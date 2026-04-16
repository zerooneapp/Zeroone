const { Server } = require('socket.io');

let io;

/**
 * Initializes the Socket.io server with CORS and room-based messaging.
 */
const initSocket = (server) => {
  const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*';
  io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log(`[SOCKET] User connected: ${socket.id}`);

    // Targeted Room Joining (User specific)
    socket.on('join', (userId) => {
      if (userId) {
        socket.join(String(userId));
        console.log(`[SOCKET] User ${userId} joined their private room.`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[SOCKET] User disconnected: ${socket.id}`);
    });
  });

  return io;
};

/**
 * Global getter for the IO instance
 */
const getIO = () => {
  if (!io) {
    throw new Error('Socket.io must be initialized before use.');
  }
  return io;
};

/**
 * Convenience method to emit a notification to a specific user
 */
const emitNotification = (userId, notification) => {
  if (io) {
    io.to(String(userId)).emit('new_notification', notification);
    console.log(`[SOCKET] Emitted realtime alert to user ${userId}`);
  }
};

module.exports = { initSocket, getIO, emitNotification };
