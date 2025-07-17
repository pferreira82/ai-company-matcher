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

// Enhanced Profile API
export const profileAPI = {
    get: () => api.get('/profile'),
    save: (profile) => api.post('/profile', profile),
    analyze: (profile) => api.post('/profile/analyze', profile),
    getProfile: () => api.get('/profile'),
    saveProfile: (profile) => api.post('/profile', profile),
    updateProfile: (updates) => api.put('/profile', updates),
    deleteProfile: () => api.delete('/profile'),

    // New methods from merged file
    analyzeProfile: (resume, personalStatement) => api.post('/profile/analyze', { resume, personalStatement }),
    getStats: () => api.get('/profile/stats'),
    addInteraction: (interaction) => api.post('/profile/interactions', interaction),
    getRecentInteractions: (limit = 10) => api.get(`/profile/interactions/recent?limit=${limit}`),
    updateSettings: (settings) => api.put('/profile/settings', settings)
};

// Enhanced Search API
export const searchAPI = {
    start: (params) => api.post('/search/ai-powered', params),
    getProgress: (jobId) => api.get(`/search/progress${jobId ? `/${jobId}` : ''}`),
    pause: () => api.post('/search/pause'),
    getHistory: () => api.get('/search/history'),
    startSearch: (params) => api.post('/ai-search/start', params),
    getSearchStatus: (jobId) => api.get(`/ai-search/status/${jobId}`),
    pauseSearch: (jobId) => api.post(`/ai-search/pause/${jobId}`),
    resumeSearch: (jobId) => api.post(`/ai-search/resume/${jobId}`),
    cancelSearch: (jobId) => api.post(`/ai-search/cancel/${jobId}`),
    getSearchHistory: () => api.get('/ai-search/history')
};

// Enhanced Companies API
export const companiesAPI = {
    // Your existing methods that work
    getAll: (params) => api.get('/matches', { params }),
    getById: (id) => api.get(`/companies/${id}`),
    updateStatus: (id, status) => api.put(`/companies/${id}/status`, { status }),
    addNote: (id, note) => api.post(`/companies/${id}/notes`, { note }),
    getMatches: (params) => api.get('/companies', { params }), // Changed to /companies since it works

    // Enhanced methods
    searchAdvanced: (filters = {}) => {
        const cleanFilters = Object.keys(filters).reduce((acc, key) => {
            if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
                acc[key] = filters[key];
            }
            return acc;
        }, {});

        return api.get('/companies/search/advanced', { params: cleanFilters });
    },

    getCompany: (id) => api.get(`/companies/${id}`),
    deleteCompany: (id) => api.delete(`/companies/${id}`),
    getStats: () => api.get('/companies/stats/summary'),

    bulkUpdate: (companyIds, updates) => {
        return api.put('/companies/bulk', { companyIds, updates });
    },

    exportData: (filters = {}) => {
        const cleanFilters = Object.keys(filters).reduce((acc, key) => {
            if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
                acc[key] = filters[key];
            }
            return acc;
        }, {});

        return api.get('/companies/export', { params: cleanFilters });
    },

    // New methods from merged file
    bulkDelete: (companyIds) => {
        return api.delete('/companies/bulk', { data: { companyIds } });
    },

    advancedSearch: (params = {}) => {
        const cleanParams = Object.keys(params).reduce((acc, key) => {
            if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
                acc[key] = params[key];
            }
            return acc;
        }, {});

        return api.get('/companies/search/advanced', { params: cleanParams });
    },

    getMinimal: () => api.get('/companies/minimal')
};

// Enhanced Email API
export const emailAPI = {
    generate: (companyId, profile) => api.post(`/emails/generate/${companyId}`, { profile }),
    getTemplates: () => api.get('/emails/templates'),
    saveTemplate: (template) => api.post('/emails/templates', template),

    getHistory: (params = {}) => {
        const cleanParams = Object.keys(params).reduce((acc, key) => {
            if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
                acc[key] = params[key];
            }
            return acc;
        }, {});

        return api.get('/emails/history', { params: cleanParams });
    },

    markAsSent: (companyId, emailIndex) => {
        return api.put(`/emails/history/${companyId}/${emailIndex}/sent`);
    },

    getStats: () => api.get('/emails/stats'),

    bulkGenerate: (companyIds, profile) => {
        return api.post('/emails/bulk-generate', { companyIds, profile });
    }
};

// Config API
export const configAPI = {
    saveApiKeys: (keys) => api.post('/config/api-keys', keys),
    testConnection: (apiName, key) => api.post('/config/test-connection', { apiName, apiKey: key }),
    getSettings: () => api.get('/config/settings'),
    updateSettings: (settings) => api.put('/config/settings', settings),
    getSystemStatus: () => api.get('/config/status')
};

// Analytics API
export const analyticsAPI = {
    getDashboardStats: () => api.get('/analytics/dashboard'),
    getEmailMetrics: (dateRange = {}) => api.get('/analytics/emails', { params: dateRange }),
    getSearchMetrics: (dateRange = {}) => api.get('/analytics/search', { params: dateRange }),
    getCompanyMetrics: (dateRange = {}) => api.get('/analytics/companies', { params: dateRange })
};

// Debug API
export const debugAPI = {
    getLogs: () => apiLogger.getLogs(),
    clearLogs: () => apiLogger.clearLogs(),
    exportLogs: () => apiLogger.exportLogs(),
    getStats: () => apiLogger.getStats(),
    toggleLogging: () => apiLogger.toggle(),
    isLoggingEnabled: () => apiLogger.isEnabled()
};

// Utility functions
export const dataUtils = {
    transformCompanyForTable: (company) => {
        return {
            ...company,
            id: company.id || company._id,
            workLifeBalanceScore: company.workLifeBalance?.score || 0,
            hrContact: company.hrContacts && company.hrContacts.length > 0 ? company.hrContacts[0] : null,
            contactCount: company.hrContacts?.length || 0,
            verifiedContactCount: company.hrContacts?.filter(c => c.verified).length || 0,
            emailCount: company.emailHistory?.length || 0,
            lastEmailDate: company.emailHistory?.length > 0
                ? new Date(company.emailHistory[company.emailHistory.length - 1].generatedAt)
                : null,
            hasEmailSent: company.emailHistory?.some(email => email.sent) || false
        };
    },

    getEmailStatus: (company) => {
        if (!company.emailHistory || company.emailHistory.length === 0) {
            return { status: 'none', label: 'No emails', count: 0 };
        }

        const sentEmails = company.emailHistory.filter(email => email.sent);
        const draftEmails = company.emailHistory.filter(email => !email.sent);

        if (sentEmails.length > 0) {
            return {
                status: 'sent',
                label: `${sentEmails.length} sent`,
                count: sentEmails.length,
                lastSent: new Date(sentEmails[sentEmails.length - 1].generatedAt)
            };
        } else if (draftEmails.length > 0) {
            return {
                status: 'draft',
                label: `${draftEmails.length} draft${draftEmails.length > 1 ? 's' : ''}`,
                count: draftEmails.length
            };
        }

        return { status: 'none', label: 'No emails', count: 0 };
    },

    formatDate: (date) => {
        if (!date) return 'Never';

        const d = new Date(date);
        const now = new Date();
        const diffTime = Math.abs(now - d);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;

        return d.toLocaleDateString();
    },

    getMatchScoreColor: (score) => {
        if (score >= 90) return 'text-green-600 bg-green-100';
        if (score >= 80) return 'text-blue-600 bg-blue-100';
        if (score >= 70) return 'text-yellow-600 bg-yellow-100';
        return 'text-gray-600 bg-gray-100';
    },

    getStatusColor: (status) => {
        const colors = {
            'not-contacted': 'text-gray-600 bg-gray-100',
            'contacted': 'text-yellow-600 bg-yellow-100',
            'responded': 'text-blue-600 bg-blue-100',
            'interview': 'text-purple-600 bg-purple-100',
            'rejected': 'text-red-600 bg-red-100',
            'hired': 'text-green-600 bg-green-100'
        };
        return colors[status] || colors['not-contacted'];
    }
};

// Error handling utilities
export const errorUtils = {
    formatError: (error) => {
        if (typeof error === 'string') return error;
        if (error.message) return error.message;
        if (error.response?.data?.message) return error.response.data.message;
        return 'An unexpected error occurred';
    },

    isNetworkError: (error) => {
        return error.name === 'NetworkError' ||
            error.message.includes('fetch') ||
            error.message.includes('network') ||
            error.code === 'NETWORK_ERROR';
    },

    isAuthError: (error) => {
        return error.response?.status === 401 ||
            error.response?.status === 403 ||
            error.message.includes('unauthorized');
    },

    getUserMessage: (error) => {
        if (errorUtils.isNetworkError(error)) {
            return 'Network connection error. Please check your internet connection.';
        }

        if (errorUtils.isAuthError(error)) {
            return 'Authentication error. Please log in again.';
        }

        if (error.response?.status >= 500) {
            return 'Server error. Please try again later.';
        }

        return errorUtils.formatError(error);
    }
};

// Export default and named exports
export default api;
export { apiLogger };