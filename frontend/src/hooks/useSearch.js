import { useState, useEffect, useCallback, useRef } from 'react';
import { searchAPI } from '../services/api';

export const useSearch = () => {
    const [searchStatus, setSearchStatus] = useState({
        isRunning: false,
        progress: 0,
        currentStep: '',
        phase: 'profile-analysis',
        totalFound: 0,
        aiAnalysis: '',
        completed: false,
        failed: false,
        expandedNationwide: false,
        demoMode: false,

        // Enhanced real-time data
        liveStats: null,
        recentActivity: [],
        performanceMetrics: {},
        apiUsage: {},
        error: null
    });

    const [searchHistory, setSearchHistory] = useState([]);
    const [error, setError] = useState(null);

    // Use refs to track polling state
    const pollIntervalRef = useRef(null);
    const lastUpdateRef = useRef(null);
    const lastJobIdRef = useRef(null);

    const startSearch = async (searchParams) => {
        try {
            console.log('🚀 Starting search with params:', searchParams);
            setError(null);
            setSearchStatus(prev => ({
                ...prev,
                isRunning: true,
                completed: false,
                failed: false,
                progress: 0,
                currentStep: searchParams.demoMode ? 'Starting demo search...' : 'Starting AI analysis...',
                phase: 'profile-analysis',
                demoMode: searchParams.demoMode || false,
                liveStats: null,
                recentActivity: [],
                performanceMetrics: {},
                apiUsage: {},
                error: null
            }));

            // Try the new API method first, fallback to the old one
            let response;
            try {
                response = await searchAPI.startSearch(searchParams);
            } catch (err) {
                response = await searchAPI.start(searchParams);
            }

            if (response.success || response.data?.success) {
                const jobId = response.jobId || response.data?.jobId;
                lastJobIdRef.current = jobId;

                // Start more frequent polling for real-time updates
                startProgressPolling();
                return { success: true, jobId };
            } else {
                throw new Error(response.message || response.data?.message || 'Search failed');
            }
        } catch (err) {
            console.error('Failed to start search:', err);
            setError(err.message);
            setSearchStatus(prev => ({
                ...prev,
                isRunning: false,
                failed: true,
                error: err.message
            }));
            return { success: false, error: err.message };
        }
    };

    const startProgressPolling = useCallback(() => {
        // Clear any existing polling
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
        }

        // More frequent polling for real-time feel (every 1 second instead of 2)
        pollIntervalRef.current = setInterval(async () => {
            try {
                const response = await searchAPI.getProgress();
                const progress = response.data || response;

                // Only update if there's actual change to avoid unnecessary re-renders
                const hasChanged = !lastUpdateRef.current ||
                    JSON.stringify(progress) !== JSON.stringify(lastUpdateRef.current);

                if (hasChanged) {
                    setSearchStatus(prevStatus => {
                        // Merge new data with existing state
                        const newStatus = {
                            ...prevStatus,
                            ...progress,

                            // Ensure arrays don't lose data on updates
                            recentActivity: progress.recentActivity || prevStatus.recentActivity || [],
                            liveStats: progress.liveStats || prevStatus.liveStats,
                            performanceMetrics: progress.performanceMetrics || prevStatus.performanceMetrics || {},
                            apiUsage: progress.apiUsage || prevStatus.apiUsage || {},
                            error: null
                        };

                        return newStatus;
                    });

                    lastUpdateRef.current = progress;
                }

                // Stop polling when search is complete or failed
                if (progress.completed || progress.failed || !progress.isRunning) {
                    clearInterval(pollIntervalRef.current);
                    pollIntervalRef.current = null;

                    // Final update to ensure we have the latest data
                    if (progress.completed) {
                        // Load search history after completion
                        setTimeout(() => loadSearchHistory(), 1000);
                    }
                }
            } catch (err) {
                console.error('Failed to get progress:', err);
                // Don't stop polling on network errors, just log them
                if (err.response?.status >= 500) {
                    // Server error, stop polling
                    clearInterval(pollIntervalRef.current);
                    pollIntervalRef.current = null;
                    setError('Lost connection to server');
                    setSearchStatus(prevStatus => ({
                        ...prevStatus,
                        error: 'Lost connection to server',
                        isRunning: false
                    }));
                }
            }
        }, 1000); // Poll every 1 second for real-time feel

        return pollIntervalRef.current;
    }, []);

    const pauseSearch = async () => {
        try {
            // Try both API methods for compatibility
            let response;
            try {
                response = await searchAPI.pauseSearch();
            } catch (err) {
                response = await searchAPI.pause();
            }

            if (response.success || response.data?.success) {
                setSearchStatus(prev => ({
                    ...prev,
                    isRunning: false,
                    currentStep: 'Search paused by user'
                }));

                // Stop polling when paused
                if (pollIntervalRef.current) {
                    clearInterval(pollIntervalRef.current);
                    pollIntervalRef.current = null;
                }

                return { success: true };
            } else {
                throw new Error(response.message || 'Failed to pause search');
            }
        } catch (err) {
            console.error('Failed to pause search:', err);
            setError(err.message);
            return { success: false, error: err.message };
        }
    };

    const resumeSearch = async () => {
        try {
            // Resume polling if search was paused
            if (!pollIntervalRef.current && searchStatus.isRunning) {
                startProgressPolling();
            }
            return { success: true };
        } catch (err) {
            console.error('Failed to resume search:', err);
            setError(err.message);
            return { success: false, error: err.message };
        }
    };

    // Resume search monitoring (useful if page is refreshed during search)
    const resumeSearchMonitoring = async () => {
        try {
            const response = await searchAPI.getProgress();
            const progress = response.data || response;

            if (progress && progress.isRunning) {
                setSearchStatus(prevStatus => ({
                    ...prevStatus,
                    ...progress,
                    error: null
                }));
                startProgressPolling();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Failed to resume search monitoring:', error);
            return false;
        }
    };

    const stopSearch = async () => {
        try {
            // Stop polling
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
            }

            setSearchStatus(prev => ({
                ...prev,
                isRunning: false,
                completed: false,
                progress: 0
            }));

            return { success: true };
        } catch (err) {
            console.error('Failed to stop search:', err);
            setError(err.message);
            return { success: false, error: err.message };
        }
    };

    // Reset search status
    const resetSearch = () => {
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }

        setSearchStatus({
            isRunning: false,
            progress: 0,
            currentStep: '',
            phase: 'profile-analysis',
            totalFound: 0,
            aiAnalysis: '',
            completed: false,
            failed: false,
            expandedNationwide: false,
            demoMode: false,
            liveStats: null,
            recentActivity: [],
            performanceMetrics: {},
            apiUsage: {},
            error: null
        });

        lastJobIdRef.current = null;
        setError(null);
    };

    const loadSearchHistory = async () => {
        try {
            const response = await searchAPI.getHistory();
            const data = response.data || response;

            if (response.success !== false) {
                setSearchHistory(data || []);
                return { success: true, data };
            } else {
                throw new Error(response.message || 'Failed to load search history');
            }
        } catch (err) {
            console.error('Failed to load search history:', err);
            return { success: false, error: err.message };
        }
    };

    // Get current search statistics
    const getSearchStats = () => {
        if (!searchStatus.liveStats) {
            // Return basic stats if no live stats
            return {
                totalSearches: searchHistory.length,
                successfulSearches: searchHistory.filter(s => s.status === 'completed').length,
                failedSearches: searchHistory.filter(s => s.status === 'failed').length,
                averageCompaniesFound: searchHistory.length > 0
                    ? Math.round(searchHistory.reduce((sum, s) => sum + (s.results?.companiesFound || 0), 0) / searchHistory.length)
                    : 0,
                totalCompaniesFound: searchHistory.reduce((sum, s) => sum + (s.results?.companiesFound || 0), 0),
                currentSearch: {
                    jobId: lastJobIdRef.current,
                    isRunning: searchStatus.isRunning,
                    progress: searchStatus.progress,
                    phase: searchStatus.phase,
                    demoMode: searchStatus.demoMode
                }
            };
        }

        const stats = searchStatus.liveStats;
        return {
            totalCompanies: stats.companiesGenerated || 0,
            processedCompanies: stats.companiesProcessed || 0,
            savedCompanies: stats.companiesSaved || 0,
            totalContacts: stats.totalHRContacts || 0,
            verifiedContacts: stats.verifiedContacts || 0,
            avgMatchScore: stats.avgMatchScore || 0,
            avgWLBScore: stats.avgWLBScore || 0,
            processingRate: stats.companiesPerMinute || 0,
            estimatedTimeRemaining: stats.estimatedTimeRemaining || 'Calculating...',
            currentCompany: stats.currentCompany || null,

            // Geographic breakdown
            bostonCompanies: stats.bostonCompanies || 0,
            providenceCompanies: stats.providenceCompanies || 0,
            nationwideCompanies: stats.nationwideCompanies || 0,

            // Quality breakdown
            highMatches: stats.highMatches || 0,
            mediumMatches: stats.mediumMatches || 0,
            lowMatches: stats.lowMatches || 0,

            // WLB breakdown
            excellentWLB: stats.excellentWLB || 0,
            goodWLB: stats.goodWLB || 0,
            averageWLB: stats.averageWLB || 0,
            poorWLB: stats.poorWLB || 0,

            // Error tracking
            processingErrors: stats.processingErrors || 0,
            apiErrors: stats.apiErrors || 0,

            // History stats
            totalSearches: searchHistory.length,
            successfulSearches: searchHistory.filter(s => s.status === 'completed').length,
            failedSearches: searchHistory.filter(s => s.status === 'failed').length,

            // Current search info
            currentSearch: {
                jobId: lastJobIdRef.current,
                isRunning: searchStatus.isRunning,
                progress: searchStatus.progress,
                phase: searchStatus.phase,
                demoMode: searchStatus.demoMode
            }
        };
    };

    // Get recent activity feed
    const getRecentActivity = (limit = 10) => {
        return searchStatus.recentActivity?.slice(0, limit) || [];
    };

    // Get performance metrics
    const getPerformanceMetrics = () => {
        return {
            elapsedTime: searchStatus.performanceMetrics?.elapsedTime || '0s',
            companiesPerSecond: searchStatus.performanceMetrics?.companiesPerSecond || 0,
            ...searchStatus.performanceMetrics
        };
    };

    // Get API usage stats
    const getAPIUsage = () => {
        return {
            openai: {
                calls: searchStatus.apiUsage?.openai?.calls || 0,
                cost: searchStatus.apiUsage?.openai?.cost || 0
            },
            apollo: {
                calls: searchStatus.apiUsage?.apollo?.calls || 0,
                companiesFound: searchStatus.apiUsage?.apollo?.companiesFound || 0
            },
            hunter: {
                calls: searchStatus.apiUsage?.hunter?.calls || 0,
                emailsFound: searchStatus.apiUsage?.hunter?.emailsFound || 0
            },
            ...searchStatus.apiUsage
        };
    };

    // Check if search is actively processing
    const isActivelyProcessing = () => {
        return searchStatus.isRunning &&
            searchStatus.phase === 'company-processing' &&
            searchStatus.liveStats?.currentCompany;
    };

    // Check if search is currently active
    const isSearchActive = () => {
        return searchStatus.isRunning || searchStatus.progress > 0;
    };

    // Get current search phase info
    const getCurrentPhaseInfo = () => {
        const phases = {
            'profile-analysis': {
                label: 'Profile Analysis',
                description: searchStatus.demoMode
                    ? 'Demo: Simulating AI analysis of your profile'
                    : 'AI is analyzing your resume and preferences',
                icon: '🤖',
                estimatedDuration: '30 seconds'
            },
            'company-generation': {
                label: 'Finding Companies',
                description: searchStatus.demoMode
                    ? 'Demo: Generating sample company matches'
                    : 'AI is generating company matches based on your profile',
                icon: '🔍',
                estimatedDuration: '1-2 minutes'
            },
            'company-processing': {
                label: 'Processing Details',
                description: searchStatus.demoMode
                    ? 'Demo: Simulating company data enrichment'
                    : 'Enriching company data and finding HR contacts',
                icon: '⚡',
                estimatedDuration: '5-10 minutes'
            },
            'completed': {
                label: 'Completed',
                description: searchStatus.demoMode
                    ? 'Demo search completed successfully'
                    : 'Search completed successfully',
                icon: '✅',
                estimatedDuration: 'Done'
            }
        };

        return phases[searchStatus.phase] || phases['profile-analysis'];
    };

    // Get completion percentage for different phases
    const getPhaseProgress = () => {
        const phases = ['profile-analysis', 'company-generation', 'company-processing', 'completed'];
        const currentPhaseIndex = phases.indexOf(searchStatus.phase);
        const phaseProgress = {};

        phases.forEach((phase, index) => {
            if (index < currentPhaseIndex) {
                phaseProgress[phase] = 100;
            } else if (index === currentPhaseIndex) {
                phaseProgress[phase] = searchStatus.progress;
            } else {
                phaseProgress[phase] = 0;
            }
        });

        return phaseProgress;
    };

    // Effect to check for running searches on component mount
    useEffect(() => {
        const checkForRunningSearch = async () => {
            const resumed = await resumeSearchMonitoring();
            if (!resumed) {
                // Load search history if no running search
                loadSearchHistory();
            }
        };

        checkForRunningSearch();

        // Cleanup polling on unmount
        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
            }
        };
    }, []);

    // Auto-resume polling if component remounts during active search
    useEffect(() => {
        if (searchStatus.isRunning && !pollIntervalRef.current) {
            startProgressPolling();
        }
    }, [searchStatus.isRunning, startProgressPolling]);

    // Effect to load search history when search completes
    useEffect(() => {
        if (searchStatus.completed || searchStatus.failed) {
            loadSearchHistory();
        }
    }, [searchStatus.completed, searchStatus.failed]);

    return {
        // State
        searchStatus,
        searchHistory,
        error,

        // Core functions
        startSearch,
        pauseSearch,
        resumeSearch,
        stopSearch,
        resetSearch,
        loadSearchHistory,
        resumeSearchMonitoring,

        // Real-time data getters
        getSearchStats,
        getRecentActivity,
        getPerformanceMetrics,
        getAPIUsage,
        getPhaseProgress,
        getCurrentPhaseInfo,

        // Status checkers
        isActivelyProcessing,
        isSearchActive,

        // Computed properties
        isRunning: searchStatus.isRunning,
        isCompleted: searchStatus.completed,
        isFailed: searchStatus.failed,
        progress: searchStatus.progress,
        currentStep: searchStatus.currentStep,
        phase: searchStatus.phase,
        demoMode: searchStatus.demoMode,
        hasRealTimeData: !!searchStatus.liveStats,

        // Polling control (for advanced usage)
        startPolling: startProgressPolling,
        stopPolling: () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
            }
        }
    };
};