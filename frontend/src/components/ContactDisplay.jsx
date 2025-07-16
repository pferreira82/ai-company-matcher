import React, { useState } from 'react';
import {
    Mail,
    Phone,
    CheckCircle,
    AlertCircle,
    Eye,
    EyeOff,
    User,
    Building,
    Shield
} from 'lucide-react';

const ContactDisplay = ({ contacts, companyName, compact = false }) => {
    const [showAllContacts, setShowAllContacts] = useState(false);
    const [obscureEmails, setObscureEmails] = useState(true);

    if (!contacts || contacts.length === 0) {
        return (
            <div className="no-contact-state">
                <AlertCircle className="no-contact-icon" />
                <div className="no-contact-text">No contacts found</div>
            </div>
        );
    }

    const primaryContact = contacts[0];
    const additionalContacts = contacts.slice(1);

    const obscureEmail = (email) => {
        if (!obscureEmails) return email;
        if (!email) return '';

        const [local, domain] = email.split('@');
        if (!local || !domain) return email;

        const obscuredLocal = local.length > 2
            ? local.substring(0, 2) + '*'.repeat(local.length - 2)
            : local;

        return `${obscuredLocal}@${domain}`;
    };

    const getContactCardClass = (contact) => {
        const baseClass = "hr-contact-card";
        return contact.verified ? `${baseClass} verified` : baseClass;
    };

    const getContactTextClass = (contact, element) => {
        const verified = contact.verified;
        switch (element) {
            case 'name':
                return verified ? 'hr-contact-name verified' : 'hr-contact-name';
            case 'title':
                return verified ? 'hr-contact-title verified' : 'hr-contact-title';
            case 'email':
                return verified ? 'hr-contact-email verified' : 'hr-contact-email';
            case 'meta':
                return verified ? 'hr-contact-meta verified' : 'hr-contact-meta';
            default:
                return '';
        }
    };

    const getSourceIcon = (source) => {
        switch (source) {
            case 'apollo':
                return <Building className="w-3 h-3" />;
            case 'hunter':
                return <Mail className="w-3 h-3" />;
            case 'linkedin':
                return <User className="w-3 h-3" />;
            case 'manual':
                return <Shield className="w-3 h-3" />;
            default:
                return <AlertCircle className="w-3 h-3" />;
        }
    };

    if (compact) {
        return (
            <div className="space-y-2">
                <div className={getContactCardClass(primaryContact)}>
                    <div className={getContactTextClass(primaryContact, 'name')}>
                        {primaryContact.name || 'Unknown'}
                        {primaryContact.verified && (
                            <CheckCircle className="w-3 h-3 inline ml-1" />
                        )}
                    </div>
                    <div className={getContactTextClass(primaryContact, 'title')}>
                        {primaryContact.title || 'No title'}
                    </div>
                    <div className={getContactTextClass(primaryContact, 'email')}>
                        <Mail className="w-3 h-3" />
                        <span className="font-mono">
                            {obscureEmail(primaryContact.email)}
                        </span>
                        <button
                            onClick={() => setObscureEmails(!obscureEmails)}
                            className="ml-1 text-gray-400 hover:text-gray-600"
                            title={obscureEmails ? 'Show email' : 'Hide email'}
                        >
                            {obscureEmails ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        </button>
                    </div>
                    <div className={getContactTextClass(primaryContact, 'meta')}>
                        {getSourceIcon(primaryContact.source)}
                        <span>{primaryContact.confidence || 0}% confidence</span>
                        <span>•</span>
                        <span className="capitalize">{primaryContact.source || 'unknown'}</span>
                    </div>
                </div>

                {additionalContacts.length > 0 && (
                    <div className="text-xs text-gray-500">
                        +{additionalContacts.length} more contact{additionalContacts.length > 1 ? 's' : ''}
                        <button
                            onClick={() => setShowAllContacts(!showAllContacts)}
                            className="ml-2 text-blue-600 hover:underline"
                        >
                            {showAllContacts ? 'Hide' : 'Show all'}
                        </button>
                    </div>
                )}

                {showAllContacts && additionalContacts.map((contact, index) => (
                    <div key={index} className={getContactCardClass(contact)}>
                        <div className={getContactTextClass(contact, 'name')}>
                            {contact.name || 'Unknown'}
                            {contact.verified && (
                                <CheckCircle className="w-3 h-3 inline ml-1" />
                            )}
                        </div>
                        <div className={getContactTextClass(contact, 'title')}>
                            {contact.title || 'No title'}
                        </div>
                        <div className={getContactTextClass(contact, 'email')}>
                            <Mail className="w-3 h-3" />
                            <span className="font-mono">
                                {obscureEmail(contact.email)}
                            </span>
                        </div>
                        <div className={getContactTextClass(contact, 'meta')}>
                            {getSourceIcon(contact.source)}
                            <span>{contact.confidence || 0}% confidence</span>
                            <span>•</span>
                            <span className="capitalize">{contact.source || 'unknown'}</span>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    // Full display mode
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-start">
                <h4 className="font-medium text-gray-800">
                    HR Contacts for {companyName}
                </h4>
                <div className="flex items-center gap-2 text-xs">
                    <span className="text-gray-600">
                        {contacts.length} contact{contacts.length > 1 ? 's' : ''}
                    </span>
                    <button
                        onClick={() => setObscureEmails(!obscureEmails)}
                        className="text-gray-400 hover:text-gray-600 flex items-center gap-1"
                        title={obscureEmails ? 'Show emails' : 'Hide emails'}
                    >
                        {obscureEmails ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        {obscureEmails ? 'Show' : 'Hide'} emails
                    </button>
                </div>
            </div>

            <div className="space-y-3">
                {contacts.map((contact, index) => (
                    <div key={index} className={getContactCardClass(contact)}>
                        <div className="flex justify-between items-start mb-2">
                            <div className={getContactTextClass(contact, 'name')}>
                                {contact.name || 'Unknown'}
                                {contact.verified && (
                                    <CheckCircle className="w-4 h-4 inline ml-2" />
                                )}
                                {index === 0 && (
                                    <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                                        Primary
                                    </span>
                                )}
                            </div>
                            <div className="text-xs text-gray-500">
                                {contact.confidence || 0}% confidence
                            </div>
                        </div>

                        <div className={getContactTextClass(contact, 'title')}>
                            {contact.title || 'No title provided'}
                        </div>

                        <div className={getContactTextClass(contact, 'email')}>
                            <Mail className="w-4 h-4" />
                            <span className="font-mono">
                                {obscureEmail(contact.email)}
                            </span>
                            {contact.email && (
                                <button
                                    onClick={() => navigator.clipboard.writeText(contact.email)}
                                    className="ml-2 text-xs text-blue-600 hover:underline"
                                    title="Copy email address"
                                >
                                    Copy
                                </button>
                            )}
                        </div>

                        <div className={getContactTextClass(contact, 'meta')}>
                            <div className="flex items-center gap-2">
                                {getSourceIcon(contact.source)}
                                <span className="capitalize">Found via {contact.source || 'unknown'}</span>
                            </div>
                            {contact.verified && (
                                <div className="flex items-center gap-1 text-green-600">
                                    <CheckCircle className="w-3 h-3" />
                                    <span>Verified contact</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {contacts.length > 0 && (
                <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-700">
                    <strong>Tip:</strong> Start with the primary contact (highest confidence) for initial outreach.
                    If no response after 1 week, try the next contact.
                </div>
            )}
        </div>
    );
};

export default ContactDisplay;