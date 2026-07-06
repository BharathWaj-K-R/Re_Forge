import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Loader2, Sparkles, LogIn, UserPlus, ArrowLeft, Eye, EyeOff, Mail, RefreshCw } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

type AuthMode = "login" | "register" | "verify-otp";

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const { login, register, verifyOtp, resendOtp } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === "verify-otp") {
      setLoading(true);
      const err = await verifyOtp(email, otp);
      setLoading(false);
      if (err) {
        setError(err);
      } else {
        navigate("/dashboard");
      }
      return;
    }

    if (mode === "register" && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    if (mode === "login") {
      const err = await login(email, password);
      setLoading(false);
      if (err) {
        setError(err);
      } else {
        navigate("/dashboard");
      }
    } else {
      const result = await register(email, password, name);
      setLoading(false);
      if (result.error) {
        setError(result.error);
      } else {
        setMode("verify-otp");
        setResendCooldown(60);
      }
    }
  }

  async function handleResendOtp() {
    if (resendCooldown > 0) return;
    setError(null);
    const err = await resendOtp(email);
    if (err) {
      setError(err);
    } else {
      setResendCooldown(60);
    }
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
              {mode === "login" ? "Welcome back" : mode === "register" ? "Join ReForge" : "Verify your email"}
            </div>
            <h1 className="text-4xl font-display font-semibold mb-2">
              {mode === "login" ? <>Sign <span className="text-gradient">in</span></> : mode === "register" ? <>Create <span className="text-gradient">account</span></> : <>Enter <span className="text-gradient">code</span></>}
            </h1>
            <p className="text-muted-foreground text-sm">
              {mode === "login"
                ? "Sign in to access your review history."
                : mode === "register"
                ? "Save your reviews and track your code quality over time."
                : `We sent a 6-digit code to ${email}`}
            </p>
          </div>

          {/* Card */}
          <div className="rounded-2xl border bg-card p-7 shadow-[var(--shadow-elegant)]">
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "verify-otp" ? (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Verification Code</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        required
                        maxLength={6}
                        placeholder="Enter 6-digit code"
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition text-center text-lg tracking-widest"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="text-sm text-danger bg-[oklch(0.95_0.05_25)] px-4 py-2.5 rounded-lg border border-[oklch(0.88_0.08_25)]">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || otp.length !== 6}
                    className="btn-primary w-full py-3 rounded-lg text-sm font-medium inline-flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Verifying…
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" /> Verify email
                      </>
                    )}
                  </button>

                  <div className="text-center text-sm text-muted-foreground">
                    Didn't receive the code?{" "}
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={resendCooldown > 0}
                      className="text-primary font-medium hover:underline inline-flex items-center gap-1 disabled:opacity-50"
                    >
                      {resendCooldown > 0 ? (
                        <>Resend in {resendCooldown}s</>
                      ) : (
                        <>
                          <RefreshCw className="w-3.5 h-3.5" /> Resend code
                        </>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {mode === "register" && (
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
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        placeholder="Min 6 characters"
                        className="w-full px-4 py-2.5 pr-10 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {mode === "register" && (
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Confirm Password</label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          minLength={6}
                          placeholder="Re-enter password"
                          className="w-full px-4 py-2.5 pr-10 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {mode === "register" && password && confirmPassword && password !== confirmPassword && (
                        <p className="text-xs text-danger mt-1">Passwords do not match</p>
                      )}
                    </div>
                  )}

                  {error && (
                    <div className="text-sm text-danger bg-[oklch(0.95_0.05_25)] px-4 py-2.5 rounded-lg border border-[oklch(0.88_0.08_25)]">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || (mode === "register" && !!password && !!confirmPassword && password !== confirmPassword)}
                    className="btn-primary w-full py-3 rounded-lg text-sm font-medium inline-flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />{" "}
                        {mode === "login" ? "Signing in…" : "Creating account…"}
                      </>
                    ) : (
                      <>
                        {mode === "login" ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                        {mode === "login" ? "Sign in" : "Create account"}
                      </>
                    )}
                  </button>
                </>
              )}
            </form>

            {/* Toggle */}
            {mode !== "verify-otp" && (
              <div className="mt-5 text-center text-sm text-muted-foreground">
                {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
                <button
                  onClick={() => {
                    setMode(mode === "login" ? "register" : "login");
                    setError(null);
                  }}
                  className="text-primary font-medium hover:underline"
                >
                  {mode === "login" ? "Sign up" : "Sign in"}
                </button>
              </div>
            )}

            {mode === "verify-otp" && (
              <div className="mt-5 text-center text-sm text-muted-foreground">
                <button
                  onClick={() => {
                    setMode("register");
                    setError(null);
                  }}
                  className="text-primary font-medium hover:underline inline-flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to registration
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
