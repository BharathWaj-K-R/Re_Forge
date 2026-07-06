import { useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Sparkles, Loader2, Play, LogOut, History, Trash2, AlertTriangle, Code2, Shield, Zap, Lightbulb, ChevronDown, User } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

const LANGS = [
  "javascript", "typescript", "python", "go", "rust", "java", "cpp", "c", "csharp",
  "php", "ruby", "swift", "kotlin", "scala", "r", "perl", "lua", "dart",
  "html", "css", "sql", "shell", "yaml", "json", "xml", "markdown"
];

const SAMPLE = `function getUser(id) {
  const query = "SELECT * FROM users WHERE id = " + id;
  db.execute(query);
  return fetch('/api/user/' + id).then(r => r.json())
}`;

type Category = { score: number; issues: string[] };
type ReviewResult = {
  overallScore: number;
  summary: string;
  bugs: Category;
  security: Category;
  performance: Category;
  bestPractices: Category;
};

type BackendFinding = {
  severity: "Critical" | "High" | "Medium" | "Low";
  title: string;
  description: string;
  recommendation?: string;
};

type BackendReviewResponse = {
  success: boolean;
  language: string;
  overall_score: number;
  summary: string;
  reviews: {
    bug: BackendFinding[];
    security: BackendFinding[];
    performance: BackendFinding[];
    best_practice: BackendFinding[];
  };
};

const SEVERITY_POINTS: Record<string, number> = {
  Critical: 30, High: 20, Medium: 10, Low: 5,
};

function categoryFromFindings(findings: BackendFinding[]): Category {
  let score = 100;
  const issues: string[] = [];
  for (const finding of findings) {
    score -= SEVERITY_POINTS[finding.severity] ?? 0;
    const line = [finding.title, finding.description, finding.recommendation].filter(Boolean).join(" — ");
    issues.push(line);
  }
  return { score: Math.max(0, score), issues: issues.length ? issues : ["No issues detected"] };
}

function transformBackendResponse(data: BackendReviewResponse): ReviewResult {
  return {
    overallScore: data.overall_score,
    summary: data.summary,
    bugs: categoryFromFindings(data.reviews.bug),
    security: categoryFromFindings(data.reviews.security),
    performance: categoryFromFindings(data.reviews.performance),
    bestPractices: categoryFromFindings(data.reviews.best_practice),
  };
}

const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "");

export default function DashboardPage() {
  const { user, token, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState(SAMPLE);
  const [lang, setLang] = useState("javascript");
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Redirect if not authenticated
  if (!isAuthenticated) {
    navigate("/auth");
    return null;
  }

  const scoreColor = useMemo(() => {
    if (!result) return "var(--accent-success)";
    if (result.overallScore >= 80) return "var(--accent-success)";
    if (result.overallScore >= 60) return "var(--accent-warning)";
    return "var(--accent-danger)";
  }, [result]);

  async function runReview() {
    if (!code.trim()) return;
    setLoading(true); setError(null); setResult(null);
    try {
      if (!API_URL) throw new Error("API URL not configured");
      const res = await fetch(`${API_URL}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code, language: lang }),
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = (await res.json()) as BackendReviewResponse;
      if (!data.success) throw new Error(data.summary || "Backend review failed");
      setResult(transformBackendResponse(data));
    } catch (e: any) {
      setError(e.message || "Review failed");
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* NAV */}
      <nav className="fixed top-0 inset-x-0 z-50 glass">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/reforgelogo.png" alt="ReForge" className="w-8 h-8 rounded-lg object-contain" />
            <span className="font-display font-semibold text-lg">ReForge</span>
          </Link>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/history")} className="px-4 py-2 rounded-lg text-sm font-medium border bg-card hover:bg-muted transition inline-flex items-center gap-1.5">
              <History className="w-4 h-4" /> History
            </button>
            <div className="relative">
              <button onClick={() => setShowUserMenu(!showUserMenu)} className="px-4 py-2 rounded-lg text-sm font-medium border bg-card hover:bg-muted transition inline-flex items-center gap-2">
                <User className="w-4 h-4" /> {user?.name || "Account"}
                <ChevronDown className="w-3 h-3" />
              </button>
              {showUserMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border bg-card shadow-[var(--shadow-elegant)] overflow-hidden">
                  <div className="px-4 py-3 border-b">
                    <div className="text-sm font-medium">{user?.name}</div>
                    <div className="text-xs text-muted-foreground">{user?.email}</div>
                  </div>
                  <button onClick={handleLogout} className="w-full px-4 py-3 text-sm text-left hover:bg-muted transition inline-flex items-center gap-2 text-danger">
                    <LogOut className="w-4 h-4" /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* MAIN */}
      <main className="flex-1 pt-24 pb-16 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs font-medium text-muted-foreground mb-3">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              AI Code Review
            </div>
            <h1 className="text-4xl font-display font-semibold mb-2">
              Welcome back, <span className="text-gradient">{user?.name?.split(" ")[0] || "Developer"}</span>
            </h1>
            <p className="text-muted-foreground">Paste your code below and get instant senior-level feedback.</p>
          </div>

          {/* Review Section */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* LEFT: Input */}
            <div className="space-y-4">
              <div className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-elegant)]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium">Source code</span>
                  <select value={lang} onChange={(e) => setLang(e.target.value)} className="text-xs px-3 py-1.5 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-ring">
                    {LANGS.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  rows={16}
                  spellCheck={false}
                  placeholder="Paste your code here..."
                  className="w-full px-4 py-3 rounded-lg border bg-background text-sm font-mono leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-ring transition"
                />
                <button
                  onClick={runReview}
                  disabled={loading || !code.trim()}
                  className="btn-primary w-full mt-4 py-3 rounded-lg text-sm font-medium inline-flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing…</> : <><Play className="w-4 h-4" /> Run review</>}
                </button>
                {error && <div className="mt-3 text-sm text-danger bg-[oklch(0.95_0.05_25)] px-4 py-2.5 rounded-lg border border-[oklch(0.88_0.08_25)]">{error}</div>}
              </div>
            </div>

            {/* RIGHT: Results */}
            <div className="space-y-4">
              {!result && !loading && (
                <div className="rounded-2xl border bg-card p-8 shadow-[var(--shadow-elegant)] flex flex-col items-center justify-center min-h-[400px] text-center">
                  <div className="w-16 h-16 rounded-2xl mb-4 flex items-center justify-center" style={{ background: "var(--gradient-brand)", boxShadow: "var(--shadow-glow)" }}>
                    <Code2 className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="font-display font-semibold text-lg mb-2">Ready to review</h3>
                  <p className="text-sm text-muted-foreground max-w-xs">Paste your code on the left and click "Run review" to get instant AI-powered feedback.</p>
                </div>
              )}

              {loading && (
                <div className="rounded-2xl border bg-card p-8 shadow-[var(--shadow-elegant)] flex flex-col items-center justify-center min-h-[400px]">
                  <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                  <p className="text-sm text-muted-foreground">Analyzing your code…</p>
                </div>
              )}

              {result && (
                <>
                  {/* Score */}
                  <div className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-elegant)]">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium">Overall score</span>
                      <span className="text-2xl font-display font-bold" style={{ color: scoreColor }}>{Math.round(result.overallScore)}<span className="text-sm text-muted-foreground font-normal">/100</span></span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${result.overallScore}%`, background: scoreColor }} />
                    </div>
                    <p className="text-sm text-muted-foreground mt-3">{result.summary}</p>
                  </div>

                  {/* Categories */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Bugs", cat: result.bugs, icon: AlertTriangle, color: "var(--accent-danger)" },
                      { label: "Security", cat: result.security, icon: Shield, color: "var(--accent-warning)" },
                      { label: "Performance", cat: result.performance, icon: Zap, color: "var(--accent-info)" },
                      { label: "Best Practices", cat: result.bestPractices, icon: Lightbulb, color: "var(--accent-success)" },
                    ].map((c) => (
                      <div key={c.label} className="rounded-xl border bg-card p-4 shadow-[var(--shadow-card)]">
                        <div className="flex items-center justify-between mb-2">
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                            <c.icon className="w-3.5 h-3.5" /> {c.label}
                          </span>
                          <span className="text-sm font-bold" style={{ color: c.color }}>{Math.round(c.cat.score)}</span>
                        </div>
                        <div className="space-y-1">
                          {c.cat.issues.slice(0, 3).map((issue, i) => (
                            <p key={i} className="text-xs text-muted-foreground line-clamp-2">{issue}</p>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
