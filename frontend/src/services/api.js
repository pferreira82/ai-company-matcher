import axios from 'axios';
import apiLogger from './apiLogger';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Create axios instance with default config
const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Request interceptor with logging
api.interceptors.request.use(
    (config) => {
        // Add auth token if available
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // Add timestamp for duration calculation
        config.metadata = { startTime: Date.now() };

        // Log the request
        apiLogger.logRequest(config);

        return config;
    },
    (error) => {
        apiLogger.logError(error);
        return Promise.reject(error);
    }
);

// Response interceptor with logging
api.interceptors.response.use(
    (response) => {
        // Calculate request duration
        const duration = response.config.metadata
            ? Date.now() - response.config.metadata.startTime
            : null;

        // Log the response
        apiLogger.logResponse(response, duration);

        if (response.status === 401) {
            // Handle unauthorized access
            localStorage.removeItem('token');
            window.location.href = '/login';
        }

        return response;
    },
    (error) => {
        // Calculate request duration for failed requests
        const duration = error.config?.metadata
            ? Date.now() - error.config.metadata.startTime
            : null;

        // Log the error
        apiLogger.logError(error);

        if (error.response?.status === 401) {
            // Handle unauthorized access
            localStorage.removeItem('token');
            window.location.href = '/login';
        }

        return Promise.reject(error);
    }
);

// Profile API
export const profileAPI = {
    get: () => api.get('/profile'),
    save: (profile) => api.post('/profile', profile),
    analyze: (profile) => api.post('/profile/analyze', profile)
};

// Search API
export const searchAPI = {
    start: (params) => api.post('/search/ai-powered', params),
    getProgress: (jobId) => api.get(`/search/progress${jobId ? `/${jobId}` : ''}`),
    pause: () => api.post('/search/pause'),
    getHistory: () => api.get('/search/history')
};

// Companies API
export const companiesAPI = {
    getAll: (params) => api.get('/matches', { params }),
    getById: (id) => api.get(`/companies/${id}`),
    updateStatus: (id, status) => api.put(`/companies/${id}/status`, { status }),
    addNote: (id, note) => api.post(`/companies/${id}/notes`, { note }),
    getMatches: (params) => api.get('/matches', { params })
};

// Email API
export const emailAPI = {
    generate: (companyId, profile) => api.post(`/email/generate/${companyId}`, { profile }),
    getTemplates: () => api.get('/email/templates'),
    saveTemplate: (template) => api.post('/email/templates', template)
};

// Config API
export const configAPI = {
    saveApiKeys: (keys) => api.post('/config/api-keys', keys),
    testConnection: (apiName, key) => api.post('/config/test-connection', { apiName, apiKey: key }),
    getSettings: () => api.get('/config/settings'),
    updateSettings: (settings) => api.put('/config/settings', settings)
};

// Debug API (for accessing logger)
export const debugAPI = {
    getLogs: () => apiLogger.getLogs(),
    clearLogs: () => apiLogger.clearLogs(),
    exportLogs: () => apiLogger.exportLogs(),
    getStats: () => apiLogger.getStats(),
    toggleLogging: () => apiLogger.toggle(),
    isLoggingEnabled: () => apiLogger.isEnabled()
};

// Export default api instance and logger
export default api;
export { apiLogger };