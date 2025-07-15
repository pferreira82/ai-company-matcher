const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const profileRoutes = require('./routes/profile');
const searchRoutes = require('./routes/aiSearch');
const companyRoutes = require('./routes/companies');
const emailRoutes = require('./routes/emails');
const configRoutes = require('./routes/config');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

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

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ai-company-matcher', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => logger.info('✅ Connected to MongoDB'))
    .catch(err => logger.error('❌ MongoDB connection error:', err));

// Test Redis connection (optional)
let redisAvailable = false;
try {
    const redis = require('redis');
    const client = redis.createClient({
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: process.env.REDIS_PORT || 6379
    });

    client.on('connect', () => {
        redisAvailable = true;
        logger.info('✅ Connected to Redis');
    });

    client.on('error', (err) => {
        redisAvailable = false;
        logger.warn('⚠️  Redis not available:', err.message);
        logger.warn('⚠️  Search jobs will run synchronously without queue');
    });
} catch (error) {
    logger.warn('⚠️  Redis not configured, search jobs will run synchronously');
}

// Routes
app.use('/api/profile', profileRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/matches', companyRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/config', configRoutes);

// Health check
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
    logger.error(err.stack);
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
const server = app.listen(PORT, HOST, () => {
    logger.info(`🚀 AI Company Matcher server running on http://${HOST}:${PORT}`);
    logger.info(`📊 Health check: http://${HOST}:${PORT}/health`);
    logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);

    // Log service status
    setTimeout(() => {
        logger.info(`📊 Service Status:`);
        logger.info(`   MongoDB: ${mongoose.connection.readyState === 1 ? '✅ Connected' : '❌ Disconnected'}`);
        logger.info(`   Redis: ${redisAvailable ? '✅ Connected' : '⚠️  Not Available'}`);
    }, 2000);
});

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

module.exports = app;