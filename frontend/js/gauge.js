(function () {
  let instanceCounter = 0;

  const CX = 110;
  const CY = 100;
  const R_TRACK = 82;
  const R_NEEDLE = 68;
  const R_TICK_OUT = 88;
  const R_TICK_IN = 82;

  function stateForScore(score) {
    if (score < 40) return { label: "Raw", color: "var(--ember)" };
    if (score < 70) return { label: "Annealing", color: "var(--brass)" };
    if (score < 90) return { label: "Tempered", color: "var(--steel)" };
    return { label: "Hardened", color: "var(--steel-deep)" };
  }

  function angleForScore(score) {
    const clamped = Math.max(0, Math.min(100, score));
    return 180 - (clamped / 100) * 180;
  }

  function polarPoint(r, angleDeg) {
    const rad = (angleDeg * Math.PI) / 180;
    return { x: CX + r * Math.cos(rad), y: CY - r * Math.sin(rad) };
  }

  function arcPath(r, fromAngle, toAngle, steps) {
    const stepCount = steps || 40;
    const delta = (toAngle - fromAngle) / stepCount;
    let d = "";
    for (let i = 0; i <= stepCount; i += 1) {
      const angle = fromAngle + delta * i;
      const p = polarPoint(r, angle);
      d += `${i === 0 ? "M" : "L"}${p.x.toFixed(2)} ${p.y.toFixed(2)} `;
    }
    return d.trim();
  }

  function tickMarks() {
    let marks = "";
    for (let i = 0; i <= 10; i += 1) {
      const angle = 180 - i * 18;
      const outer = polarPoint(R_TICK_OUT, angle);
      const inner = polarPoint(R_TICK_IN, angle);
      const major = i % 5 === 0;
      marks += `<line x1="${inner.x.toFixed(2)}" y1="${inner.y.toFixed(2)}" x2="${outer.x.toFixed(2)}" y2="${outer.y.toFixed(2)}" stroke="var(--line-strong)" stroke-width="${major ? 2 : 1}" />`;
    }
    return marks;
  }

  function buildSkeleton(id) {
    return `
      <svg viewBox="0 0 220 150" width="220" height="150" role="img" aria-label="Score gauge">
        <defs>
          <linearGradient id="gaugeGradient-${id}" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#b8460e" />
            <stop offset="50%" stop-color="#8c6b23" />
            <stop offset="100%" stop-color="#33526e" />
          </linearGradient>
        </defs>
        <path d="${arcPath(R_TRACK, 180, 0)}" fill="none" stroke="var(--line)" stroke-width="10" stroke-linecap="round" />
        ${tickMarks()}
        <path class="gauge-arc-fill" d="${arcPath(R_TRACK, 180, 180)}" fill="none" stroke="url(#gaugeGradient-${id})" stroke-width="10" stroke-linecap="round" />
        <line class="gauge-needle-line" x1="${CX}" y1="${CY}" x2="${CX - R_NEEDLE}" y2="${CY}" stroke="var(--ink)" stroke-width="3" stroke-linecap="round" />
        <circle cx="${CX}" cy="${CY}" r="6" fill="var(--ink)" />
        <text class="gauge-score" x="${CX}" y="132" text-anchor="middle">0</text>
        <text class="gauge-state-label" x="${CX}" y="148" text-anchor="middle" fill="var(--ink-soft)">—</text>
      </svg>
      <p class="gauge-caption">Deterministic score</p>
    `;
  }

  function renderGauge(container, targetScore, options) {
    if (!container) return;
    const opts = options || {};
    const id = instanceCounter++;
    const safeTarget = Math.max(0, Math.min(100, Math.round(targetScore || 0)));

    container.classList.add("temper-gauge");
    container.innerHTML = buildSkeleton(id);

    const arcFill = container.querySelector(".gauge-arc-fill");
    const needle = container.querySelector(".gauge-needle-line");
    const scoreText = container.querySelector(".gauge-score");
    const stateLabel = container.querySelector(".gauge-state-label");

    const duration = opts.instant ? 0 : 900;
    const start = performance.now();

    function frame(now) {
      const elapsed = now - start;
      const t = duration === 0 ? 1 : Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = Math.round(eased * safeTarget);

      const angle = angleForScore(current);
      arcFill.setAttribute("d", arcPath(R_TRACK, 180, angle));

      const tip = polarPoint(R_NEEDLE, angle);
      needle.setAttribute("x2", tip.x.toFixed(2));
      needle.setAttribute("y2", tip.y.toFixed(2));

      scoreText.textContent = String(current);
      const state = stateForScore(current);
      stateLabel.textContent = state.label.toUpperCase();
      stateLabel.setAttribute("fill", state.color);

      if (t < 1) requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  }

  window.ReForgeGauge = { renderGauge, stateForScore };
})();
