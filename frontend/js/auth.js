(function () {
  const SESSION_KEY = "reforge_session";

  function saveSession(user, token) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ user, token }));
  }

  function getSession() {
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch (_error) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
  }

  function getToken() {
    const session = getSession();
    return session && session.token ? session.token : null;
  }

  function getCurrentUser() {
    const session = getSession();
    return session && session.user ? session.user : null;
  }

  function isAuthenticated() {
    return Boolean(getToken());
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
  }

  function normalizeTokenResponse(data) {
    const token = data.access_token || data.token;
    if (token && data.user) saveSession(data.user, token);
    return data;
  }

  async function register(payload) {
    return window.ReForgeAPI.apiRequest("/auth/register", { method: "POST", body: JSON.stringify(payload) });
  }

  async function login(payload) {
    return normalizeTokenResponse(await window.ReForgeAPI.apiRequest("/auth/login", { method: "POST", body: JSON.stringify(payload) }));
  }

  async function verifyOtp(payload) {
    return normalizeTokenResponse(await window.ReForgeAPI.apiRequest("/auth/verify-otp", { method: "POST", body: JSON.stringify(payload) }));
  }

  async function resendOtp(payload) {
    return window.ReForgeAPI.apiRequest("/auth/resend-otp", { method: "POST", body: JSON.stringify(payload) });
  }

  async function forgotPassword(payload) {
    return window.ReForgeAPI.apiRequest("/auth/forgot-password", { method: "POST", body: JSON.stringify(payload) });
  }

  async function resetPassword(payload) {
    return window.ReForgeAPI.apiRequest("/auth/reset-password", { method: "POST", body: JSON.stringify(payload) });
  }

  window.ReForgeAuth = {
    saveSession,
    getSession,
    getToken,
    getCurrentUser,
    isAuthenticated,
    logout,
    register,
    login,
    verifyOtp,
    resendOtp,
    forgotPassword,
    resetPassword,
  };
})();
