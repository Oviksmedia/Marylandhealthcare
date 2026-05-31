'use client';

import styles from "./dashboard.module.css";
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Settings, 
  LogOut, 
  Stethoscope,
  Bell,
  Search,
  Loader2,
  Clock
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/app/lib/supabase";
import { createProfileForUser, remapLegacyProfile } from "@/app/lib/telemedicine/booking";
import { useCallback, useEffect, useRef, useState } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [authUser, setAuthUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingProfile, setIsFetchingProfile] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [seenCount, setSeenCount] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);

  const supabase = getSupabaseBrowserClient();

  // Hook 1: Fetch user and profile once on mount
  useEffect(() => {
    async function getUser() {
      setIsFetchingProfile(true);
      const { data: { user } } = await supabase.auth.getUser();
      setAuthUser(user);
      
      if (!user) {
        // Mock admin bypass for local development only
        if (process.env.NEXT_PUBLIC_ENABLE_MOCK_AUTH === 'true' && process.env.NODE_ENV !== 'production') {
          setUserProfile({
            id: "mock-admin-id",
            full_name: "Test Administrator",
            role: "admin",
            email: "tester@marylandhealthcare.com.ng",
            phone: "08000000000"
          });
          setIsFetchingProfile(false);
          return;
        }
        // Production: redirect to login
        router.push("/login");
        setIsFetchingProfile(false);
        return;
      }

      // 1. Try to find profile by ID
      const { data: profileById } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      let profile = profileById;

      // 2. If not found by ID, try to find by Email (Auto-Link)
      if (!profile && user.email) {
        const { data: legacyProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', user.email.toLowerCase().trim())
          .maybeSingle();
        
        if (legacyProfile) {
          if (legacyProfile.id !== user.id) {
            // Remap securely using the server action to preserve appointments patient_id references
            const remapResult = await remapLegacyProfile(user.email, user.id);
            if (remapResult.success) {
              const { data: newProfile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();
              profile = newProfile;
            } else {
              console.error("Secure profile re-mapping failed:", remapResult.error);
              // Fallback to local profile to prevent blocking the UI
              profile = legacyProfile;
            }
          } else {
            // Already correctly mapped
            profile = legacyProfile;
          }
        }
      }

      // 3. If STILL not found, create a new profile from auth user metadata
      if (!profile && user.email) {
        const fullName = user.user_metadata?.full_name || 'New Patient';
        const role = user.user_metadata?.role || 'patient';
        const phone = user.user_metadata?.phone || '';

        const result = await createProfileForUser({
          id: user.id,
          fullName: fullName,
          email: user.email,
          role: role,
          phone: phone
        });

        if (result.success) {
          profile = result.profile;
        } else if (result.code === '23505') {
          // Row was created concurrently/by trigger. Refetch it.
          const { data: refetchedProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          profile = refetchedProfile;
        } else {
          console.error("Auto-profile creation failed:", result.error);
        }
      }

      // Check if the doctor is suspended
      if (profile?.role === 'doctor' && profile?.is_active === false) {
        setIsFetchingProfile(false);
        setUserProfile(null);
        setAuthUser(null);
        await supabase.auth.signOut();
        router.push('/login?error=suspended');
        return;
      }

      setUserProfile(profile);
      setIsFetchingProfile(false);

      // Fetch notifications (recent appointments) for admin/receptionist/doctor
      if (profile?.role !== 'patient') {
        const { data: recentApts } = await supabase
          .from('appointments')
          .select('id, patient_name, patient_email, type, status, payment_status, scheduled_at, created_at')
          .order('created_at', { ascending: false })
          .limit(15);
        setNotifications(recentApts || []);
      }
    }
    getUser();
  }, [supabase, router]);

  // Hook 2: Handle role-based routing guards and loading clearance
  useEffect(() => {
    if (isFetchingProfile) return;

    const role = userProfile?.role;
    
    if (!role) {
      if (!authUser && process.env.NEXT_PUBLIC_ENABLE_MOCK_AUTH !== 'true') {
        router.push("/login");
      } else {
        setIsLoading(false);
      }
      return;
    }

    if (role === 'patient') {
      if (pathname === '/dashboard' || pathname === '/dashboard/' || pathname.startsWith('/dashboard/appointments') || pathname.startsWith('/dashboard/doctors') || pathname.startsWith('/dashboard/patients')) {
        router.push('/dashboard/my-appointments');
        return;
      }
    } else if (role === 'doctor') {
      if (pathname.startsWith('/dashboard/doctors') || pathname.startsWith('/dashboard/doctor-sessions') || pathname.startsWith('/dashboard/patients') || pathname === '/dashboard/my-appointments') {
        router.push('/dashboard');
        return;
      }
    } else if (role === 'receptionist') {
      if (pathname.startsWith('/dashboard/doctors') || pathname.startsWith('/dashboard/doctor-sessions') || pathname === '/dashboard/my-appointments') {
        router.push('/dashboard');
        return;
      }
    }

    setIsLoading(false);
  }, [userProfile, authUser, isFetchingProfile, pathname, router]);

  // Close notification panel on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    }
    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications]);

  const unreadCount = Math.max(0, notifications.length - seenCount);

  const getRelativeTime = useCallback((dateStr: string) => {
    const now = new Date();
    const d = new Date(dateStr);
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay === 1) return 'Yesterday';
    return `${diffDay}d ago`;
  }, []);

  const getNotifMessage = useCallback((apt: any) => {
    if (apt.status === 'pending' && apt.payment_status === 'unpaid') {
      return { text: `New registration — awaiting payment`, color: '#f59e0b' };
    }
    if (apt.status === 'confirmed' && apt.payment_status === 'paid') {
      return { text: `Booking confirmed & paid`, color: '#10b981' };
    }
    if (apt.status === 'confirmed') {
      return { text: `Appointment confirmed`, color: '#10b981' };
    }
    if (apt.status === 'completed') {
      return { text: `Consultation completed`, color: '#6366f1' };
    }
    if (apt.status === 'cancelled') {
      return { text: `Appointment cancelled`, color: '#ef4444' };
    }
    return { text: `Appointment updated`, color: 'var(--primary)' };
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  // Role-based Navigation
  const getNavItems = () => {
    const role = userProfile?.role;
    
    const items = [
      { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
    ];

    if (role === 'admin' || role === 'receptionist') {
      items.push({ name: "Appointments", href: "/dashboard/appointments", icon: Calendar });
    }

    if (role === 'admin') {
      items.push({ name: "Doctors", href: "/dashboard/doctors", icon: Stethoscope });
      items.push({ name: "Doctor Sessions", href: "/dashboard/doctor-sessions", icon: Clock });
    }

    if (role === 'admin' || role === 'receptionist') {
      items.push({ name: "Patients", href: "/dashboard/patients", icon: Users });
    }

    if (role === 'patient') {
      items.push({ name: "My Appointments", href: "/dashboard/my-appointments", icon: Calendar });
    }

    return items;
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Loader2 className={styles.spinner} size={40} color="var(--primary)" />
      </div>
    );
  }

  const userRole = userProfile?.role || authUser?.user_metadata?.role || 'patient';
  const logoText = userRole === 'patient' ? "Patient Portal" : "Maryland Staff";
  const displayName = userProfile?.full_name || authUser?.user_metadata?.full_name || (userRole === 'patient' ? 'Patient User' : 'Staff Member');
  const avatarInitials = displayName.split(' ').map((n: any) => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  return (
    <div className={styles.container}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <div className={styles.logo}>
            <div className={styles.logoIcon}>M</div>
            <span>{logoText}</span>
          </div>
        </div>

        <nav className={styles.nav}>
          {getNavItems().map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.name} 
                href={item.href} 
                className={`${styles.navItem} ${isActive ? styles.active : ""}`}
              >
                <Icon size={20} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          <Link 
            href="/dashboard/settings" 
            className={`${styles.navItem} ${pathname === '/dashboard/settings' ? styles.active : ""}`}
          >
            <Settings size={20} />
            <span>Settings</span>
          </Link>
          <button className={styles.logoutBtn} onClick={handleSignOut}>
            <LogOut size={20} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={styles.main}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.searchBar}>
              <Search size={18} />
              <input type="text" placeholder="Search patients..." disabled title="Search coming soon" />
            </div>
          </div>
          <div className={styles.headerRight}>
            <div ref={notifRef} className={styles.notifWrapper}>
              <button
                className={styles.iconBtn}
                onClick={() => {
                  setShowNotifications((v) => !v);
                  if (!showNotifications) setSeenCount(notifications.length);
                }}
                aria-label="Notifications"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className={styles.badgeCount}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className={styles.notifPanel}>
                  <div className={styles.notifHeader}>
                    <strong>Notifications</strong>
                    <span className={styles.recentCount}>{notifications.length} recent</span>
                  </div>
                  {notifications.length === 0 ? (
                    <p className={styles.emptyNotif}>No recent activity</p>
                  ) : (
                    <div className={styles.notifList}>
                      {notifications.map((apt) => {
                        const msg = getNotifMessage(apt);
                        return (
                          <div key={apt.id} className={styles.notifItem}>
                            <div className={styles.notifDot} style={{ background: msg.color }} />
                            <div className={styles.notifContent}>
                              <strong className={styles.notifPatientName}>{apt.patient_name}</strong>
                              <span className={styles.notifText}>{msg.text}</span>
                              <span className={styles.notifType}>{apt.type === 'telemedicine' ? '• Virtual' : '• In-Clinic'}</span>
                            </div>
                            <span className={styles.notifTime}>{getRelativeTime(apt.created_at)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className={styles.userProfile}>
              <div className={styles.avatar}>
                {avatarInitials}
              </div>
              <div className={styles.userInfo}>
                <strong>{displayName}</strong>
                <span className={styles.userRole}>{userRole || 'User'}</span>
              </div>
            </div>
          </div>
        </header>

        <section className={styles.content}>
          {children}
        </section>
      </main>
    </div>
  );
}
