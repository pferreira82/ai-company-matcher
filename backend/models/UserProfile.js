const mongoose = require('mongoose');

const userProfileSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true,
        default: 'default'
    },

    // Personal Information
    personalInfo: {
        firstName: {
            type: String,
            required: true,
            trim: true
        },
        lastName: {
            type: String,
            required: true,
            trim: true
        },
        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
        },
        phone: {
            type: String,
            trim: true
        },
        location: {
            city: String,
            state: String,
            country: String,
            zipCode: String
        },
        linkedinUrl: {
            type: String,
            trim: true
        },
        portfolioUrl: {
            type: String,
            trim: true
        },
        githubUrl: {
            type: String,
            trim: true
        }
    },

    // Professional Information
    currentTitle: {
        type: String,
        required: true,
        trim: true
    },
    experience: {
        type: String,
        enum: ['entry', 'junior', 'mid', 'senior', 'lead', 'principal', 'executive'],
        required: true
    },
    resume: {
        type: String,
        required: true,
        trim: true
    },
    personalStatement: {
        type: String,
        required: true,
        trim: true
    },

    // Skills and Technologies
    skills: {
        technical: [String],
        soft: [String],
        languages: [String],
        frameworks: [String],
        databases: [String],
        cloud: [String],
        other: [String]
    },

    // Education
    education: [{
        degree: String,
        field: String,
        institution: String,
        graduationYear: Number,
        gpa: Number
    }],

    // Work Preferences
    preferences: {
        companySizes: {
            type: [String],
            enum: ['startup', 'small', 'medium', 'large'],
            required: true
        },
        industries: {
            type: [String],
            enum: ['technology', 'fintech', 'healthcare', 'ecommerce', 'biotech', 'education', 'media', 'ai-ml', 'gaming', 'other'],
            required: true
        },
        workLifeBalance: {
            type: Boolean,
            default: true
        },
        remoteFriendly: {
            type: Boolean,
            default: true
        },
        startupCulture: {
            type: Boolean,
            default: false
        },
        salary: {
            min: Number,
            max: Number,
            currency: {
                type: String,
                default: 'USD'
            }
        },
        benefits: {
            healthInsurance: Boolean,
            retirement401k: Boolean,
            paidTimeOff: Boolean,
            flexibleHours: Boolean,
            stockOptions: Boolean,
            professionalDevelopment: Boolean
        },
        location: {
            type: String,
            enum: ['boston-providence', 'remote', 'hybrid', 'on-site'],
            default: 'boston-providence'
        },
        roleTypes: {
            type: [String],
            enum: ['full-time', 'part-time', 'contract', 'freelance', 'internship']
        }
    },

    // AI Analysis Results
    aiAnalysis: {
        strengths: [String],
        interests: [String],
        careerGoals: [String],
        idealCompanyProfile: String,
        marketPositioning: String,
        improvementAreas: [String],
        generatedAt: {
            type: Date,
            default: Date.now
        },
        model: {
            type: String,
            default: 'gpt-3.5-turbo'
        }
    },

    // Search History
    searchHistory: [{
        searchId: String,
        parameters: mongoose.Schema.Types.Mixed,
        resultsCount: Number,
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],

    // Company Interactions
    companyInteractions: [{
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Company'
        },
        companyName: String,
        interaction: {
            type: String,
            enum: ['viewed', 'email-generated', 'contacted', 'responded', 'interview', 'rejected', 'hired']
        },
        notes: String,
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],

    // Email Templates and History
    emailTemplates: [{
        name: String,
        subject: String,
        body: String,
        isDefault: {
            type: Boolean,
            default: false
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],

    // Profile Completion Status
    profileCompletion: {
        personalInfo: {
            type: Boolean,
            default: false
        },
        professionalInfo: {
            type: Boolean,
            default: false
        },
        preferences: {
            type: Boolean,
            default: false
        },
        skills: {
            type: Boolean,
            default: false
        },
        overall: {
            type: Number,
            min: 0,
            max: 100,
            default: 0
        }
    },

    // Privacy and Settings
    settings: {
        emailNotifications: {
            type: Boolean,
            default: true
        },
        dataSharing: {
            type: Boolean,
            default: false
        },
        searchVisible: {
            type: Boolean,
            default: true
        },
        apiLogging: {
            type: Boolean,
            default: false
        }
    },

    // Metadata
    lastActiveAt: {
        type: Date,
        default: Date.now
    },
    profileVersion: {
        type: Number,
        default: 1
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes (remove individual index to avoid duplicate warning)
userProfileSchema.index({ userId: 1 }, { unique: true });
userProfileSchema.index({ 'personalInfo.email': 1 });
userProfileSchema.index({ lastActiveAt: -1 });

// Virtuals
userProfileSchema.virtual('fullName').get(function() {
    try {
        return `${this.personalInfo?.firstName || ''} ${this.personalInfo?.lastName || ''}`.trim();
    } catch (error) {
        return 'Unknown User';
    }
});

userProfileSchema.virtual('completionPercentage').get(function() {
    try {
        let completed = 0;
        let total = 8;

        if (this.personalInfo?.firstName && this.personalInfo?.lastName) completed++;
        if (this.personalInfo?.email) completed++;
        if (this.resume) completed++;
        if (this.personalStatement) completed++;
        if (this.currentTitle) completed++;
        if (this.personalInfo?.location?.city) completed++;
        if (this.preferences?.companySizes?.length > 0) completed++;
        if (this.preferences?.industries?.length > 0) completed++;

        return Math.round((completed / total) * 100);
    } catch (error) {
        return 0;
    }
});

userProfileSchema.virtual('hasAIAnalysis').get(function() {
    try {
        return !!(this.aiAnalysis && this.aiAnalysis.generatedAt);
    } catch (error) {
        return false;
    }
});

userProfileSchema.virtual('recentSearches').get(function() {
    try {
        if (!this.searchHistory) return [];

        return this.searchHistory
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, 5);
    } catch (error) {
        return [];
    }
});

// Instance methods
userProfileSchema.methods.updateProfileCompletion = function() {
    try {
        this.profileCompletion.personalInfo = !!(
            this.personalInfo?.firstName &&
            this.personalInfo?.lastName &&
            this.personalInfo?.email
        );

        this.profileCompletion.professionalInfo = !!(
            this.currentTitle &&
            this.resume &&
            this.personalStatement
        );

        this.profileCompletion.preferences = !!(
            this.preferences?.companySizes?.length > 0 &&
            this.preferences?.industries?.length > 0
        );

        this.profileCompletion.skills = !!(
            this.skills?.technical?.length > 0
        );

        this.profileCompletion.overall = this.completionPercentage;

        return this;
    } catch (error) {
        console.error('Error updating profile completion:', error);
        return this;
    }
};

userProfileSchema.methods.addCompanyInteraction = function(companyId, companyName, interaction, notes = '') {
    try {
        if (!this.companyInteractions) {
            this.companyInteractions = [];
        }

        this.companyInteractions.push({
            companyId,
            companyName,
            interaction,
            notes,
            timestamp: new Date()
        });

        // Keep only last 100 interactions
        if (this.companyInteractions.length > 100) {
            this.companyInteractions = this.companyInteractions.slice(-100);
        }

        return this.save();
    } catch (error) {
        console.error('Error adding company interaction:', error);
        return Promise.resolve(this);
    }
};

userProfileSchema.methods.addSearchHistory = function(searchId, parameters, resultsCount) {
    try {
        if (!this.searchHistory) {
            this.searchHistory = [];
        }

        this.searchHistory.push({
            searchId,
            parameters,
            resultsCount,
            createdAt: new Date()
        });

        // Keep only last 20 searches
        if (this.searchHistory.length > 20) {
            this.searchHistory = this.searchHistory.slice(-20);
        }

        return this.save();
    } catch (error) {
        console.error('Error adding search history:', error);
        return Promise.resolve(this);
    }
};

userProfileSchema.methods.updateAIAnalysis = function(analysis) {
    try {
        this.aiAnalysis = {
            ...analysis,
            generatedAt: new Date(),
            model: 'gpt-3.5-turbo'
        };

        return this.save();
    } catch (error) {
        console.error('Error updating AI analysis:', error);
        return Promise.resolve(this);
    }
};

userProfileSchema.methods.addEmailTemplate = function(name, subject, body, isDefault = false) {
    try {
        if (!this.emailTemplates) {
            this.emailTemplates = [];
        }

        if (isDefault) {
            // Remove default flag from other templates
            this.emailTemplates.forEach(template => {
                template.isDefault = false;
            });
        }

        this.emailTemplates.push({
            name,
            subject,
            body,
            isDefault,
            createdAt: new Date()
        });

        return this.save();
    } catch (error) {
        console.error('Error adding email template:', error);
        return Promise.resolve(this);
    }
};

userProfileSchema.methods.getDefaultEmailTemplate = function() {
    try {
        return this.emailTemplates?.find(template => template.isDefault) || null;
    } catch (error) {
        console.error('Error getting default email template:', error);
        return null;
    }
};

userProfileSchema.methods.updateLastActive = function() {
    try {
        this.lastActiveAt = new Date();
        return this.save();
    } catch (error) {
        console.error('Error updating last active:', error);
        return Promise.resolve(this);
    }
};

// Static methods
userProfileSchema.statics.findByEmail = function(email) {
    return this.findOne({ 'personalInfo.email': email.toLowerCase() });
};

userProfileSchema.statics.findIncompleteProfiles = function() {
    return this.find({ 'profileCompletion.overall': { $lt: 100 } });
};

userProfileSchema.statics.findBySkill = function(skill) {
    return this.find({
        $or: [
            { 'skills.technical': { $in: [skill] } },
            { 'skills.frameworks': { $in: [skill] } },
            { 'skills.languages': { $in: [skill] } }
        ]
    });
};

// Pre-save middleware
userProfileSchema.pre('save', function(next) {
    try {
        // Update last active timestamp
        this.lastActiveAt = new Date();
        next();
    } catch (error) {
        next(error);
    }
});

// Post-save middleware
userProfileSchema.post('save', function(doc) {
    try {
        // Log profile updates for analytics
        console.log(`Profile updated for user: ${doc.personalInfo?.firstName || 'Unknown'} ${doc.personalInfo?.lastName || ''}`);
    } catch (error) {
        console.error('Error in post-save hook:', error);
    }
});

module.exports = mongoose.model('UserProfile', userProfileSchema);