const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

// Save API keys (in production, encrypt these)
router.post('/api-keys', async (req, res) => {
    try {
        const { openai, apollo, hunter, linkedin, crunchbase } = req.body;

        // In production, store these encrypted in database
        // For now, just validate they exist and update environment
        if (openai) process.env.OPENAI_API_KEY = openai;
        if (apollo) process.env.APOLLO_API_KEY = apollo;  // New Apollo API
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

// Test Apollo.io connection
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

// Test OpenAI connection
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

// Test Hunter.io connection
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

// Placeholder test functions
async function testLinkedIn(apiKey) {
    return { success: true, message: 'LinkedIn API test - placeholder' };
}

async function testCrunchbase(apiKey) {
    return { success: true, message: 'Crunchbase API test - placeholder' };
}

module.exports = router;

// ===== BACKEND/models/SearchJob.js (UPDATED) =====
const mongoose = require('mongoose');

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
        currentStep: String
    },
    results: {
        companiesFound: { type: Number, default: 0 },
        contactsFound: { type: Number, default: 0 },
        apolloCompanies: { type: Number, default: 0 },
        hunterContacts: { type: Number, default: 0 },
        errors: [String]
    },
    aiAnalysis: String,
    apiUsage: {
        openai: {
            calls: { type: Number, default: 0 },
            cost: { type: Number, default: 0 }
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
        },
        linkedin: {
            calls: { type: Number, default: 0 },
            cost: { type: Number, default: 0 }
        },
        crunchbase: {
            calls: { type: Number, default: 0 },
            cost: { type: Number, default: 0 }
        }
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('SearchJob', searchJobSchema);