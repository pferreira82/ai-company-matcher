const OpenAI = require('openai');
const logger = require('../utils/logger');

class OpenAIService {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
    }

    async analyzeUserProfile(resume, personalStatement) {
        try {
            logger.info('🤖 Starting OpenAI profile analysis');

            const prompt = `
        Analyze this developer's profile and extract key information:
        
        RESUME:
        ${resume}
        
        PERSONAL STATEMENT:
        ${personalStatement}
        
        Please provide a JSON response with:
        {
          "strengths": ["list of technical and soft skills"],
          "interests": ["areas of interest and passion"],
          "careerGoals": ["career objectives and aspirations"],
          "cultureFit": ["what type of company culture would suit them"],
          "techStack": ["technologies they're proficient in"],
          "experienceLevel": "junior/mid/senior/principal",
          "preferredRole": "description of ideal role"
        }
      `;

            const response = await this.openai.chat.completions.create({
                model: 'gpt-4',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert career advisor and technical recruiter. Analyze developer profiles and provide structured insights.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.3,
                max_tokens: 1000
            });

            const result = JSON.parse(response.choices[0].message.content);
            logger.info('✅ OpenAI profile analysis completed');
            return result;
        } catch (error) {
            logger.error('❌ OpenAI profile analysis failed:', error);
            throw error;
        }
    }

    async evaluateCompanyMatch(userProfile, company) {
        try {
            const prompt = `
        Evaluate how well this company matches the developer's profile:
        
        DEVELOPER PROFILE:
        Strengths: ${userProfile.aiAnalysis?.strengths?.join(', ') || 'Not analyzed'}
        Interests: ${userProfile.aiAnalysis?.interests?.join(', ') || 'Not analyzed'}
        Career Goals: ${userProfile.aiAnalysis?.careerGoals?.join(', ') || 'Not analyzed'}
        Preferred Culture: ${userProfile.aiAnalysis?.cultureFit?.join(', ') || 'Not analyzed'}
        Work-Life Balance Priority: ${userProfile.preferences?.workLifeBalance}
        Remote Work Preference: ${userProfile.preferences?.remoteFriendly}
        
        COMPANY:
        Name: ${company.name}
        Industry: ${company.industry}
        Size: ${company.size}
        Description: ${company.description}
        Remote Policy: ${company.remotePolicy}
        Location: ${company.location}
        
        Provide a JSON response with:
        {
          "matchScore": 85,
          "analysis": "detailed explanation of why this is a good/bad match",
          "matchFactors": {
            "cultureMatch": 90,
            "skillsMatch": 85,
            "locationMatch": 95,
            "workLifeBalanceMatch": 80,
            "remoteMatch": 85
          },
          "concerns": ["any potential concerns or mismatches"],
          "highlights": ["key reasons why this is a good match"]
        }
      `;

            const response = await this.openai.chat.completions.create({
                model: 'gpt-4',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert career advisor. Evaluate company-candidate matches and provide detailed analysis.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.3,
                max_tokens: 800
            });

            return JSON.parse(response.choices[0].message.content);
        } catch (error) {
            logger.error('OpenAI company match evaluation failed:', error);
            throw error;
        }
    }

    async evaluateWorkLifeBalance(company) {
        try {
            const prompt = `
        Research and evaluate the work-life balance reputation of this company:
        
        COMPANY: ${company.name}
        INDUSTRY: ${company.industry}
        SIZE: ${company.size}
        DESCRIPTION: ${company.description}
        
        Based on your knowledge of this company, provide a JSON response with:
        {
          "score": 8,
          "analysis": "detailed explanation of their work-life balance culture",
          "positives": ["list of positive aspects"],
          "concerns": ["any potential concerns"],
          "sources": ["where this information typically comes from"],
          "recommendations": ["what to ask about in interviews"]
        }
        
        Score should be 1-10 where:
        1-3: Poor work-life balance
        4-6: Average work-life balance
        7-8: Good work-life balance
        9-10: Excellent work-life balance
      `;

            const response = await this.openai.chat.completions.create({
                model: 'gpt-4',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert on company cultures and work-life balance. Provide accurate assessments based on publicly available information.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.3,
                max_tokens: 600
            });

            return JSON.parse(response.choices[0].message.content);
        } catch (error) {
            logger.error('OpenAI work-life balance evaluation failed:', error);
            throw error;
        }
    }

    async generatePersonalizedEmail(userProfile, company) {
        try {
            const hrContact = company.hrContacts?.[0];
            const contactName = hrContact?.name || 'Hiring Manager';

            // Get personal information with fallbacks
            const firstName = userProfile.personalInfo?.firstName || 'Your Name';
            const lastName = userProfile.personalInfo?.lastName || '';
            const fullName = `${firstName} ${lastName}`.trim();
            const email = userProfile.personalInfo?.email || 'your.email@example.com';
            const currentTitle = userProfile.currentTitle || 'Software Developer';
            const phone = userProfile.personalInfo?.phone || '';
            const linkedinUrl = userProfile.personalInfo?.linkedinUrl || '';
            const portfolioUrl = userProfile.personalInfo?.portfolioUrl || '';
            const location = userProfile.personalInfo?.location ?
                `${userProfile.personalInfo.location.city || ''}${userProfile.personalInfo.location.city && userProfile.personalInfo.location.state ? ', ' : ''}${userProfile.personalInfo.location.state || ''}`.trim() : '';

            const prompt = `
        Generate a personalized email for an informational interview request:
        
        SENDER PROFILE:
        Name: ${fullName}
        Email: ${email}
        Current Title: ${currentTitle}
        Location: ${location || 'Not specified'}
        Phone: ${phone || 'Not provided'}
        LinkedIn: ${linkedinUrl || 'Not provided'}
        Portfolio: ${portfolioUrl || 'Not provided'}
        Resume highlights: ${userProfile.resume?.substring(0, 500)}...
        Personal statement: ${userProfile.personalStatement}
        Key strengths: ${userProfile.aiAnalysis?.strengths?.join(', ') || 'Software development'}
        Career goals: ${userProfile.aiAnalysis?.careerGoals?.join(', ') || 'Career growth'}
        Experience level: ${userProfile.experienceLevel || 'Mid-level'}
        
        COMPANY:
        Name: ${company.name}
        Industry: ${company.industry}
        Description: ${company.description}
        Work-life balance score: ${company.workLifeBalance?.score}/10
        AI analysis: ${company.aiAnalysis}
        Location: ${company.location}
        
        RECIPIENT:
        Name: ${contactName}
        Title: ${hrContact?.title || 'HR Representative'}
        Email: ${hrContact?.email || 'Not available'}
        
        Generate a professional, personalized email that:
        1. Uses the sender's actual name and contact information
        2. Shows genuine interest in the company
        3. Mentions specific aspects of their culture/work-life balance
        4. Highlights relevant experience matching their needs
        5. Requests an informational interview (not a job application)
        6. Is concise but engaging (2-3 paragraphs max)
        7. Includes a professional signature with contact details
        
        Provide JSON response with:
        {
          "subject": "Professional subject line with sender's name",
          "body": "Complete email body with actual names and details",
          "signature": "Professional email signature with contact info",
          "tone": "professional but warm",
          "keyPoints": ["main personalized points covered in email"]
        }
      `;

            logger.info(`🤖 Generating personalized email for ${company.name}`);

            const response = await this.openai.chat.completions.create({
                model: 'gpt-4',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert at crafting professional networking emails. Create engaging, personalized messages that get responses. Always use the actual provided personal information.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.4,
                max_tokens: 1000
            });

            const emailData = JSON.parse(response.choices[0].message.content);

            // Add signature to body if not already included
            const fullEmailBody = emailData.body.includes('Best regards') || emailData.body.includes('Sincerely') ?
                emailData.body :
                `${emailData.body}\n\n${emailData.signature}`;

            logger.info(`✅ Email generated for ${company.name}`);

            return {
                ...emailData,
                body: fullEmailBody,
                senderInfo: {
                    name: fullName,
                    email: email,
                    phone: phone,
                    linkedin: linkedinUrl,
                    portfolio: portfolioUrl,
                    location: location
                }
            };
        } catch (error) {
            logger.error('OpenAI email generation failed:', error);
            throw error;
        }
    }

    async findCompanyMatches(userProfile, maxResults = 100, expandToNationwide = false) {
        try {
            logger.info(`🤖 Starting AI company search (nationwide: ${expandToNationwide})`);

            // Format selected company sizes and industries
            const companySizes = userProfile.preferences?.companySizes || ['medium'];
            const industries = userProfile.preferences?.industries || ['technology'];

            const userLocation = userProfile.personalInfo?.location ?
                `${userProfile.personalInfo.location.city || ''}${userProfile.personalInfo.location.city && userProfile.personalInfo.location.state ? ', ' : ''}${userProfile.personalInfo.location.state || ''}`.trim() :
                'Not specified';

            const locationStrategy = expandToNationwide ?
                `NATIONWIDE SEARCH (previous Boston/Providence search found fewer than 100 companies):
        1. All major US tech hubs (San Francisco, Seattle, New York, Austin, etc.)
        2. Remote-first companies regardless of location
        3. Fast-growing companies in secondary markets
        4. Include the candidate's current location if specified: ${userLocation}` :
                `FOCUSED REGIONAL SEARCH:
        1. Boston, MA area companies (PRIMARY - Cambridge, Somerville, nearby suburbs)
        2. Providence, RI area companies (SECONDARY - greater Providence metro)
        3. Remote-first companies with these offices or strong presence in these areas
        4. Note: If fewer than 100 companies found, will expand to nationwide search`;

            const prompt = `
        Based on this developer's profile, suggest companies they should research:
        
        DEVELOPER PROFILE:
        Name: ${userProfile.personalInfo?.firstName || 'Developer'} ${userProfile.personalInfo?.lastName || ''}
        Current Location: ${userLocation}
        Current Title: ${userProfile.currentTitle || 'Software Developer'}
        Experience Level: ${userProfile.experienceLevel || userProfile.aiAnalysis?.experienceLevel || 'Mid-level'}
        Tech Stack: ${userProfile.aiAnalysis?.techStack?.join(', ') || 'General development'}
        Interests: ${userProfile.aiAnalysis?.interests?.join(', ') || 'Software development'}
        Career Goals: ${userProfile.aiAnalysis?.careerGoals?.join(', ') || 'Career growth'}
        Culture Fit: ${userProfile.aiAnalysis?.cultureFit?.join(', ') || 'Collaborative environment'}
        Work-Life Balance Priority: ${userProfile.preferences?.workLifeBalance || true}
        Remote Work Preference: ${userProfile.preferences?.remoteFriendly || true}
        Willing to Relocate: ${userProfile.preferences?.willingToRelocate || false}
        
        COMPANY PREFERENCES:
        Preferred Company Sizes: ${companySizes.join(', ')}
        Preferred Industries: ${industries.join(', ')}
        
        LOCATION STRATEGY:
        ${locationStrategy}
        
        Provide a JSON array of companies to research (focus on realistic matches):
        [
          {
            "name": "Company Name",
            "location": "City, State",
            "industry": "Technology",
            "size": "medium",
            "why": "specific reason why this matches their profile and preferences",
            "workLifeBalanceReputation": "known for good work-life balance",
            "searchKeywords": ["keywords to search for this company"],
            "remotePolicy": "remote-friendly"
          }
        ]
        
        IMPORTANT REQUIREMENTS:
        - Only include companies that match the selected company sizes: ${companySizes.join(', ')}
        - Only include companies that match the selected industries: ${industries.join(', ')}
        - Focus on companies known for good work-life balance
        - Include a mix of well-known and growing companies
        - Prioritize companies with strong engineering cultures
        - Include companies with good remote/flexible work policies
        
        Return exactly ${maxResults} companies that would be realistic matches for this person.
      `;

            const response = await this.openai.chat.completions.create({
                model: 'gpt-4',
                messages: [
                    {
                        role: 'system',
                        content: `You are an expert tech recruiter with deep knowledge of companies across the US tech ecosystem. You understand the ${expandToNationwide ? 'national' : 'Boston/Providence'} tech market and can suggest realistic matches based on candidate profiles. Always respect the candidate's company size and industry preferences.`
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.6,
                max_tokens: 4000
            });

            const companies = JSON.parse(response.choices[0].message.content);
            logger.info(`✅ AI generated ${companies.length} company suggestions (nationwide: ${expandToNationwide})`);

            return companies;
        } catch (error) {
            logger.error('OpenAI company suggestions failed:', error);
            throw error;
        }
    }
}

module.exports = new OpenAIService();