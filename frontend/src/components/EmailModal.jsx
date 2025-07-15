import React, { useState } from 'react';
import { X, Copy, Send, Mail, User, MapPin, Phone, Linkedin, Globe } from 'lucide-react';

const EmailModal = ({ isOpen, onClose, company, emailTemplate }) => {
    const [copied, setCopied] = useState(false);

    if (!isOpen || !company || !emailTemplate) return null;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(emailTemplate.content || emailTemplate.body);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const handleEmailClient = () => {
        const subject = encodeURIComponent(emailTemplate.subject);
        const body = encodeURIComponent(emailTemplate.content || emailTemplate.body);
        const to = encodeURIComponent(emailTemplate.recipientEmail || '');

        window.open(`mailto:${to}?subject=${subject}&body=${body}`);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
                <div className="flex justify-between items-center p-6 border-b">
                    <div className="flex items-center gap-3">
                        <Mail className="w-6 h-6 text-blue-600" />
                        <div>
                            <h3 className="text-xl font-semibold">AI-Generated Email Template</h3>
                            <p className="text-sm text-gray-600">{company.name}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Email Content */}
                        <div className="lg:col-span-2 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    To:
                                </label>
                                <div className="bg-gray-50 p-3 rounded-lg text-sm">
                                    <div className="font-medium">{emailTemplate.recipientName}</div>
                                    <div className="text-gray-600">{emailTemplate.recipientEmail}</div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Subject:
                                </label>
                                <div className="bg-gray-50 p-3 rounded-lg text-sm font-medium">
                                    {emailTemplate.subject}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Email Body:
                                </label>
                                <div className="bg-gray-50 p-4 rounded-lg text-sm whitespace-pre-line border min-h-[300px]">
                                    {emailTemplate.content || emailTemplate.body}
                                </div>
                            </div>
                        </div>

                        {/* Sidebar with sender info and tips */}
                        <div className="space-y-6">
                            {/* Sender Information */}
                            {emailTemplate.senderInfo && (
                                <div className="bg-blue-50 p-4 rounded-lg">
                                    <h4 className="font-medium text-blue-800 mb-3 flex items-center gap-2">
                                        <User className="w-4 h-4" />
                                        Your Information Used
                                    </h4>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex items-center gap-2 text-blue-700">
                                            <User className="w-3 h-3" />
                                            <span className="font-medium">{emailTemplate.senderInfo.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-blue-600">
                                            <Mail className="w-3 h-3" />
                                            <span>{emailTemplate.senderInfo.email}</span>
                                        </div>
                                        {emailTemplate.senderInfo.phone && (
                                            <div className="flex items-center gap-2 text-blue-600">
                                                <Phone className="w-3 h-3" />
                                                <span>{emailTemplate.senderInfo.phone}</span>
                                            </div>
                                        )}
                                        {emailTemplate.senderInfo.location && (
                                            <div className="flex items-center gap-2 text-blue-600">
                                                <MapPin className="w-3 h-3" />
                                                <span>{emailTemplate.senderInfo.location}</span>
                                            </div>
                                        )}
                                        {emailTemplate.senderInfo.linkedin && (
                                            <div className="flex items-start gap-2 text-blue-600">
                                                <Linkedin className="w-3 h-3 mt-0.5" />
                                                <span className="text-xs break-all">{emailTemplate.senderInfo.linkedin}</span>
                                            </div>
                                        )}
                                        {emailTemplate.senderInfo.portfolio && (
                                            <div className="flex items-start gap-2 text-blue-600">
                                                <Globe className="w-3 h-3 mt-0.5" />
                                                <span className="text-xs break-all">{emailTemplate.senderInfo.portfolio}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Personalization Points */}
                            {emailTemplate.keyPoints && emailTemplate.keyPoints.length > 0 && (
                                <div className="bg-green-50 p-4 rounded-lg">
                                    <h4 className="font-medium text-green-800 mb-3">
                                        AI Personalization Points:
                                    </h4>
                                    <ul className="text-sm text-green-700 space-y-2">
                                        {emailTemplate.keyPoints.map((point, index) => (
                                            <li key={index} className="flex items-start gap-2">
                                                <span className="text-green-500 mt-0.5 text-xs">•</span>
                                                <span>{point}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Email Tips */}
                            <div className="bg-yellow-50 p-4 rounded-lg">
                                <h4 className="font-medium text-yellow-800 mb-3">
                                    Email Tips:
                                </h4>
                                <ul className="text-sm text-yellow-700 space-y-2">
                                    <li className="flex items-start gap-2">
                                        <span className="text-yellow-500 mt-0.5 text-xs">•</span>
                                        <span>Send Tuesday-Thursday, 10AM-3PM for best response rates</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-yellow-500 mt-0.5 text-xs">•</span>
                                        <span>Follow up after 1 week if no response</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-yellow-500 mt-0.5 text-xs">•</span>
                                        <span>Keep follow-ups brief and add new value</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-yellow-500 mt-0.5 text-xs">•</span>
                                        <span>Maximum of 2 follow-ups total</span>
                                    </li>
                                </ul>
                            </div>

                            {/* Company Info */}
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <h4 className="font-medium text-gray-800 mb-3">
                                    Company Details:
                                </h4>
                                <div className="text-sm text-gray-600 space-y-1">
                                    <div><strong>Industry:</strong> {company.industry}</div>
                                    <div><strong>Size:</strong> {company.size}</div>
                                    <div><strong>Location:</strong> {company.location}</div>
                                    {company.aiMatchScore && (
                                        <div><strong>AI Match:</strong> {company.aiMatchScore}%</div>
                                    )}
                                    {company.workLifeBalanceScore && (
                                        <div><strong>Work-Life Balance:</strong> {company.workLifeBalanceScore}/10</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 p-6 border-t bg-gray-50">
                    <button
                        onClick={handleCopy}
                        className={`btn flex items-center gap-2 ${
                            copied ? 'bg-green-600 text-white' : 'btn-primary'
                        }`}
                    >
                        <Copy className="w-4 h-4" />
                        {copied ? 'Copied!' : 'Copy Email'}
                    </button>

                    <button
                        onClick={handleEmailClient}
                        className="btn btn-success flex items-center gap-2"
                    >
                        <Send className="w-4 h-4" />
                        Open in Email Client
                    </button>

                    <button
                        onClick={onClose}
                        className="btn btn-secondary ml-auto"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EmailModal;