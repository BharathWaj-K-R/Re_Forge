import { useState } from 'react';
import './App.css';
import LanguageSelector from './components/LanguageSelector';
import CodeEditor from './components/CodeEditor';
import ReviewButton from './components/ReviewButton';
import ScoreCard from './components/ScoreCard';
import ReviewSection from './components/ReviewSection';
import { reviewCode } from './api';

function App() {
  const [language, setLanguage] = useState('Python');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [reviewResult, setReviewResult] = useState(null);
  const [error, setError] = useState(null);

  const handleReview = async () => {
    if (!code.trim()) {
      setError('Please paste some code to review.');
      return;
    }

    setLoading(true);
    setError(null);
    setReviewResult(null);

    try {
      const result = await reviewCode(language, code);
      setReviewResult(result);
    } catch (err) {
      console.error('Review error:', err);
      setError('Unable to review the code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">ReForge</h1>
        <p className="app-subtitle">AI-Powered Code Reviewer</p>
      </header>

      <main className="app-main">
        <section className="input-section">
          <div className="input-controls">
            <LanguageSelector language={language} onChange={setLanguage} />
            <ReviewButton loading={loading} onClick={handleReview} />
          </div>
          <CodeEditor code={code} onChange={setCode} />
        </section>

        {error && (
          <div className="error-banner">
            <p>{error}</p>
          </div>
        )}

        {loading && (
          <div className="loading-state">
            <div className="spinner" />
            <p>Reviewing code...</p>
          </div>
        )}

        {!loading && !reviewResult && !error && (
          <div className="empty-state">
            <p>Paste your source code and click "Review Code" to begin.</p>
          </div>
        )}

        {reviewResult && !loading && (
          <section className="results-section">
            <div className="results-header">
              <ScoreCard score={reviewResult.overall_score} />
              {reviewResult.summary && (
                <div className="summary-card">
                  <h3>Summary</h3>
                  <p>{reviewResult.summary}</p>
                </div>
              )}
            </div>

            <div className="results-grid">
              <ReviewSection
                title="Bug Review"
                items={reviewResult.reviews?.bug}
              />
              <ReviewSection
                title="Security Review"
                items={reviewResult.reviews?.security}
              />
              <ReviewSection
                title="Performance Review"
                items={reviewResult.reviews?.performance}
              />
              <ReviewSection
                title="Best Practices"
                items={reviewResult.reviews?.best_practice}
              />
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
