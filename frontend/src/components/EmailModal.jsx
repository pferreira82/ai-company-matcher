import React, { useState } from 'react';
import { X, Copy, Send, Mail } from 'lucide-react';

const EmailModal = ({ isOpen, onClose, company, emailTemplate }) => {
    const [copied, setCopied] = useState(false);

    if (!isOpen || !company || !emailTemplate) return null;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(emailTemplate.content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const handleEmailClient = () => {
        const subject = encodeURIComponent(emailTemplate.subject);
        const body = encodeURIComponent(emailTemplate.content);
        const to = encodeURIComponent(emailTemplate.recipientEmail || '');

        window.open(`mailto:${to}?subject=${subject}&body=${body}`);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden">
                <div className="flex justify-between items-center p-6 border-b">
                    <div className="flex items-center gap-3">
                        <Mail className="w-6 h-6 text-blue-600" />
                        <div>
                            <h3 className="text-xl font-semibold">AI-Generated Email</h3>
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
                    <div className="space-y-4">
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
                            <div className="bg-gray-50 p-4 rounded-lg text-sm whitespace-pre-line border">
                                {emailTemplate.content}
                            </div>
                        </div>

                        {emailTemplate.keyPoints && emailTemplate.keyPoints.length > 0 && (
                            <div className="bg-blue-50 p-4 rounded-lg">
                                <h4 className="font-medium text-blue-800 mb-2">
                                    AI Personalization Points:
                                </h4>
                                <ul className="text-sm text-blue-700 space-y-1">
                                    {emailTemplate.keyPoints.map((point, index) => (
                                        <li key={index} className="flex items-start gap-2">
                                            <span className="text-blue-500 mt-0.5">•</span>
                                            <span>{point}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
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