import axios from 'axios';

// Create a configured Axios instance
export const apiClient = axios.create({
    baseURL: '/api/proxy',
    withCredentials: true, // Crucial for sending the HttpOnly cookie silently
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor hook to globally manage success & errors
apiClient.interceptors.response.use(
    (response) => {
        // Any status code that lie within the range of 2xx cause this function to trigger
        return response;
    },
    (error) => {
        // Any status codes that falls outside the range of 2xx cause this function to trigger

        // Handle 401 Unauthorized globally! (The session expired or token is invalid)
        if (error.response?.status === 401) {
            // Clean global user stat and trigger a redirect natively
            if (typeof window !== 'undefined') {
                localStorage.removeItem('kh_os_user');
                window.location.href = '/login';
            }
        }

        // Extract a clean error string if provided
        const message = error.response?.data?.message || error.response?.data?.error || error.message || "An unexpected API error occurred";

        // Return a Promise Rejection with normalized Error object
        return Promise.reject(new Error(message));
    }
);
