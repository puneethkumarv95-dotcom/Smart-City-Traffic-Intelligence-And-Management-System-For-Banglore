require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const connectDB = require('./config/db');
const initSocketIO = require('./sockets/socketHandler');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: [
      process.env.CLIENT_URL || 'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173'
    ],
    credentials: true,
    methods: ['GET', 'POST']
  }
});

// Attach io instance to express app for use in controllers
app.set('io', io);

// Initialize Socket handlers
initSocketIO(io);

// Start Server after connecting to Database
const startServer = async () => {
  try {
    await connectDB();
    server.listen(PORT, () => {
      logger.info(`=======================================================`);
      logger.info(`  Smart City Traffic Intelligence System Backend (SCTIMS)`);
      logger.info(`  Running on port: http://localhost:${PORT}`);
      logger.info(`  Health check:    http://localhost:${PORT}/api/health`);
      logger.info(`  Environment:     ${process.env.NODE_ENV || 'development'}`);
      logger.info(`=======================================================`);
    });
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

// Server event error handling (e.g. EADDRINUSE port binding protection)
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    logger.error(`Port ${PORT} is already in use by another process. Please free port ${PORT} or configure a different PORT.`);
  } else {
    logger.error(`Server network error: ${err.message}`);
  }
  process.exit(1);
});

// Graceful process shutdown
const gracefulShutdown = () => {
  logger.info('Received shutdown signal. Closing HTTP and Socket.IO servers cleanly...');
  server.close(() => {
    logger.info('HTTP server closed successfully.');
    process.exit(0);
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

startServer();

module.exports = { server, app };

