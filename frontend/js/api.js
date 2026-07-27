(function () {
  function getApiUrl() {
    const configured = window.REFORGE_CONFIG && window.REFORGE_CONFIG.API_URL;
    return String(configured || "").replace(/\/+$/, "");
  }

  function getToken() {
    const session = window.ReForgeAuth && window.ReForgeAuth.getSession();
    return session && session.token ? session.token : null;
  }

  function authHeaders() {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async function readResponse(response) {
    const text = await response.text();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch (_error) {
      return { message: text };
    }
  }

  async function apiRequest(path, options) {
    const baseUrl = getApiUrl();
    if (!baseUrl) throw new Error("Backend API URL is not configured.");

    const requestOptions = options || {};
    const response = await fetch(`${baseUrl}${path}`, {
      ...requestOptions,
      headers: {
        "Content-Type": "application/json",
        ...(requestOptions.headers || {}),
      },
    });
    const data = await readResponse(response);

    if (!response.ok) {
      const message = data.detail || data.message || `Request failed with status ${response.status}`;
      throw new Error(Array.isArray(message) ? message.map((item) => item.msg || item.message).join(", ") : message);
    }

    return data;
  }

  window.ReForgeAPI = { apiRequest, authHeaders, getApiUrl };
})();
