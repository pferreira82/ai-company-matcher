const express = require('express');
const router = express.Router();
const Queue = require('bull');
const { v4: uuidv4 } = require('uuid');
const UserProfile = require('../models/UserProfile');
const Company = require('../models/Company');
const SearchJob = require('../models/SearchJob');
const openaiService = require('../services/openaiService');
const apiServices = require('../services/apiServices');
const logger = require('../utils/logger');

// Create search queue
const searchQueue = new Queue('ai company search', {
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379
    }
});

// Start AI-powered search
router.post('/ai-powered', async (req, res) => {
    try {
        const { profile, location, maxResults } = req.body;

        // Validate profile
        if (!profile.resume || !profile.personalStatement) {
            return res.status(400).json({
                success: false,
                message: 'Resume and personal statement are required'
            });
        }

        // Validate API keys
        if (!process.env.OPENAI_API_KEY) {
            return res.status(400).json({
                success: false,
                message: 'OpenAI API key is required for AI analysis'
            });
        }

        if (!process.env.APOLLO_API_KEY) {
            return res.status(400).json({
                success: false,
                message: 'Apollo.io API key is required for company data'
            });
        }

        const jobId = uuidv4();

        // Create search job
        const searchJob = new SearchJob({
            jobId,
            parameters: { profile, location, maxResults },
            status: 'pending',
            progress: { total: maxResults || 50 }
        });

        await searchJob.save();

        // Add to queue
        await searchQueue.add('ai-search', {
            jobId,
            profile,
            location,
            maxResults: maxResults || 50
        });

        res.json({
            success: true,
            jobId,
            message: 'AI-powered search started with Apollo.io integration'
        });
    } catch (error) {
        logger.error('Failed to start AI search:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to start AI search'
        });
    }
});

// Get search progress
router.get('/progress', async (req, res) => {
    try {
        const job = await SearchJob.findOne().sort({ createdAt: -1 });

        if (!job) {
            return res.json({
                isRunning: false,
                progress: 0,
                currentStep: 'No search in progress',
                totalFound: 0,
                completed: true
            });
        }

        res.json({
            isRunning: job.status === 'running',
            progress: job.progress.percentage || 0,
            currentStep: job.progress.currentStep || 'Initializing...',
            totalFound: job.results.companiesFound || 0,
            completed: job.status === 'completed',
            aiAnalysis: job.aiAnalysis || '',
            apiUsage: job.apiUsage || {}
        });
    } catch (error) {
        logger.error('Failed to get search progress:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get search progress'
        });
    }
});

// Pause search
router.post('/pause', async (req, res) => {
    try {
        const job = await SearchJob.findOne({ status: 'running' }).sort({ createdAt: -1 });

        if (job) {
            job.status = 'paused';
            await job.save();
        }

        res.json({
            success: true,
            message: 'Search paused successfully'
        });
    } catch (error) {
        logger.error('Failed to pause search:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to pause search'
        });
    }
});

// Process AI search jobs
searchQueue.process('ai-search', async (job) => {
    const { jobId, profile, location, maxResults } = job.data;

    try {
        const searchJob = await SearchJob.findOne({ jobId });
        searchJob.status = 'running';
        searchJob.progress.currentStep = 'Analyzing your profile with AI...';
        searchJob.progress.percentage = 5;
        await searchJob.save();

        // Step 1: Analyze user profile with AI
        const aiAnalysis = await openaiService.analyzeUserProfile(
            profile.resume,
            profile.personalStatement
        );

        // Update API usage
        searchJob.apiUsage.openai.calls += 1;
        searchJob.apiUsage.openai.cost += 0.02; // Estimate

        // Save AI analysis to user profile
        await UserProfile.findOneAndUpdate(
            { userId: 'default' },
            { ...profile, aiAnalysis: { ...aiAnalysis, generatedAt: new Date() } },
            { upsert: true }
        );

        searchJob.progress.currentStep = 'Finding companies with Apollo.io...';
        searchJob.progress.percentage = 15;
        searchJob.aiAnalysis = `Found ${aiAnalysis.strengths.length} key strengths and ${aiAnalysis.interests.length} interests`;
        await searchJob.save();

        // Step 2: Search companies using Apollo.io
        const apolloCompanies = await apiServices.searchApollo({
            location: location,
            industry: profile.preferences?.industry,
            companySize: profile.preferences?.companySize,
            maxResults: maxResults
        });

        // Update API usage
        searchJob.apiUsage.apollo.calls += 1;
        searchJob.apiUsage.apollo.companiesFound = apolloCompanies.length;

        searchJob.progress.currentStep = 'Enriching company data...';
        searchJob.progress.percentage = 35;
        await searchJob.save();

        // Step 3: Process each company
        let processedCount = 0;
        const totalCompanies = Math.min(apolloCompanies.length, maxResults);

        for (const companyData of apolloCompanies.slice(0, maxResults)) {
            try {
                searchJob.progress.currentStep = `Analyzing ${companyData.name}...`;
                searchJob.progress.percentage = 35 + (processedCount / totalCompanies) * 50;
                await searchJob.save();

                // Check if company already exists
                let existingCompany = await Company.findOne({ name: companyData.name });

                if (!existingCompany) {
                    // Enrich with additional data if available
                    let enrichedData = companyData;

                    // Get additional HR contacts with Hunter.io if available
                    if (companyData.domain && process.env.HUNTER_API_KEY) {
                        try {
                            const hunterContacts = await apiServices.searchHunter({
                                domain: companyData.domain
                            });

                            if (hunterContacts && hunterContacts.length > 0) {
                                // Merge Apollo and Hunter contacts
                                enrichedData.hrContacts = [
                                    ...(enrichedData.hrContacts || []),
                                    ...(hunterContacts[0]?.hrContacts || [])
                                ];

                                searchJob.apiUsage.hunter.calls += 1;
                                searchJob.apiUsage.hunter.emailsFound += hunterContacts[0]?.hrContacts?.length || 0;
                            }
                        } catch (hunterError) {
                            logger.error('Hunter.io enrichment failed:', hunterError);
                        }
                    }

                    // Evaluate work-life balance with AI
                    const wlbEvaluation = await openaiService.evaluateWorkLifeBalance(enrichedData);
                    searchJob.apiUsage.openai.calls += 1;

                    // Evaluate match with user profile
                    const matchEvaluation = await openaiService.evaluateCompanyMatch(
                        { ...profile, aiAnalysis },
                        enrichedData
                    );
                    searchJob.apiUsage.openai.calls += 1;

                    // Create company record
                    existingCompany = new Company({
                        ...enrichedData,
                        isLocalPriority: isLocalPriority(enrichedData.location, location),
                        workLifeBalance: {
                            score: wlbEvaluation.score,
                            aiAnalysis: wlbEvaluation.analysis,
                            sources: wlbEvaluation.sources,
                            positives: wlbEvaluation.positives,
                            concerns: wlbEvaluation.concerns
                        },
                        aiMatchScore: matchEvaluation.matchScore,
                        aiAnalysis: matchEvaluation.analysis,
                        matchFactors: matchEvaluation.matchFactors,
                        highlights: matchEvaluation.highlights,
                        concerns: matchEvaluation.concerns
                    });

                    await existingCompany.save();

                    searchJob.results.companiesFound = (searchJob.results.companiesFound || 0) + 1;
                    searchJob.results.contactsFound += enrichedData.hrContacts?.length || 0;
                    await searchJob.save();
                }

                processedCount++;

                // Update job progress
                job.progress(Math.floor((processedCount / totalCompanies) * 100));

                // Rate limiting delay
                await new Promise(resolve => setTimeout(resolve, 2000));

            } catch (error) {
                logger.error(`Failed to process company ${companyData.name}:`, error);
                searchJob.results.errors.push(`Failed to process ${companyData.name}: ${error.message}`);
                await searchJob.save();
            }
        }

        searchJob.status = 'completed';
        searchJob.progress.currentStep = 'Search completed!';
        searchJob.progress.percentage = 100;
        await searchJob.save();

    } catch (error) {
        logger.error(`AI search job ${jobId} failed:`, error);

        const searchJob = await SearchJob.findOne({ jobId });
        searchJob.status = 'failed';
        searchJob.results.errors = [error.message];
        await searchJob.save();

        throw error;
    }
});

// Helper function to determine local priority
function isLocalPriority(location, searchLocation) {
    if (!location) return false;

    const locationLower = location.toLowerCase();

    if (searchLocation === 'boston-providence') {
        return locationLower.includes('boston') ||
            locationLower.includes('cambridge') ||
            locationLower.includes('providence') ||
            locationLower.includes('massachusetts') ||
            locationLower.includes('rhode island') ||
            locationLower.includes('ma') ||
            locationLower.includes('ri');
    }

    return false;
}

module.exports = router;