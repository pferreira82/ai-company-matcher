const mongoose = require('mongoose');

const userProfileSchema = new mongoose.Schema({
    userId: {
        type: String,
        default: 'default', // For single user app
        unique: true
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
            match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
        },
        phone: {
            type: String,
            trim: true
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
        },
        location: {
            city: String,
            state: String,
            country: { type: String, default: 'United States' }
        }
    },
    // Professional Information
    resume: {
        type: String,
        required: true
    },
    personalStatement: {
        type: String,
        required: true
    },
    currentTitle: {
        type: String,
        trim: true
    },
    experienceLevel: {
        type: String,
        enum: ['entry', 'junior', 'mid', 'senior', 'lead', 'principal'],
        default: 'mid'
    },
    skills: [{
        name: String,
        level: { type: String, enum: ['beginner', 'intermediate', 'advanced', 'expert'] }
    }],
    preferences: {
        workLifeBalance: { type: Boolean, default: true },
        remoteFriendly: { type: Boolean, default: true },
        startupCulture: { type: Boolean, default: false },
        techStack: [String],

        // Updated: Multiple company sizes
        companySizes: {
            type: [String],
            enum: ['startup', 'small', 'medium', 'large'],
            default: ['medium']
        },

        // Updated: Multiple industries
        industries: {
            type: [String],
            enum: [
                'technology', 'fintech', 'healthcare', 'ecommerce', 'biotech',
                'education', 'cybersecurity', 'ai-ml', 'gaming', 'media'
            ],
            default: ['technology']
        },

        // Deprecated: Keep for backward compatibility but prefer arrays above
        companySize: {
            type: String,
            enum: ['startup', 'small', 'medium', 'large']
        },
        industry: {
            type: String
        },

        salaryRange: {
            min: Number,
            max: Number,
            currency: { type: String, default: 'USD' }
        },
        preferredLocations: [String],
        willingToRelocate: { type: Boolean, default: false }
    },
    aiAnalysis: {
        strengths: [String],
        interests: [String],
        careerGoals: [String],
        cultureFit: [String],
        techStack: [String],
        experienceLevel: String,
        preferredRole: String,
        generatedAt: Date
    }
}, {
    timestamps: true
});

// Pre-save middleware to handle backward compatibility
userProfileSchema.pre('save', function(next) {
    // Migrate single values to arrays if arrays are empty
    if (this.preferences) {
        // Migrate companySize to companySizes
        if (this.preferences.companySize && (!this.preferences.companySizes || this.preferences.companySizes.length === 0)) {
            this.preferences.companySizes = [this.preferences.companySize];
        }

        // Migrate industry to industries
        if (this.preferences.industry && (!this.preferences.industries || this.preferences.industries.length === 0)) {
            this.preferences.industries = [this.preferences.industry];
        }

        // Update single values from arrays for backward compatibility
        if (this.preferences.companySizes && this.preferences.companySizes.length > 0) {
            this.preferences.companySize = this.preferences.companySizes[0];
        }

        if (this.preferences.industries && this.preferences.industries.length > 0) {
            this.preferences.industry = this.preferences.industries[0];
        }
    }

    next();
});

// Virtual for full name
userProfileSchema.virtual('personalInfo.fullName').get(function() {
    return `${this.personalInfo.firstName} ${this.personalInfo.lastName}`;
});

// Virtual for formatted location
userProfileSchema.virtual('personalInfo.formattedLocation').get(function() {
    const { city, state, country } = this.personalInfo.location || {};
    if (city && state) {
        return `${city}, ${state}${country && country !== 'United States' ? `, ${country}` : ''}`;
    }
    return '';
});

// Virtual for company sizes display
userProfileSchema.virtual('preferences.companySizesDisplay').get(function() {
    const sizes = this.preferences.companySizes || [];
    const sizeLabels = {
        startup: 'Startup (1-50)',
        small: 'Small (51-200)',
        medium: 'Medium (201-1000)',
        large: 'Large (1000+)'
    };
    return sizes.map(size => sizeLabels[size] || size).join(', ');
});

// Virtual for industries display
userProfileSchema.virtual('preferences.industriesDisplay').get(function() {
    const industries = this.preferences.industries || [];
    const industryLabels = {
        technology: 'Technology',
        fintech: 'FinTech',
        healthcare: 'HealthTech',
        ecommerce: 'E-commerce',
        biotech: 'BioTech',
        education: 'EdTech',
        cybersecurity: 'Cybersecurity',
        'ai-ml': 'AI/ML',
        gaming: 'Gaming',
        media: 'Media & Entertainment'
    };
    return industries.map(industry => industryLabels[industry] || industry).join(', ');
});

// Ensure virtual fields are serialized
userProfileSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('UserProfile', userProfileSchema);