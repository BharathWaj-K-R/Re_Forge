(function () {
  const views = Array.from(document.querySelectorAll(".view"));

  function $(selector) {
    return document.querySelector(selector);
  }

  function setMessage(element, text, type) {
    if (!element) return;
    element.textContent = text || "";
    element.className = `message ${type || ""}`.trim();
  }

  function setBusy(form, busy) {
    if (!form) return;
    form.querySelectorAll("button, input, select, textarea").forEach((field) => {
      field.disabled = busy;
    });
  }

  function updateNav() {
    const authed = window.ReForgeAuth.isAuthenticated();
    document.querySelectorAll("[data-auth-link]").forEach((item) => item.classList.toggle("hidden", !authed));
    document.querySelectorAll("[data-guest-link]").forEach((item) => item.classList.toggle("hidden", authed));
    document.querySelectorAll("[data-logout]").forEach((item) => item.classList.toggle("hidden", !authed));

    const user = window.ReForgeAuth.getCurrentUser();
    const greeting = $("[data-user-greeting]");
    if (greeting) greeting.textContent = user ? `Signed in as ${user.name || user.email}` : "Please sign in to save reviews.";
  }

  function showView(name) {
    const target = ["home", "auth", "dashboard", "history"].includes(name) ? name : "home";
    if (["dashboard", "history"].includes(target) && !window.ReForgeAuth.isAuthenticated()) {
      window.location.hash = "auth";
      setMessage($("[data-auth-message]"), "Please sign in to continue.", "error");
      return;
    }

    views.forEach((view) => view.classList.toggle("active", view.id === target));
    if (target === "history") refreshHistory();
    updateNav();
  }

  async function handleReviewSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const scope = form.dataset.reviewForm;
    const message = document.querySelector(`[data-review-message="${scope}"]`);
    const resultContainer = document.querySelector(`[data-review-results="${scope}"]`);
    const data = new FormData(form);
    const language = data.get("language");
    const code = String(data.get("code") || "").trim();

    if (!code) {
      setMessage(message, "Please paste code before running a review.", "error");
      return;
    }

    setBusy(form, true);
    setMessage(message, "Reviewing code...", "");
    try {
      const result = await window.ReForgeReview.submitReview({ language, code, authenticated: scope === "dashboard" });
      window.ReForgeReview.renderReviewResult(resultContainer, result);
      setMessage(message, result.success ? "Review complete." : "Review finished with a backend warning.", result.success ? "success" : "error");
    } catch (error) {
      setMessage(message, error.message, "error");
    } finally {
      setBusy(form, false);
    }
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const type = form.dataset.authForm;
    const data = Object.fromEntries(new FormData(form).entries());
    const message = $("[data-auth-message]");
    const actions = {
      register: window.ReForgeAuth.register,
      login: window.ReForgeAuth.login,
      verify: window.ReForgeAuth.verifyOtp,
      resend: window.ReForgeAuth.resendOtp,
      forgot: window.ReForgeAuth.forgotPassword,
      reset: window.ReForgeAuth.resetPassword,
    };

    setBusy(form, true);
    setMessage(message, "Working...", "");
    try {
      const response = await actions[type](data);
      setMessage(message, response.message || "Success.", "success");
      updateNav();
      if (["login", "verify"].includes(type)) window.location.hash = "dashboard";
    } catch (error) {
      setMessage(message, error.message, "error");
    } finally {
      setBusy(form, false);
    }
  }

  async function refreshHistory() {
    const message = $("[data-history-message]");
    const list = $("[data-history-list]");
    if (!window.ReForgeAuth.isAuthenticated()) return;

    setMessage(message, "Loading history...", "");
    try {
      const data = await window.ReForgeHistory.loadHistory();
      window.ReForgeHistory.renderHistoryList(list, data, showHistoryDetail);
      setMessage(message, `Loaded ${data.count || 0} review(s).`, "success");
    } catch (error) {
      setMessage(message, error.message, "error");
    }
  }

  async function showHistoryDetail(id) {
    const detail = $("[data-history-detail]");
    const message = $("[data-history-message]");
    setMessage(message, "Loading review detail...", "");
    try {
      const data = await window.ReForgeHistory.loadReviewDetail(id);
      if (data.review) {
        window.ReForgeReview.renderReviewResult(detail, data.review);
        setMessage(message, "Review detail loaded.", "success");
      } else {
        detail.textContent = data.message || "Review not found.";
        setMessage(message, data.message || "Review not found.", "error");
      }
    } catch (error) {
      setMessage(message, error.message, "error");
    }
  }

  function setupEvents() {
    document.querySelectorAll("[data-review-form]").forEach((form) => form.addEventListener("submit", handleReviewSubmit));
    document.querySelectorAll("[data-auth-form]").forEach((form) => form.addEventListener("submit", handleAuthSubmit));
    document.querySelectorAll("[data-logout]").forEach((button) => button.addEventListener("click", () => {
      window.ReForgeAuth.logout();
      updateNav();
      window.location.hash = "home";
    }));
    $("[data-load-history]").addEventListener("click", refreshHistory);
    $("[data-clear-history]").addEventListener("click", async () => {
      if (!confirm("Clear all saved reviews?")) return;
      const message = $("[data-history-message]");
      try {
        const response = await window.ReForgeHistory.clearHistory();
        setMessage(message, response.message || "History cleared.", "success");
        refreshHistory();
      } catch (error) {
        setMessage(message, error.message, "error");
      }
    });
    $("[data-delete-account]").addEventListener("click", async () => {
      if (!confirm("Delete your account and all saved reviews? This cannot be undone.")) return;
      const message = $("[data-history-message]");
      try {
        await window.ReForgeHistory.deleteAccount();
        window.ReForgeAuth.logout();
        updateNav();
        window.location.hash = "home";
      } catch (error) {
        setMessage(message, error.message, "error");
      }
    });
    window.addEventListener("hashchange", () => showView(window.location.hash.slice(1)));
  }

  setupEvents();
  updateNav();
  showView(window.location.hash.slice(1) || "home");
})();
