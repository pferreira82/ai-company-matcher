const logger = require('../utils/logger');

// OpenAI Service with fallback for development
let OpenAI;
let openaiClient;

try {
    OpenAI = require('openai');

    if (process.env.OPENAI_API_KEY) {
        openaiClient = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
        logger.info('OpenAI client initialized successfully');
    } else {
        logger.warn('OpenAI API key not found, using mock responses');
    }
} catch (error) {
    logger.warn('OpenAI library not available, using mock responses:', error.message);
}

// Analyze user profile with AI
async function analyzeUserProfile(resume, personalStatement, demoMode = false) {
    try {
        if (demoMode || !openaiClient) {
            // Return mock analysis for demo/development
            return {
                strengths: [
                    'Strong technical skills',
                    'Problem-solving abilities',
                    'Communication skills',
                    'Adaptability',
                    'Team collaboration'
                ],
                interests: [
                    'Software development',
                    'Technology innovation',
                    'Problem solving',
                    'Continuous learning',
                    'Team collaboration'
                ],
                careerGoals: [
                    'Senior developer role',
                    'Technical leadership',
                    'Innovative projects',
                    'Work-life balance',
                    'Professional growth'
                ],
                idealCompanyProfile: 'Technology company with strong engineering culture, good work-life balance, and growth opportunities',
                marketPositioning: 'Experienced developer with strong technical skills and collaborative approach',
                improvementAreas: [
                    'Industry-specific knowledge',
                    'Leadership skills',
                    'Public speaking',
                    'Project management'
                ]
            };
        }

        const prompt = `
    Analyze the following professional profile and provide insights:
    
    Resume: ${resume}
    
    Personal Statement: ${personalStatement}
    
    Please provide a JSON response with the following structure:
    {
      "strengths": ["list of key strengths"],
      "interests": ["list of professional interests"],
      "careerGoals": ["list of career goals"],
      "idealCompanyProfile": "description of ideal company",
      "marketPositioning": "brief market positioning statement",
      "improvementAreas": ["areas for improvement"]
    }
    
    Keep responses professional and concise.
    `;

        const response = await openaiClient.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: 'You are a professional career analyst. Provide structured, actionable insights about the candidate.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: 1000,
            temperature: 0.7,
        });

        const analysis = JSON.parse(response.choices[0].message.content);
        logger.info('Profile analysis completed successfully');
        return analysis;

    } catch (error) {
        logger.error('OpenAI profile analysis failed:', error);

        // Return fallback analysis
        return {
            strengths: [
                'Technical expertise',
                'Problem-solving skills',
                'Professional communication',
                'Adaptability',
                'Team collaboration'
            ],
            interests: [
                'Software development',
                'Technology innovation',
                'Continuous learning',
                'Problem solving'
            ],
            careerGoals: [
                'Career advancement',
                'Technical growth',
                'Work-life balance',
                'Professional development'
            ],
            idealCompanyProfile: 'Technology company with growth opportunities and good work culture',
            marketPositioning: 'Skilled professional with strong technical background',
            improvementAreas: [
                'Industry knowledge',
                'Leadership skills',
                'Networking'
            ]
        };
    }
}

// Generate company matches based on profile
async function findCompanyMatches(profile, maxResults = 1000, nationwide = false, demoMode = false) {
    try {
        if (demoMode || !openaiClient) {
            // Return expanded mock companies for demo/development
            return generateMockCompanies(maxResults, nationwide, demoMode);
        }

        const location = nationwide ? 'nationwide' : 'Boston, MA and Providence, RI area';
        const companySizes = profile.preferences?.companySizes || ['small', 'medium'];
        const industries = profile.preferences?.industries || ['technology'];

        const prompt = `
    Based on this professional profile, suggest ${maxResults} companies in ${location} that would be good matches:
    
    Profile Summary:
    - Name: ${profile.personalInfo?.firstName} ${profile.personalInfo?.lastName}
    - Title: ${profile.currentTitle}
    - Experience: ${profile.experience}
    - Company Size Preferences: ${companySizes.join(', ')}
    - Industry Preferences: ${industries.join(', ')}
    - Work-Life Balance Priority: ${profile.preferences?.workLifeBalance ? 'Yes' : 'No'}
    - Remote Work Preference: ${profile.preferences?.remoteFriendly ? 'Yes' : 'No'}
    
    AI Analysis:
    - Strengths: ${profile.aiAnalysis?.strengths?.join(', ') || 'Technical skills'}
    - Interests: ${profile.aiAnalysis?.interests?.join(', ') || 'Technology'}
    - Career Goals: ${profile.aiAnalysis?.careerGoals?.join(', ') || 'Growth'}
    
    Please provide a JSON array of companies with this structure:
    [
      {
        "name": "Company Name",
        "location": "City, State",
        "industry": "Industry",
        "size": "startup|small|medium|large",
        "employeeCount": 100,
        "description": "Brief company description",
        "website": "https://company.com",
        "reasons": ["reason1", "reason2", "reason3"]
      }
    ]
    
    Focus on real companies that exist and match the criteria. Include a mix of well-known and emerging companies.
    Prioritize companies that are actively hiring and have good reputations.
    `;

        const response = await openaiClient.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: 'You are a professional recruiter with deep knowledge of the tech industry. Provide realistic company suggestions based on the candidate profile.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: 4000, // Increased for more companies
            temperature: 0.8,
        });

        const companies = JSON.parse(response.choices[0].message.content);
        logger.info(`Generated ${companies.length} company matches`);
        return companies;

    } catch (error) {
        logger.error('OpenAI company matching failed:', error);
        return generateMockCompanies(maxResults, nationwide, demoMode);
    }
}

// Evaluate work-life balance for a company
async function evaluateWorkLifeBalance(companyData, demoMode = false) {
    try {
        if (demoMode || !openaiClient) {
            // Return mock evaluation
            return {
                score: Math.floor(Math.random() * 4) + 6, // 6-10 score
                analysis: `${companyData.name} appears to have a balanced approach to work-life balance based on available information.`,
                sources: ['Company website', 'Industry reports', 'Employee reviews'],
                positives: ['Flexible work arrangements', 'Good company culture', 'Reasonable work hours'],
                concerns: ['Limited remote work options', 'Fast-paced environment']
            };
        }

        const prompt = `
    Evaluate the work-life balance reputation of ${companyData.name}:
    
    Company Details:
    - Name: ${companyData.name}
    - Industry: ${companyData.industry}
    - Location: ${companyData.location}
    - Size: ${companyData.size}
    - Description: ${companyData.description}
    
    Please provide a JSON response with:
    {
      "score": 1-10,
      "analysis": "brief analysis of work-life balance",
      "sources": ["list of information sources"],
      "positives": ["positive aspects"],
      "concerns": ["potential concerns"]
    }
    
    Base your evaluation on known industry standards and company reputation.
    `;

        const response = await openaiClient.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: 'You are a workplace culture expert. Evaluate companies objectively based on available information.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: 500,
            temperature: 0.6,
        });

        const evaluation = JSON.parse(response.choices[0].message.content);
        logger.info(`Work-life balance evaluated for ${companyData.name}: ${evaluation.score}/10`);
        return evaluation;

    } catch (error) {
        logger.error('Work-life balance evaluation failed:', error);

        // Return fallback evaluation
        return {
            score: Math.floor(Math.random() * 4) + 6,
            analysis: `Work-life balance evaluation for ${companyData.name} based on industry standards.`,
            sources: ['Industry analysis', 'Company information'],
            positives: ['Professional environment', 'Growth opportunities'],
            concerns: ['Limited information available']
        };
    }
}

// Evaluate company-profile match
async function evaluateCompanyMatch(profile, companyData, demoMode = false) {
    try {
        if (demoMode || !openaiClient) {
            // Return mock match evaluation
            return {
                matchScore: Math.floor(Math.random() * 30) + 70, // 70-100 score
                analysis: `${companyData.name} appears to be a good match based on your profile and preferences.`,
                matchFactors: [
                    'Industry alignment',
                    'Company size preference',
                    'Location compatibility',
                    'Skills match',
                    'Culture fit'
                ],
                highlights: [
                    'Strong technical team',
                    'Growth opportunities',
                    'Good work-life balance',
                    'Innovative projects'
                ],
                concerns: [
                    'Fast-paced environment',
                    'Limited remote options',
                    'Competitive culture'
                ]
            };
        }

        const prompt = `
    Evaluate how well this company matches the candidate profile:
    
    Candidate Profile:
    - Name: ${profile.personalInfo?.firstName}
    - Title: ${profile.currentTitle}
    - Experience: ${profile.experience}
    - Strengths: ${profile.aiAnalysis?.strengths?.join(', ') || 'Technical skills'}
    - Interests: ${profile.aiAnalysis?.interests?.join(', ') || 'Technology'}
    - Preferences: ${profile.preferences?.companySizes?.join(', ')} companies in ${profile.preferences?.industries?.join(', ')}
    
    Company:
    - Name: ${companyData.name}
    - Industry: ${companyData.industry}
    - Size: ${companyData.size}
    - Location: ${companyData.location}
    - Description: ${companyData.description}
    
    Please provide a JSON response with:
    {
      "matchScore": 1-100,
      "analysis": "brief match analysis",
      "matchFactors": ["key matching factors"],
      "highlights": ["positive aspects for this candidate"],
      "concerns": ["potential concerns or challenges"]
    }
    `;

        const response = await openaiClient.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: 'You are a professional recruiter evaluating candidate-company fit. Be objective and helpful.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: 600,
            temperature: 0.7,
        });

        const evaluation = JSON.parse(response.choices[0].message.content);
        logger.info(`Company match evaluated for ${companyData.name}: ${evaluation.matchScore}%`);
        return evaluation;

    } catch (error) {
        logger.error('Company match evaluation failed:', error);

        // Return fallback evaluation
        return {
            matchScore: Math.floor(Math.random() * 30) + 70,
            analysis: `Match evaluation for ${companyData.name} based on profile compatibility.`,
            matchFactors: ['Industry alignment', 'Size preference', 'Location match'],
            highlights: ['Good cultural fit', 'Growth potential', 'Skill alignment'],
            concerns: ['Competitive environment', 'Limited information']
        };
    }
}

// Generate comprehensive mock companies for development and demo
function generateMockCompanies(maxResults, nationwide, demoMode = false) {
    // Expanded company lists for better demo experience
    const bostonCompanies = [
        { name: 'HubSpot', location: 'Cambridge, MA', industry: 'technology', size: 'large' },
        { name: 'Wayfair', location: 'Boston, MA', industry: 'ecommerce', size: 'large' },
        { name: 'Toast', location: 'Boston, MA', industry: 'technology', size: 'large' },
        { name: 'CarGurus', location: 'Cambridge, MA', industry: 'technology', size: 'medium' },
        { name: 'Rapid7', location: 'Boston, MA', industry: 'technology', size: 'medium' },
        { name: 'LogMeIn', location: 'Boston, MA', industry: 'technology', size: 'medium' },
        { name: 'TripAdvisor', location: 'Needham, MA', industry: 'technology', size: 'large' },
        { name: 'Akamai', location: 'Cambridge, MA', industry: 'technology', size: 'large' },
        { name: 'Brightcove', location: 'Boston, MA', industry: 'technology', size: 'medium' },
        { name: 'Endurance International', location: 'Burlington, MA', industry: 'technology', size: 'large' },
        { name: 'Constant Contact', location: 'Waltham, MA', industry: 'technology', size: 'medium' },
        { name: 'SmartBear', location: 'Somerville, MA', industry: 'technology', size: 'medium' },
        { name: 'DataRobot', location: 'Boston, MA', industry: 'technology', size: 'medium' },
        { name: 'SimpliVity', location: 'Westborough, MA', industry: 'technology', size: 'medium' },
        { name: 'Acquia', location: 'Boston, MA', industry: 'technology', size: 'medium' },
        { name: 'ZipRecruiter Boston', location: 'Boston, MA', industry: 'technology', size: 'large' },
        { name: 'Klaviyo', location: 'Boston, MA', industry: 'technology', size: 'medium' },
        { name: 'PTC', location: 'Boston, MA', industry: 'technology', size: 'large' },
        { name: 'Workato', location: 'Boston, MA', industry: 'technology', size: 'medium' },
        { name: 'Recorded Future', location: 'Somerville, MA', industry: 'technology', size: 'medium' }
    ];

    const providenceCompanies = [
        { name: 'CVS Health', location: 'Woonsocket, RI', industry: 'healthcare', size: 'large' },
        { name: 'American Power Conversion', location: 'West Kingston, RI', industry: 'technology', size: 'large' },
        { name: 'IGT', location: 'Providence, RI', industry: 'technology', size: 'large' },
        { name: 'Citizens Bank', location: 'Providence, RI', industry: 'fintech', size: 'large' },
        { name: 'Textiles Inc', location: 'Providence, RI', industry: 'technology', size: 'small' },
        { name: 'Ocean State Tech', location: 'Providence, RI', industry: 'technology', size: 'medium' },
        { name: 'Rhode Island Software', location: 'Warwick, RI', industry: 'technology', size: 'small' },
        { name: 'Coastal Dynamics', location: 'Newport, RI', industry: 'technology', size: 'small' },
        { name: 'Providence Digital', location: 'Providence, RI', industry: 'technology', size: 'medium' },
        { name: 'Davey Tree Expert Company', location: 'Kent, RI', industry: 'technology', size: 'medium' }
    ];

    const nationwideCompanies = [
        { name: 'Microsoft', location: 'Redmond, WA', industry: 'technology', size: 'large' },
        { name: 'Google', location: 'Mountain View, CA', industry: 'technology', size: 'large' },
        { name: 'Amazon', location: 'Seattle, WA', industry: 'technology', size: 'large' },
        { name: 'Netflix', location: 'Los Gatos, CA', industry: 'technology', size: 'large' },
        { name: 'Shopify', location: 'Ottawa, ON', industry: 'ecommerce', size: 'large' },
        { name: 'Stripe', location: 'San Francisco, CA', industry: 'fintech', size: 'large' },
        { name: 'Zoom', location: 'San Jose, CA', industry: 'technology', size: 'large' },
        { name: 'Slack', location: 'San Francisco, CA', industry: 'technology', size: 'large' },
        { name: 'Atlassian', location: 'San Francisco, CA', industry: 'technology', size: 'large' },
        { name: 'DocuSign', location: 'San Francisco, CA', industry: 'technology', size: 'large' },
        { name: 'Snowflake', location: 'Bozeman, MT', industry: 'technology', size: 'large' },
        { name: 'Databricks', location: 'San Francisco, CA', industry: 'technology', size: 'large' },
        { name: 'Coinbase', location: 'San Francisco, CA', industry: 'fintech', size: 'large' },
        { name: 'Square', location: 'San Francisco, CA', industry: 'fintech', size: 'large' },
        { name: 'Twilio', location: 'San Francisco, CA', industry: 'technology', size: 'large' },
        { name: 'Okta', location: 'San Francisco, CA', industry: 'technology', size: 'large' },
        { name: 'CrowdStrike', location: 'Sunnyvale, CA', industry: 'technology', size: 'large' },
        { name: 'Palo Alto Networks', location: 'Santa Clara, CA', industry: 'technology', size: 'large' },
        { name: 'ServiceNow', location: 'Santa Clara, CA', industry: 'technology', size: 'large' },
        { name: 'Workday', location: 'Pleasanton, CA', industry: 'technology', size: 'large' },
        { name: 'Salesforce', location: 'San Francisco, CA', industry: 'technology', size: 'large' },
        { name: 'Adobe', location: 'San Jose, CA', industry: 'technology', size: 'large' },
        { name: 'Intuit', location: 'Mountain View, CA', industry: 'technology', size: 'large' },
        { name: 'PayPal', location: 'San Jose, CA', industry: 'fintech', size: 'large' },
        { name: 'eBay', location: 'San Jose, CA', industry: 'ecommerce', size: 'large' },
        { name: 'Uber', location: 'San Francisco, CA', industry: 'technology', size: 'large' },
        { name: 'Lyft', location: 'San Francisco, CA', industry: 'technology', size: 'large' },
        { name: 'Airbnb', location: 'San Francisco, CA', industry: 'technology', size: 'large' },
        { name: 'DoorDash', location: 'San Francisco, CA', industry: 'technology', size: 'large' },
        { name: 'Instacart', location: 'San Francisco, CA', industry: 'technology', size: 'large' },
        // Austin companies
        { name: 'Dell Technologies', location: 'Round Rock, TX', industry: 'technology', size: 'large' },
        { name: 'IBM Austin', location: 'Austin, TX', industry: 'technology', size: 'large' },
        { name: 'Indeed', location: 'Austin, TX', industry: 'technology', size: 'large' },
        { name: 'Bumble', location: 'Austin, TX', industry: 'technology', size: 'medium' },
        { name: 'HomeAway', location: 'Austin, TX', industry: 'technology', size: 'medium' },
        // Seattle companies
        { name: 'Expedia', location: 'Seattle, WA', industry: 'technology', size: 'large' },
        { name: 'Redfin', location: 'Seattle, WA', industry: 'technology', size: 'medium' },
        { name: 'Zillow', location: 'Seattle, WA', industry: 'technology', size: 'large' },
        // New York companies
        { name: 'MongoDB', location: 'New York, NY', industry: 'technology', size: 'large' },
        { name: 'Datadog', location: 'New York, NY', industry: 'technology', size: 'large' },
        { name: 'Etsy', location: 'Brooklyn, NY', industry: 'ecommerce', size: 'medium' },
        { name: 'Spotify', location: 'New York, NY', industry: 'technology', size: 'large' },
        { name: 'WeWork', location: 'New York, NY', industry: 'technology', size: 'large' },
        // Chicago companies
        { name: 'Groupon', location: 'Chicago, IL', industry: 'technology', size: 'medium' },
        { name: 'SpotHero', location: 'Chicago, IL', industry: 'technology', size: 'small' },
        { name: 'Orbitz', location: 'Chicago, IL', industry: 'technology', size: 'medium' },
        // Additional startups and medium companies
        { name: 'Figma', location: 'San Francisco, CA', industry: 'technology', size: 'medium' },
        { name: 'Notion', location: 'San Francisco, CA', industry: 'technology', size: 'small' },
        { name: 'Canva', location: 'Sydney, AU', industry: 'technology', size: 'medium' },
        { name: 'Robinhood', location: 'Menlo Park, CA', industry: 'fintech', size: 'medium' },
        { name: 'Plaid', location: 'San Francisco, CA', industry: 'fintech', size: 'medium' },
        { name: 'Brex', location: 'San Francisco, CA', industry: 'fintech', size: 'medium' },
        { name: 'Chime', location: 'San Francisco, CA', industry: 'fintech', size: 'medium' },
        { name: 'Affirm', location: 'San Francisco, CA', industry: 'fintech', size: 'medium' }
    ];

    let companies = [...bostonCompanies, ...providenceCompanies];

    if (nationwide) {
        companies = [...companies, ...nationwideCompanies];
    }

    // Shuffle and limit results
    const shuffled = companies.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, maxResults);

    return selected.map(company => ({
        ...company,
        employeeCount: company.size === 'startup' ? Math.floor(Math.random() * 50) + 10 :
            company.size === 'small' ? Math.floor(Math.random() * 150) + 50 :
                company.size === 'medium' ? Math.floor(Math.random() * 800) + 200 :
                    Math.floor(Math.random() * 5000) + 1000,
        description: `${company.name} is a ${company.size} ${company.industry} company focused on innovation and growth.`,
        website: `https://${company.name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')}.com`,
        reasons: [
            'Strong technical team',
            'Good company culture',
            'Growth opportunities',
            'Competitive compensation',
            'Work-life balance'
        ]
    }));
}

module.exports = {
    analyzeUserProfile,
    findCompanyMatches,
    evaluateWorkLifeBalance,
    evaluateCompanyMatch
};