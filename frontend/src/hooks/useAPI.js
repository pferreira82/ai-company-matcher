import { useState } from 'react';

export const useAPI = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const execute = async (apiCall, options = {}) => {
        try {
            setLoading(true);
            setError(null);

            const result = await apiCall();

            if (options.onSuccess) {
                options.onSuccess(result);
            }

            return { success: true, data: result };
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message || 'An error occurred';
            setError(errorMessage);

            if (options.onError) {
                options.onError(err);
            }

            return { success: false, error: errorMessage };
        } finally {
            setLoading(false);
        }
    };

    const clearError = () => setError(null);

    return {
        loading,
        error,
        execute,
        clearError
    };
};