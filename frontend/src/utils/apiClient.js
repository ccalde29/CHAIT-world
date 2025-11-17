const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

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
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
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
        throw new Error(errorData.error || `Upload failed! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Upload request failed: ${endpoint}`, error);
      throw error;
    }
  };

  return uploadRequest;
};

export default createApiClient;
