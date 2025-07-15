const express = require('express');
const router = express.Router();
const Company = require('../models/Company');
const UserProfile = require('../models/UserProfile');
const logger = require('../utils/logger');

// Generate personalized email for a company
router.post('/generate/:companyId', async (req, res) => {
    try {
        const { companyId } = req.params;
        const { profile } = req.body;

        // Get company details
        const company = await Company.findById(companyId);
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

        // Find HR contact
        const hrContact = company.primaryHRContact || (company.hrContacts && company.hrContacts[0]);

        // Generate email using AI or template
        let emailTemplate;

        try {
            // Try to use OpenAI service if available
            const openaiService = require('../services/openaiService');
            emailTemplate = await generateAIEmail(profile, company, hrContact);
        } catch (error) {
            logger.warn('OpenAI email generation failed, using template:', error.message);
            emailTemplate = generateTemplateEmail(profile, company, hrContact);
        }

        // Record email generation
        await company.generateEmailHistory({
            recipientEmail: hrContact?.email || 'hr@' + company.domain,
            subject: emailTemplate.subject,
            sent: false
        });

        // Add to user's company interactions
        try {
            const userProfile = await UserProfile.findOne({ userId: 'default' });
            if (userProfile) {
                await userProfile.addCompanyInteraction(
                    companyId,
                    company.name,
                    'email-generated',
                    'Generated personalized email'
                );
            }
        } catch (interactionError) {
            logger.warn('Failed to record company interaction:', interactionError);
        }

        logger.info('Email generated successfully', {
            companyName: company.name,
            recipientEmail: hrContact?.email || 'Unknown',
            userId: profile.personalInfo.email
        });

        res.json({
            success: true,
            data: emailTemplate,
            message: 'Email generated successfully'
        });

    } catch (error) {
        logger.error('Failed to generate email:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate email'
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

// Get email templates
router.get('/templates', async (req, res) => {
    try {
        const profile = await UserProfile.findOne({ userId: 'default' });

        const templates = profile?.emailTemplates || [];

        // Add default templates if none exist
        if (templates.length === 0) {
            const defaultTemplates = [
                {
                    name: 'Informational Interview Request',
                    subject: 'Informational Interview Request - {firstName} {lastName}',
                    body: `Dear {recipientName},

I hope this email finds you well. My name is {firstName} {lastName}, and I'm a {currentTitle} interested in learning more about opportunities at {companyName}.

Your company's work in {industry} particularly caught my attention, and I believe my background would be a strong fit for your team.

About me:
• {currentTitle} with {experience} level experience
• Strong background in {skills}
• Passionate about {interests}

I would appreciate the opportunity to have a brief informational interview to learn more about {companyName} and discuss how I might contribute to your team.

Thank you for your time and consideration.

Best regards,
{firstName} {lastName}
{email}
{phone}`,
                    isDefault: true,
                    createdAt: new Date()
                }
            ];

            templates.push(...defaultTemplates);
        }

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

// Save email template
router.post('/templates', async (req, res) => {
    try {
        const { name, subject, body, isDefault } = req.body;

        if (!name || !subject || !body) {
            return res.status(400).json({
                success: false,
                message: 'Name, subject, and body are required'
            });
        }

        const profile = await UserProfile.findOne({ userId: 'default' });

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: 'Profile not found'
            });
        }

        await profile.addEmailTemplate(name, subject, body, isDefault);

        logger.info('Email template saved:', { name, isDefault });

        res.json({
            success: true,
            message: 'Email template saved successfully'
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
                    generatedAt: email.generatedAt
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