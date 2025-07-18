// backend/server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
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

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

logger.info(`⚡ Express app initialized (${Date.now() - startTime}ms)`);

// Security middleware
app.use(helmet());

// CORS configuration
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

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging middleware
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`, {
        body: req.body,
        params: req.params,
        query: req.query
    });
    next();
});

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

// Redis connection (optional)
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

    const companiesRoutes = require('./routes/companies');
    logger.info(`✅ Companies routes loaded (${Date.now() - startTime}ms)`);

    const emailRoutes = require('./routes/emails');
    logger.info(`✅ Email routes loaded (${Date.now() - startTime}ms)`);

    const searchRoutes = require('./routes/aiSearch');
    logger.info(`✅ Search routes loaded (${Date.now() - startTime}ms)`);

    const configRoutes = require('./routes/config');
    logger.info(`✅ Config routes loaded (${Date.now() - startTime}ms)`);

    // Mount routes - preserving your existing paths
    app.use('/api/profile', profileRoutes);
    app.use('/api/companies', companiesRoutes);
    app.use('/api/emails', emailRoutes);  // Your existing email routes path
    app.use('/api/search', searchRoutes);
    app.use('/api/ai-search', searchRoutes); // Alternative path
    app.use('/api/config', configRoutes);

    logger.info(`📁 All routes registered successfully (${Date.now() - startTime}ms)`);

    // Add debugging:
    try {
        // Log all registered routes
        logger.info('Registered routes:');
        app._router.stack.forEach((middleware, index) => {
            if (middleware.route) {
                logger.info(`Route ${index}: ${Object.keys(middleware.route.methods)} ${middleware.route.path}`);
            } else if (middleware.name === 'router') {
                logger.info(`Router ${index}: ${middleware.regexp}`);
            }
        });
    } catch (debugError) {
        logger.error('Debug logging failed:', debugError);
    }

} catch (routeError) {
    logger.error(`❌ Failed to load routes at ${Date.now() - startTime}ms:`, {
        message: routeError.message,
        stack: routeError.stack,
        name: routeError.name
    });
    logger.error('Route loading failed - server may not work properly');
}

// Enhanced health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'AI Company Matcher API is running',
        timestamp: new Date().toISOString(),
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        routes: {
            profile: '/api/profile',
            companies: '/api/companies',
            emails: '/api/emails',
            search: '/api/search',
            config: '/api/config'
        },
        services: {
            mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
            redis: redisAvailable ? 'connected' : 'not available'
        }
    });
});

// Alternative health check endpoint
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
            companies: '/api/companies',
            emails: '/api/emails',
            search: '/api/search',
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

// 404 handler for API routes
app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
        logger.warn(`404 - Route not found: ${req.originalUrl}`);
        res.status(404).json({
            success: false,
            message: 'API endpoint not found',
            path: req.originalUrl
        });
    } else {
        next();
    }
});

// General 404 handler
app.use((req, res) => {
    res.status(404).json({ message: `Endpoint not found: ${req.method} ${req.path}` });
});

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// Enhanced MongoDB connection
logger.info(`🔌 Attempting to connect to MongoDB... (${Date.now() - startTime}ms)`);
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-company-matcher', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
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

// Start server
let server;
try {
    server = app.listen(PORT, HOST, () => {
        logger.info(`🚀 Server is running on http://${HOST}:${PORT} (${Date.now() - startTime}ms)`);
        logger.info(`📍 API endpoints available at http://${HOST}:${PORT}/api`);
        logger.info(`📊 Health check: http://${HOST}:${PORT}/api/health`);
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