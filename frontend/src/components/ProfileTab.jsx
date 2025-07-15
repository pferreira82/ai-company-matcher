import React from 'react';
import { User, Mail, Phone, MapPin, Globe, Github, Linkedin, Heart, Brain, Building, Briefcase } from 'lucide-react';

const ProfileTab = ({ profile, updateProfile, updatePreferences, handleSaveProfile, profileLoading }) => {
    const updatePersonalInfo = (updates) => {
        updateProfile({
            personalInfo: { ...profile.personalInfo, ...updates }
        });
    };

    const updateLocation = (updates) => {
        updateProfile({
            personalInfo: {
                ...profile.personalInfo,
                location: { ...profile.personalInfo?.location, ...updates }
            }
        });
    };

    // Handle multiple company sizes
    const handleCompanySizeChange = (size, checked) => {
        const currentSizes = profile.preferences?.companySizes || [];
        let newSizes;

        if (checked) {
            newSizes = [...currentSizes, size];
        } else {
            newSizes = currentSizes.filter(s => s !== size);
        }

        updatePreferences({ companySizes: newSizes });
    };

    // Handle multiple industries
    const handleIndustryChange = (industry, checked) => {
        const currentIndustries = profile.preferences?.industries || [];
        let newIndustries;

        if (checked) {
            newIndustries = [...currentIndustries, industry];
        } else {
            newIndustries = currentIndustries.filter(i => i !== industry);
        }

        updatePreferences({ industries: newIndustries });
    };

    const companySizeOptions = [
        { value: 'startup', label: 'Startup (1-50 employees)', description: 'Fast-paced, early stage companies' },
        { value: 'small', label: 'Small (51-200 employees)', description: 'Growing companies with agility' },
        { value: 'medium', label: 'Medium (201-1000 employees)', description: 'Established with good resources' },
        { value: 'large', label: 'Large (1000+ employees)', description: 'Enterprise with stability' }
    ];

    const industryOptions = [
        { value: 'technology', label: 'Technology', description: 'Software, hardware, tech services' },
        { value: 'fintech', label: 'FinTech', description: 'Financial technology companies' },
        { value: 'healthcare', label: 'HealthTech', description: 'Healthcare technology and services' },
        { value: 'ecommerce', label: 'E-commerce', description: 'Online retail and marketplaces' },
        { value: 'biotech', label: 'BioTech', description: 'Biotechnology and life sciences' },
        { value: 'education', label: 'EdTech', description: 'Educational technology' },
        { value: 'cybersecurity', label: 'Cybersecurity', description: 'Security and privacy technology' },
        { value: 'ai-ml', label: 'AI/ML', description: 'Artificial intelligence and machine learning' },
        { value: 'gaming', label: 'Gaming', description: 'Video games and interactive entertainment' },
        { value: 'media', label: 'Media & Entertainment', description: 'Digital media and content' }
    ];

    return (
        <div className="space-y-8">
            <h2 className="text-2xl font-bold text-gray-800">Your Professional Profile</h2>

            {/* Personal Information Section */}
            <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-600" />
                    Personal Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Name Fields */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            First Name *
                        </label>
                        <input
                            type="text"
                            value={profile.personalInfo?.firstName || ''}
                            onChange={(e) => updatePersonalInfo({ firstName: e.target.value })}
                            className="input"
                            placeholder="John"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Last Name *
                        </label>
                        <input
                            type="text"
                            value={profile.personalInfo?.lastName || ''}
                            onChange={(e) => updatePersonalInfo({ lastName: e.target.value })}
                            className="input"
                            placeholder="Doe"
                            required
                        />
                    </div>

                    {/* Contact Information */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                            <Mail className="w-4 h-4" />
                            Email Address *
                        </label>
                        <input
                            type="email"
                            value={profile.personalInfo?.email || ''}
                            onChange={(e) => updatePersonalInfo({ email: e.target.value })}
                            className="input"
                            placeholder="john.doe@email.com"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                            <Phone className="w-4 h-4" />
                            Phone Number
                        </label>
                        <input
                            type="tel"
                            value={profile.personalInfo?.phone || ''}
                            onChange={(e) => updatePersonalInfo({ phone: e.target.value })}
                            className="input"
                            placeholder="(555) 123-4567"
                        />
                    </div>

                    {/* Current Title */}
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Current Title/Role
                        </label>
                        <input
                            type="text"
                            value={profile.currentTitle || ''}
                            onChange={(e) => updateProfile({ currentTitle: e.target.value })}
                            className="input"
                            placeholder="Senior Software Engineer"
                        />
                    </div>
                </div>
            </div>

            {/* Location Section - Note: Now just for contact info, not search preferences */}
            <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    Your Location (for contact purposes)
                </h3>

                <div className="bg-blue-50 p-4 rounded-lg mb-4">
                    <p className="text-sm text-blue-700">
                        <strong>Note:</strong> Job search will focus on Boston, MA and Providence, RI areas first,
                        then expand nationwide if needed. This location is just for your contact information.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            City
                        </label>
                        <input
                            type="text"
                            value={profile.personalInfo?.location?.city || ''}
                            onChange={(e) => updateLocation({ city: e.target.value })}
                            className="input"
                            placeholder="Your current city"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            State
                        </label>
                        <input
                            type="text"
                            value={profile.personalInfo?.location?.state || ''}
                            onChange={(e) => updateLocation({ state: e.target.value })}
                            className="input"
                            placeholder="MA"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Country
                        </label>
                        <input
                            type="text"
                            value={profile.personalInfo?.location?.country || ''}
                            onChange={(e) => updateLocation({ country: e.target.value })}
                            className="input"
                            placeholder="United States"
                        />
                    </div>
                </div>
            </div>

            {/* Professional Links Section */}
            <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
                    <Globe className="w-5 h-5 text-blue-600" />
                    Professional Links
                </h3>

                <div className="grid grid-cols-1 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                            <Linkedin className="w-4 h-4" />
                            LinkedIn Profile
                        </label>
                        <input
                            type="url"
                            value={profile.personalInfo?.linkedinUrl || ''}
                            onChange={(e) => updatePersonalInfo({ linkedinUrl: e.target.value })}
                            className="input"
                            placeholder="https://linkedin.com/in/johndoe"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                            <Github className="w-4 h-4" />
                            GitHub Profile
                        </label>
                        <input
                            type="url"
                            value={profile.personalInfo?.githubUrl || ''}
                            onChange={(e) => updatePersonalInfo({ githubUrl: e.target.value })}
                            className="input"
                            placeholder="https://github.com/johndoe"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                            <Globe className="w-4 h-4" />
                            Portfolio Website
                        </label>
                        <input
                            type="url"
                            value={profile.personalInfo?.portfolioUrl || ''}
                            onChange={(e) => updatePersonalInfo({ portfolioUrl: e.target.value })}
                            className="input"
                            placeholder="https://johndoe.dev"
                        />
                    </div>
                </div>
            </div>

            {/* Professional Information Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                    <div className="card p-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Resume Content *
                        </label>
                        <textarea
                            value={profile.resume || ''}
                            onChange={(e) => updateProfile({ resume: e.target.value })}
                            className="textarea h-40"
                            placeholder="Paste your resume content here..."
                            required
                        />
                    </div>

                    <div className="card p-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Personal Statement *
                        </label>
                        <textarea
                            value={profile.personalStatement || ''}
                            onChange={(e) => updateProfile({ personalStatement: e.target.value })}
                            className="textarea h-32"
                            placeholder="What are you looking for in your next role?"
                            required
                        />
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="card p-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Experience Level</h3>
                        <select
                            value={profile.experienceLevel || 'mid'}
                            onChange={(e) => updateProfile({ experienceLevel: e.target.value })}
                            className="select"
                        >
                            <option value="entry">Entry Level (0-1 years)</option>
                            <option value="junior">Junior (1-3 years)</option>
                            <option value="mid">Mid Level (3-6 years)</option>
                            <option value="senior">Senior (6-10 years)</option>
                            <option value="lead">Lead/Staff (10+ years)</option>
                            <option value="principal">Principal/Architect (15+ years)</option>
                        </select>
                    </div>

                    <div className="card p-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Work Preferences</h3>
                        <div className="space-y-4">
                            <label className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    checked={profile.preferences?.workLifeBalance || false}
                                    onChange={(e) => updatePreferences({ workLifeBalance: e.target.checked })}
                                    className="w-4 h-4 text-blue-600 rounded"
                                />
                                <Heart className="w-4 h-4 text-red-500" />
                                <span>Work-Life Balance Priority</span>
                            </label>

                            <label className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    checked={profile.preferences?.remoteFriendly || false}
                                    onChange={(e) => updatePreferences({ remoteFriendly: e.target.checked })}
                                    className="w-4 h-4 text-blue-600 rounded"
                                />
                                <MapPin className="w-4 h-4 text-blue-500" />
                                <span>Remote-Friendly</span>
                            </label>

                            <label className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    checked={profile.preferences?.willingToRelocate || false}
                                    onChange={(e) => updatePreferences({ willingToRelocate: e.target.checked })}
                                    className="w-4 h-4 text-blue-600 rounded"
                                />
                                <MapPin className="w-4 h-4 text-green-500" />
                                <span>Willing to Relocate</span>
                            </label>
                        </div>
                    </div>

                    {profile.aiAnalysis && (
                        <div className="card p-6 bg-blue-50">
                            <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
                                <Brain className="w-5 h-5" />
                                AI Analysis
                            </h3>
                            <div className="space-y-3 text-sm">
                                <div>
                                    <h4 className="font-medium text-blue-700">Strengths:</h4>
                                    <p className="text-blue-600">{profile.aiAnalysis.strengths?.join(', ')}</p>
                                </div>
                                <div>
                                    <h4 className="font-medium text-blue-700">Career Goals:</h4>
                                    <p className="text-blue-600">{profile.aiAnalysis.careerGoals?.join(', ')}</p>
                                </div>
                                <div>
                                    <h4 className="font-medium text-blue-700">Experience Level:</h4>
                                    <p className="text-blue-600">{profile.aiAnalysis.experienceLevel}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Company Size Preferences */}
            <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
                    <Building className="w-5 h-5 text-blue-600" />
                    Preferred Company Sizes (Select Multiple)
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {companySizeOptions.map((option) => (
                        <label key={option.value} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={profile.preferences?.companySizes?.includes(option.value) || false}
                                onChange={(e) => handleCompanySizeChange(option.value, e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded mt-1"
                            />
                            <div>
                                <div className="font-medium text-gray-800">{option.label}</div>
                                <div className="text-sm text-gray-600">{option.description}</div>
                            </div>
                        </label>
                    ))}
                </div>

                {(!profile.preferences?.companySizes || profile.preferences.companySizes.length === 0) && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-yellow-800 text-sm">
                            <strong>Tip:</strong> Select at least one company size to get better matches.
                        </p>
                    </div>
                )}
            </div>

            {/* Industry Preferences */}
            <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-blue-600" />
                    Preferred Industries (Select Multiple)
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {industryOptions.map((option) => (
                        <label key={option.value} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={profile.preferences?.industries?.includes(option.value) || false}
                                onChange={(e) => handleIndustryChange(option.value, e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded mt-1"
                            />
                            <div>
                                <div className="font-medium text-gray-800">{option.label}</div>
                                <div className="text-sm text-gray-600">{option.description}</div>
                            </div>
                        </label>
                    ))}
                </div>

                {(!profile.preferences?.industries || profile.preferences.industries.length === 0) && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-yellow-800 text-sm">
                            <strong>Tip:</strong> Select at least one industry to get targeted matches.
                        </p>
                    </div>
                )}
            </div>

            {/* Preview Section */}
            {profile.personalInfo?.firstName && profile.personalInfo?.email && (
                <div className="card p-6 bg-green-50">
                    <h3 className="text-lg font-semibold text-green-800 mb-4">Profile Preview</h3>
                    <div className="bg-white p-4 rounded-lg border text-sm">
                        <div className="font-medium text-gray-800">
                            {profile.personalInfo.firstName} {profile.personalInfo.lastName}
                        </div>
                        {profile.currentTitle && (
                            <div className="text-gray-600">{profile.currentTitle}</div>
                        )}
                        <div className="text-gray-600">{profile.personalInfo.email}</div>
                        {profile.personalInfo?.location?.city && (
                            <div className="text-gray-600">
                                {profile.personalInfo.location.city}
                                {profile.personalInfo?.location?.state && `, ${profile.personalInfo.location.state}`}
                            </div>
                        )}
                        {profile.personalInfo?.linkedinUrl && (
                            <div className="text-blue-600 text-xs mt-2">
                                LinkedIn: {profile.personalInfo.linkedinUrl}
                            </div>
                        )}
                        <div className="mt-3 text-xs text-gray-500">
                            <div><strong>Search Focus:</strong> Boston, MA → Providence, RI → Nationwide</div>
                            <div><strong>Company Sizes:</strong> {profile.preferences?.companySizes?.join(', ') || 'All sizes'}</div>
                            <div><strong>Industries:</strong> {profile.preferences?.industries?.join(', ') || 'All industries'}</div>
                        </div>
                    </div>
                </div>
            )}

            <button
                onClick={handleSaveProfile}
                disabled={profileLoading || !profile.personalInfo?.firstName || !profile.personalInfo?.email}
                className="btn btn-primary w-full md:w-auto"
            >
                {profileLoading ? 'Saving...' : 'Save Profile'}
            </button>
        </div>
    );
};

export default ProfileTab;