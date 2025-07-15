import { useState, useEffect } from 'react';
import { profileAPI } from '../services/api';

export const useProfile = () => {
    const [profile, setProfile] = useState({
        resume: '',
        personalStatement: '',
        skills: [],
        preferences: {
            workLifeBalance: true,
            remoteFriendly: true,
            startupCulture: false,
            techStack: [],
            companySize: 'medium',
            industry: 'technology'
        },
        aiAnalysis: null
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            setLoading(true);
            const response = await profileAPI.get();
            if (response.data.profile) {
                setProfile(response.data.profile);
            }
        } catch (err) {
            console.error('Failed to load profile:', err);
            setError('Failed to load profile');
        } finally {
            setLoading(false);
        }
    };

    const saveProfile = async (updatedProfile) => {
        try {
            setLoading(true);
            setError(null);

            const response = await profileAPI.save(updatedProfile);
            setProfile(response.data.profile);

            return { success: true };
        } catch (err) {
            console.error('Failed to save profile:', err);
            setError('Failed to save profile');
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    const updateProfile = (updates) => {
        setProfile(prev => ({ ...prev, ...updates }));
    };

    const updatePreferences = (preferences) => {
        setProfile(prev => ({
            ...prev,
            preferences: { ...prev.preferences, ...preferences }
        }));
    };

    return {
        profile,
        loading,
        error,
        loadProfile,
        saveProfile,
        updateProfile,
        updatePreferences
    };
};