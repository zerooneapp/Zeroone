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

    // Join a specific vendor's room for status updates
    socket.on('join_vendor', (vendorId) => {
      if (vendorId) {
        socket.join(`vendor_${vendorId}`);
        console.log(`[SOCKET] Socket ${socket.id} watching vendor: ${vendorId}`);
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

/**
 * Broadcast shop status change to both vendor and customers watching the shop
 */
const emitShopStatusUpdate = (ownerId, vendorId, statusData) => {
  if (io) {
    // 1. Tell the vendor (for dashboard toggle)
    if (ownerId) io.to(String(ownerId)).emit('SHOP_STATUS_UPDATED', statusData);
    
    // 2. Tell the customers (for live status badge/button)
    if (vendorId) io.to(`vendor_${vendorId}`).emit('SHOP_STATUS_UPDATED', statusData);
    
    console.log(`[SOCKET] Broadcasted status update for vendor ${vendorId}`);
  }
};

module.exports = { initSocket, getIO, emitNotification, emitShopStatusUpdate };
