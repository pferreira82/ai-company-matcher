const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    domain: {
        type: String,
        trim: true
    },
    website: {
        type: String,
        trim: true
    },
    location: {
        type: String,
        trim: true
    },
    industry: {
        type: String,
        trim: true
    },
    size: {
        type: String,
        enum: ['startup', 'small', 'medium', 'large', 'unknown'],
        default: 'unknown'
    },
    employeeCount: {
        type: Number,
        min: 0
    },
    description: {
        type: String,
        trim: true
    },

    // Priority and location info
    isLocalPriority: {
        type: Boolean,
        default: false
    },

    // HR Contacts
    hrContacts: [{
        name: {
            type: String,
            trim: true
        },
        email: {
            type: String,
            trim: true,
            lowercase: true
        },
        title: {
            type: String,
            trim: true
        },
        confidence: {
            type: Number,
            min: 0,
            max: 100
        },
        verified: {
            type: Boolean,
            default: false
        },
        source: {
            type: String,
            enum: ['apollo', 'hunter', 'manual', 'linkedin'],
            default: 'manual'
        }
    }],

    // Work-life balance evaluation
    workLifeBalance: {
        score: {
            type: Number,
            min: 1,
            max: 10,
            required: true
        },
        aiAnalysis: {
            type: String,
            trim: true
        },
        sources: [String],
        positives: [String],
        concerns: [String],
        lastUpdated: {
            type: Date,
            default: Date.now
        }
    },

    // AI Match Information
    aiMatchScore: {
        type: Number,
        min: 0,
        max: 100,
        required: true
    },
    aiAnalysis: {
        type: String,
        trim: true
    },
    matchFactors: [String],
    highlights: [String],
    concerns: [String],

    // Company policies and culture
    remotePolicy: {
        type: String,
        enum: ['fully-remote', 'hybrid', 'office-only', 'flexible', 'not-specified'],
        default: 'not-specified'
    },
    benefits: [String],
    techStack: [String],

    // User interaction tracking
    status: {
        type: String,
        enum: ['not-contacted', 'contacted', 'responded', 'interview', 'rejected', 'hired'],
        default: 'not-contacted'
    },
    notes: [{
        content: {
            type: String,
            required: true,
            trim: true
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],

    // API source tracking
    apiSources: [{
        provider: {
            type: String,
            enum: ['apollo', 'hunter', 'clearbit', 'linkedin', 'crunchbase', 'openai'],
            required: true
        },
        data: mongoose.Schema.Types.Mixed,
        fetchedAt: {
            type: Date,
            default: Date.now
        }
    }],

    // Social media and links
    socialLinks: {
        linkedin: String,
        twitter: String,
        github: String,
        glassdoor: String
    },

    // Funding and financial info
    funding: {
        stage: {
            type: String,
            enum: ['seed', 'series-a', 'series-b', 'series-c', 'series-d', 'ipo', 'acquired', 'unknown'],
            default: 'unknown'
        },
        amount: String,
        lastRound: Date,
        investors: [String]
    },

    // Email generation history
    emailHistory: [{
        generatedAt: {
            type: Date,
            default: Date.now
        },
        recipientEmail: String,
        subject: String,
        sent: {
            type: Boolean,
            default: false
        }
    }],

    // Quality scores
    dataQuality: {
        type: Number,
        min: 0,
        max: 100,
        default: 50
    },

    // Search metadata
    searchJobId: String,
    discoveryMethod: {
        type: String,
        enum: ['ai-generated', 'api-search', 'manual-entry'],
        default: 'ai-generated'
    },

    // Geographic information
    coordinates: {
        lat: Number,
        lng: Number
    },
    timezone: String,

    // Company metrics
    metrics: {
        glassdoorRating: Number,
        linkedinFollowers: Number,
        crunchbaseRank: Number,
        techCrunchMentions: Number
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for better query performance
companySchema.index({ name: 1 });
companySchema.index({ location: 1 });
companySchema.index({ industry: 1 });
companySchema.index({ aiMatchScore: -1 });
companySchema.index({ 'workLifeBalance.score': -1 });
companySchema.index({ isLocalPriority: 1 });
companySchema.index({ status: 1 });
companySchema.index({ createdAt: -1 });

// Compound indexes
companySchema.index({ aiMatchScore: -1, 'workLifeBalance.score': -1 });
companySchema.index({ location: 1, industry: 1 });
companySchema.index({ isLocalPriority: 1, aiMatchScore: -1 });

// Virtual for primary HR contact
companySchema.virtual('primaryHRContact').get(function() {
    if (this.hrContacts && this.hrContacts.length > 0) {
        return this.hrContacts.find(contact => contact.verified) || this.hrContacts[0];
    }
    return null;
});

// Virtual for contact count
companySchema.virtual('contactCount').get(function() {
    return this.hrContacts ? this.hrContacts.length : 0;
});

// Virtual for verified contact count
companySchema.virtual('verifiedContactCount').get(function() {
    return this.hrContacts ? this.hrContacts.filter(contact => contact.verified).length : 0;
});

// Virtual for company size category
companySchema.virtual('sizeCategory').get(function() {
    if (!this.employeeCount) return this.size;

    if (this.employeeCount <= 50) return 'startup';
    if (this.employeeCount <= 200) return 'small';
    if (this.employeeCount <= 1000) return 'medium';
    return 'large';
});

// Virtual for match grade
companySchema.virtual('matchGrade').get(function() {
    if (this.aiMatchScore >= 90) return 'A';
    if (this.aiMatchScore >= 80) return 'B';
    if (this.aiMatchScore >= 70) return 'C';
    if (this.aiMatchScore >= 60) return 'D';
    return 'F';
});

// Virtual for WLB grade
companySchema.virtual('wlbGrade').get(function() {
    if (!this.workLifeBalance || !this.workLifeBalance.score) return 'Unknown';

    const score = this.workLifeBalance.score;
    if (score >= 9) return 'Excellent';
    if (score >= 7) return 'Good';
    if (score >= 5) return 'Average';
    if (score >= 3) return 'Below Average';
    return 'Poor';
});

// Instance methods
companySchema.methods.addHRContact = function(contact) {
    this.hrContacts.push(contact);
    return this.save();
};

companySchema.methods.addNote = function(noteContent) {
    this.notes.push({
        content: noteContent,
        createdAt: new Date()
    });
    return this.save();
};

companySchema.methods.updateStatus = function(newStatus) {
    this.status = newStatus;
    return this.save();
};

companySchema.methods.generateEmailHistory = function(emailData) {
    this.emailHistory.push({
        generatedAt: new Date(),
        recipientEmail: emailData.recipientEmail,
        subject: emailData.subject,
        sent: emailData.sent || false
    });
    return this.save();
};

// Static methods
companySchema.statics.findByLocation = function(location) {
    return this.find({ location: new RegExp(location, 'i') });
};

companySchema.statics.findByIndustry = function(industry) {
    return this.find({ industry: new RegExp(industry, 'i') });
};

companySchema.statics.findHighMatches = function(threshold = 80) {
    return this.find({ aiMatchScore: { $gte: threshold } });
};

companySchema.statics.findLocalPriority = function() {
    return this.find({ isLocalPriority: true });
};

companySchema.statics.getMatchStats = function() {
    return this.aggregate([
        {
            $group: {
                _id: null,
                averageMatchScore: { $avg: '$aiMatchScore' },
                averageWLBScore: { $avg: '$workLifeBalance.score' },
                highMatches: {
                    $sum: { $cond: [{ $gte: ['$aiMatchScore', 80] }, 1, 0] }
                },
                excellentWLB: {
                    $sum: { $cond: [{ $gte: ['$workLifeBalance.score', 8] }, 1, 0] }
                },
                totalCompanies: { $sum: 1 }
            }
        }
    ]);
};

// Pre-save middleware
companySchema.pre('save', function(next) {
    // Ensure website has protocol
    if (this.website && !this.website.startsWith('http')) {
        this.website = 'https://' + this.website;
    }

    // Extract domain from website if not provided
    if (this.website && !this.domain) {
        try {
            const url = new URL(this.website);
            this.domain = url.hostname.replace('www.', '');
        } catch (err) {
            // Invalid URL, skip domain extraction
        }
    }

    // Calculate data quality score
    let qualityScore = 0;
    if (this.name) qualityScore += 20;
    if (this.website) qualityScore += 15;
    if (this.location) qualityScore += 10;
    if (this.industry) qualityScore += 10;
    if (this.description) qualityScore += 10;
    if (this.hrContacts && this.hrContacts.length > 0) qualityScore += 25;
    if (this.workLifeBalance) qualityScore += 10;

    this.dataQuality = qualityScore;

    next();
});

// Ensure unique name per search job
companySchema.index({ name: 1, searchJobId: 1 }, { unique: true });

module.exports = mongoose.model('Company', companySchema);