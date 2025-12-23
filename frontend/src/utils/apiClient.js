const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// Server health status cache
let serverHealth = null;
let lastHealthCheck = 0;
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds

/**
 * Check server health and capabilities
 * @returns {Promise<Object>} Server health status
 */
export const checkServerHealth = async () => {
  const now = Date.now();
  
  // Return cached result if recent
  if (serverHealth && (now - lastHealthCheck) < HEALTH_CHECK_INTERVAL) {
    return serverHealth;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    const health = await response.json();
    serverHealth = health;
    lastHealthCheck = now;
    return health;
  } catch (error) {
    console.warn('Health check failed:', error);
    // Return degraded status
    return {
      status: 'ERROR',
      offline: true,
      mode: 'unknown',
      features: {
        offlineMode: false,
        communityFeatures: false
      }
    };
  }
};

/**
 * Check if server is in offline mode
 * @returns {Promise<boolean>}
 */
export const isOffline = async () => {
  const health = await checkServerHealth();
  return health.offline === true;
};

/**
 * Check if community features are available
 * @returns {Promise<boolean>}
 */
export const isCommunityAvailable = async () => {
  const health = await checkServerHealth();
  return health.features?.communityFeatures === true;
};

/**
 * Creates an API client with consistent error handling and authentication
 * @param {string} userId - The authenticated user's ID
 * @returns {Function} API request function
 */
export const createApiClient = (userId) => {
  /**
   * Makes an authenticated API request
   * @param {string} endpoint - API endpoint (e.g., '/api/characters')
   * @param {Object} options - Fetch options
   * @returns {Promise<any>} Response data
   */
  const apiRequest = async (endpoint, options = {}) => {
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'user-id': userId,
        'x-user-id': userId,
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle offline errors
        if (response.status === 503 && errorData.offline) {
          const error = new Error(errorData.message || 'Feature unavailable offline');
          error.offline = true;
          error.code = 'OFFLINE';
          error.statusCode = 503;
          throw error;
        }
        
        // Handle other errors
        const error = new Error(errorData.error || `HTTP error! status: ${response.status}`);
        error.statusCode = response.status;
        error.details = errorData.details;
        throw error;
      }

      return await response.json();
    } catch (error) {
      // Network errors (no connection to server)
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        const networkError = new Error('Unable to connect to server');
        networkError.offline = true;
        networkError.code = 'NETWORK_ERROR';
        console.error(`Network error: ${endpoint}`, error);
        throw networkError;
      }
      
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  };

  return apiRequest;
};

/**
 * Helper method for multipart/form-data requests (e.g., file uploads)
 * @param {string} userId - The authenticated user's ID
 * @returns {Function} Upload request function
 */
export const createUploadClient = (userId) => {
  const uploadRequest = async (endpoint, formData) => {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'user-id': userId,
          // Don't set Content-Type for FormData - browser sets it with boundary
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle offline errors
        if (response.status === 503 && errorData.offline) {
          const error = new Error(errorData.message || 'Upload unavailable offline');
          error.offline = true;
          error.code = 'OFFLINE';
          throw error;
        }
        
        throw new Error(errorData.error || `Upload failed! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      // Network errors
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        const networkError = new Error('Unable to connect to server');
        networkError.offline = true;
        networkError.code = 'NETWORK_ERROR';
        throw networkError;
      }
      
      console.error(`Upload request failed: ${endpoint}`, error);
      throw error;
    }
  };

  return uploadRequest;
};

/**
 * Utility to check if an error is an offline error
 * @param {Error} error
 * @returns {boolean}
 */
export const isOfflineError = (error) => {
  return error?.offline === true || error?.code === 'OFFLINE' || error?.code === 'NETWORK_ERROR';
};

/**
 * Get user-friendly error message
 * @param {Error} error
 * @returns {string}
 */
export const getErrorMessage = (error) => {
  if (isOfflineError(error)) {
    return error.message || 'This feature requires an internet connection';
  }
  return error?.message || 'An unexpected error occurred';
};

export default createApiClient;
