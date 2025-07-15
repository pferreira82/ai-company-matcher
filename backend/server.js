const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Add process timing
const startTime = Date.now();
console.log('🚀 Starting AI Company Matcher backend...');

// Import logger with fallback
let logger;
try {
    logger = require('./utils/logger');
    logger.info(`⏱️  Logger initialized (${Date.now() - startTime}ms)`);
} catch (error) {
    // Fallback logger if utils/logger doesn't exist
    logger = {
        info: console.log,
        error: console.error,
        warn: console.warn,
        debug: console.debug
    };
    logger.info(`⏱️  Fallback logger initialized (${Date.now() - startTime}ms)`);
}

// Initialize Express app FIRST
const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

logger.info(`⚡ Express app initialized (${Date.now() - startTime}ms)`);

// Security middleware
app.use(helmet());
app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        process.env.FRONTEND_URL || 'http://localhost:3000'
    ],
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200,
    message: 'Too many requests from this IP'
});
app.use(limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

logger.info(`🔧 Middleware configured (${Date.now() - startTime}ms)`);

// Initialize models to check for any schema issues
try {
    logger.info(`📄 Loading UserProfile model... (${Date.now() - startTime}ms)`);
    require('./models/UserProfile');
    logger.info(`✅ UserProfile model loaded (${Date.now() - startTime}ms)`);

    logger.info(`📄 Loading Company model... (${Date.now() - startTime}ms)`);
    require('./models/Company');
    logger.info(`✅ Company model loaded (${Date.now() - startTime}ms)`);

    logger.info(`📄 Loading SearchJob model... (${Date.now() - startTime}ms)`);
    require('./models/SearchJob');
    logger.info(`✅ SearchJob model loaded (${Date.now() - startTime}ms)`);

    logger.info(`📄 All models loaded successfully (${Date.now() - startTime}ms)`);
} catch (modelError) {
    logger.error(`❌ Failed to load models at ${Date.now() - startTime}ms:`, {
        message: modelError.message,
        stack: modelError.stack,
        name: modelError.name
    });

    logger.error('Model loading failed - this may cause issues later');
}

// Database connection
logger.info(`🔌 Attempting to connect to MongoDB... (${Date.now() - startTime}ms)`);
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ai-company-matcher')
    .then(() => {
        logger.info(`✅ Connected to MongoDB successfully (${Date.now() - startTime}ms)`);
        return mongoose.connection.db.admin().ping();
    })
    .then(() => {
        logger.info(`📊 MongoDB ping successful (${Date.now() - startTime}ms)`);
    })
    .catch(err => {
        logger.error(`❌ MongoDB connection failed at ${Date.now() - startTime}ms:`, {
            message: err.message,
            code: err.code,
            name: err.name
        });
        logger.warn('⚠️  Continuing without MongoDB - some features may not work');
    });

// MongoDB connection events
mongoose.connection.on('error', (err) => {
    logger.error('💥 MongoDB connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
    logger.warn('🔌 MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
    logger.info('🔄 MongoDB reconnected');
});

// Redis connection
let redisAvailable = false;
try {
    const redis = require('redis');

    const client = redis.createClient({
        url: process.env.REDIS_URL || 'redis://127.0.0.1:6379'
    });

    client.on('connect', () => {
        redisAvailable = true;
        logger.info(`✅ Connected to Redis (${Date.now() - startTime}ms)`);
    });

    client.on('error', (err) => {
        redisAvailable = false;
        logger.warn('⚠️  Redis not available:', err.message);
        logger.warn('⚠️  Search jobs will run synchronously without queue');
    });

    // Connect to Redis
    client.connect()
        .then(() => {
            redisAvailable = true;
            logger.info(`✅ Redis connection established (${Date.now() - startTime}ms)`);
        })
        .catch(err => {
            redisAvailable = false;
            logger.warn(`⚠️  Redis connection failed at ${Date.now() - startTime}ms:`, err.message);
            logger.warn('⚠️  Search jobs will run synchronously without queue');
        });

} catch (error) {
    redisAvailable = false;
    logger.warn(`⚠️  Redis not configured, search jobs will run synchronously (${Date.now() - startTime}ms)`);
}

// Import and register routes
try {
    logger.info(`📁 Loading routes... (${Date.now() - startTime}ms)`);

    const profileRoutes = require('./routes/profile');
    logger.info(`✅ Profile routes loaded (${Date.now() - startTime}ms)`);

    const searchRoutes = require('./routes/aiSearch');
    logger.info(`✅ Search routes loaded (${Date.now() - startTime}ms)`);

    const companyRoutes = require('./routes/companies');
    logger.info(`✅ Company routes loaded (${Date.now() - startTime}ms)`);

    const emailRoutes = require('./routes/emails');
    logger.info(`✅ Email routes loaded (${Date.now() - startTime}ms)`);

    const configRoutes = require('./routes/config');
    logger.info(`✅ Config routes loaded (${Date.now() - startTime}ms)`);

    // Register routes with app
    app.use('/api/profile', profileRoutes);
    app.use('/api/search', searchRoutes);
    app.use('/api/companies', companyRoutes);
    app.use('/api/matches', companyRoutes);
    app.use('/api/email', emailRoutes);
    app.use('/api/config', configRoutes);

    logger.info(`📁 All routes registered successfully (${Date.now() - startTime}ms)`);

} catch (routeError) {
    logger.error(`❌ Failed to load routes at ${Date.now() - startTime}ms:`, {
        message: routeError.message,
        stack: routeError.stack,
        name: routeError.name
    });

    logger.error('Route loading failed - server may not work properly');
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        services: {
            mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
            redis: redisAvailable ? 'connected' : 'not available'
        }
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'AI Company Matcher Backend',
        version: '1.0.0',
        status: 'running',
        endpoints: {
            health: '/health',
            profile: '/api/profile',
            search: '/api/search',
            matches: '/api/matches',
            email: '/api/email',
            config: '/api/config'
        }
    });
});

// API status endpoint
app.get('/api/status', (req, res) => {
    res.json({
        backend: 'connected',
        mongodb: mongoose.connection.readyState === 1,
        redis: redisAvailable,
        timestamp: new Date().toISOString()
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error('Express error occurred:', err.message);
    res.status(500).json({
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ message: `Endpoint not found: ${req.method} ${req.path}` });
});

// Start server
let server;
try {
    server = app.listen(PORT, HOST, () => {
        logger.info(`🚀 Server running on http://${HOST}:${PORT} (${Date.now() - startTime}ms)`);
        logger.info(`📊 Health check: http://${HOST}:${PORT}/health`);
        logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);

        // Log service status after a delay
        setTimeout(() => {
            logger.info(`📊 Service Status:`);
            logger.info(`   MongoDB: ${mongoose.connection.readyState === 1 ? '✅ Connected' : '❌ Disconnected'}`);
            logger.info(`   Redis: ${redisAvailable ? '✅ Connected' : '⚠️  Not Available'}`);
            logger.info(`   Real-time features: ${redisAvailable ? '✅ Enabled' : '⚠️  Limited (no queue)'}`);
            logger.info(`🎉 Server startup completed! Total time: ${Date.now() - startTime}ms`);
        }, 1000);
    });

    server.on('error', (err) => {
        logger.error('Server error:', err.message);

        if (err.code === 'EADDRINUSE') {
            logger.error(`Port ${PORT} is already in use. Please stop the other service or change the port.`);
        }
    });
} catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
}

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    server.close(() => {
        mongoose.connection.close(false, () => {
            logger.info('Server and database connections closed');
            process.exit(0);
        });
    });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.error('🚨 Unhandled Promise Rejection!');
    logger.error('Reason:', reason);

    if (process.env.NODE_ENV === 'production') {
        logger.error('Shutting down due to unhandled rejection');
        server.close(() => {
            process.exit(1);
        });
    } else {
        logger.warn('Continuing in development mode despite unhandled rejection');
    }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    logger.error('🚨 Uncaught Exception!');
    logger.error('Error:', err.message);

    if (process.env.NODE_ENV === 'production') {
        logger.error('Shutting down due to uncaught exception');
        process.exit(1);
    } else {
        logger.warn('Continuing in development mode despite uncaught exception');
    }
});

module.exports = app;