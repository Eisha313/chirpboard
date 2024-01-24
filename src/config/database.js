const mongoose = require('mongoose');

const connectDatabase = async () => {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/chirpboard';
    
    const options = {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
    };

    try {
        const connection = await mongoose.connect(mongoUri, options);
        console.log(`MongoDB connected: ${connection.connection.host}`);
        
        mongoose.connection.on('error', (err) => {
            console.error('MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.warn('MongoDB disconnected. Attempting to reconnect...');
        });

        mongoose.connection.on('reconnected', () => {
            console.log('MongoDB reconnected');
        });

        return connection;
    } catch (error) {
        console.error('Failed to connect to MongoDB:', error.message);
        process.exit(1);
    }
};

const disconnectDatabase = async () => {
    try {
        await mongoose.connection.close();
        console.log('MongoDB connection closed');
    } catch (error) {
        console.error('Error closing MongoDB connection:', error.message);
    }
};

module.exports = {
    connectDatabase,
    disconnectDatabase
};
