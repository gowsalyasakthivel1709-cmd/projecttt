// Thin fetch wrapper. Centralizes auth headers + error handling so pages
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
      return JSON.parse(localStorage.getItem(USER_KEY) || "null");
    } catch {
      return null;
    }
  }

  async function request(method, path, body, { auth = true } = {}) {
    const headers = { "Content-Type": "application/json" };
    if (auth) {
      const token = getToken();
      if (token) headers["Authorization"] = "Bearer " + token;
    }

    let res;
    try {
      res = await fetch(path, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (networkErr) {
      throw new ApiError("Network error — please check your connection and try again.", 0);
    }

    let data = null;
    try {
      data = await res.json();
    } catch {
      // non-JSON response
    }

    if (!res.ok) {
      if (res.status === 401) clearSession();
      throw new ApiError((data && data.error) || `Request failed (${res.status})`, res.status);
    }
    return data;
  }

  class ApiError extends Error {
    constructor(message, status) {
      super(message);
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
