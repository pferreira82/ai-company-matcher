const express = require('express');
const router = express.Router();
const UserProfile = require('../models/UserProfile');
const logger = require('../utils/logger');

// Get user profile
router.get('/', async (req, res) => {
    try {
        let profile = await UserProfile.findOne({ userId: 'default' });

        if (!profile) {
            // Create default profile if it doesn't exist
            profile = new UserProfile({
                userId: 'default',
                personalInfo: {
                    firstName: '',
                    lastName: '',
                    email: '',
                    phone: '',
                    location: {
                        city: '',
                        state: '',
                        country: 'US'
                    },
                    linkedinUrl: '',
                    portfolioUrl: '',
                    githubUrl: ''
                },
                currentTitle: '',
                experience: 'mid',
                resume: '',
                personalStatement: '',
                skills: {
                    technical: [],
                    soft: [],
                    languages: [],
                    frameworks: [],
                    databases: [],
                    cloud: [],
                    other: []
                },
                preferences: {
                    companySizes: [],
                    industries: [],
                    workLifeBalance: true,
                    remoteFriendly: true,
                    startupCulture: false,
                    salary: {
                        min: 0,
                        max: 0,
                        currency: 'USD'
                    },
                    benefits: {
                        healthInsurance: true,
                        retirement401k: true,
                        paidTimeOff: true,
                        flexibleHours: true,
                        stockOptions: false,
                        professionalDevelopment: true
                    },
                    location: 'boston-providence',
                    roleTypes: ['full-time']
                }
            });

            await profile.save();
            logger.info('Created default user profile');
        }

        res.json({
            success: true,
            profile: profile
        });

    } catch (error) {
        logger.error('Failed to get user profile:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user profile'
        });
    }
});

// Save/update user profile
router.post('/', async (req, res) => {
    try {
        const profileData = req.body;

        // Validate required fields
        if (!profileData.personalInfo?.firstName || !profileData.personalInfo?.email) {
            return res.status(400).json({
                success: false,
                message: 'Name and email are required'
            });
        }

        if (!profileData.resume || !profileData.personalStatement) {
            return res.status(400).json({
                success: false,
                message: 'Resume and personal statement are required'
            });
        }

        if (!profileData.preferences?.companySizes || profileData.preferences.companySizes.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Please select at least one company size preference'
            });
        }

        if (!profileData.preferences?.industries || profileData.preferences.industries.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Please select at least one industry preference'
            });
        }

        // Update or create profile
        let profile = await UserProfile.findOneAndUpdate(
            { userId: 'default' },
            {
                ...profileData,
                lastActiveAt: new Date()
            },
            {
                new: true,
                upsert: true,
                runValidators: true
            }
        );

        logger.info('User profile updated successfully', {
            userId: profile.userId,
            name: `${profile.personalInfo.firstName} ${profile.personalInfo.lastName}`,
            completionPercentage: profile.completionPercentage
        });

        res.json({
            success: true,
            profile: profile,
            message: 'Profile saved successfully'
        });

    } catch (error) {
        logger.error('Failed to save user profile:', error);

        // Handle validation errors
        if (error.name === 'ValidationError') {
            const errorMessages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errorMessages
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to save user profile'
        });
    }
});

// Analyze profile with AI
router.post('/analyze', async (req, res) => {
    try {
        const { resume, personalStatement } = req.body;

        if (!resume || !personalStatement) {
            return res.status(400).json({
                success: false,
                message: 'Resume and personal statement are required for analysis'
            });
        }

        // Import OpenAI service
        const openaiService = require('../services/openaiService');

        // Analyze profile
        const analysis = await openaiService.analyzeUserProfile(resume, personalStatement);

        // Update profile with analysis
        await UserProfile.findOneAndUpdate(
            { userId: 'default' },
            {
                aiAnalysis: {
                    ...analysis,
                    generatedAt: new Date(),
                    model: 'gpt-3.5-turbo'
                }
            },
            { upsert: true }
        );

        logger.info('Profile analysis completed successfully');

        res.json({
            success: true,
            analysis: analysis,
            message: 'Profile analysis completed successfully'
        });

    } catch (error) {
        logger.error('Failed to analyze profile:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to analyze profile'
        });
    }
});

// Get profile statistics
router.get('/stats', async (req, res) => {
    try {
        const profile = await UserProfile.findOne({ userId: 'default' });

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: 'Profile not found'
            });
        }

        const stats = {
            completionPercentage: profile.completionPercentage,
            sections: {
                personalInfo: {
                    completed: profile.profileCompletion.personalInfo,
                    items: [
                        { name: 'Name', completed: !!(profile.personalInfo.firstName && profile.personalInfo.lastName) },
                        { name: 'Email', completed: !!profile.personalInfo.email },
                        { name: 'Phone', completed: !!profile.personalInfo.phone },
                        { name: 'Location', completed: !!profile.personalInfo.location?.city },
                        { name: 'LinkedIn', completed: !!profile.personalInfo.linkedinUrl }
                    ]
                },
                professionalInfo: {
                    completed: profile.profileCompletion.professionalInfo,
                    items: [
                        { name: 'Current Title', completed: !!profile.currentTitle },
                        { name: 'Experience Level', completed: !!profile.experience },
                        { name: 'Resume', completed: !!profile.resume },
                        { name: 'Personal Statement', completed: !!profile.personalStatement }
                    ]
                },
                preferences: {
                    completed: profile.profileCompletion.preferences,
                    items: [
                        { name: 'Company Sizes', completed: profile.preferences.companySizes?.length > 0 },
                        { name: 'Industries', completed: profile.preferences.industries?.length > 0 },
                        { name: 'Work Preferences', completed: true },
                        { name: 'Location Preference', completed: !!profile.preferences.location }
                    ]
                },
                skills: {
                    completed: profile.profileCompletion.skills,
                    items: [
                        { name: 'Technical Skills', completed: profile.skills.technical?.length > 0 },
                        { name: 'Soft Skills', completed: profile.skills.soft?.length > 0 },
                        { name: 'Programming Languages', completed: profile.skills.languages?.length > 0 },
                        { name: 'Frameworks', completed: profile.skills.frameworks?.length > 0 }
                    ]
                }
            },
            aiAnalysis: {
                hasAnalysis: profile.hasAIAnalysis,
                lastAnalyzed: profile.aiAnalysis?.generatedAt || null
            },
            activity: {
                lastActive: profile.lastActiveAt,
                searchHistoryCount: profile.searchHistory?.length || 0,
                companyInteractionsCount: profile.companyInteractions?.length || 0
            }
        };

        res.json({
            success: true,
            stats: stats
        });

    } catch (error) {
        logger.error('Failed to get profile stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get profile statistics'
        });
    }
});

// Add company interaction
router.post('/interactions', async (req, res) => {
    try {
        const { companyId, companyName, interaction, notes } = req.body;

        if (!companyId || !companyName || !interaction) {
            return res.status(400).json({
                success: false,
                message: 'Company ID, name, and interaction type are required'
            });
        }

        const profile = await UserProfile.findOne({ userId: 'default' });

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: 'Profile not found'
            });
        }

        await profile.addCompanyInteraction(companyId, companyName, interaction, notes);

        logger.info('Company interaction added:', {
            companyName,
            interaction,
            userId: profile.userId
        });

        res.json({
            success: true,
            message: 'Company interaction recorded successfully'
        });

    } catch (error) {
        logger.error('Failed to add company interaction:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to record company interaction'
        });
    }
});

// Get recent company interactions
router.get('/interactions/recent', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;

        const profile = await UserProfile.findOne({ userId: 'default' });

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: 'Profile not found'
            });
        }

        const recentInteractions = profile.companyInteractions
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit);

        res.json({
            success: true,
            interactions: recentInteractions
        });

    } catch (error) {
        logger.error('Failed to get recent interactions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get recent interactions'
        });
    }
});

// Update profile settings
router.put('/settings', async (req, res) => {
    try {
        const settings = req.body;

        const profile = await UserProfile.findOneAndUpdate(
            { userId: 'default' },
            {
                settings: settings,
                lastActiveAt: new Date()
            },
            { new: true }
        );

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: 'Profile not found'
            });
        }

        logger.info('Profile settings updated');

        res.json({
            success: true,
            settings: profile.settings,
            message: 'Settings updated successfully'
        });

    } catch (error) {
        logger.error('Failed to update profile settings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update settings'
        });
    }
});

module.exports = router;