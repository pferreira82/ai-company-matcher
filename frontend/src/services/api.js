import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Create axios instance with default config
const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Request interceptor
api.interceptors.request.use(
    (config) => {
        // Add auth token if available
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor
api.interceptors.response.use(
    (response) => response,
    (error) => {
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

// Export default api instance
export default api;