function ReviewButton({ loading, onClick }) {
  return (
    <button
      className="review-button"
      onClick={onClick}
      disabled={loading}
    >
      {loading ? 'Reviewing...' : 'Review Code'}
    </button>
  );
}

export default ReviewButton;
