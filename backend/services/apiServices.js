const axios = require('axios');
const logger = require('../utils/logger');

class APIService {
    constructor(name, baseURL, apiKey) {
        this.name = name;
        this.baseURL = baseURL;
        this.apiKey = apiKey;
        this.rateLimiter = new Map();
    }

    async makeRequest(endpoint, params = {}, method = 'GET') {
        await this.checkRateLimit();

        try {
            const config = {
                method,
                url: `${this.baseURL}${endpoint}`,
                timeout: 30000
            };

            if (method === 'GET') {
                config.params = params;
            } else {
                config.data = params;
            }

            // Different auth methods for different APIs
            if (this.name === 'Apollo') {
                config.headers = {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache',
                    'X-Api-Key': this.apiKey
                };
            } else if (this.name === 'Hunter') {
                config.params = { ...config.params, api_key: this.apiKey };
            } else {
                config.headers = {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'User-Agent': 'AICompanyMatcher/1.0'
                };
            }

            const response = await axios(config);
            return response.data;
        } catch (error) {
            logger.error(`${this.name} API error:`, error.response?.data || error.message);
            throw error;
        }
    }

    async checkRateLimit() {
        const now = Date.now();
        const lastCall = this.rateLimiter.get(this.name) || 0;
        const minInterval = 1000; // 1 second between calls

        if (now - lastCall < minInterval) {
            await new Promise(resolve => setTimeout(resolve, minInterval - (now - lastCall)));
        }

        this.rateLimiter.set(this.name, Date.now());
    }
}

// Apollo.io API for company data and contacts
const searchApollo = async (params) => {
    if (!process.env.APOLLO_API_KEY) {
        logger.warn('Apollo.io API key not configured');
        return [];
    }

    const apolloAPI = new APIService(
        'Apollo',
        'https://api.apollo.io',
        process.env.APOLLO_API_KEY
    );

    try {
        // Step 1: Search for companies
        const locations = getLocationArray(params.location);
        const industries = getIndustryArray(params.industry);
        const employeeRanges = getEmployeeRanges(params.companySize);

        const searchParams = {
            q_organization_locations: locations,
            q_organization_industries: industries,
            q_organization_num_employees_ranges: employeeRanges,
            q_organization_keywords: ['remote', 'work-life balance', 'flexible work'],
            page: 1,
            per_page: Math.min(params.maxResults || 50, 100)
        };

        logger.info('Apollo company search params:', searchParams);

        const companyResponse = await apolloAPI.makeRequest('/api/v1/accounts/search', searchParams, 'POST');

        if (!companyResponse.accounts) {
            logger.warn('No companies returned from Apollo.io');
            return [];
        }

        // Step 2: For each company, get HR contacts
        const companiesWithContacts = [];

        for (const company of companyResponse.accounts) {
            try {
                let hrContacts = [];

                // Get contacts from Apollo
                if (company.website_url) {
                    const domain = company.website_url.replace(/^https?:\/\//, '').replace(/\/$/, '');

                    const contactParams = {
                        q_organization_domains: [domain],
                        q_person_titles: [
                            'Human Resources',
                            'HR Director',
                            'Recruiter',
                            'Talent Acquisition',
                            'People Operations',
                            'Head of People',
                            'VP of People',
                            'Talent Partner'
                        ],
                        contact_email_status: ['verified', 'guessed'],
                        per_page: 10
                    };

                    const contactResponse = await apolloAPI.makeRequest('/api/v1/contacts/search', contactParams, 'POST');

                    if (contactResponse.people) {
                        hrContacts = contactResponse.people.map(person => ({
                            name: `${person.first_name || ''} ${person.last_name || ''}`.trim(),
                            email: person.email,
                            title: person.title,
                            confidence: person.email_status === 'verified' ? 95 : 80,
                            verified: person.email_status === 'verified',
                            source: 'apollo'
                        }));
                    }
                }

                // Format company data
                const formattedCompany = {
                    name: company.name,
                    domain: company.website_url?.replace(/^https?:\/\//, '').replace(/\/$/, ''),
                    website: company.website_url,
                    location: `${company.city || ''}, ${company.state || ''}`.trim().replace(/^,\s*/, ''),
                    industry: company.industry,
                    size: getCompanySizeFromEmployees(company.estimated_num_employees),
                    employeeCount: company.estimated_num_employees,
                    description: company.short_description,
                    hrContacts: hrContacts,
                    apiSources: [{
                        provider: 'apollo',
                        data: {
                            apolloId: company.id,
                            accountId: company.account_id
                        },
                        fetchedAt: new Date()
                    }]
                };

                companiesWithContacts.push(formattedCompany);

                // Rate limiting between contact searches
                await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (contactError) {
                logger.error(`Failed to get contacts for ${company.name}:`, contactError);
                // Still add company without contacts
                companiesWithContacts.push({
                    name: company.name,
                    domain: company.website_url?.replace(/^https?:\/\//, '').replace(/\/$/, ''),
                    website: company.website_url,
                    location: `${company.city || ''}, ${company.state || ''}`.trim().replace(/^,\s*/, ''),
                    industry: company.industry,
                    size: getCompanySizeFromEmployees(company.estimated_num_employees),
                    employeeCount: company.estimated_num_employees,
                    description: company.short_description,
                    hrContacts: [],
                    apiSources: [{ provider: 'apollo', data: { apolloId: company.id }, fetchedAt: new Date() }]
                });
            }
        }

        logger.info(`Apollo.io found ${companiesWithContacts.length} companies`);
        return companiesWithContacts;

    } catch (error) {
        logger.error('Apollo.io search failed:', error);
        return [];
    }
};

// Hunter.io API for additional email verification
const searchHunter = async (params) => {
    if (!process.env.HUNTER_API_KEY) {
        logger.warn('Hunter.io API key not configured');
        return [];
    }

    const hunterAPI = new APIService(
        'Hunter',
        'https://api.hunter.io',
        process.env.HUNTER_API_KEY
    );

    try {
        if (params.domain) {
            const data = await hunterAPI.makeRequest('/v2/domain-search', {
                domain: params.domain,
                limit: 10,
                type: 'personal'
            });

            const hrEmails = data.data?.emails?.filter(email =>
                email.department === 'hr' ||
                email.position?.toLowerCase().includes('recruit') ||
                email.position?.toLowerCase().includes('talent') ||
                email.position?.toLowerCase().includes('people') ||
                email.position?.toLowerCase().includes('human resources')
            ) || [];

            return [{
                hrContacts: hrEmails.map(email => ({
                    name: `${email.first_name || ''} ${email.last_name || ''}`.trim(),
                    email: email.value,
                    title: email.position,
                    confidence: email.confidence,
                    verified: email.verification?.result === 'deliverable',
                    source: 'hunter'
                }))
            }];
        }

        return [];

    } catch (error) {
        logger.error('Hunter.io search failed:', error);
        return [];
    }
};

// Helper functions
const getLocationArray = (location) => {
    if (location === 'boston-providence') {
        return ['Boston, MA', 'Cambridge, MA', 'Somerville, MA', 'Providence, RI', 'Warwick, RI'];
    }
    if (location === 'boston') {
        return ['Boston, MA', 'Cambridge, MA', 'Somerville, MA'];
    }
    return [location];
};

const getIndustryArray = (industry) => {
    const industryMap = {
        'technology': ['Technology', 'Computer Software', 'Internet', 'Software Development'],
        'fintech': ['Financial Services', 'FinTech', 'Banking', 'Investment Management'],
        'healthcare': ['Healthcare', 'Health Technology', 'Biotechnology', 'Medical Technology'],
        'ecommerce': ['E-commerce', 'Retail', 'Online Retail', 'Consumer Goods'],
        'biotech': ['Biotechnology', 'Pharmaceuticals', 'Life Sciences', 'Medical Research']
    };

    return industryMap[industry] || [industry];
};

const getEmployeeRanges = (companySize) => {
    const ranges = {
        'startup': ['1-10', '11-50'],
        'small': ['51-200'],
        'medium': ['201-1000'],
        'large': ['1001-5000', '5001+']
    };
    return ranges[companySize] || ['11-50', '51-200', '201-1000'];
};

const getCompanySizeFromEmployees = (count) => {
    if (!count) return 'unknown';
    if (count <= 50) return 'startup';
    if (count <= 200) return 'small';
    if (count <= 1000) return 'medium';
    return 'large';
};

const mergeCompanyData = (existing, newData) => {
    return {
        ...existing,
        ...newData,
        hrContacts: [
            ...(existing.hrContacts || []),
            ...(newData.hrContacts || [])
        ],
        apiSources: [
            ...(existing.apiSources || []),
            ...(newData.apiSources || [])
        ]
    };
};

module.exports = {
    searchApollo,
    searchHunter,
    mergeCompanyData
};