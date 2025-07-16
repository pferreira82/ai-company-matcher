const express = require('express');
const router = express.Router();
const Company = require('../models/Company');
const logger = require('../utils/logger');

// Get all companies/matches with better error handling
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;

        // Filter options
        const filter = {};
        if (req.query.location) {
            filter.location = { $regex: req.query.location, $options: 'i' };
        }
        if (req.query.industry) {
            filter.industry = { $regex: req.query.industry, $options: 'i' };
        }
        if (req.query.size) {
            filter.size = req.query.size;
        }
        if (req.query.minMatchScore) {
            filter.aiMatchScore = { $gte: parseInt(req.query.minMatchScore) };
        }
        if (req.query.minWLBScore) {
            filter['workLifeBalance.score'] = { $gte: parseInt(req.query.minWLBScore) };
        }

        // Enhanced filtering for the new table
        if (req.query.status && req.query.status !== 'all') {
            filter.status = req.query.status;
        }
        if (req.query.hasContacts) {
            if (req.query.hasContacts === 'yes') {
                filter['hrContacts.0'] = { $exists: true };
            } else if (req.query.hasContacts === 'no') {
                filter['hrContacts.0'] = { $exists: false };
            }
        }
        if (req.query.isLocal === 'true') {
            filter.isLocalPriority = true;
        }

        // Text search across multiple fields
        if (req.query.search) {
            const searchRegex = { $regex: req.query.search, $options: 'i' };
            filter.$or = [
                { name: searchRegex },
                { location: searchRegex },
                { industry: searchRegex },
                { description: searchRegex }
            ];
        }

        // Sort options
        let sortOption = { aiMatchScore: -1 }; // Default sort by match score
        if (req.query.sortBy) {
            const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
            switch (req.query.sortBy) {
                case 'match':
                case 'aiMatchScore':
                    sortOption = { aiMatchScore: sortOrder };
                    break;
                case 'wlb':
                case 'workLifeBalanceScore':
                    sortOption = { 'workLifeBalance.score': sortOrder };
                    break;
                case 'name':
                    sortOption = { name: sortOrder };
                    break;
                case 'recent':
                case 'createdAt':
                    sortOption = { createdAt: sortOrder };
                    break;
                case 'updated':
                case 'updatedAt':
                    sortOption = { updatedAt: sortOrder };
                    break;
                default:
                    sortOption = { aiMatchScore: -1 };
            }
        }

        const companies = await Company.find(filter)
            .sort(sortOption)
            .skip(skip)
            .limit(limit)
            .lean();

        const total = await Company.countDocuments(filter);

        // Add computed fields for better frontend display
        const enrichedCompanies = companies.map(company => ({
            ...company,
            id: company._id,
            workLifeBalanceScore: company.workLifeBalance?.score || 0,
            hrContact: company.hrContacts && company.hrContacts.length > 0 ? company.hrContacts[0] : null,
            contactCount: company.hrContacts?.length || 0,
            verifiedContactCount: company.hrContacts?.filter(c => c.verified).length || 0,
            remotePolicy: company.remotePolicy || 'Not specified',
            status: company.status || 'not-contacted',
            emailCount: company.emailHistory?.length || 0,
            hasEmailSent: company.emailHistory?.some(email => email.sent) || false
        }));

        res.json({
            success: true,
            data: enrichedCompanies,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        logger.error('Failed to get companies:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get companies',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Get company by ID
router.get('/:id', async (req, res) => {
    try {
        const company = await Company.findById(req.params.id).lean();

        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }

        // Add computed fields
        const enrichedCompany = {
            ...company,
            id: company._id,
            workLifeBalanceScore: company.workLifeBalance?.score || 0,
            hrContact: company.hrContacts && company.hrContacts.length > 0 ? company.hrContacts[0] : null,
            contactCount: company.hrContacts?.length || 0,
            verifiedContactCount: company.hrContacts?.filter(c => c.verified).length || 0,
            remotePolicy: company.remotePolicy || 'Not specified',
            status: company.status || 'not-contacted',
            emailCount: company.emailHistory?.length || 0,
            hasEmailSent: company.emailHistory?.some(email => email.sent) || false
        };

        res.json({
            success: true,
            data: enrichedCompany
        });

    } catch (error) {
        logger.error('Failed to get company:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get company'
        });
    }
});

// Update company status
router.put('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;

        // Validate status
        const validStatuses = ['not-contacted', 'contacted', 'responded', 'interview', 'rejected', 'hired'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        const company = await Company.findByIdAndUpdate(
            req.params.id,
            {
                status,
                updatedAt: new Date()
            },
            { new: true }
        );

        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }

        logger.info('Company status updated:', {
            companyId: req.params.id,
            companyName: company.name,
            newStatus: status
        });

        res.json({
            success: true,
            data: company
        });

    } catch (error) {
        logger.error('Failed to update company status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update company status'
        });
    }
});

// NEW: Bulk update companies
router.put('/bulk', async (req, res) => {
    try {
        const { companyIds, updates } = req.body;

        if (!companyIds || !Array.isArray(companyIds) || companyIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Company IDs array is required'
            });
        }

        if (!updates || typeof updates !== 'object') {
            return res.status(400).json({
                success: false,
                message: 'Updates object is required'
            });
        }

        // Validate status if being updated
        if (updates.status) {
            const validStatuses = ['not-contacted', 'contacted', 'responded', 'interview', 'rejected', 'hired'];
            if (!validStatuses.includes(updates.status)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid status'
                });
            }
        }

        // Add timestamp to updates
        updates.updatedAt = new Date();

        const result = await Company.updateMany(
            { _id: { $in: companyIds } },
            { $set: updates }
        );

        logger.info('Bulk company update:', {
            companyIds,
            updates,
            modifiedCount: result.modifiedCount
        });

        res.json({
            success: true,
            message: `Updated ${result.modifiedCount} companies`,
            data: {
                matchedCount: result.matchedCount,
                modifiedCount: result.modifiedCount
            }
        });

    } catch (error) {
        logger.error('Failed bulk company update:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update companies'
        });
    }
});

// Add note to company
router.post('/:id/notes', async (req, res) => {
    try {
        const { note } = req.body;

        if (!note || note.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Note cannot be empty'
            });
        }

        const company = await Company.findByIdAndUpdate(
            req.params.id,
            {
                $push: {
                    notes: {
                        content: note.trim(),
                        createdAt: new Date()
                    }
                },
                updatedAt: new Date()
            },
            { new: true }
        );

        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }

        logger.info('Note added to company:', {
            companyId: req.params.id,
            companyName: company.name,
            noteLength: note.length
        });

        res.json({
            success: true,
            data: company
        });

    } catch (error) {
        logger.error('Failed to add note to company:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add note to company'
        });
    }
});

// Delete company
router.delete('/:id', async (req, res) => {
    try {
        const company = await Company.findByIdAndDelete(req.params.id);

        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }

        logger.info('Company deleted:', {
            companyId: req.params.id,
            companyName: company.name
        });

        res.json({
            success: true,
            message: 'Company deleted successfully'
        });

    } catch (error) {
        logger.error('Failed to delete company:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete company'
        });
    }
});

// NEW: Export companies data
router.get('/export', async (req, res) => {
    try {
        // Build filter based on query parameters (same as main GET route)
        const filter = {};
        if (req.query.location) {
            filter.location = { $regex: req.query.location, $options: 'i' };
        }
        if (req.query.industry) {
            filter.industry = { $regex: req.query.industry, $options: 'i' };
        }
        if (req.query.size) {
            filter.size = req.query.size;
        }
        if (req.query.status && req.query.status !== 'all') {
            filter.status = req.query.status;
        }
        if (req.query.hasContacts) {
            if (req.query.hasContacts === 'yes') {
                filter['hrContacts.0'] = { $exists: true };
            } else if (req.query.hasContacts === 'no') {
                filter['hrContacts.0'] = { $exists: false };
            }
        }
        if (req.query.search) {
            const searchRegex = { $regex: req.query.search, $options: 'i' };
            filter.$or = [
                { name: searchRegex },
                { location: searchRegex },
                { industry: searchRegex }
            ];
        }

        const companies = await Company.find(filter).lean();

        // Format for export
        const exportData = companies.map(company => ({
            name: company.name,
            location: company.location,
            industry: company.industry,
            size: company.size,
            website: company.website,
            matchScore: company.aiMatchScore,
            wlbScore: company.workLifeBalance?.score || 0,
            status: company.status || 'not-contacted',
            hasContacts: (company.hrContacts?.length || 0) > 0,
            contactCount: company.hrContacts?.length || 0,
            verifiedContacts: company.hrContacts?.filter(c => c.verified).length || 0,
            emailsGenerated: company.emailHistory?.length || 0,
            emailsSent: company.emailHistory?.filter(e => e.sent).length || 0,
            isLocalPriority: company.isLocalPriority || false,
            remotePolicy: company.remotePolicy || 'Not specified',
            description: company.description,
            createdAt: company.createdAt,
            updatedAt: company.updatedAt
        }));

        logger.info('Companies data exported:', {
            totalCompanies: exportData.length,
            filters: req.query
        });

        res.json({
            success: true,
            data: exportData,
            meta: {
                totalRecords: exportData.length,
                exportedAt: new Date().toISOString(),
                filters: req.query
            }
        });

    } catch (error) {
        logger.error('Failed to export companies:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to export companies data'
        });
    }
});

// Enhanced company statistics endpoint
router.get('/stats/summary', async (req, res) => {
    try {
        // Main stats aggregation
        const mainStats = await Company.aggregate([
            {
                $group: {
                    _id: null,
                    totalCompanies: { $sum: 1 },
                    avgMatchScore: { $avg: '$aiMatchScore' },
                    avgWLBScore: { $avg: '$workLifeBalance.score' },
                    highMatches: {
                        $sum: { $cond: [{ $gte: ['$aiMatchScore', 80] }, 1, 0] }
                    },
                    excellentWLB: {
                        $sum: { $cond: [{ $gte: ['$workLifeBalance.score', 8] }, 1, 0] }
                    },
                    localPriority: {
                        $sum: { $cond: ['$isLocalPriority', 1, 0] }
                    }
                }
            }
        ]);

        // Status breakdown
        const statusStats = await Company.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);

        // Location breakdown
        const locationStats = await Company.aggregate([
            {
                $group: {
                    _id: '$location',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        // Industry breakdown
        const industryStats = await Company.aggregate([
            {
                $group: {
                    _id: '$industry',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        // Company size breakdown
        const sizeStats = await Company.aggregate([
            {
                $group: {
                    _id: '$size',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);

        // HR contact stats
        const contactStats = await Company.aggregate([
            {
                $group: {
                    _id: null,
                    totalContacts: { $sum: { $size: '$hrContacts' } },
                    companiesWithContacts: {
                        $sum: { $cond: [{ $gt: [{ $size: '$hrContacts' }, 0] }, 1, 0] }
                    },
                    verifiedContacts: {
                        $sum: {
                            $size: {
                                $filter: {
                                    input: '$hrContacts',
                                    cond: { $eq: ['$$this.verified', true] }
                                }
                            }
                        }
                    }
                }
            }
        ]);

        // Email statistics
        const emailStats = await Company.aggregate([
            {
                $group: {
                    _id: null,
                    companiesWithEmails: {
                        $sum: { $cond: [{ $gt: [{ $size: { $ifNull: ['$emailHistory', []] } }, 0] }, 1, 0] }
                    },
                    totalEmailsGenerated: { $sum: { $size: { $ifNull: ['$emailHistory', []] } } },
                    companiesWithSentEmails: {
                        $sum: {
                            $cond: [
                                {
                                    $gt: [
                                        {
                                            $size: {
                                                $filter: {
                                                    input: { $ifNull: ['$emailHistory', []] },
                                                    cond: { $eq: ['$$this.sent', true] }
                                                }
                                            }
                                        },
                                        0
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    }
                }
            }
        ]);

        // Recent activity (companies added in last 7 days)
        const recentActivity = await Company.aggregate([
            {
                $match: {
                    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const response = {
            success: true,
            data: {
                summary: mainStats[0] || {
                    totalCompanies: 0,
                    avgMatchScore: 0,
                    avgWLBScore: 0,
                    highMatches: 0,
                    excellentWLB: 0,
                    localPriority: 0
                },
                statusBreakdown: statusStats,
                topLocations: locationStats,
                topIndustries: industryStats,
                sizeBreakdown: sizeStats,
                contactStats: contactStats[0] || {
                    totalContacts: 0,
                    companiesWithContacts: 0,
                    verifiedContacts: 0
                },
                emailStats: emailStats[0] || {
                    companiesWithEmails: 0,
                    totalEmailsGenerated: 0,
                    companiesWithSentEmails: 0
                },
                recentActivity: recentActivity
            }
        };

        res.json(response);

    } catch (error) {
        logger.error('Failed to get company stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get company statistics',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Enhanced search endpoint for dashboard
router.get('/search/advanced', async (req, res) => {
    try {
        const {
            matchScoreMin,
            matchScoreMax,
            wlbScoreMin,
            wlbScoreMax,
            hasContacts,
            isLocal,
            status,
            industry,
            size,
            location,
            search,
            sortBy,
            sortOrder,
            page = 1,
            limit = 20
        } = req.query;

        const filter = {};
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Build dynamic filter
        if (matchScoreMin || matchScoreMax) {
            filter.aiMatchScore = {};
            if (matchScoreMin) filter.aiMatchScore.$gte = parseInt(matchScoreMin);
            if (matchScoreMax) filter.aiMatchScore.$lte = parseInt(matchScoreMax);
        }

        if (wlbScoreMin || wlbScoreMax) {
            filter['workLifeBalance.score'] = {};
            if (wlbScoreMin) filter['workLifeBalance.score'].$gte = parseInt(wlbScoreMin);
            if (wlbScoreMax) filter['workLifeBalance.score'].$lte = parseInt(wlbScoreMax);
        }

        if (hasContacts === 'yes') {
            filter['hrContacts.0'] = { $exists: true };
        } else if (hasContacts === 'no') {
            filter['hrContacts.0'] = { $exists: false };
        }

        if (isLocal === 'true') {
            filter.isLocalPriority = true;
        }

        if (status && status !== 'all') {
            filter.status = status;
        }

        if (industry) {
            filter.industry = { $regex: industry, $options: 'i' };
        }

        if (size) {
            filter.size = size;
        }

        if (location) {
            filter.location = { $regex: location, $options: 'i' };
        }

        // Text search across multiple fields
        if (search) {
            const searchRegex = { $regex: search, $options: 'i' };
            filter.$or = [
                { name: searchRegex },
                { location: searchRegex },
                { industry: searchRegex },
                { description: searchRegex }
            ];
        }

        // Build sort options
        let sort = { aiMatchScore: -1 }; // default
        if (sortBy) {
            const order = sortOrder === 'asc' ? 1 : -1;
            switch (sortBy) {
                case 'name':
                    sort = { name: order };
                    break;
                case 'match':
                case 'aiMatchScore':
                    sort = { aiMatchScore: order };
                    break;
                case 'wlb':
                case 'workLifeBalanceScore':
                    sort = { 'workLifeBalance.score': order };
                    break;
                case 'created':
                case 'createdAt':
                    sort = { createdAt: order };
                    break;
                case 'updated':
                case 'updatedAt':
                    sort = { updatedAt: order };
                    break;
                default:
                    sort = { aiMatchScore: -1 };
            }
        }

        const companies = await Company.find(filter)
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        const total = await Company.countDocuments(filter);

        // Enrich companies data
        const enrichedCompanies = companies.map(company => ({
            ...company,
            id: company._id,
            workLifeBalanceScore: company.workLifeBalance?.score || 0,
            hrContact: company.hrContacts && company.hrContacts.length > 0 ? company.hrContacts[0] : null,
            contactCount: company.hrContacts?.length || 0,
            verifiedContactCount: company.hrContacts?.filter(c => c.verified).length || 0,
            emailCount: company.emailHistory?.length || 0,
            hasEmailSent: company.emailHistory?.some(email => email.sent) || false
        }));

        res.json({
            success: true,
            data: enrichedCompanies,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            },
            filters: {
                matchScoreMin,
                matchScoreMax,
                wlbScoreMin,
                wlbScoreMax,
                hasContacts,
                isLocal,
                status,
                industry,
                size,
                location,
                search
            }
        });

    } catch (error) {
        logger.error('Failed advanced company search:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search companies'
        });
    }
});

// NEW: Get companies with minimal data for dropdown/autocomplete
router.get('/minimal', async (req, res) => {
    try {
        const companies = await Company.find({}, {
            name: 1,
            location: 1,
            industry: 1,
            size: 1,
            aiMatchScore: 1
        }).sort({ name: 1 }).lean();

        const minimalCompanies = companies.map(company => ({
            id: company._id,
            name: company.name,
            location: company.location,
            industry: company.industry,
            size: company.size,
            matchScore: company.aiMatchScore
        }));

        res.json({
            success: true,
            data: minimalCompanies
        });

    } catch (error) {
        logger.error('Failed to get minimal companies:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get companies'
        });
    }
});

module.exports = router;