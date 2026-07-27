(function () {
  const CATEGORY_LABELS = {
    bug: "Bugs",
    security: "Security",
    performance: "Performance",
    best_practice: "Best Practices",
  };

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
  }

  async function submitReview({ language, code, authenticated }) {
    const headers = authenticated ? window.ReForgeAPI.authHeaders() : {};
    return window.ReForgeAPI.apiRequest("/review", {
      method: "POST",
      headers,
      body: JSON.stringify({ language, code }),
    });
  }

  function renderFindings(items) {
    if (!Array.isArray(items) || items.length === 0) {
      return '<p class="muted">No findings in this category.</p>';
    }

    return items.map((finding) => {
      const severity = escapeHtml(finding.severity || "Low");
      const level = severity.toLowerCase();
      return `
        <article class="finding">
          <span class="badge ${level}">${severity}</span>
          <h4>${escapeHtml(finding.title || "Untitled finding")}</h4>
          <p>${escapeHtml(finding.description || "No description provided.")}</p>
          <p><strong>Recommendation:</strong> ${escapeHtml(finding.recommendation || "No recommendation provided.")}</p>
        </article>
      `;
    }).join("");
  }

  function renderReviewResult(container, result) {
    if (!container) return;
    const reviews = result.reviews || {};
    const categories = ["bug", "security", "performance", "best_practice"];
    container.innerHTML = `
      <section class="panel result-summary">
        <div data-result-gauge></div>
        <div>
          <p class="eyebrow">${result.success ? "Review complete" : "Review returned"}</p>
          <h2>${escapeHtml(result.summary || "No summary returned.")}</h2>
          ${result.review_id ? `<p class="muted">Saved review #${escapeHtml(result.review_id)}</p>` : ""}
        </div>
      </section>
      <section class="category-grid">
        ${categories.map((category) => `
          <article class="category-card">
            <h3>${CATEGORY_LABELS[category]}</h3>
            ${renderFindings(reviews[category])}
          </article>
        `).join("")}
      </section>
    `;

    const gaugeMount = container.querySelector("[data-result-gauge]");
    if (gaugeMount && window.ReForgeGauge) {
      window.ReForgeGauge.renderGauge(gaugeMount, Number(result.overall_score) || 0);
    }
  }

  window.ReForgeReview = { submitReview, renderReviewResult, escapeHtml };
})();
