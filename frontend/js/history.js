(function () {
  async function loadHistory() {
    return window.ReForgeAPI.apiRequest("/history", { headers: window.ReForgeAPI.authHeaders() });
  }

  async function loadReviewDetail(id) {
    return window.ReForgeAPI.apiRequest(`/history/${encodeURIComponent(id)}`, { headers: window.ReForgeAPI.authHeaders() });
  }

  async function clearHistory() {
    return window.ReForgeAPI.apiRequest("/history", { method: "DELETE", headers: window.ReForgeAPI.authHeaders() });
  }

  async function deleteAccount() {
    return window.ReForgeAPI.apiRequest("/account", { method: "DELETE", headers: window.ReForgeAPI.authHeaders() });
  }

  function renderHistoryList(container, data, onSelect) {
    if (!container) return;
    const reviews = data.reviews || [];
    if (!reviews.length) {
      container.innerHTML = '<p class="muted">No saved reviews yet.</p>';
      return;
    }

    container.innerHTML = reviews.map((review) => `
      <button class="history-card" type="button" data-review-id="${window.ReForgeReview.escapeHtml(review.id)}">
        <h3>${window.ReForgeReview.escapeHtml(review.language || "Unknown")}</h3>
        <p><strong>Score:</strong> ${window.ReForgeReview.escapeHtml(review.overall_score ?? "--")}</p>
        <p class="muted">${window.ReForgeReview.escapeHtml(review.summary || "No summary")}</p>
        <small>${window.ReForgeReview.escapeHtml(review.created_at || "")}</small>
      </button>
    `).join("");

    container.querySelectorAll("[data-review-id]").forEach((button) => {
      button.addEventListener("click", () => onSelect(button.dataset.reviewId));
    });
  }

  window.ReForgeHistory = { loadHistory, loadReviewDetail, clearHistory, deleteAccount, renderHistoryList };
})();
