const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const UserProfile = require('../models/UserProfile');
const Company = require('../models/Company');
const SearchJob = require('../models/SearchJob');
const openaiService = require('../services/openaiService');
const apiServices = require('../services/apiServices');
const logger = require('../utils/logger');

// Import Bull and Redis with fallback
let Queue, searchQueue;
// This is good - you already handle the Redis issue properly
try {
    Queue = require('bull');
    searchQueue = new Queue('ai company search', {
        redis: {
            port: process.env.REDIS_PORT || 6379,
            host: process.env.REDIS_HOST || 'localhost',
            retryDelayOnFailover: 100,
            enableOfflineQueue: false,
            maxRetriesPerRequest: 3,
        }
    });
} catch (error) {
    logger.warn('Bull queue not available, jobs will run synchronously:', error.message);
    searchQueue = null;
}

// Start AI-powered search
router.post('/ai-powered', async (req, res) => {
    try {
        const { profile, location, maxResults, demoMode } = req.body;

        logger.info('🚀 Starting AI-powered company search', {
            user: profile.personalInfo?.firstName,
            companySizes: profile.preferences?.companySizes,
            industries: profile.preferences?.industries,
            maxResults,
            demoMode: demoMode || false
        });

        // Validate profile
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

        // In demo mode, skip API key validation
        if (!demoMode && !process.env.OPENAI_API_KEY) {
            return res.status(400).json({
                success: false,
                message: 'OpenAI API key is required for AI analysis'
            });
        }

        const jobId = uuidv4();

        // Create search job with enhanced tracking
        const searchJob = new SearchJob({
            jobId,
            parameters: { profile, location, maxResults: maxResults || 1000, demoMode },
            status: 'pending',
            progress: { total: maxResults || 1000, phase: 'profile-analysis' },
            performance: { startTime: new Date() }
        });

        await searchJob.save();

        // If Bull queue is available, use it; otherwise run synchronously
        if (searchQueue) {
            await searchQueue.add('ai-search', {
                jobId,
                profile,
                location: 'boston-providence',
                maxResults: maxResults || 1000,
                demoMode: demoMode || false
            });

            logger.info('✅ AI search job queued successfully', { jobId, demoMode });
        } else {
            // Run synchronously without queue
            logger.info('⚡ Running AI search synchronously (no queue)', { jobId, demoMode });

            // Run the search process immediately
            setImmediate(() => {
                processAISearch({
                    jobId,
                    profile,
                    location: 'boston-providence',
                    maxResults: maxResults || 1000,
                    demoMode: demoMode || false
                });
            });
        }

        res.json({
            success: true,
            jobId,
            message: demoMode ? 'Demo search started with sample data' : 'AI-powered search started with real-time tracking'
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
            demoMode: job.parameters?.demoMode || false,

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

// Add search history route
router.get('/history', async (req, res) => {
    try {
        const searchHistory = await SearchJob.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .select('jobId status progress results apiUsage parameters createdAt updatedAt');

        res.json({
            success: true,
            data: searchHistory
        });
    } catch (error) {
        logger.error('Failed to get search history:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get search history'
        });
    }
});

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

// AI Search Processing Function (works with or without queue)
async function processAISearch({ jobId, profile, location, maxResults, demoMode }) {
    try {
        const searchJob = await SearchJob.findOne({ jobId });
        if (!searchJob) {
            logger.error('Search job not found:', jobId);
            return;
        }

        searchJob.status = 'running';
        searchJob.progress.currentStep = demoMode ? 'Preparing demo data...' : 'Analyzing your profile with AI...';
        searchJob.progress.percentage = 5;
        searchJob.progress.phase = 'profile-analysis';
        searchJob.performance.startTime = new Date();

        // Add initial activity
        searchJob.addActivity('milestone', demoMode ? 'Starting demo search' : 'Starting AI profile analysis', null, {
            companySizes: profile.preferences.companySizes,
            industries: profile.preferences.industries,
            demoMode
        });

        await searchJob.save();

        logger.info('🤖 Starting profile analysis', { jobId, demoMode });

        // Step 1: Analyze user profile with AI (skip in demo mode)
        let aiAnalysis;
        if (demoMode) {
            // Use mock AI analysis for demo
            aiAnalysis = {
                strengths: ['Technical expertise', 'Problem-solving', 'Communication', 'Team collaboration'],
                interests: ['Software development', 'Technology innovation', 'Continuous learning'],
                careerGoals: ['Senior role', 'Technical leadership', 'Work-life balance'],
                experienceLevel: profile.experienceLevel || 'mid'
            };

            searchJob.addActivity('milestone', 'Using demo AI analysis data');
        } else {
            try {
                aiAnalysis = await openaiService.analyzeUserProfile(
                    profile.resume,
                    profile.personalStatement,
                    false // Not demo mode
                );

                // Update API usage and add activity
                searchJob.apiUsage.openai.calls += 1;
                searchJob.apiUsage.openai.cost += 0.02;
                searchJob.addActivity('milestone', `AI identified ${aiAnalysis.strengths.length} key strengths and ${aiAnalysis.interests.length} interests`);
            } catch (apiError) {
                logger.error('OpenAI API error during profile analysis:', apiError);
                // Fall back to mock data if API fails
                aiAnalysis = {
                    strengths: ['Technical expertise', 'Problem-solving', 'Communication'],
                    interests: ['Software development', 'Technology innovation'],
                    careerGoals: ['Career advancement', 'Technical growth'],
                    experienceLevel: profile.experienceLevel || 'mid'
                };
                searchJob.addActivity('milestone', 'Using fallback analysis due to API error');
            }
        }

        // Save AI analysis to user profile
        await UserProfile.findOneAndUpdate(
            { userId: 'default' },
            { ...profile, aiAnalysis: { ...aiAnalysis, generatedAt: new Date() } },
            { upsert: true }
        );

        searchJob.progress.currentStep = demoMode ? 'Generating demo companies...' : 'AI generating Boston/Providence company matches...';
        searchJob.progress.percentage = 15;
        searchJob.progress.phase = 'company-generation';
        searchJob.aiAnalysis = `Found ${aiAnalysis.strengths.length} key strengths and ${aiAnalysis.interests.length} interests`;
        await searchJob.save();

        logger.info('🔍 Starting company search', { jobId, demoMode });

        // Step 2: Get AI-suggested companies (Boston/Providence first)
        let bostonProvidenceCompanies;
        if (demoMode) {
            bostonProvidenceCompanies = await openaiService.findCompanyMatches(
                { ...profile, aiAnalysis },
                Math.min(maxResults, 200), // Limit demo to 200 max
                false, // Not nationwide yet
                true // Demo mode
            );
        } else {
            try {
                bostonProvidenceCompanies = await openaiService.findCompanyMatches(
                    { ...profile, aiAnalysis },
                    Math.min(maxResults, 500), // Increased limit for real search
                    false, // Not nationwide yet
                    false // Not demo mode
                );
                searchJob.apiUsage.openai.calls += 1;
            } catch (apiError) {
                logger.error('OpenAI API error during company generation:', apiError);
                // Fall back to demo data
                bostonProvidenceCompanies = await openaiService.findCompanyMatches(
                    { ...profile, aiAnalysis },
                    Math.min(maxResults, 200),
                    false,
                    true // Use demo mode as fallback
                );
                searchJob.addActivity('milestone', 'Using demo companies due to API error');
            }
        }

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
            providence: providenceCount,
            demoMode
        });

        searchJob.progress.currentStep = `Found ${bostonProvidenceCompanies.length} Boston/Providence companies...`;
        searchJob.progress.percentage = 35;
        await searchJob.save();

        // Step 3: Check if we need to expand nationwide
        let allCompanies = bostonProvidenceCompanies;
        let expandedNationwide = false;

        // Expand nationwide if we have fewer than target companies
        const targetForNationwide = demoMode ? 100 : 300;
        if (bostonProvidenceCompanies.length < targetForNationwide) {
            logger.info('🌎 Expanding to nationwide search', {
                jobId,
                currentCount: bostonProvidenceCompanies.length,
                demoMode
            });

            searchJob.progress.currentStep = 'Expanding to nationwide search for more matches...';
            searchJob.progress.percentage = 45;
            searchJob.results.expandedNationwide = true;
            searchJob.addActivity('milestone', `Expanding to nationwide search (found ${bostonProvidenceCompanies.length} regional companies)`);
            await searchJob.save();

            let nationwideCompanies;
            const nationwideTarget = Math.min(maxResults - bostonProvidenceCompanies.length, demoMode ? 100 : 700);

            if (demoMode) {
                nationwideCompanies = await openaiService.findCompanyMatches(
                    { ...profile, aiAnalysis },
                    nationwideTarget,
                    true, // Nationwide search
                    true // Demo mode
                );
            } else {
                try {
                    nationwideCompanies = await openaiService.findCompanyMatches(
                        { ...profile, aiAnalysis },
                        nationwideTarget,
                        true, // Nationwide search
                        false // Not demo mode
                    );
                    searchJob.apiUsage.openai.calls += 1;
                } catch (apiError) {
                    logger.error('OpenAI API error during nationwide search:', apiError);
                    // Fall back to demo data
                    nationwideCompanies = await openaiService.findCompanyMatches(
                        { ...profile, aiAnalysis },
                        nationwideTarget,
                        true,
                        true // Use demo mode as fallback
                    );
                    searchJob.addActivity('milestone', 'Using demo nationwide companies due to API error');
                }
            }

            searchJob.liveStats.nationwideCompanies = nationwideCompanies.length;
            searchJob.liveStats.companiesGenerated = bostonProvidenceCompanies.length + nationwideCompanies.length;

            // Combine results, Boston/Providence first
            allCompanies = [...bostonProvidenceCompanies, ...nationwideCompanies];
            expandedNationwide = true;

            searchJob.addActivity('milestone', `Added ${nationwideCompanies.length} nationwide companies`, null, {
                total: allCompanies.length,
                demoMode
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
            expandedNationwide,
            demoMode
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
                    size: companyData.size,
                    demoMode
                });

                // Check if company already exists
                let existingCompany = await Company.findOne({ name: companyData.name });

                if (existingCompany) {
                    searchJob.incrementStat('companiesSkipped');
                    searchJob.addActivity('company-processed', `Skipped ${companyData.name} (already exists)`, companyData.name);
                } else {
                    // Research company using APIs if available (skip in demo mode)
                    let enrichedData = companyData;
                    enrichedData.isLocalPriority = isLocalPriority(companyData.location);

                    let hrContactsFound = 0;

                    // Skip API calls in demo mode
                    if (!demoMode) {
                        // Try Apollo.io for additional data and contacts
                        if (process.env.APOLLO_API_KEY) {
                            try {
                                logger.info(`🔍 Searching Apollo.io for ${companyData.name}`);
                                const apolloData = await apiServices.searchApollo({
                                    name: companyData.name,
                                    location: companyData.location,
                                    demoMode: false
                                });

                                if (apolloData && apolloData.length > 0) {
                                    enrichedData = { ...enrichedData, ...apolloData[0] };
                                    hrContactsFound += apolloData[0].hrContacts?.length || 0;
                                    searchJob.incrementStat('apolloContacts', apolloData[0].hrContacts?.length || 0);
                                    searchJob.apiUsage.apollo.calls += 1;
                                    searchJob.apiUsage.apollo.companiesFound += 1;

                                    logger.info(`✅ Apollo.io found ${apolloData[0].hrContacts?.length || 0} contacts for ${companyData.name}`);
                                }
                            } catch (apiError) {
                                searchJob.incrementStat('apiErrors');
                                logger.warn(`⚠️ Apollo.io failed for ${companyData.name}:`, apiError.message);
                            }
                        }

                        // Try Hunter.io for additional HR contacts
                        if (enrichedData.domain && process.env.HUNTER_API_KEY) {
                            try {
                                logger.info(`📧 Searching Hunter.io for ${enrichedData.domain}`);
                                const hunterContacts = await apiServices.searchHunter({
                                    domain: enrichedData.domain,
                                    demoMode: false
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
                                    searchJob.apiUsage.hunter.emailsFound += newContacts.length;

                                    logger.info(`✅ Hunter.io found ${newContacts.length} contacts for ${enrichedData.domain}`);
                                }
                            } catch (hunterError) {
                                searchJob.incrementStat('apiErrors');
                                logger.warn(`⚠️ Hunter.io failed for ${enrichedData.domain}:`, hunterError.message);
                            }
                        }
                    } else {
                        // In demo mode, add mock HR contacts
                        enrichedData.hrContacts = [
                            {
                                name: 'Sarah Johnson',
                                email: `sarah.johnson@${companyData.name.toLowerCase().replace(/\s+/g, '')}.com`,
                                title: 'HR Director',
                                confidence: 90,
                                verified: true,
                                source: 'demo'
                            }
                        ];
                        hrContactsFound = 1;
                        searchJob.incrementStat('totalHRContacts', 1);
                    }

                    // AI evaluations
                    let wlbEvaluation, matchEvaluation;

                    if (demoMode) {
                        // Use mock evaluations for demo
                        wlbEvaluation = {
                            score: Math.floor(Math.random() * 4) + 6, // 6-10 score
                            analysis: `${companyData.name} appears to have a balanced approach to work-life balance.`,
                            sources: ['Demo data'],
                            positives: ['Flexible work arrangements', 'Good company culture'],
                            concerns: ['Fast-paced environment']
                        };

                        matchEvaluation = {
                            matchScore: Math.floor(Math.random() * 30) + 70, // 70-100 score
                            analysis: `${companyData.name} appears to be a good match based on your profile.`,
                            matchFactors: ['Industry alignment', 'Company size preference', 'Skills match'],
                            highlights: ['Strong technical team', 'Growth opportunities'],
                            concerns: ['Competitive environment']
                        };
                    } else {
                        try {
                            logger.info(`🤖 Evaluating work-life balance for ${companyData.name}`);
                            wlbEvaluation = await openaiService.evaluateWorkLifeBalance(enrichedData, false);
                            searchJob.apiUsage.openai.calls += 1;
                            searchJob.apiUsage.openai.cost += 0.01;

                            logger.info(`🎯 Evaluating company match for ${companyData.name}`);
                            matchEvaluation = await openaiService.evaluateCompanyMatch(
                                { ...profile, aiAnalysis },
                                enrichedData,
                                false
                            );
                            searchJob.apiUsage.openai.calls += 1;
                            searchJob.apiUsage.openai.cost += 0.01;
                        } catch (apiError) {
                            logger.warn(`⚠️ AI evaluation failed for ${companyData.name}:`, apiError.message);
                            // Fall back to mock evaluations
                            wlbEvaluation = {
                                score: Math.floor(Math.random() * 4) + 6,
                                analysis: `Work-life balance evaluation for ${companyData.name} (fallback).`,
                                sources: ['Fallback evaluation'],
                                positives: ['Professional environment'],
                                concerns: ['Limited information']
                            };

                            matchEvaluation = {
                                matchScore: Math.floor(Math.random() * 30) + 70,
                                analysis: `Match evaluation for ${companyData.name} (fallback).`,
                                matchFactors: ['Industry alignment', 'Size preference'],
                                highlights: ['Good potential fit'],
                                concerns: ['Limited information']
                            };
                        }
                    }

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
                        workLifeBalance: wlbEvaluation,
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
                            processingTime: `${(processingTime/1000).toFixed(1)}s`,
                            demoMode
                        });

                    logger.info('✅ Company processed', {
                        name: companyData.name,
                        matchScore: matchEvaluation.matchScore,
                        wlbScore: wlbEvaluation.score,
                        hrContacts: hrContactsFound,
                        processingTime: `${(processingTime/1000).toFixed(1)}s`,
                        demoMode
                    });
                }

                processedCount++;
                searchJob.incrementStat('companiesProcessed');

                // Save progress every few companies
                if (processedCount % 5 === 0) {
                    await searchJob.save();
                }

                // Rate limiting delay (shorter for demo)
                await new Promise(resolve => setTimeout(resolve, demoMode ? 100 : 1000));

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
        searchJob.progress.currentStep = demoMode ?
            'Demo search completed! All sample data processed.' :
            (expandedNationwide ?
                'Search completed! Expanded nationwide for more matches.' :
                'Search completed! Found matches in Boston/Providence area.');
        searchJob.progress.percentage = 100;
        searchJob.progress.phase = 'completed';
        searchJob.performance.endTime = new Date();
        searchJob.performance.duration = searchJob.performance.startTime - searchJob.performance.endTime;

        searchJob.addActivity('milestone',
            `🎉 Search completed! ${searchJob.liveStats.companiesSaved} companies saved`,
            null, {
                totalDuration: formatDuration(searchJob.performance.duration / 1000),
                avgProcessingTime: `${(searchJob.performance.averageCompanyProcessingTime/1000).toFixed(1)}s`,
                demoMode
            });

        await searchJob.save();

        logger.info('🎉 AI search completed successfully', {
            jobId,
            companiesFound: searchJob.results.companiesFound,
            contactsFound: searchJob.results.contactsFound,
            expandedNationwide,
            demoMode,
            duration: formatDuration(searchJob.performance.duration / 1000)
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
}

// Set up Bull queue processing if available
if (searchQueue) {
    searchQueue.process('ai-search', async (job) => {
        await processAISearch(job.data);
    });

    // Queue event handlers
    searchQueue.on('completed', (job, result) => {
        logger.info('Search job completed:', job.id);
    });

    searchQueue.on('failed', (job, err) => {
        logger.error('Search job failed:', job.id, err);
    });

    searchQueue.on('stalled', (job) => {
        logger.warn('Search job stalled:', job.id);
    });
}

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

module.exports = router;