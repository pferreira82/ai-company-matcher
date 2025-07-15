const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Create logs directory if it doesn't exist
const logDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, stack }) => {
        return `${timestamp} [${level.toUpperCase()}]: ${message}${stack ? '\n' + stack : ''}`;
    })
);

// Create logger instance
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: { service: 'ai-company-matcher' },
    transports: [
        // Error log file
        new winston.transports.File({
            filename: path.join(logDir, 'error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 3,
        }),

        // Combined log file
        new winston.transports.File({
            filename: path.join(logDir, 'combined.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),

        // Search activity log (for debugging AI searches)
        new winston.transports.File({
            filename: path.join(logDir, 'search-activity.log'),
            level: 'info',
            maxsize: 10485760, // 10MB
            maxFiles: 3,
        })
    ]
});

// Console transport for development
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        )
    }));
}

// Add search-specific logging methods
logger.searchInfo = (message, data = null) => {
    const logMessage = data ? `${message} ${JSON.stringify(data)}` : message;
    logger.info(`[SEARCH] ${logMessage}`);
};

logger.searchError = (message, error = null) => {
    const errorMessage = error ? `${message} - ${error.message}` : message;
    logger.error(`[SEARCH] ${errorMessage}`, error);
};

logger.apiLog = (service, action, data = null) => {
    const logMessage = data ? `${service} ${action}: ${JSON.stringify(data)}` : `${service} ${action}`;
    logger.info(`[API] ${logMessage}`);
};

// Log system startup info
logger.info('Logger initialized', {
    logLevel: process.env.LOG_LEVEL || 'info',
    nodeEnv: process.env.NODE_ENV || 'development',
    logDir: logDir
});

module.exports = logger;