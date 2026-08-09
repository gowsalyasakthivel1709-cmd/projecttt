// Thin fetch wrapper.
// Centralizes auth headers + error handling so pages
// never need to touch fetch() directly.

const Api = (() => {
  const TOKEN_KEY = "ai_interview_token";
  const USER_KEY = "ai_interview_user";

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function setSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  function getUser() {
    try {
      const user = localStorage.getItem(USER_KEY);
      return user ? JSON.parse(user) : null;
    } catch (error) {
      console.error("Failed to parse stored user:", error);
      return null;
    }
  }

  async function request(method, path, body = null, options = {}) {
    const { auth = true } = options;

    const headers = {
      "Content-Type": "application/json",
    };

    // Add authentication token
    if (auth) {
      const token = getToken();

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }

    const fetchOptions = {
      method,
      headers,
    };

    // Only add body when required
    if (body !== null && body !== undefined) {
      fetchOptions.body = JSON.stringify(body);
    }

    let response;

    try {
      response = await fetch(path, fetchOptions);
    } catch (error) {
      console.error("Network error:", error);

      throw new ApiError(
        "Network error — please check your connection and try again.",
        0
      );
    }

    // Try to read JSON response
    let data = null;

    try {
      data = await response.json();
    } catch (error) {
      // Response may not contain JSON
      data = null;
    }

    // Handle HTTP errors
    if (!response.ok) {
      if (response.status === 401) {
        clearSession();
      }

      throw new ApiError(
        data?.error ||
          data?.message ||
          `Request failed (${response.status})`,
        response.status
      );
    }

    return data;
  }

  class ApiError extends Error {
    constructor(message, status = 0) {
      super(message);
      this.name = "ApiError";
      this.status = status;
    }
  }

  return {
    get: (path, opts) => request("GET", path, null, opts),

    post: (path, body, opts) => request("POST", path, body, opts),

    getToken,

    setSession,

    clearSession,

    getUser,

    ApiError,
  };
})();
