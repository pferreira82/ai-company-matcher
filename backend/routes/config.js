const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const logger = require('../utils/logger');

// Import or create SearchJob model safely
let SearchJob;
try {
    SearchJob = mongoose.model('SearchJob');
} catch (error) {
    // Model doesn't exist, create it
    const searchJobSchema = new mongoose.Schema({
        jobId: {
            type: String,
            required: true,
            unique: true
        },
        parameters: {
            profile: mongoose.Schema.Types.Mixed,
            location: String,
            maxResults: Number
        },
        status: {
            type: String,
            enum: ['pending', 'running', 'paused', 'completed', 'failed'],
            default: 'pending'
        },
        progress: {
            current: { type: Number, default: 0 },
            total: { type: Number, default: 0 },
            percentage: { type: Number, default: 0 },
            currentStep: String,
            phase: {
                type: String,
                enum: ['profile-analysis', 'company-generation', 'company-processing', 'completed'],
                default: 'profile-analysis'
            }
        },
        liveStats: {
            companiesGenerated: { type: Number, default: 0 },
            companiesProcessed: { type: Number, default: 0 },
            companiesSaved: { type: Number, default: 0 },
            companiesSkipped: { type: Number, default: 0 },
            bostonCompanies: { type: Number, default: 0 },
            providenceCompanies: { type: Number, default: 0 },
            nationwideCompanies: { type: Number, default: 0 },
            totalHRContacts: { type: Number, default: 0 },
            verifiedContacts: { type: Number, default: 0 },
            apolloContacts: { type: Number, default: 0 },
            hunterContacts: { type: Number, default: 0 },
            highMatches: { type: Number, default: 0 },
            mediumMatches: { type: Number, default: 0 },
            lowMatches: { type: Number, default: 0 },
            avgMatchScore: { type: Number, default: 0 },
            excellentWLB: { type: Number, default: 0 },
            goodWLB: { type: Number, default: 0 },
            averageWLB: { type: Number, default: 0 },
            poorWLB: { type: Number, default: 0 },
            avgWLBScore: { type: Number, default: 0 },
            currentCompany: String,
            companiesPerMinute: { type: Number, default: 0 },
            estimatedTimeRemaining: String,
            processingErrors: { type: Number, default: 0 },
            apiErrors: { type: Number, default: 0 }
        },
        recentActivity: [{
            timestamp: { type: Date, default: Date.now },
            type: {
                type: String,
                enum: ['company-found', 'company-processed', 'contact-found', 'error', 'milestone']
            },
            message: String,
            companyName: String,
            data: mongoose.Schema.Types.Mixed
        }],
        results: {
            companiesFound: { type: Number, default: 0 },
            contactsFound: { type: Number, default: 0 },
            apolloCompanies: { type: Number, default: 0 },
            hunterContacts: { type: Number, default: 0 },
            expandedNationwide: { type: Boolean, default: false },
            errors: [String]
        },
        aiAnalysis: String,
        apiUsage: {
            openai: {
                calls: { type: Number, default: 0 },
                cost: { type: Number, default: 0 },
                tokensUsed: { type: Number, default: 0 }
            },
            apollo: {
                calls: { type: Number, default: 0 },
                creditsUsed: { type: Number, default: 0 },
                companiesFound: { type: Number, default: 0 }
            },
            hunter: {
                calls: { type: Number, default: 0 },
                searchesUsed: { type: Number, default: 0 },
                emailsFound: { type: Number, default: 0 }
            }
        },
        performance: {
            startTime: Date,
            endTime: Date,
            duration: Number,
            averageCompanyProcessingTime: Number,
            bottlenecks: [String]
        }
    }, {
        timestamps: true
    });

    // Add methods to schema
    searchJobSchema.methods.addActivity = function(type, message, companyName = null, data = null) {
        this.recentActivity.unshift({
            type,
            message,
            companyName,
            data,
            timestamp: new Date()
        });

        if (this.recentActivity.length > 50) {
            this.recentActivity = this.recentActivity.slice(0, 50);
        }
    };

    searchJobSchema.methods.updateStats = function(updates) {
        Object.keys(updates).forEach(key => {
            if (this.liveStats[key] !== undefined) {
                this.liveStats[key] = updates[key];
            }
        });

        const totalMatches = this.liveStats.highMatches + this.liveStats.mediumMatches + this.liveStats.lowMatches;
        if (totalMatches > 0) {
            const weightedScore = (this.liveStats.highMatches * 85) + (this.liveStats.mediumMatches * 70) + (this.liveStats.lowMatches * 50);
            this.liveStats.avgMatchScore = Math.round(weightedScore / totalMatches);
        }

        const totalWLB = this.liveStats.excellentWLB + this.liveStats.goodWLB + this.liveStats.averageWLB + this.liveStats.poorWLB;
        if (totalWLB > 0) {
            const weightedWLB = (this.liveStats.excellentWLB * 8.5) + (this.liveStats.goodWLB * 6.5) + (this.liveStats.averageWLB * 4.5) + (this.liveStats.poorWLB * 2.5);
            this.liveStats.avgWLBScore = (weightedWLB / totalWLB).toFixed(1);
        }

        if (this.performance.startTime) {
            const elapsed = (Date.now() - this.performance.startTime) / 1000 / 60;
            if (elapsed > 0) {
                this.liveStats.companiesPerMinute = Math.round(this.liveStats.companiesProcessed / elapsed);

                const remaining = Math.max(0, this.progress.total - this.liveStats.companiesProcessed);
                if (this.liveStats.companiesPerMinute > 0) {
                    const minutesRemaining = Math.round(remaining / this.liveStats.companiesPerMinute);
                    this.liveStats.estimatedTimeRemaining = minutesRemaining > 1 ?
                        `${minutesRemaining} minutes` :
                        'Less than 1 minute';
                }
            }
        }
    };

    searchJobSchema.methods.incrementStat = function(statName, increment = 1) {
        if (this.liveStats[statName] !== undefined) {
            this.liveStats[statName] += increment;
            this.updateStats({});
        }
    };

    SearchJob = mongoose.model('SearchJob', searchJobSchema);
}

// Save API keys (in production, encrypt these)
router.post('/api-keys', async (req, res) => {
    try {
        const { openai, apollo, hunter, linkedin, crunchbase } = req.body;

        // In production, store these encrypted in database
        // For now, just validate they exist and update environment
        if (openai) process.env.OPENAI_API_KEY = openai;
        if (apollo) process.env.APOLLO_API_KEY = apollo;
        if (hunter) process.env.HUNTER_API_KEY = hunter;
        if (linkedin) process.env.LINKEDIN_API_KEY = linkedin;
        if (crunchbase) process.env.CRUNCHBASE_API_KEY = crunchbase;

        logger.info('API keys updated - Apollo.io integration enabled');
        res.json({ success: true, message: 'API keys saved successfully' });
    } catch (error) {
        logger.error('Failed to save API keys:', error);
        res.status(500).json({ message: error.message });
    }
});

// Test API connections
router.post('/test-connection', async (req, res) => {
    try {
        const { apiName, apiKey } = req.body;

        let testResult = { success: false, message: '' };

        switch (apiName) {
            case 'openai':
                testResult = await testOpenAI(apiKey);
                break;
            case 'apollo':
                testResult = await testApollo(apiKey);
                break;
            case 'hunter':
                testResult = await testHunter(apiKey);
                break;
            case 'linkedin':
                testResult = await testLinkedIn(apiKey);
                break;
            case 'crunchbase':
                testResult = await testCrunchbase(apiKey);
                break;
            default:
                testResult = { success: false, message: 'Unknown API' };
        }

        res.json(testResult);
    } catch (error) {
        logger.error('API test failed:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Test functions
async function testApollo(apiKey) {
    try {
        const axios = require('axios');
        const response = await axios.post('https://api.apollo.io/api/v1/accounts/search', {
            q_organization_locations: ['Boston, MA'],
            per_page: 1
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
                'X-Api-Key': apiKey
            }
        });

        return {
            success: true,
            message: `Apollo.io connected successfully. Found ${response.data?.accounts?.length || 0} test results.`
        };
    } catch (error) {
        return {
            success: false,
            message: `Apollo.io connection failed: ${error.response?.data?.message || error.message}`
        };
    }
}

async function testOpenAI(apiKey) {
    try {
        const OpenAI = require('openai');
        const openai = new OpenAI({ apiKey });

        const response = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: 'Test connection' }],
            max_tokens: 10
        });

        return { success: true, message: 'OpenAI connected successfully' };
    } catch (error) {
        return { success: false, message: `OpenAI connection failed: ${error.message}` };
    }
}

async function testHunter(apiKey) {
    try {
        const axios = require('axios');
        const response = await axios.get('https://api.hunter.io/v2/account', {
            params: { api_key: apiKey }
        });

        return {
            success: true,
            message: `Hunter.io connected. ${response.data.data.calls.left} calls remaining.`
        };
    } catch (error) {
        return { success: false, message: `Hunter.io connection failed: ${error.message}` };
    }
}

async function testLinkedIn(apiKey) {
    return { success: true, message: 'LinkedIn API test - placeholder' };
}

async function testCrunchbase(apiKey) {
    return { success: true, message: 'Crunchbase API test - placeholder' };
}

module.exports = router;