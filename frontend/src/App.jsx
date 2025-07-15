import React, { useState, useEffect } from 'react';
import { User, Search, Database, Mail, Settings, Brain, Heart, MapPin, Bug, BarChart3 } from 'lucide-react';

// Components
import ProfileTab from './components/ProfileTab';
import CompanyCard from './components/CompanyCard';
import EmailModal from './components/EmailModal';
import RealTimeStatsDashboard from './components/RealTimeStatsDashboard';

// Hooks
import { useProfile } from './hooks/useProfile';
import { useSearch } from './hooks/useSearch';
import { useAPI } from './hooks/useAPI';

// Services
import { companiesAPI, emailAPI, configAPI, debugAPI } from './services/api';

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

    // API Logging state
    const [apiLoggingEnabled, setApiLoggingEnabled] = useState(() => debugAPI.isLoggingEnabled());
    const [apiStats, setApiStats] = useState(null);

    // Custom hooks
    const { profile, loading: profileLoading, updateProfile, updatePreferences, saveProfile } = useProfile();
    const { searchStatus, startSearch, pauseSearch } = useSearch();
    const { loading: apiLoading, execute } = useAPI();

    // Load companies on mount and when search completes
    useEffect(() => {
        if (searchStatus.completed) {
            loadCompanies();
        }
    }, [searchStatus.completed]);

    useEffect(() => {
        loadCompanies();
        updateApiStats();
    }, []);

    // Update API stats periodically when logging is enabled
    useEffect(() => {
        if (apiLoggingEnabled) {
            const interval = setInterval(updateApiStats, 5000);
            return () => clearInterval(interval);
        }
    }, [apiLoggingEnabled]);

    const updateApiStats = () => {
        if (debugAPI.isLoggingEnabled()) {
            setApiStats(debugAPI.getStats());
        }
    };

    const toggleApiLogging = () => {
        const newState = debugAPI.toggleLogging();
        setApiLoggingEnabled(newState);
        updateApiStats();
    };

    const clearApiLogs = () => {
        if (confirm('Are you sure you want to clear all API logs?')) {
            debugAPI.clearLogs();
            updateApiStats();
        }
    };

    const exportApiLogs = () => {
        debugAPI.exportLogs();
    };

    const loadCompanies = async () => {
        const result = await execute(() => companiesAPI.getMatches());
        if (result.success) {
            setCompanies(result.data.data || []);
        }
    };

    const handleStartSearch = async () => {
        // Validate required fields
        if (!profile.resume || !profile.personalStatement) {
            alert('Please complete your resume and personal statement first');
            return;
        }

        if (!profile.personalInfo?.firstName || !profile.personalInfo?.email) {
            alert('Please add your name and email in the personal information section');
            setActiveTab('profile');
            return;
        }

        // Validate preferences
        if (!profile.preferences?.companySizes || profile.preferences.companySizes.length === 0) {
            alert('Please select at least one company size preference');
            setActiveTab('profile');
            return;
        }

        if (!profile.preferences?.industries || profile.preferences.industries.length === 0) {
            alert('Please select at least one industry preference');
            setActiveTab('profile');
            return;
        }

        const result = await startSearch({
            profile,
            location: 'boston-providence', // Always start with Boston/Providence
            maxResults: 50
        });

        if (result.success) {
            setActiveTab('search');
        }
    };

    const handleGenerateEmail = async (company) => {
        // Check if personal info is complete
        if (!profile.personalInfo?.firstName || !profile.personalInfo?.email) {
            alert('Please complete your personal information (name and email) before generating emails');
            setActiveTab('profile');
            return;
        }

        const result = await execute(() => emailAPI.generate(company.id, profile));
        if (result.success) {
            setEmailModal({
                isOpen: true,
                company,
                template: result.data.data
            });
        }
    };

    const handleUpdateCompanyStatus = async (companyId, status) => {
        const result = await execute(() => companiesAPI.updateStatus(companyId, status));
        if (result.success) {
            setCompanies(prev =>
                prev.map(c => c.id === companyId ? { ...c, status } : c)
            );
        }
    };

    const handleSaveApiKeys = async () => {
        const result = await execute(() => configAPI.saveApiKeys(apiKeys));
        if (result.success) {
            alert('API keys saved successfully!');
        }
    };

    const handleSaveProfile = async () => {
        // Validate required fields
        if (!profile.personalInfo?.firstName || !profile.personalInfo?.email) {
            alert('Please provide your name and email address');
            return;
        }

        if (!profile.resume || !profile.personalStatement) {
            alert('Please complete your resume and personal statement');
            return;
        }

        const result = await saveProfile(profile);
        if (result.success) {
            alert('Profile saved successfully!');
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

    const profileStats = getProfileCompleteness();

    return (
        <div className="min-h-screen bg-gradient-primary">
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

                        {/* Right side controls */}
                        <div className="flex items-center gap-4">
                            {/* API Logging Toggle */}
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={toggleApiLogging}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                        apiLoggingEnabled
                                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                    title="Toggle API call logging in browser console"
                                >
                                    <Bug className="w-4 h-4" />
                                    API Logs {apiLoggingEnabled ? 'ON' : 'OFF'}
                                </button>

                                {apiLoggingEnabled && apiStats && (
                                    <div className="flex items-center gap-2 text-xs text-gray-600">
                                        <BarChart3 className="w-4 h-4" />
                                        <span>{apiStats.total} calls</span>
                                        {apiStats.errors > 0 && (
                                            <span className="text-red-600">({apiStats.errors} errors)</span>
                                        )}
                                    </div>
                                )}

                                {apiLoggingEnabled && (
                                    <div className="flex gap-1">
                                        <button
                                            onClick={clearApiLogs}
                                            className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                                            title="Clear API logs"
                                        >
                                            Clear
                                        </button>
                                        <button
                                            onClick={exportApiLogs}
                                            className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                                            title="Export API logs"
                                        >
                                            Export
                                        </button>
                                    </div>
                                )}
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
                    <p className="text-gray-600 mt-2">
                        Find companies that match your profile in Boston, MA → Providence, RI → Nationwide
                    </p>

                    {/* API Logging Status Details */}
                    {apiLoggingEnabled && (
                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-center gap-2 text-blue-800 text-sm">
                                <Bug className="w-4 h-4" />
                                <span className="font-medium">API Logging Active</span>
                                <span>- Check your browser console for detailed API call logs</span>
                            </div>
                            {apiStats && (
                                <div className="mt-2 text-xs text-blue-700">
                                    Total: {apiStats.total} | Requests: {apiStats.requests} | Responses: {apiStats.responses} |
                                    Errors: {apiStats.errors} | Success Rate: {(100 - parseFloat(apiStats.errorRate)).toFixed(1)}%
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <div className="card mb-6">
                    <div className="flex border-b overflow-x-auto">
                        {[
                            { id: 'profile', label: 'My Profile', icon: User },
                            { id: 'search', label: 'AI Search', icon: Search },
                            { id: 'matches', label: 'Company Matches', icon: Database },
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
                                </button>
                            );
                        })}
                    </div>

                    <div className="p-6">
                        {/* Profile Tab */}
                        {activeTab === 'profile' && (
                            <ProfileTab
                                profile={profile}
                                updateProfile={updateProfile}
                                updatePreferences={updatePreferences}
                                handleSaveProfile={handleSaveProfile}
                                profileLoading={profileLoading}
                            />
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
                                            <li>• <strong>Phase 3:</strong> Expand nationwide if &lt;100 found</li>
                                        </ul>
                                        <ul className="space-y-2">
                                            <li>• Filter by your selected company sizes</li>
                                            <li>• Filter by your selected industries</li>
                                            <li>• AI evaluates work-life balance reputation</li>
                                            <li>• Find verified HR contacts for each company</li>
                                        </ul>
                                    </div>
                                </div>

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

                                {/* Basic Progress Bar */}
                                {renderProgressBar()}

                                {/* Real-Time Stats Dashboard */}
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
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-2xl font-bold text-gray-800">
                                        Company Matches {profile.personalInfo?.firstName && `for ${profile.personalInfo.firstName}`}
                                    </h2>
                                    <div className="text-sm text-gray-600">
                                        {companies.length} companies found • AI-ranked by fit
                                    </div>
                                </div>

                                {companies.length === 0 ? (
                                    <div className="text-center py-12">
                                        <Brain className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                        <h3 className="text-lg font-medium text-gray-600 mb-2">No companies found yet</h3>
                                        <p className="text-gray-500 mb-4">Start an AI search to discover companies that match your profile</p>
                                        <button
                                            onClick={() => setActiveTab('search')}
                                            className="btn btn-primary"
                                        >
                                            Start AI Search
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {companies.map((company) => (
                                            <CompanyCard
                                                key={company.id}
                                                company={company}
                                                onGenerateEmail={handleGenerateEmail}
                                                onUpdateStatus={handleUpdateCompanyStatus}
                                                userProfile={profile}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
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

                        {/* Config Tab */}
                        {activeTab === 'config' && (
                            <div className="space-y-6">
                                <h2 className="text-2xl font-bold text-gray-800">API Configuration</h2>

                                <div className="bg-red-50 p-6 rounded-lg">
                                    <h3 className="text-lg font-semibold text-red-800 mb-4">Required API Keys</h3>
                                    <div className="space-y-4">
                                        <div className="bg-white p-4 rounded border">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                OpenAI API Key (Required) *
                                            </label>
                                            <input
                                                type="password"
                                                value={apiKeys.openai}
                                                onChange={(e) => setApiKeys(prev => ({ ...prev, openai: e.target.value }))}
                                                className="input"
                                                placeholder="sk-..."
                                            />
                                            <p className="text-xs text-gray-500 mt-1">
                                                Get from: https://platform.openai.com/api-keys
                                            </p>
                                        </div>

                                        <div className="bg-white p-4 rounded border">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Apollo.io API Key (Company data)
                                            </label>
                                            <input
                                                type="password"
                                                value={apiKeys.apollo}
                                                onChange={(e) => setApiKeys(prev => ({ ...prev, apollo: e.target.value }))}
                                                className="input"
                                                placeholder="Free tier: 50 credits/month"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">
                                                Get from: https://www.apollo.io/
                                            </p>
                                        </div>

                                        <div className="bg-white p-4 rounded border">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Hunter.io API Key (Email finding)
                                            </label>
                                            <input
                                                type="password"
                                                value={apiKeys.hunter}
                                                onChange={(e) => setApiKeys(prev => ({ ...prev, hunter: e.target.value }))}
                                                className="input"
                                                placeholder="Free tier: 25 searches/month"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">
                                                Get from: https://hunter.io
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={handleSaveApiKeys}
                                    disabled={apiLoading}
                                    className="btn btn-primary"
                                >
                                    {apiLoading ? 'Saving...' : 'Save API Configuration'}
                                </button>
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