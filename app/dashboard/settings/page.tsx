'use client';

import { 
  User, 
  Mail, 
  Phone, 
  Shield, 
  Lock, 
  CheckCircle2, 
  Loader2,
  Stethoscope
} from "lucide-react";
import styles from "./settings.module.css";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/app/lib/supabase";
import { sendPasswordResetEmail } from "@/app/login/actions";

export default function SettingsPage() {
  const [userProfile, setUserProfile] = useState<any>(null);
  const [userEmail, setUserEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const supabase = getSupabaseBrowserClient();

  async function loadProfile() {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      setUserEmail(user.email || "");
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profile) {
        setUserProfile(profile);
        setFullName(profile.full_name || "");
        setPhone(profile.phone || "");
      } else {
        const fallbackProfile = {
          id: user.id,
          full_name: user.user_metadata?.full_name || "",
          role: user.user_metadata?.role || "patient",
          phone: user.user_metadata?.phone || ""
        };
        setUserProfile(fallbackProfile);
        setFullName(fallbackProfile.full_name);
        setPhone(fallbackProfile.phone);
      }
    } else if (process.env.NEXT_PUBLIC_ENABLE_MOCK_AUTH === 'true' && process.env.NODE_ENV !== 'production') {
      // Mock admin bypass for local development only
      setUserEmail("tester@marylandhealthcare.com.ng");
      setUserProfile({
        id: "mock-admin-id",
        full_name: "Test Administrator",
        role: "admin",
        phone: "08000000000"
      });
      setFullName("Test Administrator");
      setPhone("08000000000");
    }
    setIsLoading(false);
  }

  useEffect(() => {
    loadProfile();
  }, [supabase]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMessage("");
    setErrorMessage("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      if (process.env.NEXT_PUBLIC_ENABLE_MOCK_AUTH === 'true' && process.env.NODE_ENV !== 'production') {
        setSuccessMessage("Your profile information has been successfully updated (Local Test Mode)!");
        setIsSaving(false);
        return;
      }
      setErrorMessage("You must be logged in to update your profile.");
      setIsSaving(false);
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        phone: phone
      })
      .eq('id', user.id);

    if (error) {
      setErrorMessage("Error updating profile details: " + error.message);
    } else {
      setSuccessMessage("Your profile information has been successfully updated!");
      // Reload profile
      loadProfile();
    }
    setIsSaving(false);
  }

  async function handleResetPassword() {
    setIsResetting(true);
    setSuccessMessage("");
    setErrorMessage("");

    const result = await sendPasswordResetEmail(userEmail);

    if (result.success) {
      setSuccessMessage("A secure password reset link has been dispatched to your email address.");
    } else {
      setErrorMessage("Failed to send reset link: " + (result.error || "Unknown error"));
    }
    setIsResetting(false);
  }

  if (isLoading) {
    return (
      <div className={styles.loadingState}>
        <Loader2 className={styles.spinner} size={30} />
        <p>Loading security profile credentials...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <h1>Account & Security Settings</h1>
          <p>Update your personal information, roles, and manage password security.</p>
        </div>
      </div>

      {(successMessage || errorMessage) && (
        <div className={styles.notificationRow}>
          {successMessage && (
            <div className={styles.successNotification}>
              <CheckCircle2 size={18} />
              <span>{successMessage}</span>
            </div>
          )}
          {errorMessage && (
            <div className={styles.errorNotification}>
              <CheckCircle2 size={18} style={{ color: '#ef4444' }} />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>
      )}

      <div className={styles.settingsGrid}>
        <div className={styles.profileCard}>
          <h2>{userProfile?.role === 'patient' ? "Patient Profile" : "Attending Staff Profile"}</h2>
          <div className={styles.badgeRow}>
            <span className={styles.roleBadge}>
              <Shield size={14} />
              {userProfile?.role || 'Staff'}
            </span>
            {userProfile?.specialty && (
              <span className={styles.specialtyBadge}>
                <Stethoscope size={14} />
                {userProfile.specialty}
              </span>
            )}
          </div>

          <form onSubmit={handleSaveProfile} className={styles.form}>
            <div className={styles.inputGroup}>
              <label>
                <User size={16} />
                Full Name
              </label>
              <input 
                type="text" 
                required 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Dr. Stephen Ekwelibe"
              />
            </div>

            <div className={styles.inputGroup}>
              <label>
                <Mail size={16} />
                Primary Email (Read-Only)
              </label>
              <input 
                type="email" 
                disabled 
                value={userEmail}
                className={styles.disabledInput}
              />
            </div>

            <div className={styles.inputGroup}>
              <label>
                <Phone size={16} />
                Phone Number
              </label>
              <input 
                type="tel" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="080XXXXXXXX"
              />
            </div>

            <button type="submit" className={styles.saveBtn} disabled={isSaving}>
              {isSaving ? <Loader2 className={styles.spinner} size={18} /> : "Save Changes"}
            </button>
          </form>
        </div>

        <div className={styles.securityCard}>
          <h2>Credentials & Security</h2>
          <p>Initiate a secure password reset. An automated recovery link will be sent to your primary email address immediately.</p>
          
          <div className={styles.securityActionRow}>
            <div className={styles.securityInfo}>
              <Lock size={20} color="var(--primary)" />
              <div>
                <strong>Authentication Key</strong>
                <span>Updates passwords, token-keys and active sessions.</span>
              </div>
            </div>
            <button 
              className={styles.resetBtn}
              onClick={handleResetPassword}
              disabled={isResetting}
            >
              {isResetting ? <Loader2 className={styles.spinner} size={16} /> : "Reset Account Password"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
