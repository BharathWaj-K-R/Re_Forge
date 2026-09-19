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

  function showView(name) {
    const target = ["home", "review"].includes(name) ? name : "home";
    views.forEach((view) => view.classList.toggle("active", view.id === target));
  }

  async function handleReviewSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const message = document.querySelector("[data-review-message]");
    const resultContainer = document.querySelector("[data-review-results]");
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
      const result = await window.ReForgeReview.submitReview({ language, code });
      window.ReForgeReview.renderReviewResult(resultContainer, result);
      setMessage(
        message,
        result.success ? "Review complete." : "Review finished with a backend warning.",
        result.success ? "success" : "error"
      );
    } catch (error) {
      setMessage(message, error.message, "error");
    } finally {
      setBusy(form, false);
    }
  }

  function setupEvents() {
    document.querySelectorAll("[data-review-form]").forEach((form) => {
      form.addEventListener("submit", handleReviewSubmit);
    });
    window.addEventListener("hashchange", () => showView(window.location.hash.slice(1)));
  }

  function renderHeroGauge() {
    const mount = $("[data-hero-gauge]");
    if (!mount || !window.ReForgeGauge) return;
    window.ReForgeGauge.renderGauge(mount, 92);
    const caption = document.createElement("p");
    caption.className = "hero-card-caption";
    caption.textContent = "Every finding is validated before it changes the score.";
    mount.appendChild(caption);
  }

  setupEvents();
  showView(window.location.hash.slice(1) || "home");
  renderHeroGauge();
})();
