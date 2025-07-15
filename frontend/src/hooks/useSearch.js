import { useState, useEffect, useCallback } from 'react';
import { searchAPI } from '../services/api';

export const useSearch = () => {
    const [searchStatus, setSearchStatus] = useState({
        isRunning: false,
        progress: 0,
        currentStep: '',
        totalFound: 0,
        aiAnalysis: '',
        completed: false
    });

    const [searchHistory, setSearchHistory] = useState([]);
    const [error, setError] = useState(null);

    const startSearch = async (searchParams) => {
        try {
            setError(null);
            setSearchStatus(prev => ({ ...prev, isRunning: true, completed: false }));

            const response = await searchAPI.start(searchParams);

            if (response.data.success) {
                // Start polling for progress
                startProgressPolling();
                return { success: true, jobId: response.data.jobId };
            } else {
                throw new Error(response.data.message || 'Search failed');
            }
        } catch (err) {
            console.error('Failed to start search:', err);
            setError(err.message);
            setSearchStatus(prev => ({ ...prev, isRunning: false }));
            return { success: false, error: err.message };
        }
    };

    const startProgressPolling = useCallback(() => {
        const pollInterval = setInterval(async () => {
            try {
                const response = await searchAPI.getProgress();
                const progress = response.data;

                setSearchStatus(progress);

                if (progress.completed || !progress.isRunning) {
                    clearInterval(pollInterval);
                }
            } catch (err) {
                console.error('Failed to get progress:', err);
                clearInterval(pollInterval);
            }
        }, 2000);

        return pollInterval;
    }, []);

    const pauseSearch = async () => {
        try {
            await searchAPI.pause();
            setSearchStatus(prev => ({ ...prev, isRunning: false }));
            return { success: true };
        } catch (err) {
            console.error('Failed to pause search:', err);
            setError(err.message);
            return { success: false, error: err.message };
        }
    };

    const loadSearchHistory = async () => {
        try {
            const response = await searchAPI.getHistory();
            setSearchHistory(response.data);
        } catch (err) {
            console.error('Failed to load search history:', err);
        }
    };

    useEffect(() => {
        loadSearchHistory();
    }, []);

    return {
        searchStatus,
        searchHistory,
        error,
        startSearch,
        pauseSearch,
        loadSearchHistory
    };
};