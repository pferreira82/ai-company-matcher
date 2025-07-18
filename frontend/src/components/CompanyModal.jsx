import React from 'react';
import { X } from 'lucide-react';
import CompanyCard from './CompanyCard';

const CompanyModal = ({ isOpen, onClose, company, onGenerateEmail, onUpdateStatus }) => {
    if (!isOpen || !company) return null;

    // Ensure company has all required fields for CompanyCard
    const companyData = {
        ...company,
        id: company.id || company._id,
        workLifeBalanceScore: company.workLifeBalance?.score || 0,
        hrContact: company.hrContacts && company.hrContacts.length > 0 ? company.hrContacts[0] : null,
        remotePolicy: company.remotePolicy || 'Not specified',
        status: company.status || 'not-contacted'
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
                {/* Modal Header */}
                <div className="flex justify-between items-center p-4 border-b bg-gray-50">
                    <h2 className="text-xl font-bold text-gray-800">Company Details</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                        aria-label="Close modal"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                    <CompanyCard
                        company={companyData}
                        onGenerateEmail={onGenerateEmail}
                        onUpdateStatus={onUpdateStatus}
                    />

                    {/* Additional Details Section */}
                    <div className="mt-6 space-y-6">
                        {/* Full Description */}
                        {company.description && (
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <h3 className="font-semibold text-gray-800 mb-2">Company Description</h3>
                                <p className="text-sm text-gray-600">{company.description}</p>
                            </div>
                        )}

                        {/* All HR Contacts */}
                        {company.hrContacts && company.hrContacts.length > 1 && (
                            <div className="bg-blue-50 p-4 rounded-lg">
                                <h3 className="font-semibold text-blue-800 mb-3">All HR Contacts ({company.hrContacts.length})</h3>
                                <div className="space-y-3">
                                    {company.hrContacts.map((contact, index) => (
                                        <div key={index} className="bg-white p-3 rounded border border-blue-200">
                                            <div className="font-medium text-gray-800">{contact.name}</div>
                                            <div className="text-sm text-gray-600">{contact.title}</div>
                                            <div className="text-sm text-blue-600">{contact.email}</div>
                                            <div className="text-xs text-gray-500 mt-1">
                                                {contact.confidence}% confidence • {contact.source}
                                                {contact.verified && " • Verified ✓"}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Match Details */}
                        {company.matchFactors && company.matchFactors.length > 0 && (
                            <div className="bg-green-50 p-4 rounded-lg">
                                <h3 className="font-semibold text-green-800 mb-2">Match Factors</h3>
                                <ul className="text-sm text-green-700 space-y-1">
                                    {company.matchFactors.map((factor, index) => (
                                        <li key={index} className="flex items-start gap-2">
                                            <span className="text-green-500 mt-0.5">•</span>
                                            <span>{factor}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Work-Life Balance Details */}
                        {company.workLifeBalance && (
                            <div className="bg-purple-50 p-4 rounded-lg">
                                <h3 className="font-semibold text-purple-800 mb-2">
                                    Work-Life Balance Analysis ({company.workLifeBalance.score}/10)
                                </h3>
                                {company.workLifeBalance.analysis && (
                                    <p className="text-sm text-purple-700 mb-3">{company.workLifeBalance.analysis}</p>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {company.workLifeBalance.positives && company.workLifeBalance.positives.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-medium text-purple-700 mb-1">Positives</h4>
                                            <ul className="text-sm text-purple-600 space-y-1">
                                                {company.workLifeBalance.positives.map((positive, index) => (
                                                    <li key={index}>• {positive}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    {company.workLifeBalance.concerns && company.workLifeBalance.concerns.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-medium text-purple-700 mb-1">Concerns</h4>
                                            <ul className="text-sm text-purple-600 space-y-1">
                                                {company.workLifeBalance.concerns.map((concern, index) => (
                                                    <li key={index}>• {concern}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Concerns */}
                        {company.concerns && company.concerns.length > 0 && (
                            <div className="bg-red-50 p-4 rounded-lg">
                                <h3 className="font-semibold text-red-800 mb-2">Potential Concerns</h3>
                                <ul className="text-sm text-red-700 space-y-1">
                                    {company.concerns.map((concern, index) => (
                                        <li key={index} className="flex items-start gap-2">
                                            <span className="text-red-500 mt-0.5">•</span>
                                            <span>{concern}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Email History */}
                        {company.emailHistory && company.emailHistory.length > 0 && (
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <h3 className="font-semibold text-gray-800 mb-2">
                                    Email History ({company.emailHistory.length})
                                </h3>
                                <div className="space-y-2">
                                    {company.emailHistory.map((email, index) => (
                                        <div key={index} className="text-sm text-gray-600 flex justify-between">
                                            <span>{email.subject}</span>
                                            <span className="text-xs">
                                                {new Date(email.generatedAt).toLocaleDateString()}
                                                {email.sent && " • Sent ✓"}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Metadata */}
                        <div className="bg-gray-50 p-4 rounded-lg text-xs text-gray-500">
                            <div className="grid grid-cols-2 gap-2">
                                <div>Added: {new Date(company.createdAt).toLocaleDateString()}</div>
                                <div>Updated: {new Date(company.updatedAt).toLocaleDateString()}</div>
                                <div>Data Quality: {company.dataQuality || 0}%</div>
                                <div>Discovery: {company.discoveryMethod || 'Unknown'}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CompanyModal;