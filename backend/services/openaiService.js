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
            model: 'gpt-4o-mini',
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
            model: 'gpt-4o-mini',
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
        if (demoMode) {
            return generateMockCompanies(maxResults, nationwide, demoMode);
        }
        throw error;
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
            model: 'gpt-4o-mini',
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
            model: 'gpt-4o-mini',
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

// Generate AI-powered email for informational interviews
// In openaiService.js, update the generateAIEmail function:

async function generateAIEmail(profile, company, hrContact) {
    try {
        logger.info('🤖 Starting AI email generation', {
            company: company.name,
            hasOpenAI: !!openaiClient,
            model: 'gpt-4o-mini'
        });

        // Check if we have OpenAI client
        if (!openaiClient) {
            logger.warn('OpenAI client not available, using template fallback');
            return generateTemplateEmail(profile, company, hrContact);
        }

        const recipientName = hrContact?.name || 'Hiring Manager';
        const recipientEmail = hrContact?.email || `hr@${company.domain}`;
        const senderName = `${profile.personalInfo?.firstName} ${profile.personalInfo?.lastName}`;

        // Build a more specific prompt for unique emails
        const prompt = `
Generate a UNIQUE and personalized email for an informational interview request. Make it different from standard templates.

SENDER PROFILE:
- Name: ${senderName}
- Current Title: ${profile.currentTitle}
- Experience Level: ${profile.experience}
- Location: ${profile.personalInfo?.location?.city}, ${profile.personalInfo?.location?.state}
- Key Strengths: ${profile.aiAnalysis?.strengths?.slice(0, 3).join(', ') || 'technical skills, problem-solving, collaboration'}
- Career Interests: ${profile.aiAnalysis?.interests?.slice(0, 3).join(', ') || 'technology, innovation, growth'}

COMPANY DETAILS:
- Company Name: ${company.name}
- Industry: ${company.industry}
- Size: ${company.size} (${company.employeeCount || 'N/A'} employees)
- Location: ${company.location}
- Match Score: ${company.aiMatchScore}%
- Company Highlights: ${company.highlights?.slice(0, 3).join(', ') || 'innovative culture, growth opportunities'}

RECIPIENT:
- Name: ${recipientName}
- Title: ${hrContact?.title || 'HR Professional'}

REQUIREMENTS:
1. Make this email UNIQUE - avoid generic phrases
2. Reference something SPECIFIC about ${company.name}
3. Show genuine interest in the company's work in ${company.industry}
4. Keep it concise (150-250 words)
5. Be warm but professional
6. Include a clear ask for a 15-20 minute conversation
7. DO NOT use these overused phrases: "I hope this email finds you well", "I'm reaching out", "I came across"

Generate a fresh, engaging email that stands out from typical networking emails.
`;

        logger.info('📝 Calling OpenAI API for email generation');

        const response = await openaiClient.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert at writing personalized, engaging networking emails that get responses. Each email should be unique and tailored to the specific company and person.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: 500,
            temperature: 0.8,  // Increased for more variety
            presence_penalty: 0.6,  // Encourage uniqueness
            frequency_penalty: 0.6  // Avoid repetition
        });

        const emailContent = response.choices[0].message.content.trim();

        logger.info('✅ AI email generated successfully', {
            company: company.name,
            contentLength: emailContent.length
        });

        // Generate unique subject line
        const subjectPrompt = `
Generate a unique, engaging subject line for an informational interview request email to ${company.name}.
Make it specific to ${company.name} and their work in ${company.industry}.
Keep it under 60 characters and avoid generic phrases like "Informational Interview Request".
Examples: "Curious about ${company.name}'s approach to [specific thing]", "Following ${company.name}'s journey in [industry]"
`;

        const subjectResponse = await openaiClient.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'user',
                    content: subjectPrompt
                }
            ],
            max_tokens: 30,
            temperature: 0.8,
        });

        const subject = subjectResponse.choices[0].message.content.trim().replace(/["']/g, '');

        return {
            recipientName,
            recipientEmail,
            subject,
            content: emailContent,
            keyPoints: [
                `Personalized for ${recipientName} at ${company.name}`,
                `Unique content tailored to ${company.industry}`,
                `Match score: ${company.aiMatchScore}%`,
                `Generated with GPT-4o-mini`,
                `Fresh approach avoiding template language`
            ],
            senderInfo: {
                name: senderName,
                email: profile.personalInfo?.email,
                phone: profile.personalInfo?.phone,
                location: `${profile.personalInfo?.location?.city || ''}, ${profile.personalInfo?.location?.state || ''}`.trim(),
                linkedin: profile.personalInfo?.linkedinUrl,
                portfolio: profile.personalInfo?.portfolioUrl
            },
            companyContext: {
                matchScore: company.aiMatchScore,
                workLifeBalance: company.workLifeBalance?.score,
                companySize: company.size,
                industry: company.industry
            },
            generatedAt: new Date().toISOString()
        };

    } catch (error) {
        logger.error('OpenAI email generation failed:', error);
        logger.error('Error details:', {
            message: error.message,
            status: error.status,
            type: error.type
        });

        // Return enhanced template as fallback
        return generateEnhancedTemplateEmail(profile, company, hrContact);
    }
}

// Enhanced template generator as fallback
function generateEnhancedTemplateEmail(profile, company, hrContact) {
    const recipientName = hrContact?.name || 'Hiring Manager';
    const recipientEmail = hrContact?.email || `hr@${company.domain}`;
    const senderName = `${profile.personalInfo?.firstName} ${profile.personalInfo?.lastName}`;

    // Create personalized elements based on company data
    const industryIntro = getIndustrySpecificIntro(company.industry);
    const companySizeAppeal = getCompanySizeAppeal(company.size);
    const locationNote = company.location?.includes(profile.personalInfo?.location?.city)
        ? "As a local professional, I'm particularly excited about companies in our community."
        : "";

    const subject = `Informational Interview Request - ${senderName}, ${profile.currentTitle}`;

    const content = `Dear ${recipientName},

I hope this email finds you well. My name is ${senderName}, and I'm a ${profile.currentTitle} with a strong interest in ${company.name}'s work in the ${company.industry} space.

${industryIntro} I've been particularly impressed by ${company.name}'s ${company.highlights?.[0] || 'innovative approach'} and ${company.highlights?.[1] || 'company culture'}. ${companySizeAppeal}

With my background in ${profile.aiAnalysis?.strengths?.[0] || profile.skills?.technical?.[0] || 'technology'} and passion for ${profile.aiAnalysis?.interests?.[0] || 'continuous learning'}, I believe I could contribute meaningfully to your team. ${locationNote}

I would greatly appreciate the opportunity to learn more about ${company.name}'s culture, current initiatives, and future direction. Would you be available for a brief 15-20 minute informational interview in the coming weeks?

Thank you for considering my request. I look forward to the possibility of connecting with you.

Best regards,
${senderName}
${profile.personalInfo?.email}
${profile.personalInfo?.phone || ''}
${profile.personalInfo?.linkedinUrl ? `LinkedIn: ${profile.personalInfo?.linkedinUrl}` : ''}`;

    return {
        recipientName,
        recipientEmail,
        subject,
        content,
        keyPoints: [
            `Customized for ${company.name} in ${company.industry}`,
            `${company.size} company culture appeal`,
            `Highlights ${profile.currentTitle} experience`,
            `Requests informational interview (not job)`,
            `Professional closing with full contact details`
        ],
        senderInfo: {
            name: senderName,
            email: profile.personalInfo?.email,
            phone: profile.personalInfo?.phone,
            location: `${profile.personalInfo?.location?.city || ''}, ${profile.personalInfo?.location?.state || ''}`.trim(),
            linkedin: profile.personalInfo?.linkedinUrl,
            portfolio: profile.personalInfo?.portfolioUrl
        }
    };
}

// Helper function for industry-specific introductions
function getIndustrySpecificIntro(industry) {
    const intros = {
        technology: "In researching innovative tech companies,",
        fintech: "As someone passionate about the intersection of finance and technology,",
        healthcare: "With my interest in healthcare innovation,",
        ecommerce: "Having followed the evolution of digital commerce,",
        biotech: "As an advocate for biotechnology advancements,",
        education: "With my commitment to educational technology,",
        media: "As someone engaged with digital media trends,",
        'ai-ml': "Being deeply interested in AI and machine learning applications,",
        gaming: "As an enthusiast of interactive entertainment technology,",
        cybersecurity: "With the critical importance of digital security,"
    };
    return intros[industry] || "In my search for innovative companies,";
}

// Helper function for company size appeals
function getCompanySizeAppeal(size) {
    const appeals = {
        startup: "The dynamic, fast-paced environment of a startup like yours aligns perfectly with my entrepreneurial mindset.",
        small: "I'm drawn to smaller companies where individual contributions have significant impact.",
        medium: "The balance of stability and growth opportunity in mid-sized companies is particularly appealing to me.",
        large: "The resources and scale of established companies like yours offer exciting possibilities for innovation."
    };
    return appeals[size] || "Your company's unique position in the market is particularly intriguing.";
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
    evaluateCompanyMatch,
    generateAIEmail,
    generateEnhancedTemplateEmail
};