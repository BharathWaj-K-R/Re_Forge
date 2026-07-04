function ReviewSection({ title, items }) {
  if (!items || items.length === 0) {
    return (
      <div className="review-section">
        <h3 className="review-title">{title}</h3>
        <p className="review-empty">No issues found</p>
      </div>
    );
  }

  const getSeverityClass = (severity) => {
    switch (severity) {
      case 'Critical': return 'severity-critical';
      case 'High': return 'severity-high';
      case 'Medium': return 'severity-medium';
      case 'Low': return 'severity-low';
      default: return 'severity-low';
    }
  };

  return (
    <div className="review-section">
      <h3 className="review-title">{title}</h3>
      <div className="review-cards">
        {items.map((item, index) => (
          <div key={index} className="review-card">
            <div className="review-card-header">
              <span className={`severity-badge ${getSeverityClass(item.severity)}`}>
                {item.severity}
              </span>
              <h4 className="review-card-title">{item.title}</h4>
            </div>
            <p className="review-card-description">{item.description}</p>
            {item.recommendation && (
              <div className="review-card-recommendation">
                <strong>Recommendation:</strong> {item.recommendation}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default ReviewSection;
