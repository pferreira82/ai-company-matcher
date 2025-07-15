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

        logger.info('🚀 Starting AI-powered company search', {
            user: profile.personalInfo?.firstName,
            companySizes: profile.preferences?.companySizes,
            industries: profile.preferences?.industries,
            maxResults
        });

        // Validate profile (same validation as before)
        if (!profile.resume || !profile.personalStatement) {
            return res.status(400).json({
                success: false,
                message: 'Resume and personal statement are required'
            });
        }

        if (!profile.personalInfo?.firstName || !profile.personalInfo?.email) {
            return res.status(400).json({
                success: false,
                message: 'Name and email are required'
            });
        }

        if (!profile.preferences?.companySizes || profile.preferences.companySizes.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Please select at least one company size preference'
            });
        }

        if (!profile.preferences?.industries || profile.preferences.industries.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Please select at least one industry preference'
            });
        }

        if (!process.env.OPENAI_API_KEY) {
            return res.status(400).json({
                success: false,
                message: 'OpenAI API key is required for AI analysis'
            });
        }

        const jobId = uuidv4();

        // Create search job with enhanced tracking
        const searchJob = new SearchJob({
            jobId,
            parameters: { profile, location, maxResults },
            status: 'pending',
            progress: { total: maxResults || 50, phase: 'profile-analysis' },
            performance: { startTime: new Date() }
        });

        await searchJob.save();

        // Add to queue
        await searchQueue.add('ai-search', {
            jobId,
            profile,
            location: 'boston-providence',
            maxResults: maxResults || 50
        });

        logger.info('✅ AI search job created successfully', { jobId });

        res.json({
            success: true,
            jobId,
            message: 'AI-powered search started with real-time tracking'
        });
    } catch (error) {
        logger.error('❌ Failed to start AI search:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to start AI search'
        });
    }
});

// Enhanced get search progress with real-time stats
router.get('/progress', async (req, res) => {
    try {
        const job = await SearchJob.findOne().sort({ createdAt: -1 });

        if (!job) {
            return res.json({
                isRunning: false,
                progress: 0,
                currentStep: 'No search in progress',
                totalFound: 0,
                completed: true,
                liveStats: null,
                recentActivity: []
            });
        }

        // Calculate real-time performance metrics
        let performanceMetrics = {};
        if (job.performance.startTime) {
            const elapsed = (Date.now() - job.performance.startTime) / 1000;
            performanceMetrics = {
                elapsedTime: formatDuration(elapsed),
                companiesPerSecond: job.liveStats.companiesProcessed > 0 ?
                    (job.liveStats.companiesProcessed / elapsed).toFixed(2) : 0
            };
        }

        res.json({
            isRunning: job.status === 'running',
            progress: job.progress.percentage || 0,
            currentStep: job.progress.currentStep || 'Initializing...',
            phase: job.progress.phase || 'profile-analysis',
            totalFound: job.results.companiesFound || 0,
            completed: job.status === 'completed',
            failed: job.status === 'failed',

            // Enhanced real-time data
            liveStats: job.liveStats,
            recentActivity: job.recentActivity.slice(0, 10), // Last 10 activities
            performanceMetrics,

            // API usage stats
            apiUsage: job.apiUsage || {},

            // Legacy fields for backward compatibility
            aiAnalysis: job.aiAnalysis || '',
            expandedNationwide: job.results.expandedNationwide || false
        });
    } catch (error) {
        logger.error('Failed to get search progress:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get search progress'
        });
    }
});

// Process AI search jobs with enhanced real-time tracking
searchQueue.process('ai-search', async (job) => {
    const { jobId, profile, location, maxResults } = job.data;

    try {
        const searchJob = await SearchJob.findOne({ jobId });
        searchJob.status = 'running';
        searchJob.progress.currentStep = 'Analyzing your profile with AI...';
        searchJob.progress.percentage = 5;
        searchJob.progress.phase = 'profile-analysis';
        searchJob.performance.startTime = new Date();

        // Add initial activity
        searchJob.addActivity('milestone', 'Starting AI profile analysis', null, {
            companySizes: profile.preferences.companySizes,
            industries: profile.preferences.industries
        });

        await searchJob.save();

        logger.info('🤖 Starting profile analysis', { jobId });

        // Step 1: Analyze user profile with AI
        const aiAnalysis = await openaiService.analyzeUserProfile(
            profile.resume,
            profile.personalStatement
        );

        // Update API usage and add activity
        searchJob.apiUsage.openai.calls += 1;
        searchJob.apiUsage.openai.cost += 0.02;
        searchJob.addActivity('milestone', `AI identified ${aiAnalysis.strengths.length} key strengths and ${aiAnalysis.interests.length} interests`);

        // Save AI analysis to user profile
        await UserProfile.findOneAndUpdate(
            { userId: 'default' },
            { ...profile, aiAnalysis: { ...aiAnalysis, generatedAt: new Date() } },
            { upsert: true }
        );

        searchJob.progress.currentStep = 'AI generating Boston/Providence company matches...';
        searchJob.progress.percentage = 15;
        searchJob.progress.phase = 'company-generation';
        searchJob.aiAnalysis = `Found ${aiAnalysis.strengths.length} key strengths and ${aiAnalysis.interests.length} interests`;
        await searchJob.save();

        logger.info('🔍 Starting Boston/Providence company search', { jobId });

        // Step 2: Get AI-suggested companies (Boston/Providence first)
        const bostonProvidenceCompanies = await openaiService.findCompanyMatches(
            { ...profile, aiAnalysis },
            maxResults,
            false // Not nationwide yet
        );

        searchJob.apiUsage.openai.calls += 1;
        searchJob.liveStats.companiesGenerated = bostonProvidenceCompanies.length;

        // Count location breakdown
        let bostonCount = 0, providenceCount = 0;
        bostonProvidenceCompanies.forEach(company => {
            if (isBostonArea(company.location)) bostonCount++;
            else if (isProvidenceArea(company.location)) providenceCount++;
        });

        searchJob.liveStats.bostonCompanies = bostonCount;
        searchJob.liveStats.providenceCompanies = providenceCount;

        searchJob.addActivity('milestone', `Generated ${bostonProvidenceCompanies.length} Boston/Providence companies`, null, {
            boston: bostonCount,
            providence: providenceCount
        });

        searchJob.progress.currentStep = `Found ${bostonProvidenceCompanies.length} Boston/Providence companies...`;
        searchJob.progress.percentage = 35;
        await searchJob.save();

        // Step 3: Check if we need to expand nationwide
        let allCompanies = bostonProvidenceCompanies;
        let expandedNationwide = false;

        if (bostonProvidenceCompanies.length < 100) {
            logger.info('🌎 Expanding to nationwide search', {
                jobId,
                currentCount: bostonProvidenceCompanies.length
            });

            searchJob.progress.currentStep = 'Expanding to nationwide search for more matches...';
            searchJob.progress.percentage = 45;
            searchJob.results.expandedNationwide = true;
            searchJob.addActivity('milestone', `Expanding to nationwide search (found ${bostonProvidenceCompanies.length} regional companies)`);
            await searchJob.save();

            const nationwideCompanies = await openaiService.findCompanyMatches(
                { ...profile, aiAnalysis },
                maxResults - bostonProvidenceCompanies.length,
                true // Nationwide search
            );

            searchJob.apiUsage.openai.calls += 1;
            searchJob.liveStats.nationwideCompanies = nationwideCompanies.length;
            searchJob.liveStats.companiesGenerated = bostonProvidenceCompanies.length + nationwideCompanies.length;

            // Combine results, Boston/Providence first
            allCompanies = [...bostonProvidenceCompanies, ...nationwideCompanies];
            expandedNationwide = true;

            searchJob.addActivity('milestone', `Added ${nationwideCompanies.length} nationwide companies`, null, {
                total: allCompanies.length
            });

            searchJob.progress.currentStep = `Total ${allCompanies.length} companies found (including nationwide)`;
            searchJob.progress.percentage = 55;
            await searchJob.save();
        }

        searchJob.progress.currentStep = 'Processing companies and finding HR contacts...';
        searchJob.progress.percentage = 60;
        searchJob.progress.phase = 'company-processing';
        await searchJob.save();

        // Step 4: Process each company with real-time updates
        let processedCount = 0;
        const totalCompanies = Math.min(allCompanies.length, maxResults);

        logger.info('📊 Processing companies', {
            jobId,
            totalCompanies,
            expandedNationwide
        });

        for (const companyData of allCompanies.slice(0, maxResults)) {
            try {
                const companyStartTime = Date.now();

                searchJob.progress.currentStep = `Analyzing ${companyData.name}...`;
                searchJob.progress.percentage = 60 + (processedCount / totalCompanies) * 35;
                searchJob.liveStats.currentCompany = companyData.name;
                await searchJob.save();

                searchJob.addActivity('company-found', `Analyzing ${companyData.name}`, companyData.name, {
                    location: companyData.location,
                    industry: companyData.industry,
                    size: companyData.size
                });

                // Check if company already exists
                let existingCompany = await Company.findOne({ name: companyData.name });

                if (existingCompany) {
                    searchJob.incrementStat('companiesSkipped');
                    searchJob.addActivity('company-processed', `Skipped ${companyData.name} (already exists)`, companyData.name);
                } else {
                    // Research company using APIs if available
                    let enrichedData = companyData;
                    enrichedData.isLocalPriority = isLocalPriority(companyData.location);

                    let hrContactsFound = 0;

                    // Try Apollo.io for additional data
                    if (process.env.APOLLO_API_KEY) {
                        try {
                            const apolloData = await apiServices.searchApollo({
                                name: companyData.name,
                                location: companyData.location
                            });

                            if (apolloData && apolloData.length > 0) {
                                enrichedData = { ...enrichedData, ...apolloData[0] };
                                hrContactsFound += apolloData[0].hrContacts?.length || 0;
                                searchJob.incrementStat('apolloContacts', apolloData[0].hrContacts?.length || 0);
                                searchJob.apiUsage.apollo.calls += 1;
                            }
                        } catch (apiError) {
                            searchJob.incrementStat('apiErrors');
                            logger.warn('Apollo API failed for company:', companyData.name, apiError.message);
                        }
                    }

                    // Try Hunter.io for HR contacts
                    if (enrichedData.domain && process.env.HUNTER_API_KEY) {
                        try {
                            const hunterContacts = await apiServices.searchHunter({
                                domain: enrichedData.domain
                            });

                            if (hunterContacts && hunterContacts.length > 0) {
                                const newContacts = hunterContacts[0]?.hrContacts || [];
                                enrichedData.hrContacts = [
                                    ...(enrichedData.hrContacts || []),
                                    ...newContacts
                                ];

                                hrContactsFound += newContacts.length;
                                searchJob.incrementStat('hunterContacts', newContacts.length);
                                searchJob.apiUsage.hunter.calls += 1;
                            }
                        } catch (hunterError) {
                            searchJob.incrementStat('apiErrors');
                            logger.warn('Hunter.io failed for company:', companyData.name, hunterError.message);
                        }
                    }

                    // AI evaluations
                    const wlbEvaluation = await openaiService.evaluateWorkLifeBalance(enrichedData);
                    searchJob.apiUsage.openai.calls += 1;

                    const matchEvaluation = await openaiService.evaluateCompanyMatch(
                        { ...profile, aiAnalysis },
                        enrichedData
                    );
                    searchJob.apiUsage.openai.calls += 1;

                    // Update match quality stats
                    if (matchEvaluation.matchScore >= 80) {
                        searchJob.incrementStat('highMatches');
                    } else if (matchEvaluation.matchScore >= 60) {
                        searchJob.incrementStat('mediumMatches');
                    } else {
                        searchJob.incrementStat('lowMatches');
                    }

                    // Update WLB stats
                    if (wlbEvaluation.score >= 8) {
                        searchJob.incrementStat('excellentWLB');
                    } else if (wlbEvaluation.score >= 6) {
                        searchJob.incrementStat('goodWLB');
                    } else if (wlbEvaluation.score >= 4) {
                        searchJob.incrementStat('averageWLB');
                    } else {
                        searchJob.incrementStat('poorWLB');
                    }

                    // Create company record
                    existingCompany = new Company({
                        ...enrichedData,
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

                    // Update stats
                    searchJob.incrementStat('companiesSaved');
                    searchJob.incrementStat('totalHRContacts', hrContactsFound);
                    searchJob.incrementStat('verifiedContacts', enrichedData.hrContacts?.filter(c => c.verified).length || 0);

                    const processingTime = Date.now() - companyStartTime;
                    searchJob.performance.averageCompanyProcessingTime =
                        ((searchJob.performance.averageCompanyProcessingTime || 0) * processedCount + processingTime) / (processedCount + 1);

                    searchJob.results.companiesFound = (searchJob.results.companiesFound || 0) + 1;
                    searchJob.results.contactsFound += hrContactsFound;

                    searchJob.addActivity('company-processed',
                        `✅ ${companyData.name} - ${matchEvaluation.matchScore}% match, ${wlbEvaluation.score}/10 WLB, ${hrContactsFound} contacts`,
                        companyData.name, {
                            matchScore: matchEvaluation.matchScore,
                            wlbScore: wlbEvaluation.score,
                            contacts: hrContactsFound,
                            processingTime: `${(processingTime/1000).toFixed(1)}s`
                        });

                    logger.info('✅ Company processed', {
                        name: companyData.name,
                        matchScore: matchEvaluation.matchScore,
                        wlbScore: wlbEvaluation.score,
                        hrContacts: hrContactsFound,
                        processingTime: `${(processingTime/1000).toFixed(1)}s`
                    });
                }

                processedCount++;
                searchJob.incrementStat('companiesProcessed');

                // Update job progress
                job.progress(Math.floor((processedCount / totalCompanies) * 100));

                // Save progress every few companies
                if (processedCount % 5 === 0) {
                    await searchJob.save();
                }

                // Rate limiting delay
                await new Promise(resolve => setTimeout(resolve, 1500));

            } catch (error) {
                searchJob.incrementStat('processingErrors');
                logger.error(`Failed to process company ${companyData.name}:`, error);
                searchJob.results.errors.push(`Failed to process ${companyData.name}: ${error.message}`);
                searchJob.addActivity('error', `❌ Failed to process ${companyData.name}: ${error.message}`, companyData.name);
                await searchJob.save();
            }
        }

        // Final completion
        searchJob.status = 'completed';
        searchJob.progress.currentStep = expandedNationwide ?
            'Search completed! Expanded nationwide for more matches.' :
            'Search completed! Found matches in Boston/Providence area.';
        searchJob.progress.percentage = 100;
        searchJob.progress.phase = 'completed';
        searchJob.performance.endTime = new Date();
        searchJob.performance.duration = searchJob.performance.endTime - searchJob.performance.startTime;

        searchJob.addActivity('milestone',
            `🎉 Search completed! ${searchJob.liveStats.companiesSaved} companies saved, ${searchJob.liveStats.totalHRContacts} HR contacts found`,
            null, {
                totalDuration: formatDuration(searchJob.performance.duration / 1000),
                avgProcessingTime: `${(searchJob.performance.averageCompanyProcessingTime/1000).toFixed(1)}s`,
                apiCalls: searchJob.apiUsage.openai.calls + searchJob.apiUsage.apollo.calls + searchJob.apiUsage.hunter.calls
            });

        await searchJob.save();

        logger.info('🎉 AI search completed successfully', {
            jobId,
            companiesFound: searchJob.results.companiesFound,
            contactsFound: searchJob.results.contactsFound,
            expandedNationwide,
            duration: formatDuration(searchJob.performance.duration / 1000),
            apiCalls: {
                openai: searchJob.apiUsage.openai.calls,
                apollo: searchJob.apiUsage.apollo.calls,
                hunter: searchJob.apiUsage.hunter.calls
            }
        });

    } catch (error) {
        logger.error(`❌ AI search job ${jobId} failed:`, error);

        const searchJob = await SearchJob.findOne({ jobId });
        if (searchJob) {
            searchJob.status = 'failed';
            searchJob.results.errors = [error.message];
            searchJob.addActivity('error', `❌ Search failed: ${error.message}`);
            await searchJob.save();
        }

        throw error;
    }
});

// Helper functions
function isLocalPriority(location) {
    return isBostonArea(location) || isProvidenceArea(location);
}

function isBostonArea(location) {
    if (!location) return false;
    const locationLower = location.toLowerCase();
    return locationLower.includes('boston') ||
        locationLower.includes('cambridge') ||
        locationLower.includes('somerville');
}

function isProvidenceArea(location) {
    if (!location) return false;
    const locationLower = location.toLowerCase();
    return locationLower.includes('providence') ||
        locationLower.includes('rhode island') ||
        locationLower.includes(' ri');
}

function formatDuration(seconds) {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
}

// Pause search
router.post('/pause', async (req, res) => {
    try {
        const job = await SearchJob.findOne({ status: 'running' }).sort({ createdAt: -1 });

        if (job) {
            job.status = 'paused';
            job.addActivity('milestone', 'Search paused by user');
            await job.save();
            logger.info('Search paused by user');
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

module.exports = router;