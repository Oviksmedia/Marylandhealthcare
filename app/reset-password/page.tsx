'use client';

import { useState, useEffect } from "react";
import { getSupabaseBrowserClient } from "@/app/lib/supabase";
import { useRouter } from "next/navigation";
import { Lock, Loader2, CheckCircle2, ArrowRight, Mail, Key } from "lucide-react";
import styles from "./reset-password.module.css";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);

  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    // Supabase sends the user back with auth tokens in the URL hash
    async function checkSession() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setIsValidSession(true);
      } else {
        setIsValidSession(false);
      }
    }
    checkSession();
  }, [supabase]);

  useEffect(() => {
    // Parse email from URL query params (safe on client-side to avoid Next.js Suspense requirement)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const emailParam = params.get('email');
      if (emailParam) {
        setEmail(emailParam);
      }
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError("Password must be at least 8 characters and contain both letters and numbers.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    if (!isValidSession) {
      if (!email.trim() || !otp.trim()) {
        setError("Email address and 8-digit reset code are required.");
        setIsLoading(false);
        return;
      }

      // Step 1: Verify OTP code
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: otp.trim(),
        type: 'recovery',
      });

      if (verifyError) {
        console.error("OTP verification error:", verifyError.message);
        setError("Invalid or expired reset code. Please double check the code from your email.");
        setIsLoading(false);
        return;
      }
    }

    // Step 2: Update password
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setIsLoading(false);
      return;
    }

    setSuccess(true);
    setIsLoading(false);

    // Redirect based on role after a short delay
    setTimeout(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        const userRole = profile?.role || user.user_metadata?.role;

        if (userRole === 'patient') {
          router.push('/dashboard/my-appointments');
        } else {
          router.push('/dashboard/settings');
        }
      } else {
        router.push('/login');
      }
    }, 2000);
  }

  if (isValidSession === null) {
    return (
      <div className={styles.container}>
        <div className={styles.formSide}>
          <div className={styles.formCard}>
            <Loader2 className={styles.spinner} size={30} />
            <p>Checking recovery credentials...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.formSide}>
        <div className={styles.formCard}>
          <div className={styles.formHeader}>
            <h2>{isValidSession ? "Set New Password" : "Reset Your Password"}</h2>
            <p>
              {isValidSession 
                ? "Choose a strong password to secure your account."
                : "Enter your email address and the 8-digit code sent to your inbox."}
            </p>
          </div>

          {success ? (
            <div className={styles.successState}>
              <CheckCircle2 size={48} color="#10b981" />
              <h3>Password Updated!</h3>
              <p>Redirecting you to your dashboard...</p>
            </div>
          ) : (
            <form className={styles.form} onSubmit={handleSubmit}>
              {!isValidSession && (
                <>
                  <div className={styles.inputGroup}>
                    <label htmlFor="email">Email Address</label>
                    <div className={styles.inputWrapper}>
                      <Mail className={styles.inputIcon} size={18} />
                      <input
                        type="email"
                        id="email"
                        placeholder="yourname@marylandhealthcare.com.ng"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className={styles.inputGroup}>
                    <label htmlFor="otp">8-Digit Security Code</label>
                    <div className={styles.inputWrapper}>
                      <Key className={styles.inputIcon} size={18} />
                      <input
                        type="text"
                        id="otp"
                        placeholder="Enter the 8-digit code"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        required
                        maxLength={8}
                        pattern="\d{8}"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className={styles.inputGroup}>
                <label htmlFor="password">New Password</label>
                <div className={styles.inputWrapper}>
                  <Lock className={styles.inputIcon} size={18} />
                  <input
                    type="password"
                    id="password"
                    placeholder="At least 8 characters, letters and numbers"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="confirmPassword">Confirm Password</label>
                <div className={styles.inputWrapper}>
                  <Lock className={styles.inputIcon} size={18} />
                  <input
                    type="password"
                    id="confirmPassword"
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
              </div>

              {error && <div className={styles.errorAlert}>{error}</div>}

              <button className={styles.loginBtn} type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className={styles.spinner} size={20} />
                    Updating Password...
                  </>
                ) : (
                  <>
                    Update Password
                    <ArrowRight size={20} />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
