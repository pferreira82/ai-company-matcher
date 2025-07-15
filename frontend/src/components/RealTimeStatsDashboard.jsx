import React from 'react';
import {
    Building, Users, MapPin, Heart, Trophy, Clock,
    TrendingUp, Activity, Mail, Star, AlertCircle,
    CheckCircle, Target, Zap, BarChart3
} from 'lucide-react';

const RealTimeStatsDashboard = ({ searchStatus, isRunning }) => {
    const { liveStats, recentActivity, performanceMetrics, apiUsage, phase } = searchStatus;

    if (!isRunning && !liveStats) return null;

    const StatCard = ({ icon: Icon, title, value, subtitle, color = "blue", trend = null }) => (
        <div className={`bg-white rounded-lg border-l-4 border-${color}-500 p-4 shadow-sm`}>
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Icon className={`w-4 h-4 text-${color}-600`} />
                        <span className="text-sm font-medium text-gray-700">{title}</span>
                    </div>
                    <div className={`text-2xl font-bold text-${color}-600`}>{value}</div>
                    {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
                </div>
                {trend && (
                    <div className={`text-xs text-${trend > 0 ? 'green' : 'red'}-600 flex items-center gap-1`}>
                        <TrendingUp className="w-3 h-3" />
                        {trend > 0 ? '+' : ''}{trend}
                    </div>
                )}
            </div>
        </div>
    );

    const ActivityItem = ({ activity }) => {
        const getActivityIcon = (type) => {
            switch (type) {
                case 'company-found': return <Building className="w-4 h-4 text-blue-500" />;
                case 'company-processed': return <CheckCircle className="w-4 h-4 text-green-500" />;
                case 'contact-found': return <Mail className="w-4 h-4 text-purple-500" />;
                case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />;
                case 'milestone': return <Star className="w-4 h-4 text-yellow-500" />;
                default: return <Activity className="w-4 h-4 text-gray-500" />;
            }
        };

        const getActivityColor = (type) => {
            switch (type) {
                case 'company-found': return 'text-blue-700';
                case 'company-processed': return 'text-green-700';
                case 'contact-found': return 'text-purple-700';
                case 'error': return 'text-red-700';
                case 'milestone': return 'text-yellow-700';
                default: return 'text-gray-700';
            }
        };

        return (
            <div className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                <div className="mt-0.5">
                    {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium ${getActivityColor(activity.type)}`}>
                        {activity.message}
                    </div>
                    {activity.companyName && (
                        <div className="text-xs text-gray-500 mt-1">
                            Company: {activity.companyName}
                        </div>
                    )}
                    <div className="text-xs text-gray-400 mt-1">
                        {new Date(activity.timestamp).toLocaleTimeString()}
                    </div>
                </div>
            </div>
        );
    };

    const ProgressBar = ({ label, value, max, color = "blue" }) => {
        const percentage = max > 0 ? (value / max) * 100 : 0;
        return (
            <div className="mb-3">
                <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{label}</span>
                    <span className="text-gray-800 font-medium">{value}/{max}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                        className={`bg-${color}-500 h-2 rounded-full transition-all duration-500`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                </div>
            </div>
        );
    };

    const CircularProgress = ({ value, max, label, color = "blue" }) => {
        const percentage = max > 0 ? (value / max) * 100 : 0;
        const circumference = 2 * Math.PI * 45; // radius = 45
        const strokeDasharray = circumference;
        const strokeDashoffset = circumference - (percentage / 100) * circumference;

        return (
            <div className="flex flex-col items-center">
                <div className="relative w-24 h-24">
                    <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                        <circle
                            cx="50"
                            cy="50"
                            r="45"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="transparent"
                            className="text-gray-200"
                        />
                        <circle
                            cx="50"
                            cy="50"
                            r="45"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="transparent"
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                            className={`text-${color}-500 transition-all duration-1000`}
                            strokeLinecap="round"
                        />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-lg font-bold text-${color}-600`}>
              {Math.round(percentage)}%
            </span>
                    </div>
                </div>
                <div className="text-sm text-gray-600 mt-2 text-center">{label}</div>
                <div className="text-xs text-gray-500">{value}/{max}</div>
            </div>
        );
    };

    if (!liveStats) {
        return (
            <div className="bg-white p-6 rounded-lg border">
                <div className="flex items-center gap-2 text-gray-600">
                    <Activity className="w-5 h-5 animate-pulse" />
                    <span>Initializing real-time tracking...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Phase Indicator */}
            <div className="bg-white p-4 rounded-lg border">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <Activity className="w-5 h-5" />
                        Live Search Progress
                    </h3>
                    <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                        <span className="text-sm text-gray-600">
              {isRunning ? 'Processing...' : 'Completed'}
            </span>
                    </div>
                </div>

                {/* Phase Progress */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    {[
                        { phase: 'profile-analysis', label: 'Profile Analysis', icon: Users },
                        { phase: 'company-generation', label: 'Finding Companies', icon: Building },
                        { phase: 'company-processing', label: 'Processing Details', icon: Zap },
                        { phase: 'completed', label: 'Completed', icon: CheckCircle }
                    ].map((phaseInfo, index) => {
                        const isActive = phase === phaseInfo.phase;
                        const isCompleted = ['profile-analysis', 'company-generation', 'company-processing', 'completed'].indexOf(phase) > index;
                        const Icon = phaseInfo.icon;

                        return (
                            <div
                                key={phaseInfo.phase}
                                className={`flex items-center gap-2 p-3 rounded-lg transition-colors ${
                                    isActive ? 'bg-blue-100 text-blue-700' :
                                        isCompleted ? 'bg-green-100 text-green-700' :
                                            'bg-gray-100 text-gray-500'
                                }`}
                            >
                                <Icon className={`w-4 h-4 ${isActive ? 'animate-pulse' : ''}`} />
                                <span className="text-sm font-medium">{phaseInfo.label}</span>
                                {isCompleted && !isActive && <CheckCircle className="w-4 h-4 text-green-600 ml-auto" />}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={Building}
                    title="Companies Found"
                    value={liveStats.companiesGenerated || 0}
                    subtitle={`${liveStats.companiesProcessed || 0} processed`}
                    color="blue"
                />

                <StatCard
                    icon={CheckCircle}
                    title="Saved to Database"
                    value={liveStats.companiesSaved || 0}
                    subtitle={`${liveStats.companiesSkipped || 0} skipped (duplicates)`}
                    color="green"
                />

                <StatCard
                    icon={Mail}
                    title="HR Contacts"
                    value={liveStats.totalHRContacts || 0}
                    subtitle={`${liveStats.verifiedContacts || 0} verified`}
                    color="purple"
                />

                <StatCard
                    icon={Trophy}
                    title="Avg Match Score"
                    value={liveStats.avgMatchScore ? `${liveStats.avgMatchScore}%` : '0%'}
                    subtitle={`${liveStats.highMatches || 0} high matches`}
                    color="yellow"
                />
            </div>

            {/* Location Breakdown */}
            <div className="bg-white p-6 rounded-lg border">
                <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Geographic Distribution
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                        <CircularProgress
                            value={liveStats.bostonCompanies || 0}
                            max={(liveStats.bostonCompanies || 0) + (liveStats.providenceCompanies || 0) + (liveStats.nationwideCompanies || 0) || 1}
                            label="Boston Area"
                            color="blue"
                        />
                    </div>
                    <div className="text-center">
                        <CircularProgress
                            value={liveStats.providenceCompanies || 0}
                            max={(liveStats.bostonCompanies || 0) + (liveStats.providenceCompanies || 0) + (liveStats.nationwideCompanies || 0) || 1}
                            label="Providence Area"
                            color="green"
                        />
                    </div>
                    <div className="text-center">
                        <CircularProgress
                            value={liveStats.nationwideCompanies || 0}
                            max={(liveStats.bostonCompanies || 0) + (liveStats.providenceCompanies || 0) + (liveStats.nationwideCompanies || 0) || 1}
                            label="Nationwide"
                            color="purple"
                        />
                    </div>
                </div>
            </div>

            {/* Match Quality & Work-Life Balance */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg border">
                    <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <Target className="w-5 h-5" />
                        Match Quality Distribution
                    </h4>
                    <ProgressBar label="High Matches (80%+)" value={liveStats.highMatches || 0} max={liveStats.companiesSaved || 1} color="green" />
                    <ProgressBar label="Medium Matches (60-79%)" value={liveStats.mediumMatches || 0} max={liveStats.companiesSaved || 1} color="yellow" />
                    <ProgressBar label="Lower Matches (<60%)" value={liveStats.lowMatches || 0} max={liveStats.companiesSaved || 1} color="red" />
                </div>

                <div className="bg-white p-6 rounded-lg border">
                    <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <Heart className="w-5 h-5" />
                        Work-Life Balance Scores
                    </h4>
                    <ProgressBar label="Excellent (8-10/10)" value={liveStats.excellentWLB || 0} max={liveStats.companiesSaved || 1} color="green" />
                    <ProgressBar label="Good (6-7/10)" value={liveStats.goodWLB || 0} max={liveStats.companiesSaved || 1} color="blue" />
                    <ProgressBar label="Average (4-5/10)" value={liveStats.averageWLB || 0} max={liveStats.companiesSaved || 1} color="yellow" />
                    {liveStats.avgWLBScore && (
                        <div className="mt-3 text-center">
              <span className="text-lg font-bold text-green-600">
                Average: {liveStats.avgWLBScore}/10
              </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Performance Metrics */}
            {performanceMetrics && (
                <div className="bg-white p-6 rounded-lg border">
                    <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5" />
                        Performance Metrics
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <StatCard
                            icon={Clock}
                            title="Elapsed Time"
                            value={performanceMetrics.elapsedTime || '0s'}
                            color="blue"
                        />
                        <StatCard
                            icon={Zap}
                            title="Processing Rate"
                            value={`${liveStats.companiesPerMinute || 0}/min`}
                            subtitle={`${performanceMetrics.companiesPerSecond || 0}/sec`}
                            color="green"
                        />
                        <StatCard
                            icon={Target}
                            title="Current Company"
                            value={liveStats.currentCompany ? liveStats.currentCompany.split(' ')[0] : 'None'}
                            subtitle={liveStats.currentCompany ? 'Processing...' : 'Idle'}
                            color="purple"
                        />
                        <StatCard
                            icon={Clock}
                            title="Time Remaining"
                            value={liveStats.estimatedTimeRemaining || 'Calculating...'}
                            color="yellow"
                        />
                    </div>
                </div>
            )}

            {/* API Usage Stats */}
            {apiUsage && (
                <div className="bg-white p-6 rounded-lg border">
                    <h4 className="text-lg font-semibold text-gray-800 mb-4">API Usage</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <StatCard
                            icon={Users}
                            title="OpenAI Calls"
                            value={apiUsage.openai?.calls || 0}
                            subtitle={`~$${(apiUsage.openai?.cost || 0).toFixed(3)}`}
                            color="blue"
                        />
                        <StatCard
                            icon={Building}
                            title="Apollo.io Calls"
                            value={apiUsage.apollo?.calls || 0}
                            subtitle={`${liveStats.apolloContacts || 0} contacts`}
                            color="purple"
                        />
                        <StatCard
                            icon={Mail}
                            title="Hunter.io Calls"
                            value={apiUsage.hunter?.calls || 0}
                            subtitle={`${liveStats.hunterContacts || 0} emails`}
                            color="green"
                        />
                    </div>
                </div>
            )}

            {/* Live Activity Feed */}
            {recentActivity && recentActivity.length > 0 && (
                <div className="bg-white p-6 rounded-lg border">
                    <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <Activity className="w-5 h-5" />
                        Live Activity Feed
                    </h4>
                    <div className="max-h-80 overflow-y-auto space-y-1">
                        {recentActivity.map((activity, index) => (
                            <ActivityItem key={index} activity={activity} />
                        ))}
                    </div>
                </div>
            )}

            {/* Error Summary */}
            {(liveStats.processingErrors > 0 || liveStats.apiErrors > 0) && (
                <div className="bg-red-50 p-6 rounded-lg border border-red-200">
                    <h4 className="text-lg font-semibold text-red-800 mb-4 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        Error Summary
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <StatCard
                            icon={AlertCircle}
                            title="Processing Errors"
                            value={liveStats.processingErrors || 0}
                            subtitle="Company processing failures"
                            color="red"
                        />
                        <StatCard
                            icon={AlertCircle}
                            title="API Errors"
                            value={liveStats.apiErrors || 0}
                            subtitle="External API failures"
                            color="red"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default RealTimeStatsDashboard;