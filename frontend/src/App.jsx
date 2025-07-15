import React, { useState, useEffect } from 'react';
import { User, Search, Database, Mail, Settings, Brain, Heart, MapPin, Zap, AlertCircle, CheckCircle } from 'lucide-react';

// Components
import CompanyCard from './components/CompanyCard';
import EmailModal from './components/EmailModal';

// Hooks
import { useProfile } from './hooks/useProfile';
import { useSearch } from './hooks/useSearch';
import { useAPI } from './hooks/useAPI';

// Services
import { companiesAPI, emailAPI, configAPI } from './services/api';

const App = () => {
    const [activeTab, setActiveTab] = useState('profile');
    const [companies, setCompanies] = useState([]);
    const [emailModal, setEmailModal] = useState({ isOpen: false, company: null, template: null });
    const [apiKeys, setApiKeys] = useState({
        openai: '',
        apollo: '',    // Updated: Apollo instead of Clearbit
        hunter: '',
        linkedin: '',
        crunchbase: ''
    });
    const [apiStatus, setApiStatus] = useState({
        openai: 'disconnected',
        apollo: 'disconnected',    // Updated: Apollo instead of Clearbit
        hunter: 'disconnected',
        linkedin: 'disconnected',
        crunchbase: 'disconnected'
    });

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
    }, []);

    const loadCompanies = async () => {
        const result = await execute(() => companiesAPI.getMatches());
        if (result.success) {
            setCompanies(result.data.data);
        }
    };

    const handleStartSearch = async () => {
        if (!profile.resume || !profile.personalStatement) {
            alert('Please complete your profile first');
            return;
        }

        if (!apiKeys.openai) {
            alert('OpenAI API key is required for AI analysis');
            setActiveTab('config');
            return;
        }

        if (!apiKeys.apollo) {
            alert('Apollo.io API key is required for company data');
            setActiveTab('config');
            return;
        }

        const result = await startSearch({
            profile,
            location: 'boston-providence',
            maxResults: 50
        });

        if (result.success) {
            setActiveTab('search');
        }
    };

    const handleGenerateEmail = async (company) => {
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

    const handleTestAPI = async (apiName) => {
        const apiKey = apiKeys[apiName];
        if (!apiKey) {
            alert(`Please enter ${apiName} API key first`);
            return;
        }

        const result = await execute(() => configAPI.testConnection(apiName, apiKey));
        if (result.success) {
            setApiStatus(prev => ({ ...prev, [apiName]: 'connected' }));
            alert(`${apiName} API connected successfully!`);
        } else {
            setApiStatus(prev => ({ ...prev, [apiName]: 'error' }));
            alert(`${apiName} API connection failed: ${result.error}`);
        }
    };

    const handleSaveApiKeys = async () => {
        const result = await execute(() => configAPI.saveApiKeys(apiKeys));
        if (result.success) {
            alert('API keys saved successfully!');
        }
    };

    const handleSaveProfile = async () => {
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

                {searchStatus.isRunning && (
                    <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="font-medium text-blue-800 mb-2">AI Analysis In Progress:</h4>
                        <div className="text-sm text-blue-700 space-y-1">
                            <p>• <Zap className="w-4 h-4 inline mr-1" />ChatGPT analyzing your profile for cultural fit</p>
                            <p>• <Database className="w-4 h-4 inline mr-1" />Apollo.io searching Boston/Providence companies</p>
                            <p>• <Heart className="w-4 h-4 inline mr-1" />AI evaluating work-life balance reputations</p>
                            <p>• <Mail className="w-4 h-4 inline mr-1" />Finding verified HR contacts</p>
                        </div>
                    </div>
                )}

                {searchStatus.completed && (
                    <div className="bg-green-50 p-4 rounded-lg">
                        <h4 className="font-medium text-green-800 mb-2">Search Completed!</h4>
                        <p className="text-sm text-green-700">
                            Found {searchStatus.totalFound} companies with verified HR contacts
                        </p>
                        {searchStatus.apiUsage && (
                            <div className="mt-2 text-xs text-green-600">
                                Apollo: {searchStatus.apiUsage.apollo?.companiesFound || 0} companies •
                                Hunter: {searchStatus.apiUsage.hunter?.emailsFound || 0} emails •
                                OpenAI: {searchStatus.apiUsage.openai?.calls || 0} calls
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    const ApiStatusIndicator = ({ status }) => {
        const getStatusColor = () => {
            switch(status) {
                case 'connected': return 'text-green-600';
                case 'error': return 'text-red-600';
                default: return 'text-gray-400';
            }
        };

        const getStatusIcon = () => {
            switch(status) {
                case 'connected': return <CheckCircle className="w-4 h-4" />;
                case 'error': return <AlertCircle className="w-4 h-4" />;
                default: return <div className="w-4 h-4 border-2 border-gray-400 rounded-full" />;
            }
        };

        return (
            <div className={`flex items-center gap-2 ${getStatusColor()}`}>
                {getStatusIcon()}
                <span className="capitalize">{status}</span>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gradient-primary">
            <div className="container mx-auto px-4 py-6 max-w-7xl">
                {/* Header */}
                <div className="card p-6 mb-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Brain className="w-8 h-8 text-blue-600" />
                        <h1 className="text-3xl font-bold text-gradient">
                            AI Company Matcher
                        </h1>
                        <div className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                            Apollo.io Powered
                        </div>
                    </div>
                    <p className="text-gray-600">
                        Find companies that match your profile and prioritize work-life balance in Boston/Providence area
                    </p>
                </div>

                {/* API Status Dashboard */}
                <div className="card p-4 mb-6">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">API Status</h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {Object.entries(apiStatus).map(([api, status]) => (
                            <div key={api} className="flex items-center justify-between">
                                <span className="text-sm font-medium capitalize">{api === 'apollo' ? 'Apollo.io' : api}</span>
                                <ApiStatusIndicator status={status} />
                            </div>
                        ))}
                    </div>
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
                                                Resume Content *
                                            </label>
                                            <textarea
                                                value={profile.resume}
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
                                                value={profile.personalStatement}
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
                                                <label className="flex items-center gap-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={profile.preferences.workLifeBalance}
                                                        onChange={(e) => updatePreferences({ workLifeBalance: e.target.checked })}
                                                        className="w-4 h-4 text-blue-600 rounded"
                                                    />
                                                    <Heart className="w-4 h-4 text-red-500" />
                                                    <span>Work-Life Balance Priority</span>
                                                </label>

                                                <label className="flex items-center gap-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={profile.preferences.remoteFriendly}
                                                        onChange={(e) => updatePreferences({ remoteFriendly: e.target.checked })}
                                                        className="w-4 h-4 text-blue-600 rounded"
                                                    />
                                                    <MapPin className="w-4 h-4 text-blue-500" />
                                                    <span>Remote-Friendly</span>
                                                </label>

                                                <div className="grid grid-cols-1 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                                            Company Size
                                                        </label>
                                                        <select
                                                            value={profile.preferences.companySize}
                                                            onChange={(e) => updatePreferences({ companySize: e.target.value })}
                                                            className="select"
                                                        >
                                                            <option value="startup">Startup (1-50)</option>
                                                            <option value="small">Small (51-200)</option>
                                                            <option value="medium">Medium (201-1000)</option>
                                                            <option value="large">Large (1000+)</option>
                                                        </select>
                                                    </div>

                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                                            Industry
                                                        </label>
                                                        <select
                                                            value={profile.preferences.industry}
                                                            onChange={(e) => updatePreferences({ industry: e.target.value })}
                                                            className="select"
                                                        >
                                                            <option value="technology">Technology</option>
                                                            <option value="fintech">FinTech</option>
                                                            <option value="healthcare">HealthTech</option>
                                                            <option value="ecommerce">E-commerce</option>
                                                            <option value="biotech">BioTech</option>
                                                        </select>
                                                    </div>
                                                </div>
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
                                                        <p className="text-blue-600">{profile.aiAnalysis.strengths?.join(', ')}</p>
                                                    </div>
                                                    <div>
                                                        <h4 className="font-medium text-blue-700">Career Goals:</h4>
                                                        <p className="text-blue-600">{profile.aiAnalysis.careerGoals?.join(', ')}</p>
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
                                        Apollo.io Integration
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
                                        <ul className="space-y-2">
                                            <li>• AI analyzes your resume and personal statement</li>
                                            <li>• Apollo.io searches Boston/Providence companies</li>
                                            <li>• Finds verified HR contacts automatically</li>
                                        </ul>
                                        <ul className="space-y-2">
                                            <li>• AI evaluates work-life balance reputation</li>
                                            <li>• Hunter.io verifies email addresses</li>
                                            <li>• Generates personalized email templates</li>
                                        </ul>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <button
                                        onClick={handleStartSearch}
                                        disabled={searchStatus.isRunning || !profile.resume || apiLoading}
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
                            </div>
                        )}

                        {/* Matches Tab */}
                        {activeTab === 'matches' && (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-2xl font-bold text-gray-800">Company Matches</h2>
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
                                            <h4 className="font-medium text-yellow-700 mb-2">What AI Analyzes:</h4>
                                            <ul className="text-yellow-600 space-y-1">
                                                <li>• Your technical background and experience</li>
                                                <li>• Company's work-life balance culture</li>
                                                <li>• Relevant skills matching their needs</li>
                                                <li>• HR contact's name and title from Apollo.io</li>
                                            </ul>
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-yellow-700 mb-2">Email Strategy:</h4>
                                            <ul className="text-yellow-600 space-y-1">
                                                <li>• Request informational interview (not job)</li>
                                                <li>• Professional but warm tone</li>
                                                <li>• Show genuine interest in company</li>
                                                <li>• Highlight relevant experience</li>
                                            </ul>
                                        </div>
                                    </div>
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
                                                <li>• "Informational Interview Request"</li>
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
                                            <div className="flex gap-2">
                                                <input
                                                    type="password"
                                                    value={apiKeys.openai}
                                                    onChange={(e) => setApiKeys(prev => ({ ...prev, openai: e.target.value }))}
                                                    className="input"
                                                    placeholder="sk-..."
                                                />
                                                <button
                                                    onClick={() => handleTestAPI('openai')}
                                                    className="btn btn-secondary whitespace-nowrap"
                                                >
                                                    Test
                                                </button>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Get from: https://platform.openai.com/api-keys
                                            </p>
                                        </div>

                                        <div className="bg-white p-4 rounded border">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Apollo.io API Key (Required) *
                                            </label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="password"
                                                    value={apiKeys.apollo}
                                                    onChange={(e) => setApiKeys(prev => ({ ...prev, apollo: e.target.value }))}
                                                    className="input"
                                                    placeholder="Free tier: 50 credits/month"
                                                />
                                                <button
                                                    onClick={() => handleTestAPI('apollo')}
                                                    className="btn btn-secondary whitespace-nowrap"
                                                >
                                                    Test
                                                </button>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Get from: https://www.apollo.io/ (Replaces Clearbit)
                                            </p>
                                        </div>

                                        <div className="bg-white p-4 rounded border">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Hunter.io API Key (Email verification)
                                            </label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="password"
                                                    value={apiKeys.hunter}
                                                    onChange={(e) => setApiKeys(prev => ({ ...prev, hunter: e.target.value }))}
                                                    className="input"
                                                    placeholder="Free tier: 25 searches/month"
                                                />
                                                <button
                                                    onClick={() => handleTestAPI('hunter')}
                                                    className="btn btn-secondary whitespace-nowrap"
                                                >
                                                    Test
                                                </button>
                                            </div>
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