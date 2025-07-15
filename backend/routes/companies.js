const express = require('express');
const router = express.Router();
const Company = require('../models/Company');
const logger = require('../utils/logger');

// Get all companies/matches
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

        // Sort options
        let sortOption = { aiMatchScore: -1 }; // Default sort by match score
        if (req.query.sortBy) {
            switch (req.query.sortBy) {
                case 'match':
                    sortOption = { aiMatchScore: -1 };
                    break;
                case 'wlb':
                    sortOption = { 'workLifeBalance.score': -1 };
                    break;
                case 'name':
                    sortOption = { name: 1 };
                    break;
                case 'recent':
                    sortOption = { createdAt: -1 };
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
            remotePolicy: company.remotePolicy || 'Not specified',
            status: company.status || 'not-contacted'
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
            message: 'Failed to get companies'
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
            remotePolicy: company.remotePolicy || 'Not specified',
            status: company.status || 'not-contacted'
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

// Get company statistics
router.get('/stats/summary', async (req, res) => {
    try {
        const stats = await Company.aggregate([
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

        const statusStats = await Company.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

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

        res.json({
            success: true,
            data: {
                summary: stats[0] || {
                    totalCompanies: 0,
                    avgMatchScore: 0,
                    avgWLBScore: 0,
                    highMatches: 0,
                    excellentWLB: 0,
                    localPriority: 0
                },
                statusBreakdown: statusStats,
                topLocations: locationStats,
                topIndustries: industryStats
            }
        });

    } catch (error) {
        logger.error('Failed to get company stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get company statistics'
        });
    }
});

module.exports = router;