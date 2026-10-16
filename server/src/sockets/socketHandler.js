const { verifyAccessToken } = require('../config/jwt');
const User = require('../models/User');
const logger = require('../utils/logger');

const initSocketIO = (io) => {
  // Socket authentication middleware
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        // Allow unauthenticated connection as guest (e.g., public live map updates)
        socket.user = null;
        return next();
      }

      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.id).select('-password');
      if (user && user.isActive) {
        socket.user = user;
      }
      next();
    } catch (err) {
      // If token is invalid, proceed as guest without error to prevent crashing reconnect loops
      socket.user = null;
      next();
    }
  });

  io.on('connection', (socket) => {
    const userRole = socket.user ? socket.user.role : 'guest';
    const userId = socket.user ? socket.user._id.toString() : 'guest';

    logger.info(`Socket connected: ${socket.id} | User: ${userId} (${userRole})`);

    // Join general traffic channel
    socket.join('channel:public-traffic');

    // If authenticated, join user-specific and role-specific channels
    if (socket.user) {
      socket.join(`user:${userId}`);
      socket.join(`role:${userRole}`);

      if (socket.user.assignedZone) {
        socket.join(`zone:${socket.user.assignedZone.toString()}`);
      }
    }

    // Allow subscribing to specific zone feeds
    socket.on('subscribe:zone', (zoneCode) => {
      if (zoneCode) {
        socket.join(`zone:${zoneCode.toUpperCase()}`);
        logger.info(`Socket ${socket.id} joined zone:${zoneCode.toUpperCase()}`);
      }
    });

    socket.on('unsubscribe:zone', (zoneCode) => {
      if (zoneCode) {
        socket.leave(`zone:${zoneCode.toUpperCase()}`);
      }
    });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

module.exports = initSocketIO;

