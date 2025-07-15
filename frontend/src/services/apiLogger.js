// API Logger Service
class APILogger {
    constructor() {
        this.enabled = localStorage.getItem('apiLoggingEnabled') === 'true';
        this.logs = JSON.parse(localStorage.getItem('apiLogs') || '[]');
        this.maxLogs = 100; // Keep last 100 logs
    }

    toggle() {
        this.enabled = !this.enabled;
        localStorage.setItem('apiLoggingEnabled', this.enabled.toString());

        if (this.enabled) {
            console.log('🔍 API Logging ENABLED');
        } else {
            console.log('🔇 API Logging DISABLED');
        }

        return this.enabled;
    }

    isEnabled() {
        return this.enabled;
    }

    logRequest(config) {
        if (!this.enabled) return;

        const logEntry = {
            id: Date.now() + Math.random(),
            timestamp: new Date().toISOString(),
            type: 'REQUEST',
            method: config.method?.toUpperCase() || 'GET',
            url: config.url,
            headers: this.sanitizeHeaders(config.headers),
            data: this.sanitizeData(config.data),
            params: config.params
        };

        this.addLog(logEntry);

        console.group(`📤 API REQUEST: ${logEntry.method} ${logEntry.url}`);
        console.log('Headers:', logEntry.headers);
        if (logEntry.data) console.log('Data:', logEntry.data);
        if (logEntry.params) console.log('Params:', logEntry.params);
        console.groupEnd();
    }

    logResponse(response, duration = null) {
        if (!this.enabled) return;

        const logEntry = {
            id: Date.now() + Math.random(),
            timestamp: new Date().toISOString(),
            type: 'RESPONSE',
            method: response.config?.method?.toUpperCase() || 'GET',
            url: response.config?.url,
            status: response.status,
            statusText: response.statusText,
            headers: this.sanitizeHeaders(response.headers),
            data: this.sanitizeData(response.data),
            duration: duration
        };

        this.addLog(logEntry);

        const statusEmoji = response.status >= 200 && response.status < 300 ? '✅' : '❌';

        console.group(`📥 API RESPONSE: ${statusEmoji} ${logEntry.status} ${logEntry.method} ${logEntry.url}${duration ? ` (${duration}ms)` : ''}`);
        console.log('Status:', `${logEntry.status} ${logEntry.statusText}`);
        console.log('Headers:', logEntry.headers);
        console.log('Data:', logEntry.data);
        if (duration) console.log('Duration:', `${duration}ms`);
        console.groupEnd();
    }

    logError(error) {
        if (!this.enabled) return;

        const logEntry = {
            id: Date.now() + Math.random(),
            timestamp: new Date().toISOString(),
            type: 'ERROR',
            method: error.config?.method?.toUpperCase() || 'UNKNOWN',
            url: error.config?.url || 'UNKNOWN',
            message: error.message,
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: this.sanitizeData(error.response?.data)
        };

        this.addLog(logEntry);

        console.group(`🚨 API ERROR: ${logEntry.status || 'NETWORK'} ${logEntry.method} ${logEntry.url}`);
        console.error('Message:', logEntry.message);
        if (logEntry.status) console.error('Status:', `${logEntry.status} ${logEntry.statusText}`);
        if (logEntry.data) console.error('Error Data:', logEntry.data);
        console.groupEnd();
    }

    addLog(logEntry) {
        this.logs.unshift(logEntry); // Add to beginning

        // Keep only last maxLogs entries
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(0, this.maxLogs);
        }

        // Store in localStorage
        localStorage.setItem('apiLogs', JSON.stringify(this.logs));
    }

    getLogs() {
        return this.logs;
    }

    clearLogs() {
        this.logs = [];
        localStorage.removeItem('apiLogs');
        console.log('🗑️ API Logs cleared');
    }

    exportLogs() {
        const dataStr = JSON.stringify(this.logs, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `api-logs-${new Date().toISOString().split('T')[0]}.json`;
        link.click();

        URL.revokeObjectURL(url);
    }

    sanitizeHeaders(headers) {
        if (!headers) return {};

        const sanitized = { ...headers };

        // Remove sensitive headers
        delete sanitized.authorization;
        delete sanitized.Authorization;
        delete sanitized['X-Api-Key'];
        delete sanitized['x-api-key'];

        return sanitized;
    }

    sanitizeData(data) {
        if (!data) return null;

        // If it's a string, try to parse it
        if (typeof data === 'string') {
            try {
                data = JSON.parse(data);
            } catch {
                return data.length > 1000 ? data.substring(0, 1000) + '...' : data;
            }
        }

        // For objects, remove sensitive fields
        if (typeof data === 'object') {
            const sanitized = { ...data };

            // Remove API keys and sensitive data
            this.removeSensitiveFields(sanitized);

            return sanitized;
        }

        return data;
    }

    removeSensitiveFields(obj) {
        if (!obj || typeof obj !== 'object') return;

        const sensitiveKeys = [
            'apiKey', 'api_key', 'password', 'token', 'secret',
            'openai', 'hunter', 'apollo', 'clearbit', 'linkedin'
        ];

        for (const key in obj) {
            if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
                obj[key] = '[REDACTED]';
            } else if (typeof obj[key] === 'object') {
                this.removeSensitiveFields(obj[key]);
            }
        }
    }

    // Get summary stats
    getStats() {
        const total = this.logs.length;
        const requests = this.logs.filter(log => log.type === 'REQUEST').length;
        const responses = this.logs.filter(log => log.type === 'RESPONSE').length;
        const errors = this.logs.filter(log => log.type === 'ERROR').length;
        const successfulResponses = this.logs.filter(log =>
            log.type === 'RESPONSE' && log.status >= 200 && log.status < 300
        ).length;

        return {
            total,
            requests,
            responses,
            errors,
            successfulResponses,
            errorRate: responses > 0 ? ((errors / (responses + errors)) * 100).toFixed(1) : 0
        };
    }
}

// Create singleton instance
const apiLogger = new APILogger();

export default apiLogger;