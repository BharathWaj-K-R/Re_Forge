import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Loader2, Sparkles, LogIn, UserPlus, ArrowLeft } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const err = isLogin
      ? await login(email, password)
      : await register(email, password, name);

    setLoading(false);

    if (err) {
      setError(err);
    } else {
      navigate("/history");
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
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
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition inline-flex items-center gap-1.5">
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>
        </div>
      </nav>

      {/* FORM */}
      <section className="flex-1 flex items-center justify-center px-6 pt-24 pb-16">
        <div className="w-full max-w-md animate-fade-up">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs font-medium text-muted-foreground mb-5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              {isLogin ? "Welcome back" : "Join ReForge"}
            </div>
            <h1 className="text-4xl font-display font-semibold mb-2">
              {isLogin ? "Sign <span>in</span>" : "Create <span>account</span>"}
            </h1>
            <p className="text-muted-foreground text-sm">
              {isLogin
                ? "Sign in to access your review history."
                : "Save your reviews and track your code quality over time."}
            </p>
          </div>

          {/* Card */}
          <div className="rounded-2xl border bg-card p-7 shadow-[var(--shadow-elegant)]">
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <label className="block text-sm font-medium mb-1.5">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Your name"
                    className="w-full px-4 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full px-4 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Min 6 characters"
                  className="w-full px-4 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition"
                />
              </div>

              {error && (
                <div className="text-sm text-danger bg-[oklch(0.95_0.05_25)] px-4 py-2.5 rounded-lg border border-[oklch(0.88_0.08_25)]">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3 rounded-lg text-sm font-medium inline-flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />{" "}
                    {isLogin ? "Signing in…" : "Creating account…"}
                  </>
                ) : (
                  <>
                    {isLogin ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                    {isLogin ? "Sign in" : "Create account"}
                  </>
                )}
              </button>
            </form>

            {/* Toggle */}
            <div className="mt-5 text-center text-sm text-muted-foreground">
              {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError(null);
                }}
                className="text-primary font-medium hover:underline"
              >
                {isLogin ? "Sign up" : "Sign in"}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
