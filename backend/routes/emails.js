const express = require('express');
const router = express.Router();
const Company = require('../models/Company');
const UserProfile = require('../models/UserProfile');
const logger = require('../utils/logger');

// Debug middleware to log all requests to this router
router.use((req, res, next) => {
    logger.info(`Email route accessed: ${req.method} ${req.path}`);
    next();
});

// Test route to verify emails router is working
router.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'Email routes are working',
        endpoints: [
            'POST /api/emails/generate/:companyId',
            'POST /api/emails/regenerate/:companyId',
            'POST /api/emails/bulk-generate',
            'GET /api/emails/templates',
            'POST /api/emails/templates',
            'GET /api/emails/history',
            'PUT /api/emails/history/:companyId/:emailIndex/sent',
            'GET /api/emails/stats'
        ]
    });
});

// Generate personalized email for a company (UPDATED)
router.post('/generate/:companyId', async (req, res) => {
    try {
        const { companyId } = req.params;
        const { profile } = req.body;

        // Validate inputs
        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: 'Company ID is required'
            });
        }

        // Get company details with HR contacts
        const company = await Company.findById(companyId).lean();
        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }

        // Validate profile data
        if (!profile || !profile.personalInfo?.firstName || !profile.personalInfo?.email) {
            return res.status(400).json({
                success: false,
                message: 'Complete profile with name and email is required'
            });
        }

        // Find the best HR contact
        const hrContact = company.hrContacts?.find(c => c.verified) ||
            company.hrContacts?.[0] ||
            null;

        // Log the email generation attempt
        logger.info('Generating AI email', {
            companyName: company.name,
            hasHRContact: !!hrContact,
            userId: profile.personalInfo.email
        });

        // Generate email using AI service with fallback
        let emailTemplate;
        try {
            const openaiService = require('../services/openaiService');
            emailTemplate = await openaiService.generateAIEmail(profile, company, hrContact);
        } catch (error) {
            logger.warn('OpenAI email generation failed, using template:', error.message);
            emailTemplate = generateTemplateEmail(profile, company, hrContact);
        }

        // Validate the generated email
        if (!emailTemplate.content || !emailTemplate.subject) {
            throw new Error('Failed to generate valid email content');
        }

        // Record email generation in company history
        const emailHistoryEntry = {
            generatedAt: new Date(),
            recipientEmail: emailTemplate.recipientEmail,
            subject: emailTemplate.subject,
            sent: false,
            metadata: {
                hasAI: true,
                templateVersion: '2.0',
                recipientName: emailTemplate.recipientName,
                matchScore: company.aiMatchScore
            }
        };

        await Company.findByIdAndUpdate(companyId, {
            $push: { emailHistory: emailHistoryEntry }
        });

        // Track in user profile
        try {
            const userProfile = await UserProfile.findOne({
                'personalInfo.email': profile.personalInfo.email
            });

            if (userProfile) {
                await userProfile.addCompanyInteraction(
                    companyId,
                    company.name,
                    'email-generated',
                    `AI email generated for ${emailTemplate.recipientName}`
                );
            }
        } catch (interactionError) {
            logger.warn('Failed to record company interaction:', interactionError);
        }

        logger.info('Email generated successfully', {
            companyName: company.name,
            recipientEmail: emailTemplate.recipientEmail,
            userId: profile.personalInfo.email
        });

        // Send successful response
        res.json({
            success: true,
            data: {
                ...emailTemplate,
                companyId: company._id,
                companyName: company.name,
                generatedAt: new Date()
            },
            message: 'Email generated successfully'
        });

    } catch (error) {
        logger.error('Failed to generate email:', error);

        // Provide helpful error messages
        let errorMessage = 'Failed to generate email';
        if (error.message.includes('OpenAI')) {
            errorMessage = 'AI service temporarily unavailable. Using template fallback.';
        }

        res.status(500).json({
            success: false,
            message: errorMessage,
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// NEW: Regenerate email with different tone/style
router.post('/regenerate/:companyId', async (req, res) => {
    try {
        const { companyId } = req.params;
        const { profile, tone = 'professional' } = req.body;

        // Validate inputs
        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: 'Company ID is required'
            });
        }

        const company = await Company.findById(companyId).lean();
        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }

        if (!profile || !profile.personalInfo?.firstName || !profile.personalInfo?.email) {
            return res.status(400).json({
                success: false,
                message: 'Complete profile with name and email is required'
            });
        }

        const hrContact = company.hrContacts?.find(c => c.verified) ||
            company.hrContacts?.[0] ||
            null;

        // Generate email with specific tone
        let emailTemplate;
        try {
            const openaiService = require('../services/openaiService');
            emailTemplate = await openaiService.generateAIEmail(profile, company, hrContact, { tone });
        } catch (error) {
            logger.warn('OpenAI regeneration failed, using template:', error.message);
            emailTemplate = generateTemplateEmail(profile, company, hrContact);
        }

        res.json({
            success: true,
            data: {
                ...emailTemplate,
                companyId: company._id,
                companyName: company.name,
                tone,
                generatedAt: new Date()
            },
            message: 'Email regenerated successfully'
        });

    } catch (error) {
        logger.error('Failed to regenerate email:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to regenerate email'
        });
    }
});

// NEW: Bulk email generation endpoint
router.post('/bulk-generate', async (req, res) => {
    try {
        const { companyIds, profile } = req.body;

        if (!companyIds || !Array.isArray(companyIds) || companyIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Company IDs array is required'
            });
        }

        if (!profile || !profile.personalInfo?.firstName || !profile.personalInfo?.email) {
            return res.status(400).json({
                success: false,
                message: 'Complete profile with name and email is required'
            });
        }

        const results = [];
        const errors = [];

        for (const companyId of companyIds) {
            try {
                const company = await Company.findById(companyId).lean();
                if (!company) {
                    errors.push({ companyId, error: 'Company not found' });
                    continue;
                }

                const hrContact = company.hrContacts?.find(c => c.verified) ||
                    company.hrContacts?.[0] ||
                    null;

                let emailTemplate;
                try {
                    const openaiService = require('../services/openaiService');
                    emailTemplate = await openaiService.generateAIEmail(profile, company, hrContact);
                } catch (error) {
                    logger.warn(`AI generation failed for ${company.name}, using template`);
                    emailTemplate = generateTemplateEmail(profile, company, hrContact);
                }

                results.push({
                    companyId,
                    companyName: company.name,
                    email: emailTemplate
                });

                // Add delay to avoid rate limits
                await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (error) {
                errors.push({
                    companyId,
                    error: error.message
                });
            }
        }

        res.json({
            success: true,
            data: {
                generated: results,
                failed: errors,
                summary: {
                    total: companyIds.length,
                    successful: results.length,
                    failed: errors.length
                }
            },
            message: `Bulk generation completed: ${results.length}/${companyIds.length} successful`
        });

    } catch (error) {
        logger.error('Failed bulk email generation:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate bulk emails'
        });
    }
});

// Generate AI-powered email
async function generateAIEmail(profile, company, hrContact) {
    // This would use OpenAI to generate a personalized email
    // For now, return a structured template

    const recipientName = hrContact?.name || 'Hiring Manager';
    const recipientEmail = hrContact?.email || `hr@${company.domain}`;

    const subject = `Informational Interview Request - ${profile.personalInfo.firstName} ${profile.personalInfo.lastName}`;

    const content = `Dear ${recipientName},

I hope this email finds you well. My name is ${profile.personalInfo.firstName} ${profile.personalInfo.lastName}, and I'm a ${profile.currentTitle} with a strong interest in ${company.name}.

I've been following ${company.name}'s work in ${company.industry} and am particularly impressed by ${company.highlights?.[0] || 'your innovative approach'}. Based on my research, I believe ${company.name} would be an excellent place to contribute my skills in ${profile.aiAnalysis?.strengths?.[0] || 'software development'}.

A bit about my background:
• Currently working as ${profile.currentTitle}
• ${profile.experience} level professional with expertise in ${profile.skills?.technical?.slice(0, 3).join(', ') || 'technology'}
• Passionate about ${profile.aiAnalysis?.interests?.[0] || 'innovation and problem-solving'}

I'm particularly drawn to ${company.name} because of:
• ${company.highlights?.[0] || 'Strong technical team'}
• ${company.highlights?.[1] || 'Growth opportunities'}
• Your commitment to ${company.workLifeBalance?.positives?.[0] || 'work-life balance'}

I would love the opportunity to learn more about ${company.name} and discuss how my background in ${profile.aiAnalysis?.strengths?.[0] || 'technology'} could contribute to your team. Would you be available for a brief informational interview in the coming weeks?

Thank you for your time and consideration. I look forward to hearing from you.

Best regards,
${profile.personalInfo.firstName} ${profile.personalInfo.lastName}
${profile.personalInfo.email}
${profile.personalInfo.phone || ''}
${profile.personalInfo.linkedinUrl ? `LinkedIn: ${profile.personalInfo.linkedinUrl}` : ''}`;

    return {
        recipientName,
        recipientEmail,
        subject,
        content,
        keyPoints: [
            `Personalized for ${company.name} in ${company.industry}`,
            `Highlights ${profile.aiAnalysis?.strengths?.[0] || 'technical skills'}`,
            `References company's ${company.highlights?.[0] || 'strengths'}`,
            `Professional tone appropriate for ${hrContact?.title || 'HR contact'}`,
            `Includes full contact information`
        ]
    };
}

// Generate template-based email
function generateTemplateEmail(profile, company, hrContact) {
    const recipientName = hrContact?.name || 'Hiring Manager';
    const recipientEmail = hrContact?.email || `hr@${company.domain}`;

    const subject = `Informational Interview Request - ${profile.personalInfo.firstName} ${profile.personalInfo.lastName}`;

    const content = `Dear ${recipientName},

I hope this email finds you well. My name is ${profile.personalInfo.firstName} ${profile.personalInfo.lastName}, and I'm a ${profile.currentTitle} interested in learning more about opportunities at ${company.name}.

Your company's work in ${company.industry} particularly caught my attention, and I believe my background would be a strong fit for your team.

About me:
• ${profile.currentTitle} with ${profile.experience} level experience
• Strong background in technology and problem-solving
• Passionate about innovation and continuous learning

I would appreciate the opportunity to have a brief informational interview to learn more about ${company.name} and discuss how I might contribute to your team.

Thank you for your time and consideration.

Best regards,
${profile.personalInfo.firstName} ${profile.personalInfo.lastName}
${profile.personalInfo.email}
${profile.personalInfo.phone || ''}`;

    return {
        recipientName,
        recipientEmail,
        subject,
        content,
        keyPoints: [
            `Professional introduction to ${company.name}`,
            `Highlights relevant experience`,
            `Requests informational interview`,
            `Includes complete contact information`
        ]
    };
}

// Helper function for default templates
function getDefaultEmailTemplates() {
    return [
        {
            name: 'Professional Informational Interview',
            subject: 'Informational Interview Request - {senderName}',
            body: `Dear {recipientName},

I hope this email finds you well. My name is {senderName}, and I'm a {currentTitle} with a keen interest in {companyName}'s work in the {industry} sector.

I've been following {companyName}'s journey and am particularly impressed by your innovative approach. I would greatly appreciate the opportunity to learn more about your company culture and current initiatives.

Would you be available for a brief 15-20 minute informational interview in the coming weeks? I'm happy to work around your schedule.

Thank you for considering my request.

Best regards,
{senderName}
{email}
{phone}`,
            variables: ['recipientName', 'senderName', 'currentTitle', 'companyName', 'industry', 'email', 'phone'],
            isDefault: true,
            createdAt: new Date(),
            useCount: 0
        },
        {
            name: 'Casual Networking Request',
            subject: 'Coffee Chat Request - Fellow {industry} Professional',
            body: `Hi {recipientName},

I'm {senderName}, a {currentTitle} based in {location}. I came across {companyName} and was really intrigued by what you're building.

I'd love to grab a virtual coffee and hear about your experience at {companyName}. I'm particularly interested in learning about your team's approach to {industry} challenges.

Would you have 20 minutes for a quick chat sometime next week?

Thanks!
{senderName}`,
            variables: ['recipientName', 'senderName', 'currentTitle', 'location', 'companyName', 'industry'],
            isDefault: false,
            createdAt: new Date(),
            useCount: 0
        }
    ];
}

// Get email templates (UPDATED)
router.get('/templates', async (req, res) => {
    try {
        const profile = await UserProfile.findOne({ userId: 'default' });

        let templates = profile?.emailTemplates || [];

        // Add default templates if none exist
        if (templates.length === 0) {
            templates = getDefaultEmailTemplates();
        }

        // Sort by most recently used
        templates.sort((a, b) => {
            if (a.isDefault) return -1;
            if (b.isDefault) return 1;
            return (b.lastUsed || 0) - (a.lastUsed || 0);
        });

        res.json({
            success: true,
            data: templates
        });

    } catch (error) {
        logger.error('Failed to get email templates:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get email templates'
        });
    }
});

// Save custom email template (UPDATED)
router.post('/templates', async (req, res) => {
    try {
        const { name, subject, body, variables, isDefault } = req.body;

        if (!name || !subject || !body) {
            return res.status(400).json({
                success: false,
                message: 'Template name, subject, and body are required'
            });
        }

        // Get user profile
        const profile = await UserProfile.findOne({ userId: 'default' });
        if (!profile) {
            return res.status(404).json({
                success: false,
                message: 'User profile not found'
            });
        }

        // Initialize email templates if not exists
        if (!profile.emailTemplates) {
            profile.emailTemplates = [];
        }

        // If setting as default, remove default from others
        if (isDefault) {
            profile.emailTemplates.forEach(template => {
                template.isDefault = false;
            });
        }

        // Add new template
        const newTemplate = {
            name,
            subject,
            body,
            variables: variables || [
                'recipientName',
                'companyName',
                'industry',
                'senderName',
                'currentTitle',
                'location'
            ],
            isDefault: isDefault || false,
            createdAt: new Date(),
            lastUsed: null,
            useCount: 0
        };

        profile.emailTemplates.push(newTemplate);
        await profile.save();

        logger.info('Email template saved:', { name, isDefault });

        res.json({
            success: true,
            message: 'Email template saved successfully',
            data: newTemplate
        });

    } catch (error) {
        logger.error('Failed to save email template:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save email template'
        });
    }
});

// Get email generation history
router.get('/history', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        // Get companies with email history
        const companies = await Company.find({
            'emailHistory.0': { $exists: true }
        })
            .select('name emailHistory')
            .sort({ 'emailHistory.generatedAt': -1 })
            .skip(skip)
            .limit(limit);

        const emailHistory = [];

        companies.forEach(company => {
            company.emailHistory.forEach(email => {
                emailHistory.push({
                    companyId: company._id,
                    companyName: company.name,
                    recipientEmail: email.recipientEmail,
                    subject: email.subject,
                    sent: email.sent,
                    generatedAt: email.generatedAt,
                    metadata: email.metadata
                });
            });
        });

        // Sort by generated date
        emailHistory.sort((a, b) => b.generatedAt - a.generatedAt);

        const total = await Company.countDocuments({
            'emailHistory.0': { $exists: true }
        });

        res.json({
            success: true,
            data: emailHistory,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        logger.error('Failed to get email history:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get email history'
        });
    }
});

// Mark email as sent
router.put('/history/:companyId/:emailIndex/sent', async (req, res) => {
    try {
        const { companyId, emailIndex } = req.params;

        const company = await Company.findById(companyId);

        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }

        const index = parseInt(emailIndex);
        if (index < 0 || index >= company.emailHistory.length) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email index'
            });
        }

        company.emailHistory[index].sent = true;
        await company.save();

        // Update user interaction
        try {
            const userProfile = await UserProfile.findOne({ userId: 'default' });
            if (userProfile) {
                await userProfile.addCompanyInteraction(
                    companyId,
                    company.name,
                    'contacted',
                    'Sent email to HR contact'
                );
            }
        } catch (interactionError) {
            logger.warn('Failed to record company interaction:', interactionError);
        }

        logger.info('Email marked as sent:', {
            companyName: company.name,
            recipientEmail: company.emailHistory[index].recipientEmail
        });

        res.json({
            success: true,
            message: 'Email marked as sent'
        });

    } catch (error) {
        logger.error('Failed to mark email as sent:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update email status'
        });
    }
});

// Get email statistics
router.get('/stats', async (req, res) => {
    try {
        const stats = await Company.aggregate([
            {
                $match: {
                    'emailHistory.0': { $exists: true }
                }
            },
            {
                $unwind: '$emailHistory'
            },
            {
                $group: {
                    _id: null,
                    totalEmails: { $sum: 1 },
                    emailsSent: {
                        $sum: { $cond: ['$emailHistory.sent', 1, 0] }
                    },
                    emailsGenerated: {
                        $sum: { $cond: [{ $not: '$emailHistory.sent' }, 1, 0] }
                    }
                }
            }
        ]);

        const result = stats[0] || {
            totalEmails: 0,
            emailsSent: 0,
            emailsGenerated: 0
        };

        // Calculate response rate (placeholder)
        result.responseRate = result.emailsSent > 0 ? Math.round((result.emailsSent * 0.15) / result.emailsSent * 100) : 0;

        res.json({
            success: true,
            stats: result
        });

    } catch (error) {
        logger.error('Failed to get email statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get email statistics'
        });
    }
});

module.exports = router;