import React, { useState, useEffect } from 'react';
import { User, Search, Database, Mail, Settings, Brain, Heart, MapPin, Bug, BarChart3, AlertCircle, CheckCircle, Clock, Eye, EyeOff, TestTube } from 'lucide-react';

// Components
import CompanyCard from './components/CompanyCard';
import EmailModal from './components/EmailModal';
import RealTimeStatsDashboard from './components/RealTimeStatsDashboard';
import CompaniesTable from './components/CompaniesTable';

// Hooks
import { useProfile } from './hooks/useProfile';
import { useSearch } from './hooks/useSearch';

// Services
import { companiesAPI, emailAPI, configAPI } from './services/api';

const App = () => {
    const [activeTab, setActiveTab] = useState('profile');
    const [companies, setCompanies] = useState([]);
    const [emailModal, setEmailModal] = useState({ isOpen: false, company: null, template: null });
    const [apiKeys, setApiKeys] = useState({
        openai: '',
        apollo: '',
        hunter: '',
        linkedin: '',
        crunchbase: ''
    });

    // API monitoring state
    const [apiLoading, setApiLoading] = useState(false);
    const [apiStatus, setApiStatus] = useState({
        openai: { connected: false, usage: null, limit: null, error: null },
        apollo: { connected: false, usage: null, limit: null, error: null },
        hunter: { connected: false, usage: null, limit: null, error: null }
    });
    const [showApiKeys, setShowApiKeys] = useState({
        openai: false,
        apollo: false,
        hunter: false
    });
    const [notifications, setNotifications] = useState([]);

    // Demo mode state
    const [demoMode, setDemoMode] = useState(false);

    // Custom hooks
    const { profile, loading: profileLoading, updateProfile, updatePreferences, saveProfile } = useProfile();
    const { searchStatus, startSearch, pauseSearch } = useSearch();

    // Load saved settings on mount
    useEffect(() => {
        loadSavedApiKeys();
        loadDemoMode();
    }, []);

    // Load saved demo mode setting
    const loadDemoMode = () => {
        const savedDemoMode = localStorage.getItem('ai-company-matcher-demo-mode');
        if (savedDemoMode === 'true') {
            setDemoMode(true);
        }
    };

    // Save demo mode setting
    const toggleDemoMode = () => {
        const newDemoMode = !demoMode;
        setDemoMode(newDemoMode);
        localStorage.setItem('ai-company-matcher-demo-mode', newDemoMode.toString());

        if (newDemoMode) {
            addNotification('Demo mode enabled - using sample data', 'info');
        } else {
            addNotification('Demo mode disabled - using production APIs', 'info');
        }
    };

    // Enhanced execute function with API monitoring
    const execute = async (apiCall, apiType = 'unknown') => {
        try {
            setApiLoading(true);
            const response = await apiCall();

            // Track API usage if headers contain usage info
            if (response.headers) {
                updateApiUsage(apiType, response.headers);
            }

            return { success: true, data: response.data };
        } catch (error) {
            console.error(`API Error (${apiType}):`, error);

            // Check for rate limit errors
            if (error.response?.status === 429) {
                addNotification(`${apiType} API rate limit reached!`, 'error');
                updateApiStatus(apiType, { rateLimited: true });
            }

            return {
                success: false,
                error: error.response?.data?.message || error.message
            };
        } finally {
            setApiLoading(false);
        }
    };

    // Load saved API keys from localStorage
    const loadSavedApiKeys = () => {
        try {
            const saved = localStorage.getItem('ai-company-matcher-api-keys');
            if (saved) {
                const parsedKeys = JSON.parse(saved);
                setApiKeys(parsedKeys);
                console.log('✅ Loaded saved API keys');

                // Test connections for saved keys
                Object.entries(parsedKeys).forEach(([key, value]) => {
                    if (value && value.trim()) {
                        testApiConnection(key, value);
                    }
                });
            }
        } catch (error) {
            console.error('Failed to load saved API keys:', error);
        }
    };

    // Enhanced API key saving
    const handleSaveApiKeys = async () => {
        try {
            setApiLoading(true);

            // Save to localStorage first
            localStorage.setItem('ai-company-matcher-api-keys', JSON.stringify(apiKeys));

            // Send to backend
            const result = await execute(() => configAPI.saveApiKeys(apiKeys), 'config');

            if (result.success) {
                addNotification('API keys saved successfully!', 'success');

                // Test all connections
                Object.entries(apiKeys).forEach(([key, value]) => {
                    if (value && value.trim()) {
                        testApiConnection(key, value);
                    }
                });
            } else {
                addNotification('Failed to save API keys: ' + result.error, 'error');
            }
        } catch (error) {
            console.error('Error saving API keys:', error);
            addNotification('Failed to save API keys', 'error');
        } finally {
            setApiLoading(false);
        }
    };

    // Enhanced API connection testing with error clearing
    const testApiConnection = async (apiName, apiKey) => {
        try {
            // Clear previous status first
            setApiStatus(prev => ({
                ...prev,
                [apiName]: {
                    connected: false,
                    usage: null,
                    limit: null,
                    error: null,
                    testing: true
                }
            }));

            const result = await execute(() => configAPI.testConnection(apiName, apiKey), apiName);

            if (result.success) {
                setApiStatus(prev => ({
                    ...prev,
                    [apiName]: {
                        connected: true,
                        usage: result.data.usage || null,
                        limit: result.data.limit || null,
                        message: result.data.message,
                        error: null,
                        testing: false
                    }
                }));
                console.log(`✅ ${apiName} connected successfully`);
            } else {
                setApiStatus(prev => ({
                    ...prev,
                    [apiName]: {
                        connected: false,
                        error: result.error,
                        testing: false
                    }
                }));
                console.error(`❌ ${apiName} connection failed:`, result.error);
            }
        } catch (error) {
            setApiStatus(prev => ({
                ...prev,
                [apiName]: {
                    connected: false,
                    error: error.message,
                    testing: false
                }
            }));
            console.error(`Error testing ${apiName}:`, error);
        }
    };

    // Test all API connections
    const testAllConnections = () => {
        // Clear all statuses first
        setApiStatus({
            openai: { connected: false, usage: null, limit: null, error: null, testing: true },
            apollo: { connected: false, usage: null, limit: null, error: null, testing: true },
            hunter: { connected: false, usage: null, limit: null, error: null, testing: true }
        });

        // Test each connection
        Object.entries(apiKeys).forEach(([key, value]) => {
            if (value && value.trim()) {
                testApiConnection(key, value);
            } else {
                setApiStatus(prev => ({
                    ...prev,
                    [key]: {
                        connected: false,
                        error: 'API key not provided',
                        testing: false
                    }
                }));
            }
        });
    };

    // Update API usage tracking
    const updateApiUsage = (apiType, headers) => {
        const usage = {
            openai: headers['x-ratelimit-remaining-tokens'],
            apollo: headers['x-credits-remaining'],
            hunter: headers['x-ratelimit-remaining']
        };

        if (usage[apiType]) {
            setApiStatus(prev => ({
                ...prev,
                [apiType]: {
                    ...prev[apiType],
                    usage: usage[apiType]
                }
            }));

            // Check if approaching limits
            const remaining = parseInt(usage[apiType]);
            if (remaining < 10) {
                addNotification(`${apiType} API usage low: ${remaining} calls remaining`, 'warning');
            }
        }
    };

    // Update API status
    const updateApiStatus = (apiType, status) => {
        setApiStatus(prev => ({
            ...prev,
            [apiType]: {
                ...prev[apiType],
                ...status
            }
        }));
    };

    // Add notification
    const addNotification = (message, type = 'info') => {
        const notification = {
            id: Date.now(),
            message,
            type,
            timestamp: new Date().toLocaleTimeString()
        };

        setNotifications(prev => [notification, ...prev.slice(0, 4)]); // Keep last 5

        // Auto-remove after 5 seconds
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== notification.id));
        }, 5000);
    };

    // Load companies
    const loadCompanies = async () => {
        console.log('🔍 Loading companies...');
        try {
            const result = await execute(() => companiesAPI.getMatches(), 'companies');
            console.log('📦 Raw API result:', result);

            if (result.success && result.data) {
                if (Array.isArray(result.data)) {
                    console.log('✅ Setting companies directly (array):', result.data.length, 'companies');
                    setCompanies(result.data);
                } else if (Array.isArray(result.data.data)) {
                    console.log('✅ Setting companies from data.data:', result.data.data.length, 'companies');
                    setCompanies(result.data.data);
                } else {
                    console.warn('⚠️ Unexpected data structure:', result.data);
                    setCompanies([]);
                }
            } else {
                console.warn('⚠️ API call unsuccessful:', result);
                setCompanies([]);
            }
        } catch (error) {
            console.error('❌ Error loading companies:', error);
            setCompanies([]);
        }
    };

    // Delete company
    const handleDeleteCompany = async (companyId) => {
        if (!confirm('Are you sure you want to delete this company? This action cannot be undone.')) {
            return;
        }

        const result = await execute(() => companiesAPI.deleteCompany(companyId), 'companies');
        if (result.success) {
            setCompanies(prev => prev.filter(c => (c.id || c._id) !== companyId));
            addNotification('Company deleted successfully', 'success');
        } else {
            addNotification('Failed to delete company: ' + result.error, 'error');
        }
    };

    // Delete without confirmation (for bulk operations)
    const handleDeleteCompanyNoConfirm = async (companyId) => {
        const result = await execute(() => companiesAPI.deleteCompany(companyId), 'companies');
        if (result.success) {
            setCompanies(prev => prev.filter(c => (c.id || c._id) !== companyId));
            return true;
        } else {
            addNotification('Failed to delete company: ' + result.error, 'error');
            return false;
        }
    };

    // Handle bulk delete with ONE confirmation
    const handleBulkDelete = async (companyIds) => {
        if (!confirm(`Are you sure you want to delete ${companyIds.length} selected companies? This action cannot be undone.`)) {
            return;
        }

        let successCount = 0;
        for (const companyId of companyIds) {
            const success = await handleDeleteCompanyNoConfirm(companyId);
            if (success) successCount++;
        }

        addNotification(`Deleted ${successCount} of ${companyIds.length} companies`, 'success');
    };

    const handleStartSearch = async () => {
        // In demo mode, allow search without API keys
        if (!demoMode && (!apiKeys.openai || !apiKeys.apollo)) {
            addNotification('Please configure OpenAI and Apollo API keys first, or enable demo mode', 'error');
            setActiveTab('config');
            return;
        }

        // Validate required fields
        if (!profile.resume || !profile.personalStatement) {
            addNotification('Please complete your resume and personal statement first', 'error');
            setActiveTab('profile');
            return;
        }

        if (!profile.personalInfo?.firstName || !profile.personalInfo?.email) {
            addNotification('Please add your name and email in the personal information section', 'error');
            setActiveTab('profile');
            return;
        }

        // Validate preferences
        if (!profile.preferences?.companySizes || profile.preferences.companySizes.length === 0) {
            addNotification('Please select at least one company size preference', 'error');
            setActiveTab('profile');
            return;
        }

        if (!profile.preferences?.industries || profile.preferences.industries.length === 0) {
            addNotification('Please select at least one industry preference', 'error');
            setActiveTab('profile');
            return;
        }

        if (demoMode) {
            addNotification('Starting demo search with sample data...', 'info');
        } else {
            addNotification('Starting AI search...', 'info');
        }

        const result = await startSearch({
            profile,
            location: 'boston-providence',
            maxResults: 1000,
            demoMode: demoMode // Pass demo mode to search
        });

        if (result.success) {
            setActiveTab('search');
            addNotification('Search started successfully!', 'success');
        } else {
            addNotification('Failed to start search: ' + result.error, 'error');
        }
    };

    const handleGenerateEmail = async (company) => {
        console.log('Generating email for company:', company);

        if (!profile.personalInfo?.firstName || !profile.personalInfo?.email) {
            addNotification('Please complete your personal information before generating emails', 'error');
            setActiveTab('profile');
            return;
        }

        try {
            setApiLoading(true);
            addNotification(`Generating email for ${company.name}...`, 'info');

            const result = await execute(() => emailAPI.generate(company.id || company._id, profile), 'openai');

            console.log('Email generation result:', result);

            if (result.success && result.data) {
                setEmailModal({
                    isOpen: true,
                    company,
                    template: result.data.data || result.data  // Handle nested data structure
                });
                addNotification(`Email generated for ${company.name}`, 'success');
            } else {
                console.error('Email generation failed:', result);
                addNotification('Failed to generate email: ' + (result.error || 'Unknown error'), 'error');
            }
        } catch (error) {
            console.error('Email generation error:', error);
            addNotification('Failed to generate email: ' + error.message, 'error');
        } finally {
            setApiLoading(false);
        }
    };

    const handleUpdateCompanyStatus = async (companyId, status) => {
        const result = await execute(() => companiesAPI.updateStatus(companyId, status), 'companies');
        if (result.success) {
            setCompanies(prev =>
                prev.map(c => (c.id === companyId || c._id === companyId) ? { ...c, status } : c)
            );
            addNotification('Company status updated', 'success');
        } else {
            addNotification('Failed to update status: ' + result.error, 'error');
        }
    };

    const handleSaveProfile = async () => {
        if (!profile.personalInfo?.firstName || !profile.personalInfo?.email) {
            addNotification('Please provide your name and email address', 'error');
            return;
        }

        if (!profile.resume || !profile.personalStatement) {
            addNotification('Please complete your resume and personal statement', 'error');
            return;
        }

        const result = await saveProfile(profile);
        if (result.success) {
            addNotification('Profile saved successfully!', 'success');
        } else {
            addNotification('Failed to save profile: ' + result.error, 'error');
        }
    };

    const renderProgressBar = () => {
        if (!searchStatus.isRunning && searchStatus.progress === 0) return null;

        return (
            <div className="bg-white p-6 rounded-lg border card">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>{searchStatus.currentStep || 'Initializing...'}</span>
                    <span>{searchStatus.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                    <div
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${searchStatus.progress}%` }}
                    />
                </div>

                {searchStatus.completed && (
                    <div className="bg-green-50 p-4 rounded-lg">
                        <h4 className="font-medium text-green-800 mb-2">Search Completed!</h4>
                        <p className="text-sm text-green-700">
                            Found {searchStatus.totalFound} companies with verified HR contacts for {profile.personalInfo?.firstName || 'you'}
                        </p>
                        {searchStatus.expandedNationwide && (
                            <p className="text-sm text-green-600 mt-1">
                                Expanded to nationwide search to find more matches.
                            </p>
                        )}
                    </div>
                )}
            </div>
        );
    };

    const getProfileCompleteness = () => {
        let completed = 0;
        let total = 8;

        if (profile.personalInfo?.firstName && profile.personalInfo?.lastName) completed++;
        if (profile.personalInfo?.email) completed++;
        if (profile.resume) completed++;
        if (profile.personalStatement) completed++;
        if (profile.currentTitle) completed++;
        if (profile.personalInfo?.location?.city) completed++;
        if (profile.preferences?.companySizes?.length > 0) completed++;
        if (profile.preferences?.industries?.length > 0) completed++;

        return { completed, total, percentage: Math.round((completed / total) * 100) };
    };

    const getApiStatusIcon = (status) => {
        if (status.testing) return <Clock className="w-4 h-4 text-blue-600 animate-spin" />;
        if (status.connected) return <CheckCircle className="w-4 h-4 text-green-600" />;
        if (status.rateLimited) return <Clock className="w-4 h-4 text-yellow-600" />;
        return <AlertCircle className="w-4 h-4 text-red-600" />;
    };

    const profileStats = getProfileCompleteness();

    useEffect(() => {
        loadCompanies();
    }, []);

    useEffect(() => {
        if (searchStatus.completed) {
            loadCompanies();
        }
    }, [searchStatus.completed]);

    return (
        <div className="min-h-screen bg-gradient-primary">
            {/* Notifications */}
            {notifications.length > 0 && (
                <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
                    {notifications.map(notification => (
                        <div
                            key={notification.id}
                            className={`p-4 rounded-lg shadow-lg border-l-4 ${
                                notification.type === 'success' ? 'bg-green-50 border-green-500' :
                                    notification.type === 'error' ? 'bg-red-50 border-red-500' :
                                        notification.type === 'warning' ? 'bg-yellow-50 border-yellow-500' :
                                            'bg-blue-50 border-blue-500'
                            }`}
                        >
                            <div className="flex items-start gap-2">
                                {notification.type === 'success' && <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />}
                                {notification.type === 'error' && <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />}
                                {notification.type === 'warning' && <Clock className="w-4 h-4 text-yellow-600 mt-0.5" />}
                                <div>
                                    <p className="text-sm font-medium">{notification.message}</p>
                                    <p className="text-xs text-gray-500 mt-1">{notification.timestamp}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="container mx-auto px-4 py-6 max-w-7xl">
                {/* Header */}
                <div className="card p-6 mb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Brain className="w-8 h-8 text-blue-600" />
                            <div>
                                <h1 className="text-3xl font-bold text-gradient">
                                    AI Company Matcher
                                </h1>
                                {profile.personalInfo?.firstName && (
                                    <p className="text-gray-600">
                                        Welcome back, {profile.personalInfo.firstName}!
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-6">
                            {/* Demo Mode Toggle */}
                            <div className="flex items-center gap-3">
                                <div className="text-right">
                                    <div className="text-sm text-gray-600 mb-1">Demo Mode</div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={toggleDemoMode}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                                demoMode ? 'bg-blue-600' : 'bg-gray-200'
                                            }`}
                                        >
                                            <span
                                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                    demoMode ? 'translate-x-6' : 'translate-x-1'
                                                }`}
                                            />
                                        </button>
                                        <TestTube className={`w-4 h-4 ${demoMode ? 'text-blue-600' : 'text-gray-400'}`} />
                                    </div>
                                </div>
                            </div>

                            {/* API Status Summary */}
                            <div className="text-right">
                                <div className="text-sm text-gray-600 mb-1">API Status</div>
                                <div className="flex items-center gap-2">
                                    {getApiStatusIcon(apiStatus.openai)}
                                    {getApiStatusIcon(apiStatus.apollo)}
                                    {getApiStatusIcon(apiStatus.hunter)}
                                </div>
                            </div>

                            {/* Profile Completeness */}
                            <div className="text-right">
                                <div className="text-sm text-gray-600 mb-1">Profile Completeness</div>
                                <div className="flex items-center gap-2">
                                    <div className="w-24 bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                            style={{ width: `${profileStats.percentage}%` }}
                                        />
                                    </div>
                                    <span className="text-sm font-medium text-gray-700">
                                        {profileStats.percentage}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                        <p className="text-gray-600">
                            Find companies that match your profile • {companies.length} companies found
                        </p>
                        {demoMode && (
                            <div className="flex items-center gap-2 text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                                <TestTube className="w-4 h-4" />
                                <span className="text-sm font-medium">Demo Mode Active</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Navigation */}
                <div className="card mb-6">
                    <div className="flex border-b overflow-x-auto">
                        {[
                            { id: 'profile', label: 'My Profile', icon: User },
                            { id: 'search', label: 'AI Search', icon: Search },
                            { id: 'matches', label: 'Company Database', icon: Database },
                            { id: 'emails', label: 'Email Guide', icon: Mail },
                            { id: 'config', label: 'API Config', icon: Settings }
                        ].map(tab => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-6 py-4 font-medium border-b-2 transition-colors whitespace-nowrap ${
                                        activeTab === tab.id
                                            ? 'border-blue-500 text-blue-600 bg-blue-50'
                                            : 'border-transparent text-gray-600 hover:text-gray-800'
                                    }`}
                                >
                                    <Icon className="w-5 h-5" />
                                    {tab.label}
                                    {tab.id === 'profile' && profileStats.percentage < 100 && (
                                        <div className="w-2 h-2 bg-orange-400 rounded-full" />
                                    )}
                                    {tab.id === 'matches' && companies.length > 0 && (
                                        <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                                            {companies.length}
                                        </span>
                                    )}
                                    {tab.id === 'config' && !demoMode && (!apiKeys.openai || !apiKeys.apollo) && (
                                        <AlertCircle className="w-4 h-4 text-red-500" />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    <div className="p-6">
                        {/* Profile Tab */}
                        {activeTab === 'profile' && (
                            <div className="space-y-6">
                                <h2 className="text-2xl font-bold text-gray-800">Your Professional Profile</h2>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="space-y-6">
                                        <div className="bg-gray-50 p-6 rounded-lg">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                First Name *
                                            </label>
                                            <input
                                                type="text"
                                                value={profile.personalInfo?.firstName || ''}
                                                onChange={(e) => updateProfile({
                                                    personalInfo: { ...profile.personalInfo, firstName: e.target.value }
                                                })}
                                                className="input"
                                                placeholder="Your first name"
                                                required
                                            />
                                        </div>

                                        <div className="bg-gray-50 p-6 rounded-lg">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Last Name *
                                            </label>
                                            <input
                                                type="text"
                                                value={profile.personalInfo?.lastName || ''}
                                                onChange={(e) => updateProfile({
                                                    personalInfo: { ...profile.personalInfo, lastName: e.target.value }
                                                })}
                                                className="input"
                                                placeholder="Your last name"
                                                required
                                            />
                                        </div>

                                        <div className="bg-gray-50 p-6 rounded-lg">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Email *
                                            </label>
                                            <input
                                                type="email"
                                                value={profile.personalInfo?.email || ''}
                                                onChange={(e) => updateProfile({
                                                    personalInfo: { ...profile.personalInfo, email: e.target.value }
                                                })}
                                                className="input"
                                                placeholder="your.email@example.com"
                                                required
                                            />
                                        </div>

                                        <div className="bg-gray-50 p-6 rounded-lg">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Current Title *
                                            </label>
                                            <input
                                                type="text"
                                                value={profile.currentTitle || ''}
                                                onChange={(e) => updateProfile({ currentTitle: e.target.value })}
                                                className="input"
                                                placeholder="e.g. Software Engineer, Product Manager"
                                                required
                                            />
                                        </div>

                                        <div className="bg-gray-50 p-6 rounded-lg">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Resume Content *
                                            </label>
                                            <textarea
                                                value={profile.resume || ''}
                                                onChange={(e) => updateProfile({ resume: e.target.value })}
                                                className="textarea h-40"
                                                placeholder="Paste your resume content here..."
                                                required
                                            />
                                        </div>

                                        <div className="bg-gray-50 p-6 rounded-lg">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Personal Statement *
                                            </label>
                                            <textarea
                                                value={profile.personalStatement || ''}
                                                onChange={(e) => updateProfile({ personalStatement: e.target.value })}
                                                className="textarea h-32"
                                                placeholder="What are you looking for in your next role?"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="bg-gray-50 p-6 rounded-lg">
                                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Work Preferences</h3>
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Company Sizes *
                                                    </label>
                                                    <div className="space-y-2">
                                                        {['startup', 'small', 'medium', 'large'].map(size => (
                                                            <label key={size} className="flex items-center gap-2">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={profile.preferences?.companySizes?.includes(size) || false}
                                                                    onChange={(e) => {
                                                                        const sizes = profile.preferences?.companySizes || [];
                                                                        if (e.target.checked) {
                                                                            updatePreferences({ companySizes: [...sizes, size] });
                                                                        } else {
                                                                            updatePreferences({ companySizes: sizes.filter(s => s !== size) });
                                                                        }
                                                                    }}
                                                                    className="w-4 h-4 text-blue-600 rounded"
                                                                />
                                                                <span className="capitalize">{size} ({
                                                                    size === 'startup' ? '1-50 employees' :
                                                                        size === 'small' ? '51-200 employees' :
                                                                            size === 'medium' ? '201-1000 employees' :
                                                                                '1000+ employees'
                                                                })</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Industries *
                                                    </label>
                                                    <div className="space-y-2">
                                                        {['technology', 'fintech', 'healthcare', 'ecommerce', 'biotech'].map(industry => (
                                                            <label key={industry} className="flex items-center gap-2">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={profile.preferences?.industries?.includes(industry) || false}
                                                                    onChange={(e) => {
                                                                        const industries = profile.preferences?.industries || [];
                                                                        if (e.target.checked) {
                                                                            updatePreferences({ industries: [...industries, industry] });
                                                                        } else {
                                                                            updatePreferences({ industries: industries.filter(i => i !== industry) });
                                                                        }
                                                                    }}
                                                                    className="w-4 h-4 text-blue-600 rounded"
                                                                />
                                                                <span className="capitalize">{industry}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>

                                                <label className="flex items-center gap-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={profile.preferences?.workLifeBalance || false}
                                                        onChange={(e) => updatePreferences({ workLifeBalance: e.target.checked })}
                                                        className="w-4 h-4 text-blue-600 rounded"
                                                    />
                                                    <Heart className="w-4 h-4 text-red-500" />
                                                    <span>Work-Life Balance Priority</span>
                                                </label>

                                                <label className="flex items-center gap-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={profile.preferences?.remoteFriendly || false}
                                                        onChange={(e) => updatePreferences({ remoteFriendly: e.target.checked })}
                                                        className="w-4 h-4 text-blue-600 rounded"
                                                    />
                                                    <MapPin className="w-4 h-4 text-blue-500" />
                                                    <span>Remote-Friendly</span>
                                                </label>
                                            </div>
                                        </div>

                                        {profile.aiAnalysis && (
                                            <div className="bg-blue-50 p-6 rounded-lg">
                                                <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
                                                    <Brain className="w-5 h-5" />
                                                    AI Analysis
                                                </h3>
                                                <div className="space-y-3 text-sm">
                                                    <div>
                                                        <h4 className="font-medium text-blue-700">Strengths:</h4>
                                                        <p className="text-blue-600">{profile.aiAnalysis.strengths?.join(', ') || 'Not analyzed yet'}</p>
                                                    </div>
                                                    <div>
                                                        <h4 className="font-medium text-blue-700">Career Goals:</h4>
                                                        <p className="text-blue-600">{profile.aiAnalysis.careerGoals?.join(', ') || 'Not analyzed yet'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <button
                                    onClick={handleSaveProfile}
                                    disabled={profileLoading}
                                    className="btn btn-primary"
                                >
                                    {profileLoading ? 'Saving...' : 'Save Profile'}
                                </button>
                            </div>
                        )}

                        {/* Search Tab */}
                        {activeTab === 'search' && (
                            <div className="space-y-6">
                                <h2 className="text-2xl font-bold text-gray-800">AI-Powered Company Search</h2>

                                <div className="bg-blue-50 p-6 rounded-lg">
                                    <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
                                        <Brain className="w-5 h-5" />
                                        Smart Location Strategy for {profile.personalInfo?.firstName || 'You'}
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
                                        <ul className="space-y-2">
                                            <li>• <strong>Phase 1:</strong> Boston, MA area companies (primary focus)</li>
                                            <li>• <strong>Phase 2:</strong> Providence, RI area companies</li>
                                            <li>• <strong>Phase 3:</strong> Expand nationwide for 1000+ companies</li>
                                        </ul>
                                        <ul className="space-y-2">
                                            <li>• Filter by your selected company sizes</li>
                                            <li>• Filter by your selected industries</li>
                                            <li>• AI evaluates work-life balance reputation</li>
                                            <li>• Find verified HR contacts for each company</li>
                                        </ul>
                                    </div>
                                </div>

                                {/* Demo Mode Info */}
                                {demoMode && (
                                    <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                                        <div className="flex items-center gap-2 text-green-800 mb-2">
                                            <TestTube className="w-5 h-5" />
                                            <span className="font-medium">Demo Mode Active</span>
                                        </div>
                                        <p className="text-green-700 text-sm">
                                            Using sample data for demonstration. Turn off demo mode to use real API connections.
                                        </p>
                                    </div>
                                )}

                                {/* API Keys Warning */}
                                {!demoMode && (!apiKeys.openai || !apiKeys.apollo) && (
                                    <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                                        <div className="flex items-center gap-2 text-red-800 mb-2">
                                            <AlertCircle className="w-5 h-5" />
                                            <span className="font-medium">API Keys Required</span>
                                        </div>
                                        <p className="text-red-700 text-sm">
                                            Please configure your API keys in the API Config tab before starting a search.
                                            Without proper API keys, you'll only find limited results.
                                        </p>
                                        <button
                                            onClick={() => setActiveTab('config')}
                                            className="mt-3 btn btn-primary text-sm"
                                        >
                                            Configure API Keys
                                        </button>
                                    </div>
                                )}

                                {!profile.personalInfo?.firstName && (
                                    <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
                                        <div className="flex items-center gap-2 text-orange-800 mb-2">
                                            <User className="w-5 h-5" />
                                            <span className="font-medium">Complete Your Profile First</span>
                                        </div>
                                        <p className="text-orange-700 text-sm">
                                            Please add your personal information (name, email) and preferences before starting a search.
                                        </p>
                                        <button
                                            onClick={() => setActiveTab('profile')}
                                            className="mt-3 btn btn-primary text-sm"
                                        >
                                            Complete Profile
                                        </button>
                                    </div>
                                )}

                                <div className="flex gap-4">
                                    <button
                                        onClick={handleStartSearch}
                                        disabled={searchStatus.isRunning || !profile.resume || !profile.personalInfo?.firstName || apiLoading}
                                        className="btn btn-success flex items-center gap-2"
                                    >
                                        <Brain className="w-5 h-5" />
                                        {searchStatus.isRunning ? 'AI Searching...' : 'Start AI Search'}
                                    </button>

                                    {searchStatus.isRunning && (
                                        <button
                                            onClick={pauseSearch}
                                            className="btn btn-secondary"
                                        >
                                            Pause Search
                                        </button>
                                    )}
                                </div>

                                {renderProgressBar()}

                                {(searchStatus.isRunning || searchStatus.liveStats) && (
                                    <div className="mt-8">
                                        <RealTimeStatsDashboard
                                            searchStatus={searchStatus}
                                            isRunning={searchStatus.isRunning}
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Matches Tab */}
                        {activeTab === 'matches' && (
                            <CompaniesTable
                                companies={companies}
                                onGenerateEmail={handleGenerateEmail}
                                onUpdateStatus={handleUpdateCompanyStatus}
                                onDeleteCompany={handleDeleteCompany}
                                onBulkDelete={handleBulkDelete}
                                userProfile={profile}
                            />
                        )}

                        {/* Emails Tab */}
                        {activeTab === 'emails' && (
                            <div className="space-y-6">
                                <h2 className="text-2xl font-bold text-gray-800">Email Templates & Best Practices</h2>

                                <div className="bg-yellow-50 p-6 rounded-lg">
                                    <h3 className="text-lg font-semibold text-yellow-800 mb-4">AI Email Personalization</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <h4 className="font-medium text-yellow-700 mb-2">Your Information Used:</h4>
                                            <ul className="text-yellow-600 space-y-1">
                                                <li>• Full name: {profile.personalInfo?.firstName || 'Not set'} {profile.personalInfo?.lastName || ''}</li>
                                                <li>• Email: {profile.personalInfo?.email || 'Not set'}</li>
                                                <li>• Current title: {profile.currentTitle || 'Not set'}</li>
                                                <li>• Location: {profile.personalInfo?.location?.city || 'Not set'}</li>
                                                <li>• LinkedIn profile: {profile.personalInfo?.linkedinUrl ? 'Added' : 'Not set'}</li>
                                            </ul>
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-yellow-700 mb-2">Email Strategy:</h4>
                                            <ul className="text-yellow-600 space-y-1">
                                                <li>• Request informational interview (not job)</li>
                                                <li>• Professional but warm tone</li>
                                                <li>• Show genuine interest in company</li>
                                                <li>• Highlight relevant experience</li>
                                                <li>• Include professional signature</li>
                                            </ul>
                                        </div>
                                    </div>

                                    {(!profile.personalInfo?.firstName || !profile.personalInfo?.email) && (
                                        <div className="mt-4 p-3 bg-orange-100 border border-orange-300 rounded">
                                            <p className="text-orange-800 text-sm">
                                                <strong>Note:</strong> Please complete your personal information to generate fully personalized emails.
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="bg-gray-50 p-6 rounded-lg">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Best Practices</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                                        <div>
                                            <h4 className="font-medium text-gray-700 mb-2">Timing:</h4>
                                            <ul className="text-gray-600 space-y-1">
                                                <li>• Tuesday-Thursday, 10AM-3PM</li>
                                                <li>• Follow up after 1 week</li>
                                                <li>• Maximum 2 follow-ups</li>
                                            </ul>
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-gray-700 mb-2">Subject Lines:</h4>
                                            <ul className="text-gray-600 space-y-1">
                                                <li>• "Informational Interview Request - [Your Name]"</li>
                                                <li>• "Learning About [Company] Culture"</li>
                                                <li>• "Developer Interested in [Company]"</li>
                                            </ul>
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-gray-700 mb-2">Follow-up:</h4>
                                            <ul className="text-gray-600 space-y-1">
                                                <li>• Reference previous email</li>
                                                <li>• Add new relevant information</li>
                                                <li>• Keep it brief and polite</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Enhanced Config Tab */}
                        {activeTab === 'config' && (
                            <div className="space-y-6">
                                <h2 className="text-2xl font-bold text-gray-800">API Configuration</h2>

                                <div className="bg-blue-50 p-6 rounded-lg">
                                    <h3 className="text-lg font-semibold text-blue-800 mb-4">Why API Keys Are Required</h3>
                                    <p className="text-blue-700 text-sm">
                                        To find hundreds of companies with verified HR contacts, this tool needs access to:
                                    </p>
                                    <ul className="text-blue-600 text-sm mt-2 space-y-1">
                                        <li>• <strong>OpenAI</strong> - For AI analysis and email generation</li>
                                        <li>• <strong>Apollo.io</strong> - For company data and contact information</li>
                                        <li>• <strong>Hunter.io</strong> - For additional email verification</li>
                                    </ul>
                                    <p className="text-blue-700 text-sm mt-3">
                                        Without proper API keys, you can use demo mode to explore the interface with sample data.
                                    </p>
                                </div>

                                <div className="bg-white p-6 rounded-lg border">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-4">API Configuration</h3>
                                    <div className="space-y-6">
                                        {/* OpenAI */}
                                        <div className="p-4 border rounded-lg">
                                            <div className="flex items-center justify-between mb-3">
                                                <label className="text-sm font-medium text-gray-700">
                                                    OpenAI API Key (Required) *
                                                </label>
                                                <div className="flex items-center gap-2">
                                                    {getApiStatusIcon(apiStatus.openai)}
                                                    <button
                                                        onClick={() => setShowApiKeys(prev => ({...prev, openai: !prev.openai}))}
                                                        className="text-xs text-gray-500 hover:text-gray-700"
                                                    >
                                                        {showApiKeys.openai ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                            </div>
                                            <input
                                                type={showApiKeys.openai ? "text" : "password"}
                                                value={apiKeys.openai}
                                                onChange={(e) => setApiKeys(prev => ({ ...prev, openai: e.target.value }))}
                                                className="input"
                                                placeholder="sk-..."
                                            />
                                            <div className="flex justify-between items-center mt-2">
                                                <p className="text-xs text-gray-500">
                                                    Get from: https://platform.openai.com/api-keys
                                                </p>
                                                {apiStatus.openai.connected && (
                                                    <span className="text-xs text-green-600">
                                                        {apiStatus.openai.message}
                                                    </span>
                                                )}
                                                {apiStatus.openai.error && (
                                                    <span className="text-xs text-red-600">
                                                        {apiStatus.openai.error}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Apollo */}
                                        <div className="p-4 border rounded-lg">
                                            <div className="flex items-center justify-between mb-3">
                                                <label className="text-sm font-medium text-gray-700">
                                                    Apollo.io API Key (Company Data) *
                                                </label>
                                                <div className="flex items-center gap-2">
                                                    {getApiStatusIcon(apiStatus.apollo)}
                                                    <button
                                                        onClick={() => setShowApiKeys(prev => ({...prev, apollo: !prev.apollo}))}
                                                        className="text-xs text-gray-500 hover:text-gray-700"
                                                    >
                                                        {showApiKeys.apollo ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                            </div>
                                            <input
                                                type={showApiKeys.apollo ? "text" : "password"}
                                                value={apiKeys.apollo}
                                                onChange={(e) => setApiKeys(prev => ({ ...prev, apollo: e.target.value }))}
                                                className="input"
                                                placeholder="Your Apollo.io API key"
                                            />
                                            <div className="flex justify-between items-center mt-2">
                                                <p className="text-xs text-gray-500">
                                                    Free tier: 50 credits/month - Get from: https://www.apollo.io/
                                                </p>
                                                {apiStatus.apollo.usage && (
                                                    <span className="text-xs text-blue-600">
                                                        {apiStatus.apollo.usage} credits remaining
                                                    </span>
                                                )}
                                                {apiStatus.apollo.error && (
                                                    <span className="text-xs text-red-600">
                                                        {apiStatus.apollo.error}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Hunter */}
                                        <div className="p-4 border rounded-lg">
                                            <div className="flex items-center justify-between mb-3">
                                                <label className="text-sm font-medium text-gray-700">
                                                    Hunter.io API Key (Email Verification)
                                                </label>
                                                <div className="flex items-center gap-2">
                                                    {getApiStatusIcon(apiStatus.hunter)}
                                                    <button
                                                        onClick={() => setShowApiKeys(prev => ({...prev, hunter: !prev.hunter}))}
                                                        className="text-xs text-gray-500 hover:text-gray-700"
                                                    >
                                                        {showApiKeys.hunter ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                            </div>
                                            <input
                                                type={showApiKeys.hunter ? "text" : "password"}
                                                value={apiKeys.hunter}
                                                onChange={(e) => setApiKeys(prev => ({ ...prev, hunter: e.target.value }))}
                                                className="input"
                                                placeholder="Your Hunter.io API key"
                                            />
                                            <div className="flex justify-between items-center mt-2">
                                                <p className="text-xs text-gray-500">
                                                    Free tier: 25 searches/month - Get from: https://hunter.io
                                                </p>
                                                {apiStatus.hunter.usage && (
                                                    <span className="text-xs text-blue-600">
                                                        {apiStatus.hunter.usage} searches remaining
                                                    </span>
                                                )}
                                                {apiStatus.hunter.error && (
                                                    <span className="text-xs text-red-600">
                                                        {apiStatus.hunter.error}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <button
                                        onClick={handleSaveApiKeys}
                                        disabled={apiLoading}
                                        className="btn btn-primary"
                                    >
                                        {apiLoading ? 'Saving...' : 'Save & Test API Keys'}
                                    </button>

                                    <button
                                        onClick={testAllConnections}
                                        disabled={apiLoading}
                                        className="btn btn-secondary"
                                    >
                                        {apiLoading ? 'Testing...' : 'Test All Connections'}
                                    </button>
                                </div>

                                {/* API Status Dashboard */}
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h4 className="font-medium text-gray-800 mb-3">API Status Dashboard</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                        <div className="bg-white p-3 rounded border">
                                            <div className="flex items-center gap-2 mb-1">
                                                {getApiStatusIcon(apiStatus.openai)}
                                                <span className="font-medium">OpenAI</span>
                                            </div>
                                            <p className="text-gray-600">
                                                {apiStatus.openai.testing ? 'Testing...' :
                                                    apiStatus.openai.connected ? 'Connected' :
                                                        apiStatus.openai.error ? apiStatus.openai.error : 'Not connected'}
                                            </p>
                                        </div>
                                        <div className="bg-white p-3 rounded border">
                                            <div className="flex items-center gap-2 mb-1">
                                                {getApiStatusIcon(apiStatus.apollo)}
                                                <span className="font-medium">Apollo.io</span>
                                            </div>
                                            <p className="text-gray-600">
                                                {apiStatus.apollo.testing ? 'Testing...' :
                                                    apiStatus.apollo.connected ? 'Connected' :
                                                        apiStatus.apollo.error ? apiStatus.apollo.error : 'Not connected'}
                                            </p>
                                        </div>
                                        <div className="bg-white p-3 rounded border">
                                            <div className="flex items-center gap-2 mb-1">
                                                {getApiStatusIcon(apiStatus.hunter)}
                                                <span className="font-medium">Hunter.io</span>
                                            </div>
                                            <p className="text-gray-600">
                                                {apiStatus.hunter.testing ? 'Testing...' :
                                                    apiStatus.hunter.connected ? 'Connected' :
                                                        apiStatus.hunter.error ? apiStatus.hunter.error : 'Not connected'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Email Modal */}
                <EmailModal
                    isOpen={emailModal.isOpen}
                    onClose={() => setEmailModal({ isOpen: false, company: null, template: null })}
                    company={emailModal.company}
                    emailTemplate={emailModal.template}
                />
            </div>
        </div>
    );
};

export default App;