function ScoreCard({ score }) {
  const getScoreColor = (s) => {
    if (s >= 80) return 'var(--color-success)';
    if (s >= 50) return 'var(--color-warning)';
    return 'var(--color-danger)';
  };

  return (
    <div className="score-card">
      <div className="score-value">
        <span className="score-number" style={{ color: getScoreColor(score) }}>
          {score}
        </span>
        <span className="score-total"> / 100</span>
      </div>
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{
            width: `${score}%`,
            backgroundColor: getScoreColor(score),
          }}
        />
      </div>
      <p className="score-label">Overall Score</p>
    </div>
  );
}

export default ScoreCard;
