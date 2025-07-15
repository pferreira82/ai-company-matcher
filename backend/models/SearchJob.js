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
        currentStep: String,
        phase: {
            type: String,
            enum: ['profile-analysis', 'company-generation', 'company-processing', 'completed'],
            default: 'profile-analysis'
        }
    },

    // Enhanced real-time stats
    liveStats: {
        // Company discovery stats
        companiesGenerated: { type: Number, default: 0 },
        companiesProcessed: { type: Number, default: 0 },
        companiesSaved: { type: Number, default: 0 },
        companiesSkipped: { type: Number, default: 0 },

        // Location breakdown
        bostonCompanies: { type: Number, default: 0 },
        providenceCompanies: { type: Number, default: 0 },
        nationwideCompanies: { type: Number, default: 0 },

        // Contact discovery
        totalHRContacts: { type: Number, default: 0 },
        verifiedContacts: { type: Number, default: 0 },
        apolloContacts: { type: Number, default: 0 },
        hunterContacts: { type: Number, default: 0 },

        // Match quality stats
        highMatches: { type: Number, default: 0 }, // 80%+ match
        mediumMatches: { type: Number, default: 0 }, // 60-79% match
        lowMatches: { type: Number, default: 0 }, // <60% match
        avgMatchScore: { type: Number, default: 0 },

        // Work-life balance stats
        excellentWLB: { type: Number, default: 0 }, // 8-10/10
        goodWLB: { type: Number, default: 0 }, // 6-7/10
        averageWLB: { type: Number, default: 0 }, // 4-5/10
        poorWLB: { type: Number, default: 0 }, // 1-3/10
        avgWLBScore: { type: Number, default: 0 },

        // Processing stats
        currentCompany: String,
        companiesPerMinute: { type: Number, default: 0 },
        estimatedTimeRemaining: String,

        // Error tracking
        processingErrors: { type: Number, default: 0 },
        apiErrors: { type: Number, default: 0 }
    },

    // Recent activity feed
    recentActivity: [{
        timestamp: { type: Date, default: Date.now },
        type: {
            type: String,
            enum: ['company-found', 'company-processed', 'contact-found', 'error', 'milestone']
        },
        message: String,
        companyName: String,
        data: mongoose.Schema.Types.Mixed
    }],

    results: {
        companiesFound: { type: Number, default: 0 },
        contactsFound: { type: Number, default: 0 },
        apolloCompanies: { type: Number, default: 0 },
        hunterContacts: { type: Number, default: 0 },
        expandedNationwide: { type: Boolean, default: false },
        errors: [String]
    },
    aiAnalysis: String,
    apiUsage: {
        openai: {
            calls: { type: Number, default: 0 },
            cost: { type: Number, default: 0 },
            tokensUsed: { type: Number, default: 0 }
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
        }
    },

    // Performance metrics
    performance: {
        startTime: Date,
        endTime: Date,
        duration: Number, // in milliseconds
        averageCompanyProcessingTime: Number,
        bottlenecks: [String]
    }
}, {
    timestamps: true
});

// Method to add activity to the feed
searchJobSchema.methods.addActivity = function(type, message, companyName = null, data = null) {
    this.recentActivity.unshift({
        type,
        message,
        companyName,
        data,
        timestamp: new Date()
    });

    // Keep only last 50 activities
    if (this.recentActivity.length > 50) {
        this.recentActivity = this.recentActivity.slice(0, 50);
    }
};

// Method to update live stats
searchJobSchema.methods.updateStats = function(updates) {
    Object.keys(updates).forEach(key => {
        if (this.liveStats[key] !== undefined) {
            this.liveStats[key] = updates[key];
        }
    });

    // Calculate averages
    const totalMatches = this.liveStats.highMatches + this.liveStats.mediumMatches + this.liveStats.lowMatches;
    if (totalMatches > 0) {
        // Weighted average for match scores
        const weightedScore = (this.liveStats.highMatches * 85) + (this.liveStats.mediumMatches * 70) + (this.liveStats.lowMatches * 50);
        this.liveStats.avgMatchScore = Math.round(weightedScore / totalMatches);
    }

    const totalWLB = this.liveStats.excellentWLB + this.liveStats.goodWLB + this.liveStats.averageWLB + this.liveStats.poorWLB;
    if (totalWLB > 0) {
        // Weighted average for WLB scores
        const weightedWLB = (this.liveStats.excellentWLB * 8.5) + (this.liveStats.goodWLB * 6.5) + (this.liveStats.averageWLB * 4.5) + (this.liveStats.poorWLB * 2.5);
        this.liveStats.avgWLBScore = (weightedWLB / totalWLB).toFixed(1);
    }

    // Calculate processing rate
    if (this.performance.startTime) {
        const elapsed = (Date.now() - this.performance.startTime) / 1000 / 60; // minutes
        if (elapsed > 0) {
            this.liveStats.companiesPerMinute = Math.round(this.liveStats.companiesProcessed / elapsed);

            // Estimate time remaining
            const remaining = Math.max(0, this.progress.total - this.liveStats.companiesProcessed);
            if (this.liveStats.companiesPerMinute > 0) {
                const minutesRemaining = Math.round(remaining / this.liveStats.companiesPerMinute);
                this.liveStats.estimatedTimeRemaining = minutesRemaining > 1 ?
                    `${minutesRemaining} minutes` :
                    'Less than 1 minute';
            }
        }
    }
};

// Method to increment a stat
searchJobSchema.methods.incrementStat = function(statName, increment = 1) {
    if (this.liveStats[statName] !== undefined) {
        this.liveStats[statName] += increment;
        this.updateStats({});
    }
};

module.exports = mongoose.model('SearchJob', searchJobSchema);