import React from 'react';
import { MapPin, Building, Users, Globe, Star, Mail } from 'lucide-react';

const CompanyCard = ({ company, onGenerateEmail, onUpdateStatus }) => {
    const getPriorityBadge = () => {
        if (company.isLocalPriority) {
            return (
                <div className="flex items-center gap-1 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    <Star className="w-3 h-3 fill-current" />
                    Local Priority
                </div>
            );
        }
        return null;
    };

    const getMatchScoreColor = (score) => {
        if (score >= 90) return 'bg-green-100 text-green-800';
        if (score >= 80) return 'bg-blue-100 text-blue-800';
        if (score >= 70) return 'bg-yellow-100 text-yellow-800';
        return 'bg-gray-100 text-gray-800';
    };

    const getWLBScoreColor = (score) => {
        if (score >= 8) return 'bg-green-100 text-green-800';
        if (score >= 6) return 'bg-yellow-100 text-yellow-800';
        return 'bg-red-100 text-red-800';
    };

    return (
        <div className="card p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div>
                        <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                            {company.name}
                            {getPriorityBadge()}
                        </h3>
                        <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3" />
                            {company.location}
                        </p>
                    </div>
                </div>
                <div className="text-right space-y-2">
                    <div className={`text-sm px-3 py-1 rounded-full font-medium ${getMatchScoreColor(company.aiMatchScore)}`}>
                        {company.aiMatchScore}% AI Match
                    </div>
                    <div className={`text-sm px-3 py-1 rounded-full font-medium ${getWLBScoreColor(company.workLifeBalanceScore)}`}>
                        {company.workLifeBalanceScore}/10 WLB
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                        <Building className="w-4 h-4 text-gray-400" />
                        <span><strong>Industry:</strong> {company.industry}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span><strong>Size:</strong> {company.size}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <Globe className="w-4 h-4 text-gray-400" />
                        <span><strong>Remote:</strong> {company.remotePolicy}</span>
                    </div>

                    {company.hrContact && (
                        <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                            <div className="font-medium text-green-800 text-sm mb-1">
                                HR Contact Found
                            </div>
                            <div className="text-sm text-green-700">
                                <div className="font-medium">{company.hrContact.name}</div>
                                <div className="text-xs">{company.hrContact.title}</div>
                                <div className="text-xs text-green-600">
                                    {company.hrContact.confidence}% confidence
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div>
                    <h4 className="font-medium text-gray-700 mb-2">AI Analysis</h4>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-3">
                        {company.aiAnalysis}
                    </p>

                    {company.highlights && company.highlights.length > 0 && (
                        <div className="mb-3">
                            <h5 className="text-xs font-medium text-green-700 mb-1">Highlights</h5>
                            <ul className="text-xs text-green-600 space-y-1">
                                {company.highlights.slice(0, 2).map((highlight, index) => (
                                    <li key={index} className="flex items-start gap-1">
                                        <span className="text-green-500 mt-0.5">•</span>
                                        <span>{highlight}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex flex-wrap gap-3">
                <button
                    onClick={() => onGenerateEmail(company)}
                    className="btn btn-primary flex items-center gap-2"
                >
                    <Mail className="w-4 h-4" />
                    Generate AI Email
                </button>

                <select
                    value={company.status || 'not-contacted'}
                    onChange={(e) => onUpdateStatus(company.id, e.target.value)}
                    className="select text-sm px-3 py-2 min-w-[140px]"
                >
                    <option value="not-contacted">Not Contacted</option>
                    <option value="contacted">Contacted</option>
                    <option value="responded">Responded</option>
                    <option value="interview">Interview</option>
                    <option value="rejected">Rejected</option>
                </select>

                {company.website && (
                    <a
                        href={company.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary text-sm"
                    >
                        Visit Website
                    </a>
                )}
            </div>
        </div>
    );
};

export default CompanyCard;