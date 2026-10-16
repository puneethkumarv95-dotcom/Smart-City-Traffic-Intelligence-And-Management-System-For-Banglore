const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smart_city_traffic';
  try {
    const conn = await mongoose.connect(uri, {
      autoIndex: true
    });
    logger.info(`MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    logger.error(`MongoDB Connection Error: ${error.message}`);
    // In production we would exit, but during bootstrapping we want clear logging
    throw error;
  }
};

module.exports = connectDB;

