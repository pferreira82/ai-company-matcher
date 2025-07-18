import React, { useState, useEffect } from 'react';
import { X, Copy, Send, Mail, User, MapPin, Phone, Linkedin, Globe, Edit3, Check } from 'lucide-react';

const EmailModal = ({ isOpen, onClose, company, emailTemplate }) => {
    const [copied, setCopied] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editedContent, setEditedContent] = useState('');

    useEffect(() => {
        if (emailTemplate?.content || emailTemplate?.body) {
            setEditedContent(emailTemplate.content || emailTemplate.body);
        }
    }, [emailTemplate]);

    if (!isOpen || !company || !emailTemplate) return null;

    // Handle different data structures
    const template = emailTemplate?.data || emailTemplate;

    if (!template) {
        console.error('No email template data:', emailTemplate);
        return null;
    }

    const handleCopy = async () => {
        try {
            const contentToCopy = editMode ? editedContent : (emailTemplate.content || emailTemplate.body);
            await navigator.clipboard.writeText(contentToCopy);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const handleEmailClient = () => {
        const subject = encodeURIComponent(emailTemplate.subject);
        const body = encodeURIComponent(editMode ? editedContent : (emailTemplate.content || emailTemplate.body));
        const to = encodeURIComponent(emailTemplate.recipientEmail || '');

        window.open(`mailto:${to}?subject=${subject}&body=${body}`);
    };

    console.log('EmailModal rendering with:', { company, template });

    const handleEditToggle = () => {
        if (editMode) {
            // Exiting edit mode - could save changes here if needed
        }
        setEditMode(!editMode);
    };

    const handleCancelEdit = () => {
        setEditedContent(emailTemplate.content || emailTemplate.body);
        setEditMode(false);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header - Fixed */}
                <div className="flex justify-between items-center p-6 border-b flex-shrink-0">
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

                {/* Content - Scrollable */}
                <div className="flex-1 p-6 overflow-y-auto">
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
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Email Body:
                                    </label>
                                    <div className="flex gap-2">
                                        {editMode ? (
                                            <>
                                                <button
                                                    onClick={handleEditToggle}
                                                    className="text-green-600 hover:text-green-700 transition-colors flex items-center gap-1 text-sm"
                                                >
                                                    <Check className="w-4 h-4" />
                                                    Save
                                                </button>
                                                <button
                                                    onClick={handleCancelEdit}
                                                    className="text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1 text-sm"
                                                >
                                                    <X className="w-4 h-4" />
                                                    Cancel
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                onClick={handleEditToggle}
                                                className="text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1 text-sm"
                                            >
                                                <Edit3 className="w-4 h-4" />
                                                Edit
                                            </button>
                                        )}
                                    </div>
                                </div>
                                {editMode ? (
                                    <textarea
                                        value={editedContent}
                                        onChange={(e) => setEditedContent(e.target.value)}
                                        className="w-full bg-white p-4 rounded-lg text-sm border border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 min-h-[300px] resize-vertical"
                                        placeholder="Edit your email content..."
                                    />
                                ) : (
                                    <div className="bg-gray-50 p-4 rounded-lg text-sm whitespace-pre-line border min-h-[300px]">
                                        {emailTemplate.content || emailTemplate.body}
                                    </div>
                                )}
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

                {/* Footer - Fixed */}
                <div className="flex gap-3 p-6 border-t bg-gray-50 flex-shrink-0">
                    <button
                        onClick={handleCopy}
                        className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                            copied ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                    >
                        <Copy className="w-4 h-4" />
                        {copied ? 'Copied!' : `Copy ${editMode ? 'Edited ' : ''}Email`}
                    </button>

                    <button
                        onClick={handleEmailClient}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                    >
                        <Send className="w-4 h-4" />
                        Open in Email Client
                    </button>

                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors ml-auto"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EmailModal;