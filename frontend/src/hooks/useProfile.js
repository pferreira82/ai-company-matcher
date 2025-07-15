import { useState, useEffect } from 'react';
import { profileAPI } from '../services/api';

export const useProfile = () => {
    const [profile, setProfile] = useState({
        personalInfo: {
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            linkedinUrl: '',
            portfolioUrl: '',
            githubUrl: '',
            location: {
                city: '',
                state: '',
                country: 'United States'
            }
        },
        resume: '',
        personalStatement: '',
        currentTitle: '',
        experienceLevel: 'mid',
        skills: [],
        preferences: {
            workLifeBalance: true,
            remoteFriendly: true,
            startupCulture: false,
            techStack: [],

            // Multiple selections (new)
            companySizes: ['medium'],
            industries: ['technology'],

            // Single selections (deprecated but kept for compatibility)
            companySize: 'medium',
            industry: 'technology',

            willingToRelocate: false,
            salaryRange: {
                min: null,
                max: null,
                currency: 'USD'
            },
            preferredLocations: []
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
                // Merge loaded profile with defaults to ensure all fields exist
                const loadedProfile = response.data.profile;

                setProfile(prev => {
                    const merged = {
                        ...prev,
                        ...loadedProfile,
                        personalInfo: {
                            ...prev.personalInfo,
                            ...loadedProfile.personalInfo,
                            location: {
                                ...prev.personalInfo.location,
                                ...loadedProfile.personalInfo?.location
                            }
                        },
                        preferences: {
                            ...prev.preferences,
                            ...loadedProfile.preferences,

                            // Handle migration from single to multiple selections
                            companySizes: loadedProfile.preferences?.companySizes ||
                                (loadedProfile.preferences?.companySize ? [loadedProfile.preferences.companySize] : ['medium']),
                            industries: loadedProfile.preferences?.industries ||
                                (loadedProfile.preferences?.industry ? [loadedProfile.preferences.industry] : ['technology']),

                            salaryRange: {
                                ...prev.preferences.salaryRange,
                                ...loadedProfile.preferences?.salaryRange
                            }
                        }
                    };

                    // Sync single values for backward compatibility
                    if (merged.preferences.companySizes?.length > 0) {
                        merged.preferences.companySize = merged.preferences.companySizes[0];
                    }
                    if (merged.preferences.industries?.length > 0) {
                        merged.preferences.industry = merged.preferences.industries[0];
                    }

                    return merged;
                });
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

            // Validate required fields
            if (!updatedProfile.personalInfo?.firstName || !updatedProfile.personalInfo?.email) {
                throw new Error('Name and email are required');
            }

            if (!updatedProfile.resume || !updatedProfile.personalStatement) {
                throw new Error('Resume and personal statement are required');
            }

            // Validate preferences
            if (!updatedProfile.preferences?.companySizes || updatedProfile.preferences.companySizes.length === 0) {
                throw new Error('Please select at least one company size');
            }

            if (!updatedProfile.preferences?.industries || updatedProfile.preferences.industries.length === 0) {
                throw new Error('Please select at least one industry');
            }

            // Ensure backward compatibility - sync single values
            const profileToSave = {
                ...updatedProfile,
                preferences: {
                    ...updatedProfile.preferences,
                    companySize: updatedProfile.preferences.companySizes?.[0] || 'medium',
                    industry: updatedProfile.preferences.industries?.[0] || 'technology'
                }
            };

            const response = await profileAPI.save(profileToSave);
            setProfile(response.data.profile);

            return { success: true };
        } catch (err) {
            console.error('Failed to save profile:', err);
            const errorMessage = err.response?.data?.message || err.message || 'Failed to save profile';
            setError(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setLoading(false);
        }
    };

    const updateProfile = (updates) => {
        setProfile(prev => {
            // Handle nested personal info updates
            if (updates.personalInfo) {
                return {
                    ...prev,
                    ...updates,
                    personalInfo: {
                        ...prev.personalInfo,
                        ...updates.personalInfo
                    }
                };
            }
            return { ...prev, ...updates };
        });
    };

    const updatePreferences = (preferences) => {
        setProfile(prev => {
            const newPreferences = { ...prev.preferences, ...preferences };

            // Auto-sync single values when arrays change
            if (preferences.companySizes) {
                newPreferences.companySize = preferences.companySizes[0] || 'medium';
            }
            if (preferences.industries) {
                newPreferences.industry = preferences.industries[0] || 'technology';
            }

            return {
                ...prev,
                preferences: newPreferences
            };
        });
    };

    const updatePersonalInfo = (personalInfo) => {
        setProfile(prev => ({
            ...prev,
            personalInfo: { ...prev.personalInfo, ...personalInfo }
        }));
    };

    const updateLocation = (location) => {
        setProfile(prev => ({
            ...prev,
            personalInfo: {
                ...prev.personalInfo,
                location: { ...prev.personalInfo.location, ...location }
            }
        }));
    };

    // Helper functions for validation
    const isProfileComplete = () => {
        return !!(
            profile.personalInfo?.firstName &&
            profile.personalInfo?.email &&
            profile.resume &&
            profile.personalStatement &&
            profile.preferences?.companySizes?.length > 0 &&
            profile.preferences?.industries?.length > 0
        );
    };

    const getProfileCompleteness = () => {
        const fields = [
            profile.personalInfo?.firstName,
            profile.personalInfo?.lastName,
            profile.personalInfo?.email,
            profile.resume,
            profile.personalStatement,
            profile.currentTitle,
            profile.personalInfo?.location?.city,
            profile.preferences?.companySizes?.length > 0,
            profile.preferences?.industries?.length > 0
        ];

        const completed = fields.filter(Boolean).length;
        const total = fields.length;

        return {
            completed,
            total,
            percentage: Math.round((completed / total) * 100)
        };
    };

    const getMissingRequiredFields = () => {
        const missing = [];

        if (!profile.personalInfo?.firstName) missing.push('First Name');
        if (!profile.personalInfo?.email) missing.push('Email');
        if (!profile.resume) missing.push('Resume');
        if (!profile.personalStatement) missing.push('Personal Statement');
        if (!profile.preferences?.companySizes || profile.preferences.companySizes.length === 0) {
            missing.push('Company Size Preferences');
        }
        if (!profile.preferences?.industries || profile.preferences.industries.length === 0) {
            missing.push('Industry Preferences');
        }

        return missing;
    };

    // Helper functions for preferences
    const addCompanySize = (size) => {
        const current = profile.preferences?.companySizes || [];
        if (!current.includes(size)) {
            updatePreferences({ companySizes: [...current, size] });
        }
    };

    const removeCompanySize = (size) => {
        const current = profile.preferences?.companySizes || [];
        updatePreferences({ companySizes: current.filter(s => s !== size) });
    };

    const addIndustry = (industry) => {
        const current = profile.preferences?.industries || [];
        if (!current.includes(industry)) {
            updatePreferences({ industries: [...current, industry] });
        }
    };

    const removeIndustry = (industry) => {
        const current = profile.preferences?.industries || [];
        updatePreferences({ industries: current.filter(i => i !== industry) });
    };

    const getSelectedCompanySizesDisplay = () => {
        const sizes = profile.preferences?.companySizes || [];
        const sizeLabels = {
            startup: 'Startup (1-50)',
            small: 'Small (51-200)',
            medium: 'Medium (201-1000)',
            large: 'Large (1000+)'
        };
        return sizes.map(size => sizeLabels[size] || size);
    };

    const getSelectedIndustriesDisplay = () => {
        const industries = profile.preferences?.industries || [];
        const industryLabels = {
            technology: 'Technology',
            fintech: 'FinTech',
            healthcare: 'HealthTech',
            ecommerce: 'E-commerce',
            biotech: 'BioTech',
            education: 'EdTech',
            cybersecurity: 'Cybersecurity',
            'ai-ml': 'AI/ML',
            gaming: 'Gaming',
            media: 'Media & Entertainment'
        };
        return industries.map(industry => industryLabels[industry] || industry);
    };

    return {
        profile,
        loading,
        error,
        loadProfile,
        saveProfile,
        updateProfile,
        updatePreferences,
        updatePersonalInfo,
        updateLocation,
        isProfileComplete,
        getProfileCompleteness,
        getMissingRequiredFields,

        // Preference helpers
        addCompanySize,
        removeCompanySize,
        addIndustry,
        removeIndustry,
        getSelectedCompanySizesDisplay,
        getSelectedIndustriesDisplay
    };
};