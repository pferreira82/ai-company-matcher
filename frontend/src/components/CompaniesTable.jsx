import React, { useState, useEffect } from 'react';
import {
    MapPin,
    Building,
    Users,
    Mail,
    Phone,
    Globe,
    Star,
    CheckCircle,
    Clock,
    AlertCircle,
    Filter,
    Search,
    Download,
    Eye,
    Send,
    Trash2,
    MoreHorizontal
} from 'lucide-react';

const CompaniesTable = ({ companies, onGenerateEmail, onUpdateStatus, onDeleteCompany, userProfile }) => {
    const [filteredCompanies, setFilteredCompanies] = useState(companies);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [hasContactsFilter, setHasContactsFilter] = useState('all');
    const [sortBy, setSortBy] = useState('aiMatchScore');
    const [sortOrder, setSortOrder] = useState('desc');
    const [selectedCompanies, setSelectedCompanies] = useState(new Set());
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

    useEffect(() => {
        let filtered = [...companies];

        // Search filter
        if (searchTerm) {
            filtered = filtered.filter(company =>
                company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                company.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                company.industry?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(company => company.status === statusFilter);
        }

        // Contacts filter
        if (hasContactsFilter === 'yes') {
            filtered = filtered.filter(company => company.hrContacts && company.hrContacts.length > 0);
        } else if (hasContactsFilter === 'no') {
            filtered = filtered.filter(company => !company.hrContacts || company.hrContacts.length === 0);
        }

        // Sort
        filtered.sort((a, b) => {
            let aValue = a[sortBy];
            let bValue = b[sortBy];

            if (sortBy === 'workLifeBalanceScore') {
                aValue = a.workLifeBalance?.score || 0;
                bValue = b.workLifeBalance?.score || 0;
            }

            if (typeof aValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
            }

            if (sortOrder === 'asc') {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });

        setFilteredCompanies(filtered);
    }, [companies, searchTerm, statusFilter, hasContactsFilter, sortBy, sortOrder]);

    const getStatusBadge = (status) => {
        const badges = {
            'not-contacted': { color: 'bg-gray-100 text-gray-800', label: 'Not Contacted' },
            'contacted': { color: 'bg-yellow-100 text-yellow-800', label: 'Contacted' },
            'responded': { color: 'bg-blue-100 text-blue-800', label: 'Responded' },
            'interview': { color: 'bg-purple-100 text-purple-800', label: 'Interview' },
            'rejected': { color: 'bg-red-100 text-red-800', label: 'Rejected' },
            'hired': { color: 'bg-green-100 text-green-800', label: 'Hired' }
        };

        const badge = badges[status] || badges['not-contacted'];
        return (
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
                {badge.label}
            </span>
        );
    };

    const getMatchScoreBadge = (score) => {
        if (score >= 90) return 'bg-green-100 text-green-800';
        if (score >= 80) return 'bg-blue-100 text-blue-800';
        if (score >= 70) return 'bg-yellow-100 text-yellow-800';
        return 'bg-gray-100 text-gray-800';
    };

    const getEmailStatus = (company) => {
        if (!company.emailHistory || company.emailHistory.length === 0) {
            return { status: 'none', label: 'No emails', icon: Mail, color: 'text-gray-400' };
        }

        const latestEmail = company.emailHistory[company.emailHistory.length - 1];
        if (latestEmail.sent) {
            return { status: 'sent', label: 'Email sent', icon: CheckCircle, color: 'text-green-600' };
        } else {
            return { status: 'generated', label: 'Draft ready', icon: Clock, color: 'text-yellow-600' };
        }
    };

    const handleSelectCompany = (companyId) => {
        const newSelected = new Set(selectedCompanies);
        if (newSelected.has(companyId)) {
            newSelected.delete(companyId);
        } else {
            newSelected.add(companyId);
        }
        setSelectedCompanies(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedCompanies.size === filteredCompanies.length) {
            setSelectedCompanies(new Set());
        } else {
            setSelectedCompanies(new Set(filteredCompanies.map(c => c.id || c._id)));
        }
    };

    const handleBulkStatusUpdate = (newStatus) => {
        selectedCompanies.forEach(companyId => {
            onUpdateStatus(companyId, newStatus);
        });
        setSelectedCompanies(new Set());
    };

    const handleBulkDelete = () => {
        if (!confirm(`Are you sure you want to delete ${selectedCompanies.size} selected companies? This action cannot be undone.`)) {
            return;
        }

        selectedCompanies.forEach(companyId => {
            onDeleteCompany(companyId);
        });
        setSelectedCompanies(new Set());
    };

    const handleDeleteSingle = (companyId) => {
        setShowDeleteConfirm(companyId);
    };

    const confirmDelete = () => {
        if (showDeleteConfirm) {
            onDeleteCompany(showDeleteConfirm);
            setShowDeleteConfirm(null);
        }
    };

    const ActionDropdown = ({ company }) => {
        const [showDropdown, setShowDropdown] = useState(false);

        return (
            <div className="relative">
                <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="p-1 rounded hover:bg-gray-100 transition-colors"
                >
                    <MoreHorizontal className="w-4 h-4 text-gray-400" />
                </button>

                {showDropdown && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                        <div className="py-1">
                            <button
                                onClick={() => {
                                    onGenerateEmail(company);
                                    setShowDropdown(false);
                                }}
                                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                                <Mail className="w-4 h-4" />
                                Generate Email
                            </button>

                            {company.website && (
                                <a
                                    href={company.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    onClick={() => setShowDropdown(false)}
                                >
                                    <Globe className="w-4 h-4" />
                                    Visit Website
                                </a>
                            )}

                            <hr className="my-1" />

                            <button
                                onClick={() => {
                                    handleDeleteSingle(company.id || company._id);
                                    setShowDropdown(false);
                                }}
                                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                            >
                                <Trash2 className="w-4 h-4" />
                                Delete Company
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">
                        Company Database {userProfile.personalInfo?.firstName && `for ${userProfile.personalInfo.firstName}`}
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                        {filteredCompanies.length} of {companies.length} companies • AI-ranked by compatibility
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {selectedCompanies.size > 0 && (
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">
                                {selectedCompanies.size} selected
                            </span>
                            <select
                                onChange={(e) => {
                                    if (e.target.value === 'delete') {
                                        handleBulkDelete();
                                    } else if (e.target.value) {
                                        handleBulkStatusUpdate(e.target.value);
                                    }
                                    e.target.value = '';
                                }}
                                className="text-sm border border-gray-300 rounded px-2 py-1"
                                defaultValue=""
                            >
                                <option value="">Bulk Actions</option>
                                <option value="contacted">Mark as Contacted</option>
                                <option value="not-contacted">Mark as Not Contacted</option>
                                <option value="rejected">Mark as Rejected</option>
                                <option value="delete" className="text-red-600">Delete Selected</option>
                            </select>
                        </div>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg border space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Filter className="w-4 h-4" />
                    Filters & Search
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Search</label>
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Company, location, industry..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full py-2 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="all">All Statuses</option>
                            <option value="not-contacted">Not Contacted</option>
                            <option value="contacted">Contacted</option>
                            <option value="responded">Responded</option>
                            <option value="interview">Interview</option>
                            <option value="rejected">Rejected</option>
                            <option value="hired">Hired</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">HR Contacts</label>
                        <select
                            value={hasContactsFilter}
                            onChange={(e) => setHasContactsFilter(e.target.value)}
                            className="w-full py-2 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="all">All Companies</option>
                            <option value="yes">Has Contacts</option>
                            <option value="no">No Contacts</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Sort By</label>
                        <select
                            value={`${sortBy}-${sortOrder}`}
                            onChange={(e) => {
                                const [field, order] = e.target.value.split('-');
                                setSortBy(field);
                                setSortOrder(order);
                            }}
                            className="w-full py-2 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="aiMatchScore-desc">Match Score (High to Low)</option>
                            <option value="aiMatchScore-asc">Match Score (Low to High)</option>
                            <option value="workLifeBalanceScore-desc">Work-Life Balance (High to Low)</option>
                            <option value="name-asc">Company Name (A-Z)</option>
                            <option value="name-desc">Company Name (Z-A)</option>
                            <option value="createdAt-desc">Recently Added</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Companies Table */}
            <div className="bg-white rounded-lg border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="text-left py-3 px-4">
                                <input
                                    type="checkbox"
                                    checked={selectedCompanies.size === filteredCompanies.length && filteredCompanies.length > 0}
                                    onChange={handleSelectAll}
                                    className="w-4 h-4 text-blue-600 rounded"
                                />
                            </th>
                            <th className="text-left py-3 px-4 font-medium text-gray-700">Company</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-700">Contact Info</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-700">Match</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-700">Email Status</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                        {filteredCompanies.map((company) => {
                            const emailStatus = getEmailStatus(company);
                            const StatusIcon = emailStatus.icon;
                            const primaryContact = company.hrContacts && company.hrContacts.length > 0 ? company.hrContacts[0] : null;

                            return (
                                <tr key={company.id || company._id} className="hover:bg-gray-50">
                                    <td className="py-4 px-4">
                                        <input
                                            type="checkbox"
                                            checked={selectedCompanies.has(company.id || company._id)}
                                            onChange={() => handleSelectCompany(company.id || company._id)}
                                            className="w-4 h-4 text-blue-600 rounded"
                                        />
                                    </td>

                                    <td className="py-4 px-4">
                                        <div className="flex items-start gap-3">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-semibold text-gray-900">{company.name}</h3>
                                                    {company.isLocalPriority && (
                                                        <Star className="w-4 h-4 text-blue-500 fill-current" />
                                                    )}
                                                </div>
                                                <div className="text-sm text-gray-600 mt-1 space-y-1">
                                                    <div className="flex items-center gap-1">
                                                        <MapPin className="w-3 h-3" />
                                                        {company.location}
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Building className="w-3 h-3" />
                                                        {company.industry} • {company.size}
                                                    </div>
                                                    {company.website && (
                                                        <div className="flex items-center gap-1">
                                                            <Globe className="w-3 h-3" />
                                                            <a
                                                                href={company.website}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-blue-600 hover:underline text-xs"
                                                            >
                                                                Website
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </td>

                                    <td className="py-4 px-4">
                                        {primaryContact ? (
                                            <div className="space-y-2">
                                                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                                                    <div className="font-medium text-green-800 text-sm">
                                                        {primaryContact.name}
                                                    </div>
                                                    <div className="text-xs text-green-700 mt-1">
                                                        {primaryContact.title}
                                                    </div>
                                                    <div className="flex items-center gap-1 mt-2">
                                                        <Mail className="w-3 h-3 text-green-600" />
                                                        <span className="text-xs text-green-600">
                                                                {primaryContact.email}
                                                            </span>
                                                    </div>
                                                    <div className="text-xs text-green-600 mt-1">
                                                        {primaryContact.confidence}% confidence • {primaryContact.source}
                                                        {primaryContact.verified && (
                                                            <CheckCircle className="w-3 h-3 inline ml-1" />
                                                        )}
                                                    </div>
                                                </div>
                                                {company.hrContacts.length > 1 && (
                                                    <div className="text-xs text-gray-500">
                                                        +{company.hrContacts.length - 1} more contact{company.hrContacts.length > 2 ? 's' : ''}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="text-center py-2">
                                                <AlertCircle className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                                                <div className="text-xs text-gray-500">No contacts found</div>
                                            </div>
                                        )}
                                    </td>

                                    <td className="py-4 px-4">
                                        <div className="space-y-2">
                                            <div className={`text-xs px-2 py-1 rounded-full font-medium ${getMatchScoreBadge(company.aiMatchScore)}`}>
                                                {company.aiMatchScore}% Match
                                            </div>
                                            <div className="text-xs text-gray-600">
                                                WLB: {company.workLifeBalance?.score || 0}/10
                                            </div>
                                        </div>
                                    </td>

                                    <td className="py-4 px-4">
                                        <div className="flex items-center gap-2">
                                            <StatusIcon className={`w-4 h-4 ${emailStatus.color}`} />
                                            <span className="text-sm text-gray-700">{emailStatus.label}</span>
                                        </div>
                                        {company.emailHistory && company.emailHistory.length > 0 && (
                                            <div className="text-xs text-gray-500 mt-1">
                                                {company.emailHistory.length} email{company.emailHistory.length > 1 ? 's' : ''} generated
                                            </div>
                                        )}
                                    </td>

                                    <td className="py-4 px-4">
                                        <select
                                            value={company.status || 'not-contacted'}
                                            onChange={(e) => onUpdateStatus(company.id || company._id, e.target.value)}
                                            className="text-xs border border-gray-300 rounded px-2 py-1 bg-white"
                                        >
                                            <option value="not-contacted">Not Contacted</option>
                                            <option value="contacted">Contacted</option>
                                            <option value="responded">Responded</option>
                                            <option value="interview">Interview</option>
                                            <option value="rejected">Rejected</option>
                                            <option value="hired">Hired</option>
                                        </select>
                                    </td>

                                    <td className="py-4 px-4">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => onGenerateEmail(company)}
                                                disabled={!userProfile.personalInfo?.firstName || !userProfile.personalInfo?.email}
                                                className="btn btn-primary text-xs px-3 py-1 flex items-center gap-1"
                                            >
                                                <Mail className="w-3 h-3" />
                                                Email
                                            </button>
                                            <ActionDropdown company={company} />
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>
                </div>

                {filteredCompanies.length === 0 && (
                    <div className="text-center py-12">
                        <Building className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-600 mb-2">No companies found</h3>
                        <p className="text-gray-500">
                            {companies.length === 0
                                ? "Start an AI search to discover companies that match your profile"
                                : "Try adjusting your filters to see more results"
                            }
                        </p>
                    </div>
                )}
            </div>

            {/* Summary Statistics */}
            {filteredCompanies.length > 0 && (
                <div className="bg-white p-4 rounded-lg border">
                    <h3 className="font-medium text-gray-800 mb-3">Summary Statistics</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                            <div className="text-gray-600">Companies with Contacts</div>
                            <div className="font-semibold text-green-600">
                                {filteredCompanies.filter(c => c.hrContacts && c.hrContacts.length > 0).length}
                            </div>
                        </div>
                        <div>
                            <div className="text-gray-600">Emails Generated</div>
                            <div className="font-semibold text-blue-600">
                                {filteredCompanies.filter(c => c.emailHistory && c.emailHistory.length > 0).length}
                            </div>
                        </div>
                        <div>
                            <div className="text-gray-600">High Matches (80%+)</div>
                            <div className="font-semibold text-purple-600">
                                {filteredCompanies.filter(c => c.aiMatchScore >= 80).length}
                            </div>
                        </div>
                        <div>
                            <div className="text-gray-600">Contacted</div>
                            <div className="font-semibold text-yellow-600">
                                {filteredCompanies.filter(c => c.status && c.status !== 'not-contacted').length}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full">
                        <div className="flex items-center gap-3 mb-4">
                            <Trash2 className="w-6 h-6 text-red-600" />
                            <h3 className="text-lg font-semibold text-gray-900">Delete Company</h3>
                        </div>

                        <p className="text-gray-600 mb-6">
                            Are you sure you want to delete this company? This action cannot be undone and will remove all associated data including emails and notes.
                        </p>

                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setShowDeleteConfirm(null)}
                                className="btn btn-secondary"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="btn bg-red-600 hover:bg-red-700 text-white"
                            >
                                Delete Company
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CompaniesTable;