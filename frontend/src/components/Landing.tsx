import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bug, Shield, Zap, Sparkles, Loader2, Play, Github, ChevronDown, Server, CheckCircle2, LogIn, History, Code2 } from "lucide-react";
import HeroOrb from "./HeroOrb";
import MiniCards from "./MiniCards";
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

type Category = { score: number; issues: string[]; summary?: string };
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
  Critical: 30,
  High: 20,
  Medium: 10,
  Low: 5,
};

function categoryFromFindings(findings: BackendFinding[]): Category {
  let score = 100;
  const issues: string[] = [];
  for (const finding of findings) {
    score -= SEVERITY_POINTS[finding.severity] ?? 0;
    const line = [finding.title, finding.description, finding.recommendation]
      .filter(Boolean)
      .join(" — ");
    issues.push(line);
  }
  return {
    score: Math.max(0, score),
    issues: issues.length ? issues : ["No issues detected"],
  };
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

const API_URL = import.meta.env.VITE_API_URL as string | undefined;

function mockReview(code: string, language: string): ReviewResult {
  const lower = code.toLowerCase();
  const hasSql = /select\s+\*|"\s*\+|'\s*\+.*sql|where\s+.*=\s*"?\s*\+/i.test(code);
  const hasVar = /\bvar\s+/.test(code);
  const hasAny = /:\s*any\b/.test(code);
  const noAwait = /\.then\(/.test(code) && !/async|await/.test(code);
  const lines = code.split("\n").length;

  const security: Category = {
    score: hasSql ? 42 : 88,
    issues: hasSql
      ? ["Possible SQL injection via string concatenation", "Unsanitized user input passed to query"]
      : ["No obvious injection vectors detected"],
  };
  const bugs: Category = {
    score: noAwait ? 68 : 90,
    issues: noAwait
      ? ["Unhandled promise rejection — add try/catch or .catch()", "Return type may be a pending Promise"]
      : ["No critical bug patterns found"],
  };
  const performance: Category = {
    score: lines > 40 ? 72 : 86,
    issues: lines > 40 ? ["Consider breaking long function into smaller units"] : ["Runs within expected complexity"],
  };
  const bestPractices: Category = {
    score: hasVar || hasAny ? 65 : 84,
    issues: [
      ...(hasVar ? [`Avoid \`var\` — prefer \`const\`/\`let\``] : []),
      ...(hasAny ? ["Avoid `any` — use precise types"] : []),
      "Add JSDoc / docstring for public API",
    ],
  };
  const overall = Math.round((security.score + bugs.score + performance.score + bestPractices.score) / 4);
  return {
    overallScore: overall,
    summary: `Reviewed ${lines} lines of ${language}. ${hasSql ? "Critical security issue detected." : "Overall solid, with a few improvements suggested."}`,
    bugs, security, performance, bestPractices,
  };
}

function ScoreRing({ score }: { score: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score));
  const offset = c - (pct / 100) * c;
  const color = pct >= 80 ? "var(--success)" : pct >= 60 ? "var(--warning)" : "var(--danger)";
  return (
    <div className="relative w-24 h-24 flex-shrink-0">
      <svg viewBox="0 0 120 120" className="absolute inset-0 w-full h-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--muted)" strokeWidth="10" />
        <circle
          cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="text-2xl font-display font-semibold text-gradient">{Math.round(pct)}</div>
        <div className="text-[8px] uppercase tracking-widest text-muted-foreground">Score</div>
      </div>
    </div>
  );
}

function CategoryCard({ icon: Icon, label, cat, tint }: { icon: any; label: string; cat: Category; tint: string }) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-elegant)] transition-all">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: tint }}>
            <Icon className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="text-sm font-medium">{label}</div>
        </div>
        <div className="font-mono text-xs px-2 py-0.5 rounded-md bg-muted">{Math.round(cat.score)}</div>
      </div>
      <ul className="space-y-1">
        {cat.issues.slice(0, 3).map((i, idx) => (
          <li key={idx} className="text-xs text-muted-foreground flex gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>{i}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated, token } = useAuth();
  const [code, setCode] = useState(SAMPLE);
  const [lang, setLang] = useState("javascript");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canReview = useMemo(() => code.trim().length > 5 && !loading, [code, loading]);

  async function runReview() {
    setLoading(true); setError(null);
    try {
      if (API_URL) {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const res = await fetch(`${API_URL.replace(/\/$/, "")}/review`, {
          method: "POST",
          headers,
          body: JSON.stringify({ code, language: lang }),
        });
        if (!res.ok) throw new Error(`API ${res.status}`);
        const data = (await res.json()) as BackendReviewResponse;
        if (!data.success) {
          throw new Error(data.summary || "Backend review failed");
        }
        setResult(transformBackendResponse(data));
      } else {
        await new Promise(r => setTimeout(r, 900));
        setResult(mockReview(code, lang));
      }
    } catch (e: any) {
      setError(e.message || "Review failed");
      setResult(mockReview(code, lang));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      {/* NAV */}
      <nav className="fixed top-0 inset-x-0 z-50 glass">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="#top" className="flex items-center gap-2">
            <img src="/reforgelogo.png" alt="ReForge" className="w-8 h-8 rounded-lg object-contain" />
            <span className="font-display font-semibold text-lg">ReForge</span>
          </a>
          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#demo" className="hover:text-foreground transition">Demo</a>
            <a href="#features" className="hover:text-foreground transition">Features</a>
            <a href="#how" className="hover:text-foreground transition">How it works</a>
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <button onClick={() => navigate("/dashboard")} className="px-4 py-2 rounded-lg text-sm font-medium border bg-card hover:bg-muted transition inline-flex items-center gap-1.5">
                  <Code2 className="w-4 h-4" /> Dashboard
                </button>
                <button onClick={() => navigate("/history")} className="px-4 py-2 rounded-lg text-sm font-medium border bg-card hover:bg-muted transition inline-flex items-center gap-1.5">
                  <History className="w-4 h-4" /> History
                </button>
              </>
            ) : (
              <button onClick={() => navigate("/auth")} className="px-4 py-2 rounded-lg text-sm font-medium border bg-card hover:bg-muted transition inline-flex items-center gap-1.5">
                <LogIn className="w-4 h-4" /> Sign in
              </button>
            )}
            {isAuthenticated ? (
              <button onClick={() => navigate("/dashboard")} className="btn-primary px-4 py-2 rounded-lg text-sm font-medium">Start review</button>
            ) : (
              <a href="#demo" className="btn-primary px-4 py-2 rounded-lg text-sm font-medium">Try it</a>
            )}
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section id="top" className="relative pt-32 pb-24 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full opacity-40 blur-3xl"
               style={{ background: "radial-gradient(circle, oklch(0.8 0.15 275 / .5), transparent 60%)" }} />
        </div>
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
          <div className="animate-fade-up">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs font-medium text-muted-foreground mb-6">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              AI-native code intelligence
            </div>
            <h1 className="text-6xl md:text-7xl font-display font-semibold leading-[1.02] mb-6">
              Re<span className="text-gradient">Forge</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-lg mb-8">
              AI-Powered Code Reviews. Ship safer code with instant, senior-level feedback on bugs, security, performance and best practices.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="#demo" className="btn-primary px-6 py-3 rounded-xl font-medium inline-flex items-center gap-2">
                <Play className="w-4 h-4" /> Try the live demo
              </a>
              <a href="#features" className="px-6 py-3 rounded-xl border bg-card font-medium hover:bg-muted transition">
                Explore features
              </a>
            </div>
          </div>
          <div className="h-[440px] relative">
            <HeroOrb />
          </div>
        </div>
        <a href="#demo" className="flex flex-col items-center gap-1 mt-12 text-muted-foreground animate-bounce-down">
          <span className="text-xs uppercase tracking-widest">Scroll</span>
          <ChevronDown className="w-5 h-5" />
        </a>
      </section>

      {/* DEMO */}
      <section id="demo" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <div className="text-xs uppercase tracking-widest text-primary font-medium mb-3">Live Demo</div>
            <h2 className="text-4xl md:text-5xl font-semibold mb-3">Paste code. Get answers.</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              A real review in seconds. {API_URL ? "Connected to your backend." : "Running in offline demo mode."}
            </p>
          </div>

          <div className="rounded-3xl border glass shadow-[var(--shadow-elegant)] overflow-hidden">
            {/* window chrome */}
            <div className="flex items-center gap-2 px-5 h-11 border-b bg-muted/40">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[oklch(0.75_0.15_25)]" />
                <span className="w-3 h-3 rounded-full bg-[oklch(0.82_0.13_85)]" />
                <span className="w-3 h-3 rounded-full bg-[oklch(0.75_0.15_150)]" />
              </div>
              <div className="ml-4 text-xs text-muted-foreground font-mono">reforge — review.{lang}</div>
            </div>

            <div className="grid lg:grid-cols-5 gap-0">
              {/* editor */}
              <div className="lg:col-span-3 p-5 border-b lg:border-b-0 lg:border-r">
                <div className="flex items-center justify-between mb-3">
                  <select
                    value={lang}
                    onChange={(e) => setLang(e.target.value)}
                    className="px-3 py-2 rounded-lg border bg-card text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {LANGS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                  <button
                    onClick={runReview}
                    disabled={!canReview}
                    className="btn-primary px-5 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-2 disabled:opacity-60"
                  >
                    {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Reviewing…</> : <><Play className="w-4 h-4" /> Run Review</>}
                  </button>
                </div>
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  spellCheck={false}
                  className="w-full h-[420px] p-4 rounded-xl border bg-[oklch(0.985_0.005_265)] font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring leading-relaxed"
                  placeholder="Paste code here…"
                />
              </div>

              {/* results */}
              <div className="lg:col-span-2 p-6 bg-gradient-to-br from-transparent to-accent/30">
                {!result && !loading && (
                  <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground py-16">
                    <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center mb-4">
                      <Sparkles className="w-7 h-7 text-primary" />
                    </div>
                    <p className="font-medium text-foreground">Ready when you are</p>
                    <p className="text-sm mt-1">Click Run Review to analyze your code.</p>
                  </div>
                )}

                {loading && (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-16">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
                    <p className="text-sm">Analyzing your code…</p>
                  </div>
                )}

                {result && !loading && (
                  <div className="space-y-5 animate-fade-up">
                    <div className="flex items-center gap-5">
                      <ScoreRing score={result.overallScore} />
                      <div>
                        <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Summary</div>
                        <p className="text-sm">{result.summary}</p>
                      </div>
                    </div>
                    {error && <div className="text-xs text-danger">Live API failed ({error}) — showing local analysis.</div>}
                    <div className="grid sm:grid-cols-2 gap-3">
                      <CategoryCard icon={Bug} label="Bugs" cat={result.bugs} tint="oklch(0.95 0.05 25)" />
                      <CategoryCard icon={Shield} label="Security" cat={result.security} tint="oklch(0.95 0.05 275)" />
                      <CategoryCard icon={Zap} label="Performance" cat={result.performance} tint="oklch(0.95 0.06 85)" />
                      <CategoryCard icon={CheckCircle2} label="Best Practices" cat={result.bestPractices} tint="oklch(0.95 0.06 155)" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div className="h-[380px] order-2 lg:order-1">
            <MiniCards />
          </div>
          <div className="order-1 lg:order-2">
            <div className="text-xs uppercase tracking-widest text-primary font-medium mb-3">Features</div>
            <h2 className="text-4xl md:text-5xl font-semibold mb-5">Four lenses, one verdict.</h2>
            <p className="text-muted-foreground mb-8 max-w-lg">
              Every review analyzes your code across four dimensions, then synthesizes a single, actionable score.
            </p>
            <div className="space-y-3">
              {[
                { icon: Bug, t: "Bugs", d: "Logic errors, unhandled edges, silent failures." },
                { icon: Shield, t: "Security", d: "Injection, secrets, unsafe patterns." },
                { icon: Zap, t: "Performance", d: "Hotspots, complexity, wasted work." },
                { icon: CheckCircle2, t: "Best Practices", d: "Idioms, readability, maintainability." },
              ].map(({ icon: Icon, t, d }) => (
                <div key={t} className="flex items-start gap-4 p-4 rounded-xl border bg-card hover:shadow-[var(--shadow-soft)] transition">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "var(--gradient-brand)" }}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="font-medium">{t}</div>
                    <div className="text-sm text-muted-foreground">{d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* HOW */}
      <section id="how" className="py-24 px-6 bg-gradient-to-b from-transparent to-accent/40">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="text-xs uppercase tracking-widest text-primary font-medium mb-3">How it works</div>
            <h2 className="text-4xl md:text-5xl font-semibold">Three steps to a better review.</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { n: "01", t: "Paste your code", d: "Any language, any snippet. No setup, no repo access required." },
              { n: "02", t: "AI analyzes", d: "ReForge inspects across bugs, security, performance and practices." },
              { n: "03", t: "Ship with confidence", d: "Actionable feedback in seconds — the second pair of senior eyes." },
            ].map((s) => (
              <div key={s.n} className="relative rounded-2xl border bg-card p-7 shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-elegant)] transition group">
                <div className="text-5xl font-display font-semibold text-gradient mb-4">{s.n}</div>
                <div className="text-lg font-medium mb-1">{s.t}</div>
                <p className="text-sm text-muted-foreground">{s.d}</p>
                <div className="absolute -top-3 -right-3 w-16 h-16 rounded-2xl opacity-20 blur-2xl animate-float"
                     style={{ background: "var(--gradient-brand)" }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t px-6 py-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/reforgelogo.png" alt="ReForge" className="w-6 h-6 rounded-md object-contain" />
            <span className="font-display font-semibold">ReForge</span>
            <span className="text-sm text-muted-foreground ml-2">© {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-5 text-sm">
            <a href="https://github.com/BharathWaj-K-R/Re_Forge" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition">
              <Github className="w-4 h-4" /> GitHub
            </a>
            <a href={API_URL || "#"} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition">
              <Server className="w-4 h-4" /> Backend
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
