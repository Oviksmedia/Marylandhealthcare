'use client';

import { useState } from "react";
import { getSupabaseBrowserClient } from "@/app/lib/supabase";
import { useRouter } from "next/navigation";
import styles from "./login.module.css";
import { Lock, Mail, Loader2, ArrowRight } from "lucide-react";
import { sendPasswordResetEmail } from "./actions";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      if (data?.user) {
        // Fetch the user's role from the profile table to redirect directly
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

        const role = profile?.role || data.user.user_metadata?.role || 'patient';
        
        if (role === 'patient') {
          router.push("/dashboard/my-appointments");
        } else {
          router.push("/dashboard");
        }
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Invalid login credentials");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.brandSide}>
        <div className={styles.brandContent}>
          <img src="/logo.png" alt="Maryland Healthcare" className={styles.logoImg} />
          <h1>Maryland Healthcare</h1>
          <p>Excellence in every heartbeat. Secure access to your health records and portal dashboard.</p>
        </div>
        <div className={styles.brandFooter}>
          <span>&copy; {new Date().getFullYear()} Maryland Healthcare Center</span>
        </div>
      </div>

      <div className={styles.formSide}>
        <div className={styles.formCard}>
          <div className={styles.formHeader}>
            <h2>Portal Access</h2>
            <p>Enter your credentials to access your dashboard and records.</p>
          </div>

          <form className={styles.form} onSubmit={handleLogin}>
            <div className={styles.inputGroup}>
              <label htmlFor="email">Email Address</label>
              <div className={styles.inputWrapper}>
                <Mail className={styles.inputIcon} size={18} />
                <input 
                  type="email" 
                  id="email"
                  placeholder="name@marylandhealthcare.com.ng"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="password">Password</label>
              <div className={styles.inputWrapper}>
                <Lock className={styles.inputIcon} size={18} />
                <input 
                  type="password" 
                  id="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {error && <div className={styles.errorAlert}>{error}</div>}
            {resetMessage && <div className={styles.successAlert}>{resetMessage}</div>}

            <button className={styles.loginBtn} type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className={styles.spinner} size={20} />
                  Authenticating...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          <div className={styles.formFooter}>
            <button
              type="button"
              className={styles.forgotPasswordBtn}
              disabled={isResetting}
              onClick={async () => {
                if (!email) {
                  setError("Please enter your email address first.");
                  return;
                }
                setIsResetting(true);
                setError(null);
                setResetMessage(null);
                const result = await sendPasswordResetEmail(email);
                if (result.success) {
                  setResetMessage("Password reset link sent! Check your inbox.");
                } else {
                  setError(result.error || "Failed to send reset link.");
                }
                setIsResetting(false);
              }}
            >
              {isResetting ? (
                <><Loader2 className={styles.spinner} size={14} /> Sending...</>
              ) : (
                "Forgot your password?"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
