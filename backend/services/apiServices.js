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
    try {
        if (!process.env.APOLLO_API_KEY) {
            logger.warn('Apollo.io API key not configured, returning mock data');
            return generateMockApolloData(params);
        }

        const apolloAPI = new APIService(
            'Apollo',
            'https://api.apollo.io',
            process.env.APOLLO_API_KEY
        );

        // For company name search, try to find the specific company
        if (params.name) {
            const searchParams = {
                q_organization_name: params.name,
                per_page: 1
            };

            const companyResponse = await apolloAPI.makeRequest('/api/v1/accounts/search', searchParams, 'POST');

            if (companyResponse.accounts && companyResponse.accounts.length > 0) {
                const company = companyResponse.accounts[0];

                // Get contacts for this company
                let hrContacts = [];
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

                    try {
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
                    } catch (contactError) {
                        logger.error('Failed to get contacts from Apollo:', contactError);
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

                return [formattedCompany];
            }
        }

        // If no specific company found, return empty
        return [];

    } catch (error) {
        logger.error('Apollo.io search failed:', error);
        return generateMockApolloData(params);
    }
};

// Hunter.io API for additional email verification
const searchHunter = async (params) => {
    try {
        if (!process.env.HUNTER_API_KEY) {
            logger.warn('Hunter.io API key not configured, returning mock data');
            return generateMockHunterData(params);
        }

        const hunterAPI = new APIService(
            'Hunter',
            'https://api.hunter.io',
            process.env.HUNTER_API_KEY
        );

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
        return generateMockHunterData(params);
    }
};

// Generate mock Apollo data for development
function generateMockApolloData(params) {
    if (!params.name) return [];

    const mockContacts = [
        {
            name: 'Sarah Johnson',
            email: 'sarah.johnson@company.com',
            title: 'HR Director',
            confidence: 90,
            verified: true,
            source: 'apollo'
        },
        {
            name: 'Mike Chen',
            email: 'mike.chen@company.com',
            title: 'Talent Acquisition Manager',
            confidence: 85,
            verified: false,
            source: 'apollo'
        }
    ];

    return [{
        name: params.name,
        domain: params.name.toLowerCase().replace(/\s+/g, '') + '.com',
        website: `https://${params.name.toLowerCase().replace(/\s+/g, '')}.com`,
        location: params.location || 'Boston, MA',
        industry: 'technology',
        size: 'medium',
        employeeCount: 500,
        description: `${params.name} is a growing technology company.`,
        hrContacts: mockContacts,
        apiSources: [{
            provider: 'apollo',
            data: { apolloId: 'mock-id' },
            fetchedAt: new Date()
        }]
    }];
}

// Generate mock Hunter data for development
function generateMockHunterData(params) {
    if (!params.domain) return [];

    return [{
        hrContacts: [
            {
                name: 'Jennifer Smith',
                email: 'jennifer.smith@' + params.domain,
                title: 'Head of People',
                confidence: 95,
                verified: true,
                source: 'hunter'
            }
        ]
    }];
}

// Helper functions
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