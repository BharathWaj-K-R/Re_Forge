import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, Clock, Code2, ChevronRight, LogOut, ArrowLeft, FileText } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "");

type HistoryItem = {
  id: number;
  language: string;
  overall_score: number;
  summary: string;
  created_at: string;
};

export default function HistoryPage() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReview, setSelectedReview] = useState<any>(null);

  useEffect(() => {
    if (!token) {
      navigate("/auth");
      return;
    }
    fetchHistory();
  }, [token]);

  async function fetchHistory() {
    if (!API_URL || !token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Failed to load (${res.status})`);
      const data = await res.json();
      setReviews(data.reviews || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchReviewDetail(id: number) {
    if (!API_URL || !token) return;
    try {
      const res = await fetch(`${API_URL}/history/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Failed to load detail`);
      const data = await res.json();
      setSelectedReview(data.review);
    } catch (e: any) {
      setError(e.message);
    }
  }

  function handleLogout() {
    logout();
    navigate("/");
  }

  function scoreColor(score: number) {
    if (score >= 80) return "var(--success)";
    if (score >= 60) return "var(--warning)";
    return "var(--danger)";
  }

  return (
    <div className="min-h-screen">
      {/* NAV */}
      <nav className="fixed top-0 inset-x-0 z-50 glass">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg"
              style={{ background: "var(--gradient-brand)", boxShadow: "var(--shadow-glow)" }}
            />
            <span className="font-display font-semibold text-lg">ReForge</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {user?.email}
            </span>
            <button
              onClick={handleLogout}
              className="text-sm text-muted-foreground hover:text-foreground transition inline-flex items-center gap-1.5"
            >
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        </div>
      </nav>

      {/* CONTENT */}
      <section className="pt-24 pb-16 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-display font-semibold mb-1">Review History</h1>
              <p className="text-muted-foreground text-sm">
                {reviews.length} review{reviews.length !== 1 ? "s" : ""} saved
              </p>
            </div>
            <Link to="/" className="btn-primary px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-2">
              <Code2 className="w-4 h-4" /> New Review
            </Link>
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
              <p className="text-sm">Loading your reviews…</p>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="rounded-xl border bg-card p-6 text-center">
              <p className="text-danger text-sm">{error}</p>
              <button onClick={fetchHistory} className="mt-3 text-sm text-primary hover:underline">
                Retry
              </button>
            </div>
          )}

          {/* Empty */}
          {!loading && !error && reviews.length === 0 && (
            <div className="rounded-2xl border bg-card p-12 text-center shadow-[var(--shadow-soft)]">
              <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center mx-auto mb-4">
                <FileText className="w-7 h-7 text-primary" />
              </div>
              <p className="font-medium text-lg mb-1">No reviews yet</p>
              <p className="text-sm text-muted-foreground mb-5">
                Run your first code review and it will appear here.
              </p>
              <Link to="/" className="btn-primary px-5 py-2.5 rounded-lg text-sm font-medium inline-flex items-center gap-2">
                <Code2 className="w-4 h-4" /> Run a review
              </Link>
            </div>
          )}

          {/* List */}
          {!loading && !error && reviews.length > 0 && (
            <div className="space-y-3">
              {reviews.map((r) => (
                <div
                  key={r.id}
                  className="rounded-xl border bg-card p-5 shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-elegant)] transition cursor-pointer"
                  onClick={() => fetchReviewDetail(r.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Score badge */}
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center font-mono text-lg font-semibold"
                        style={{
                          background: `color-mix(in oklab, ${scoreColor(r.overall_score)} 15%, transparent)`,
                          color: scoreColor(r.overall_score),
                        }}
                      >
                        {r.overall_score}
                      </div>
                      <div>
                        <div className="font-medium capitalize">{r.language}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {new Date(r.created_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-sm text-muted-foreground max-w-xs truncate hidden sm:block">
                        {r.summary}
                      </p>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Detail modal */}
          {selectedReview && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-6"
              style={{ background: "oklch(0 0 0 / 0.4)", backdropFilter: "blur(4px)" }}
              onClick={() => setSelectedReview(null)}
            >
              <div
                className="w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl border bg-card p-7 shadow-[var(--shadow-elegant)] animate-fade-up"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center font-mono text-xl font-semibold"
                      style={{
                        background: `color-mix(in oklab, ${scoreColor(selectedReview.overall_score)} 15%, transparent)`,
                        color: scoreColor(selectedReview.overall_score),
                      }}
                    >
                      {selectedReview.overall_score}
                    </div>
                    <div>
                      <div className="font-display text-xl font-semibold capitalize">{selectedReview.language}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(selectedReview.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setSelectedReview(null)} className="text-sm text-muted-foreground hover:text-foreground">
                    Close
                  </button>
                </div>

                <p className="text-sm mb-5">{selectedReview.summary}</p>

                {/* Code preview */}
                <div className="rounded-xl border bg-[oklch(0.985_0.005_265)] p-4 mb-5">
                  <pre className="text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                    {selectedReview.code}
                  </pre>
                </div>

                {/* Findings */}
                {selectedReview.reviews && (
                  <div className="space-y-3">
                    {Object.entries(selectedReview.reviews).map(([category, findings]) => {
                      const items = findings as any[];
                      if (!items || items.length === 0) return null;
                      const SEV: Record<string, number> = { Critical: 30, High: 20, Medium: 10, Low: 5 };
                      return (
                        <div key={category}>
                          <div className="text-xs uppercase tracking-widest text-primary font-medium mb-2 capitalize">
                            {category.replace("_", " ")}
                          </div>
                          <div className="space-y-2">
                            {items.map((f, i) => (
                              <div key={i} className="rounded-lg border bg-background p-3">
                                <div className="flex items-center gap-2 mb-1">
                                  <span
                                    className="text-xs font-mono px-1.5 py-0.5 rounded"
                                    style={{
                                      background: `color-mix(in oklab, ${scoreColor(100 - (SEV[f.severity] || 0))} 15%, transparent)`,
                                      color: scoreColor(100 - (SEV[f.severity] || 0)),
                                    }}
                                  >
                                    {f.severity}
                                  </span>
                                  <span className="font-medium text-sm">{f.title}</span>
                                </div>
                                <p className="text-xs text-muted-foreground">{f.description}</p>
                                {f.recommendation && (
                                  <p className="text-xs text-primary mt-1">→ {f.recommendation}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
