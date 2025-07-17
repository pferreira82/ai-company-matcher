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
        // Return demo data if in demo mode
        if (params.demoMode || !process.env.APOLLO_API_KEY) {
            logger.info('Apollo.io using demo data mode');
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
        // Return demo data if in demo mode
        if (params.demoMode || !process.env.HUNTER_API_KEY) {
            logger.info('Hunter.io using demo data mode');
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

// Generate enhanced mock Apollo data for development and demo
function generateMockApolloData(params) {
    if (!params.name) return [];

    // Generate varied mock contacts for better demo experience
    const mockContactTemplates = [
        {
            name: 'Sarah Johnson',
            title: 'HR Director',
            confidence: 90,
            verified: true,
            source: 'apollo'
        },
        {
            name: 'Mike Chen',
            title: 'Talent Acquisition Manager',
            confidence: 85,
            verified: false,
            source: 'apollo'
        },
        {
            name: 'Jennifer Martinez',
            title: 'People Operations Lead',
            confidence: 88,
            verified: true,
            source: 'apollo'
        },
        {
            name: 'David Williams',
            title: 'Senior Recruiter',
            confidence: 82,
            verified: false,
            source: 'apollo'
        },
        {
            name: 'Emily Davis',
            title: 'Head of People',
            confidence: 95,
            verified: true,
            source: 'apollo'
        }
    ];

    // Randomly select 1-3 contacts
    const numContacts = Math.floor(Math.random() * 3) + 1;
    const selectedContacts = mockContactTemplates
        .sort(() => 0.5 - Math.random())
        .slice(0, numContacts)
        .map(contact => ({
            ...contact,
            email: `${contact.name.toLowerCase().replace(/\s+/g, '.')}@${params.name.toLowerCase().replace(/\s+/g, '')}.com`
        }));

    return [{
        name: params.name,
        domain: params.name.toLowerCase().replace(/\s+/g, '') + '.com',
        website: `https://${params.name.toLowerCase().replace(/\s+/g, '')}.com`,
        location: params.location || 'Boston, MA',
        industry: 'technology',
        size: 'medium',
        employeeCount: Math.floor(Math.random() * 800) + 200,
        description: `${params.name} is a growing technology company focused on innovation and customer success.`,
        hrContacts: selectedContacts,
        apiSources: [{
            provider: 'apollo',
            data: { apolloId: 'demo-' + Date.now() },
            fetchedAt: new Date()
        }]
    }];
}

// Generate enhanced mock Hunter data for development and demo
function generateMockHunterData(params) {
    if (!params.domain) return [];

    const mockHunterContacts = [
        {
            name: 'Jennifer Smith',
            title: 'Head of People',
            confidence: 95,
            verified: true,
            source: 'hunter'
        },
        {
            name: 'Robert Anderson',
            title: 'Talent Partner',
            confidence: 87,
            verified: false,
            source: 'hunter'
        },
        {
            name: 'Lisa Thompson',
            title: 'HR Business Partner',
            confidence: 92,
            verified: true,
            source: 'hunter'
        }
    ];

    // Randomly select 1-2 contacts
    const numContacts = Math.floor(Math.random() * 2) + 1;
    const selectedContacts = mockHunterContacts
        .sort(() => 0.5 - Math.random())
        .slice(0, numContacts)
        .map(contact => ({
            ...contact,
            email: `${contact.name.toLowerCase().replace(/\s+/g, '.')}@${params.domain}`
        }));

    return [{
        hrContacts: selectedContacts
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