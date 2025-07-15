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

        // Enhanced real-time data
        liveStats: null,
        recentActivity: [],
        performanceMetrics: {},
        apiUsage: {}
    });

    const [searchHistory, setSearchHistory] = useState([]);
    const [error, setError] = useState(null);

    // Use refs to track polling state
    const pollIntervalRef = useRef(null);
    const lastUpdateRef = useRef(null);

    const startSearch = async (searchParams) => {
        try {
            setError(null);
            setSearchStatus(prev => ({
                ...prev,
                isRunning: true,
                completed: false,
                failed: false,
                progress: 0,
                liveStats: null,
                recentActivity: [],
                performanceMetrics: {},
                apiUsage: {}
            }));

            const response = await searchAPI.start(searchParams);

            if (response.data.success) {
                // Start more frequent polling for real-time updates
                startProgressPolling();
                return { success: true, jobId: response.data.jobId };
            } else {
                throw new Error(response.data.message || 'Search failed');
            }
        } catch (err) {
            console.error('Failed to start search:', err);
            setError(err.message);
            setSearchStatus(prev => ({ ...prev, isRunning: false, failed: true }));
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
                const progress = response.data;

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
                            apiUsage: progress.apiUsage || prevStatus.apiUsage || {}
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
                }
            }
        }, 1000); // Poll every 1 second for real-time feel

        return pollIntervalRef.current;
    }, []);

    const pauseSearch = async () => {
        try {
            await searchAPI.pause();
            setSearchStatus(prev => ({ ...prev, isRunning: false }));

            // Stop polling when paused
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
            }

            return { success: true };
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

    const loadSearchHistory = async () => {
        try {
            const response = await searchAPI.getHistory();
            setSearchHistory(response.data || []);
        } catch (err) {
            console.error('Failed to load search history:', err);
        }
    };

    // Get current search statistics
    const getSearchStats = () => {
        if (!searchStatus.liveStats) return null;

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
            apiErrors: stats.apiErrors || 0
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

    // Cleanup polling on unmount
    useEffect(() => {
        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
            }
        };
    }, []);

    // Load search history on mount
    useEffect(() => {
        loadSearchHistory();
    }, []);

    // Auto-resume polling if component remounts during active search
    useEffect(() => {
        if (searchStatus.isRunning && !pollIntervalRef.current) {
            startProgressPolling();
        }
    }, [searchStatus.isRunning, startProgressPolling]);

    return {
        searchStatus,
        searchHistory,
        error,

        // Core functions
        startSearch,
        pauseSearch,
        resumeSearch,
        stopSearch,
        loadSearchHistory,

        // Real-time data getters
        getSearchStats,
        getRecentActivity,
        getPerformanceMetrics,
        getAPIUsage,
        getPhaseProgress,

        // Status checkers
        isActivelyProcessing,

        // Computed properties
        isRunning: searchStatus.isRunning,
        isCompleted: searchStatus.completed,
        isFailed: searchStatus.failed,
        progress: searchStatus.progress,
        currentStep: searchStatus.currentStep,
        phase: searchStatus.phase,
        hasRealTimeData: !!searchStatus.liveStats
    };
};