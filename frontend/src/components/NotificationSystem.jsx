import React, { useState, useEffect } from 'react';
import {
    Bell, X, CheckCircle, AlertTriangle, Info, Star,
    TrendingUp, MapPin, Mail, Trophy, Clock
} from 'lucide-react';

const NotificationSystem = ({ searchStatus, isRunning }) => {
    const [notifications, setNotifications] = useState([]);
    const [lastStats, setLastStats] = useState(null);
    const [soundEnabled, setSoundEnabled] = useState(
        localStorage.getItem('notificationsSound') !== 'false'
    );

    useEffect(() => {
        if (!isRunning || !searchStatus.liveStats) return;

        const currentStats = searchStatus.liveStats;

        if (lastStats) {
            checkForNotifications(lastStats, currentStats, searchStatus);
        }

        setLastStats(currentStats);
    }, [searchStatus, isRunning]);

    const checkForNotifications = (prevStats, currentStats, status) => {
        const newNotifications = [];

        // Milestone notifications
        if (currentStats.companiesProcessed > 0 && prevStats.companiesProcessed === 0) {
            newNotifications.push({
                id: Date.now() + 1,
                type: 'milestone',
                title: 'Search Started!',
                message: 'AI has begun processing companies',
                icon: Star,
                priority: 'medium'
            });
        }

        // Companies milestones
        const companyMilestones = [10, 25, 50, 100];
        companyMilestones.forEach(milestone => {
            if (currentStats.companiesProcessed >= milestone && prevStats.companiesProcessed < milestone) {
                newNotifications.push({
                    id: Date.now() + milestone,
                    type: 'milestone',
                    title: `${milestone} Companies Processed!`,
                    message: `Great progress! Found ${currentStats.totalHRContacts} HR contacts so far`,
                    icon: Trophy,
                    priority: 'high'
                });
            }
        });

        // High-quality match found
        if (currentStats.highMatches > prevStats.highMatches) {
            const newHighMatches = currentStats.highMatches - prevStats.highMatches;
            newNotifications.push({
                id: Date.now() + 2,
                type: 'success',
                title: `${newHighMatches} High-Quality Match${newHighMatches > 1 ? 'es' : ''} Found!`,
                message: `80%+ compatibility - these look promising!`,
                icon: TrendingUp,
                priority: 'high',
                autoClose: 8000
            });
        }

        // Excellent work-life balance companies
        if (currentStats.excellentWLB > prevStats.excellentWLB) {
            const newExcellentWLB = currentStats.excellentWLB - prevStats.excellentWLB;
            newNotifications.push({
                id: Date.now() + 3,
                type: 'success',
                title: `Excellent Work-Life Balance Found!`,
                message: `${newExcellentWLB} compan${newExcellentWLB > 1 ? 'ies' : 'y'} with 8+ WLB scores`,
                icon: Star,
                priority: 'medium',
                autoClose: 6000
            });
        }

        // HR contacts milestone
        const contactMilestones = [50, 100, 200, 500];
        contactMilestones.forEach(milestone => {
            if (currentStats.totalHRContacts >= milestone && prevStats.totalHRContacts < milestone) {
                newNotifications.push({
                    id: Date.now() + milestone + 1000,
                    type: 'info',
                    title: `${milestone} HR Contacts Found!`,
                    message: `${currentStats.verifiedContacts} verified contacts ready for outreach`,
                    icon: Mail,
                    priority: 'medium'
                });
            }
        });

        // Geographic expansion notification
        if (status.expandedNationwide && currentStats.nationwideCompanies > 0 && prevStats.nationwideCompanies === 0) {
            newNotifications.push({
                id: Date.now() + 4,
                type: 'info',
                title: 'Expanded to Nationwide Search',
                message: 'Finding more matches beyond Boston/Providence area',
                icon: MapPin,
                priority: 'medium',
                autoClose: 5000
            });
        }

        // Processing speed alerts
        if (currentStats.companiesPerMinute < 10 && currentStats.companiesProcessed > 10) {
            const prevRate = prevStats.companiesPerMinute || 0;
            if (currentStats.companiesPerMinute < prevRate * 0.7) { // 30% slowdown
                newNotifications.push({
                    id: Date.now() + 5,
                    type: 'warning',
                    title: 'Processing Slower Than Expected',
                    message: `API rate limits may be affecting speed (${currentStats.companiesPerMinute}/min)`,
                    icon: Clock,
                    priority: 'low',
                    autoClose: 10000
                });
            }
        }

        // Error alerts
        if (currentStats.processingErrors > prevStats.processingErrors) {
            const newErrors = currentStats.processingErrors - prevStats.processingErrors;
            if (newErrors >= 3) {
                newNotifications.push({
                    id: Date.now() + 6,
                    type: 'error',
                    title: `${newErrors} Processing Errors`,
                    message: 'Some companies failed to process - search will continue',
                    icon: AlertTriangle,
                    priority: 'medium'
                });
            }
        }

        // Add new notifications
        if (newNotifications.length > 0) {
            setNotifications(prev => {
                const updated = [...newNotifications, ...prev];
                // Keep only last 20 notifications
                return updated.slice(0, 20);
            });

            // Play notification sound
            if (soundEnabled && newNotifications.some(n => n.priority === 'high')) {
                playNotificationSound();
            }
        }
    };

    // Completion notification
    useEffect(() => {
        if (searchStatus.completed && lastStats) {
            const completionNotification = {
                id: Date.now() + 9999,
                type: 'success',
                title: '🎉 Search Completed!',
                message: `Found ${lastStats.companiesSaved} companies with ${lastStats.totalHRContacts} HR contacts`,
                icon: CheckCircle,
                priority: 'high',
                persistent: true
            };

            setNotifications(prev => [completionNotification, ...prev]);

            if (soundEnabled) {
                playCompletionSound();
            }

            // Browser notification if page is not visible
            if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
                new Notification('AI Company Search Completed!', {
                    body: completionNotification.message,
                    icon: '/favicon.ico'
                });
            }
        }
    }, [searchStatus.completed, lastStats, soundEnabled]);

    const playNotificationSound = () => {
        try {
            const audio = new Audio('data:audio/wav;base64,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');
            audio.volume = 0.3;
            audio.play().catch(() => {}); // Ignore errors if audio fails
        } catch (e) {
            // Ignore audio errors
        }
    };

    const playCompletionSound = () => {
        try {
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+b26WQdBDaH0fPTgC0GIWq+8+WTYQ0PUqXh8bllHgU2jdXzzn0vBSF1xe/akEILElyx5+uuWRUKQ5jj9+djHQU2jdT0z3wuBSBquu7glEoODkyh4/K9aB4GM4nU8tGALQYfcsLu2YtBCxFYrOPwtmQcBjiS1/HNeSsFJHfH8N2QQAoUXrTp66hVFApGn+b26WQdBDaH0fPTgC0GIWq+8+WTYQ0PUqXh8bllHgU2jdXzzn0vBSF1xe/akEILElyx5+uuWRUKQ5jj9+djHQU2jdT0z3wuBSBquu7glEoODkyh4/K9aB4GM4nU8tGALQYfcsLu2YtBCxFYrOPwtmQcBjiS1/HNeSsFJHfH8N2QQAoUXrTp66hVFApGn+b26WQdBDaH0fPTgC0GIWq+8+WTYQ0PUqXh8bllHgU2jdXzzn0vBSF1xe/akEILElyx5+uuWRUKQ5jj9+djHQU2jdT0z3wuBSBquu7glEoODkyh4/K9aB4GM4nU8tGALQYfcsLu2YtBCxFYrOPwtmQcBjiS1/HNeSsFJHfH8N2QQAoUXrTp66hVFApGn+b26WQdBDaH0fPTgC0GIWq+8+WTYQ0PUqXh8bllHgU2jdXzzn0vBSF1xe/akEILElyx5+uuWRUKQ5jj9+djHQU2jdT0z3wuBSBquu7glEoODkyh4/K9aB4GM4nU8tGALQYfcsLu2YtBCxFYrOPwtmQcBjiS1/HNeSsFJHfH8N2QQAoUXrTp66hVFApGn+b26WQdBDaH0fPTgC0GIWq+8+WTYQ0PUqXh8bllHgU2jdXzzn0vBSF1xe/akEILElyx5+uuWRUKQ5jj9+djHQU2jdT0z3wuBSBquu7glEoODkyh4/K9aB4GM4nU8tGALQYfcsLu2YtBCxFYrOPwtmQcBjiS1/HNeSsFJHfH8N2QQAoUXrTp66hVFApGn+b26WQdBDaH0fPTgC0GIWq+8+WTYQ0PUqXh8bllHgU2jdXzzn0vBSF1xe/akEILElyx5+uuWRUKQ5jj9+djHQU2jdT0z3wuBSBquu7glEoODkyh4/K9aB4GM4nU8tGALQYfcsLu2YtBCxFYrOPwtmQcBjiS1/HNeSsFJHfH8N2QQAoUXrTp66hVFApGn+b26WQdBDaH0fPTgC0GIWq+8+WTYQ0PUqXh8bllHgU2jdXzzn0vBSF1xe/akEILElyx5+uuWRUKQ5jj9+djHQU2jdT0z3wuBSBquu7glEoODkyh4/K9aB4GM4nU8tGALQYfcsLu2YtBCxFYrOPwtmQcBjiS1/HNeSsFJHfH8N2QQAoUXrTp66hVFApGn+b26WQdBDaH0fPTgC0GIWq+8+WTYQ0PUqXh8bllHgU2jdXzzn0vBSF1xe/akEILElyx5+uuWRUKQ5jj9+djHQU2jdT0z3wuBSBquu7glEoODkyh4/K9aB4=');
            audio.volume = 0.5;
            audio.play().catch(() => {});
        } catch (e) {
            // Ignore audio errors
        }
    };

    const dismissNotification = (id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const dismissAll = () => {
        setNotifications([]);
    };

    const toggleSound = () => {
        const newState = !soundEnabled;
        setSoundEnabled(newState);
        localStorage.setItem('notificationsSound', newState.toString());
    };

    const requestNotificationPermission = async () => {
        if ('Notification' in window && Notification.permission === 'default') {
            await Notification.requestPermission();
        }
    };

    useEffect(() => {
        requestNotificationPermission();
    }, []);

    // Auto-dismiss notifications
    useEffect(() => {
        const timers = notifications
            .filter(n => n.autoClose && !n.persistent)
            .map(n =>
                setTimeout(() => dismissNotification(n.id), n.autoClose)
            );

        return () => timers.forEach(timer => clearTimeout(timer));
    }, [notifications]);

    const getNotificationColor = (type) => {
        switch (type) {
            case 'success': return 'border-green-500 bg-green-50';
            case 'warning': return 'border-yellow-500 bg-yellow-50';
            case 'error': return 'border-red-500 bg-red-50';
            case 'milestone': return 'border-purple-500 bg-purple-50';
            default: return 'border-blue-500 bg-blue-50';
        }
    };

    const getNotificationTextColor = (type) => {
        switch (type) {
            case 'success': return 'text-green-800';
            case 'warning': return 'text-yellow-800';
            case 'error': return 'text-red-800';
            case 'milestone': return 'text-purple-800';
            default: return 'text-blue-800';
        }
    };

    if (notifications.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
            {/* Notification Controls */}
            <div className="flex items-center justify-between bg-white rounded-lg shadow-lg border p-2">
                <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">
            {notifications.length} notifications
          </span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={toggleSound}
                        className={`p-1 rounded text-xs ${
                            soundEnabled ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                        }`}
                        title={`Sound ${soundEnabled ? 'enabled' : 'disabled'}`}
                    >
                        🔊
                    </button>
                    <button
                        onClick={dismissAll}
                        className="p-1 rounded text-xs bg-gray-100 text-gray-600 hover:bg-gray-200"
                        title="Dismiss all"
                    >
                        Clear
                    </button>
                </div>
            </div>

            {/* Notifications List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
                {notifications.map((notification) => {
                    const Icon = notification.icon;
                    return (
                        <div
                            key={notification.id}
                            className={`bg-white rounded-lg shadow-lg border-l-4 p-4 ${getNotificationColor(notification.type)} animate-slide-in`}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-3">
                                    <Icon className={`w-5 h-5 mt-0.5 ${getNotificationTextColor(notification.type)}`} />
                                    <div className="flex-1">
                                        <h4 className={`font-medium text-sm ${getNotificationTextColor(notification.type)}`}>
                                            {notification.title}
                                        </h4>
                                        <p className="text-xs text-gray-600 mt-1">
                                            {notification.message}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => dismissNotification(notification.id)}
                                    className="text-gray-400 hover:text-gray-600 ml-2"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Priority indicator */}
                            {notification.priority === 'high' && (
                                <div className="mt-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    High Priority
                  </span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <style jsx>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
        </div>
    );
};

export default NotificationSystem;