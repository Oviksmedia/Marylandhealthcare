'use client';

import {
  Users,
  Calendar,
  TrendingUp,
  ArrowUpRight,
  ShieldCheck,
  Video,
  Clock,
  Loader2,
  X,
  Stethoscope,
  CheckCircle2
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./overview.module.css";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/app/lib/supabase";
import { assignDoctor, updateAppointmentStatus, saveClinicalNotes } from "./actions";
import { stripSystemMetadata } from "@/app/lib/telemedicine/note-utils";

export default function DashboardOverview() {
  const [userProfile, setUserProfile] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Assignment Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedApt, setSelectedApt] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Details Panel State
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedAptDetails, setSelectedAptDetails] = useState<any>(null);
  const [notesText, setNotesText] = useState("");
  const [patientHistory, setPatientHistory] = useState<any[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  // Custom Toast State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  // Automatically clear toast notification after 4 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Sync selected appointment details to the notesText editing state
  useEffect(() => {
    if (selectedAptDetails) {
      // Legacy fallback: default to the stripped notes column if doctor_notes is empty and status is completed
      const initialNotes = selectedAptDetails.doctor_notes || 
        (selectedAptDetails.status === 'completed' ? stripSystemMetadata(selectedAptDetails.clinical_notes) : "");
      setNotesText(initialNotes);
    } else {
      setNotesText("");
    }
  }, [selectedAptDetails]);

  async function loadDashboardData() {
    try {
      let activeUser = null;
      const { data: { user } } = await supabase.auth.getUser();
      activeUser = user;

      let profile = null;
      if (activeUser) {
        const { data: p } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', activeUser.id)
          .single();
        profile = p;

        if (!profile) {
          profile = {
            id: activeUser.id,
            full_name: activeUser.user_metadata?.full_name || 'Patient',
            role: activeUser.user_metadata?.role || 'patient',
            email: activeUser.email || '',
            phone: activeUser.user_metadata?.phone || ''
          };
        }
      } else if (process.env.NEXT_PUBLIC_ENABLE_MOCK_AUTH === 'true' && process.env.NODE_ENV !== 'production') {
        // Mock admin bypass for local development only
        profile = {
          id: "mock-admin-id",
          full_name: "Test Administrator",
          role: "admin",
          email: "tester@marylandhealthcare.com.ng",
          phone: "08000000000"
        };
      }

      setUserProfile(profile);

      // Redirect patients to their appointments page
      if (profile?.role === 'patient') {
        router.push('/dashboard/my-appointments');
        return;
      }

      let query = supabase.from('appointments').select('*, clinical_notes:notes').order('scheduled_at', { ascending: false });
      
      if (profile?.role === 'doctor') {
        query = query.eq('doctor_id', profile.id);
      }

      const { data: apts } = await query;
      setAppointments(apts || []);

      // Fetch doctors for assignment (Admin/Receptionist only)
      if (profile?.role === 'admin' || profile?.role === 'receptionist') {
        const { data: drs } = await supabase.from('profiles').select('*').eq('role', 'doctor');
        setDoctors(drs || []);
      }
    } catch (e) {
      console.error("Failed to load dashboard data:", e);
    } finally {
      setIsLoading(false);
    }
  }

  // Calculate Stats
  const totalAppointments = appointments.length;
  const virtualConsults = appointments.filter(a => a.type === 'telemedicine').length;
  
  const getAppointmentAmount = (apt: any) => {
    if (!apt) return 0;
    if (apt.amount) return Number(apt.amount);
    return 0; // If the database has no amount saved, show 0 to enforce data integrity.
  };

  const totalRevenue = appointments.reduce((sum, apt) => sum + getAppointmentAmount(apt), 0);

  useEffect(() => {
    loadDashboardData();
  }, [supabase]);

  async function handleAssignDoctor(doctorId: string) {
    if (!selectedApt) return;
    setIsUpdating(true);

    const result = await assignDoctor(selectedApt.id, doctorId);

    if (!result.success) {
      setToast({ message: "Error assigning doctor: " + result.error, type: 'error' });
    } else {
      setToast({ message: "Doctor assigned successfully.", type: 'success' });
      setIsAssignModalOpen(false);
      loadDashboardData(); // Refresh list
    }
    setIsUpdating(false);
  }

  async function loadPatientHistory(email: string, excludeId?: string) {
    setIsHistoryLoading(true);
    let query = supabase
      .from('appointments')
      .select('*, clinical_notes:notes')
      .eq('patient_email', email)
      .order('scheduled_at', { ascending: false });

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data } = await query;
    setPatientHistory(data || []);
    setIsHistoryLoading(false);
  }

  async function handleSaveNotes() {
    if (!selectedAptDetails) return;
    setIsUpdating(true);

    const result = await saveClinicalNotes(selectedAptDetails.id, notesText);

    if (!result.success) {
      setToast({ message: "Error saving notes: " + result.error, type: 'error' });
    } else {
      setToast({ message: "Medical records updated successfully.", type: 'success' });
      
      const updatedApt = { ...selectedAptDetails, doctor_notes: notesText };
      setSelectedAptDetails(updatedApt);

      setAppointments(appointments.map(a =>
        a.id === selectedAptDetails.id ? { ...a, doctor_notes: notesText } : a
      ));
    }
    setIsUpdating(false);
  }

  async function handleUpdateStatus(status: string) {
    if (!selectedAptDetails) return;
    setIsUpdating(true);

    const result = await updateAppointmentStatus(selectedAptDetails.id, status);

    if (!result.success) {
      setToast({ message: "Error updating status: " + result.error, type: 'error' });
    } else {
      setToast({ message: `Appointment status updated to '${status}' successfully.`, type: 'success' });
      setIsDetailsOpen(false);
      loadDashboardData(); // Refresh list
    }
    setIsUpdating(false);
  }

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Loader2 className={styles.spinner} size={30} />
      </div>
    );
  }

  const isDoctor = userProfile?.role === 'doctor';

  return (
    <div className={styles.grid}>
      {!isDoctor && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.statIconBg}`}>
              <Calendar size={24} color="var(--primary)" />
            </div>
            <div className={styles.statInfo}>
              <span>Total Appointments</span>
              <strong>{totalAppointments}</strong>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.statIconBg}`}>
              <ShieldCheck size={24} color="var(--primary)" />
            </div>
            <div className={styles.statInfo}>
              <span>Virtual Consultations</span>
              <strong>{virtualConsults}</strong>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.statIconBg}`}>
              <TrendingUp size={24} color="var(--primary)" />
            </div>
            <div className={styles.statInfo}>
              <span>Total Revenue</span>
              <strong>NGN {totalRevenue.toLocaleString()}</strong>
            </div>
          </div>
        </div>
      )}

      <div className={styles.tableCard}>
        <div className={styles.tableHeader}>
          <h2>{isDoctor ? "My Clinical Schedule" : "Receptionist Live Queue"}</h2>
          {!isDoctor && <Link href="/dashboard/appointments" className={styles.btnOutline}>View All</Link>}
        </div>
        
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Patient Name</th>
                <th>Type</th>
                <th>Date / Time</th>
                {!isDoctor && <th>Doctor</th>}
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((apt) => (
                <tr key={apt.id}>
                  <td>
                    <div className={styles.patientInfo}>
                      <strong>{apt.patient_name}</strong>
                      <span>{apt.patient_phone}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`${styles.badge} ${apt.type === 'telemedicine' ? styles.badgeVirtual : styles.badgeClinic}`}>
                      {apt.type === 'telemedicine' ? 'Virtual' : 'In-Clinic'}
                    </span>
                  </td>
                  <td>
                    <div className={styles.dateTime}>
                      <span>{new Date(apt.scheduled_at).toLocaleDateString()}</span>
                      <small>{new Date(apt.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                    </div>
                  </td>
                  {!isDoctor && (
                    <td>
                      {apt.doctor_id ? (
                        <div className={styles.assignedDoctor}>
                          <CheckCircle2 size={14} color="#10b981" />
                          <span>{doctors.find(d => d.id === apt.doctor_id)?.full_name || 'Assigned'}</span>
                        </div>
                      ) : (
                        <span className={styles.unassigned}>Unassigned</span>
                      )}
                    </td>
                  )}
                  <td>
                    <span className={
                      apt.status === 'confirmed' ? styles.statusConfirmed :
                      apt.status === 'completed' ? styles.statusCompleted :
                      apt.status === 'cancelled' ? styles.statusCancelled :
                      styles.statusPending
                    }>
                      {apt.status ? apt.status.charAt(0).toUpperCase() + apt.status.slice(1) : 'Pending'}
                    </span>
                  </td>
                  <td>
                    <div className={styles.tableActions}>
                      <button 
                        className={styles.iconBtn} 
                        title="View Details"
                        onClick={() => {
                          setSelectedAptDetails(apt);
                          setIsDetailsOpen(true);
                        }}
                      >
                        <ArrowUpRight size={16} />
                      </button>
                      {isDoctor && apt.type === 'telemedicine' && (
                        <a href={apt.meet_link} target="_blank" rel="noopener noreferrer" className={styles.joinBtn}>
                          <Video size={16} />
                          Join Meeting
                        </a>
                      )}
                      {!isDoctor && (
                        <>
                          <button 
                            className={styles.iconBtn} 
                            title="Assign Doctor"
                            onClick={() => {
                              setSelectedApt(apt);
                              setIsAssignModalOpen(true);
                            }}
                          >
                            <Stethoscope size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {appointments.length === 0 && (
                <tr>
                  <td colSpan={6} className={styles.emptyState}>
                    <div className={styles.emptyStateIcon}><Clock size={48} /></div>
                    {isDoctor ? "You have no appointments scheduled for today." : "No recent appointments found in the queue."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Patient Details Side Panel */}
      {isDetailsOpen && (
        <div className={styles.sidePanelOverlay} onClick={() => setIsDetailsOpen(false)}>
          <div className={styles.sidePanel} onClick={e => e.stopPropagation()}>
            <div className={styles.panelHeader}>
              <div>
                <h2>Patient Details</h2>
                <p>Ref: {selectedAptDetails?.id.slice(0,8)}</p>
              </div>
              <button onClick={() => {
                setIsDetailsOpen(false);
                setPatientHistory([]);
              }} className={styles.closeBtn}>
                <X size={20} />
              </button>
            </div>

            <div className={styles.panelContent}>
              <div className={styles.detailSection}>
                <label>PATIENT INFORMATION</label>
                <div className={styles.detailItem}>
                  <strong>{selectedAptDetails?.patient_name}</strong>
                  <span>{selectedAptDetails?.patient_email}</span>
                  <span>{selectedAptDetails?.patient_phone}</span>
                </div>
              </div>

              <div className={styles.detailSection}>
                <label>APPOINTMENT INFO</label>
                <div className={styles.detailRow}>
                  <div>
                    <span>Date</span>
                    <strong>{new Date(selectedAptDetails?.scheduled_at).toLocaleDateString()}</strong>
                  </div>
                  <div>
                    <span>Time</span>
                    <strong>{new Date(selectedAptDetails?.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
                  </div>
                </div>
                <div className={styles.detailRow}>
                  <div>
                    <span>Modality</span>
                    <strong className={styles.typeLabel}>{selectedAptDetails?.type === 'telemedicine' ? 'Virtual' : 'In-Clinic'}</strong>
                  </div>
                  <div>
                    <span>Status</span>
                    <div>
                      <span className={
                        selectedAptDetails?.status === 'confirmed' ? styles.statusConfirmed :
                        selectedAptDetails?.status === 'completed' ? styles.statusCompleted :
                        selectedAptDetails?.status === 'cancelled' ? styles.statusCancelled :
                        styles.statusPending
                      }>
                        {selectedAptDetails?.status ? selectedAptDetails.status.charAt(0).toUpperCase() + selectedAptDetails.status.slice(1) : 'Pending'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.detailSection}>
                <label>CLINICAL REASON / DESCRIPTION</label>
                <div className={styles.clinicalNotes}>
                  {stripSystemMetadata(selectedAptDetails?.clinical_notes) || "No description provided."}
                </div>
              </div>

              {isDoctor && (
                <div className={styles.detailSection}>
                  <label>DOCTOR'S CONSULTATION NOTES</label>
                  <textarea 
                    className={styles.notesInput}
                    placeholder="Enter diagnosis, prescriptions, or follow-up notes..."
                    value={notesText}
                    onChange={(e) => setNotesText(e.target.value)}
                    rows={6}
                  />
                  <button 
                    className={styles.btnSave} 
                    onClick={handleSaveNotes}
                    disabled={isUpdating}
                  >
                    {isUpdating ? <Loader2 className={styles.spinner} size={16} /> : "Save Clinical Notes"}
                  </button>
                </div>
              )}

              {selectedAptDetails?.meet_link && (
                <div className={styles.detailSection}>
                  <label>TELEMEDICINE LINK</label>
                  <a href={selectedAptDetails.meet_link} target="_blank" rel="noopener noreferrer" className={styles.panelLink}>
                    <Video size={16} />
                    Join Virtual Clinic
                  </a>
                </div>
              )}

              <div className={styles.detailSection}>
                <label>FINANCIALS</label>
                <div className={styles.paymentRow}>
                  <span>Consultation Fee Paid</span>
                  <strong>NGN {getAppointmentAmount(selectedAptDetails).toLocaleString()}</strong>
                </div>
              </div>

              <div className={styles.detailSection}>
                <label>PATIENT MEDICAL HISTORY</label>
                <button 
                  className={styles.btnHistory} 
                  onClick={() => loadPatientHistory(selectedAptDetails.patient_email, selectedAptDetails.id)}
                  disabled={isHistoryLoading}
                >
                  {isHistoryLoading ? <Loader2 className={styles.spinner} size={16} /> : <Clock size={16} />}
                  Load Past Consultations
                </button>

                {patientHistory.length > 0 && (
                  <div className={styles.historyList}>
                    {patientHistory.map((history) => (
                      <div key={history.id} className={styles.historyItem}>
                        <div className={styles.historyMeta}>
                          <strong>{new Date(history.scheduled_at).toLocaleDateString()}</strong>
                          <span>{history.type === 'telemedicine' ? 'Virtual' : 'Clinic'}</span>
                        </div>
                        <p>{stripSystemMetadata(history.doctor_notes || history.clinical_notes) || "No notes recorded."}</p>
                      </div>
                    ))}
                    {patientHistory.length === 0 && (
                      <p className={styles.noHistory}>No previous records found for this patient.</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className={styles.panelActions}>
              <div className={styles.statusActions}>
                {selectedAptDetails?.status === 'confirmed' && (
                  <button 
                    className={styles.btnComplete} 
                    onClick={() => handleUpdateStatus('completed')}
                    disabled={isUpdating}
                  >
                    {isUpdating ? <Loader2 className={styles.spinner} size={18} /> : <CheckCircle2 size={18} />}
                    Mark as Completed
                  </button>
                )}
                {(selectedAptDetails?.status === 'pending' || selectedAptDetails?.status === 'confirmed') && (
                  <button 
                    className={styles.btnCancel} 
                    onClick={() => handleUpdateStatus('cancelled')}
                    disabled={isUpdating}
                  >
                    <X size={18} />
                    Cancel Appointment
                  </button>
                )}
              </div>
              <button className={styles.btnOutlineFull} onClick={() => {
                setIsDetailsOpen(false);
                setPatientHistory([]);
              }}>Close Panel</button>
            </div>
          </div>
        </div>
      )}

      {/* Assignment Modal */}
      {isAssignModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div>
                <h2>Assign Doctor</h2>
                <p className={styles.patientNameModal}>Patient: {selectedApt?.patient_name}</p>
              </div>
              <button onClick={() => setIsAssignModalOpen(false)}><X size={20} /></button>
            </div>
            <div className={styles.doctorList}>
              {doctors.map((dr) => (
                <button 
                  key={dr.id} 
                  className={styles.doctorOption}
                  onClick={() => handleAssignDoctor(dr.id)}
                  disabled={isUpdating}
                >
                  <div className={styles.drAvatar}>
                    {dr.full_name.split(' ').map((n: string) => n[0]).join('')}
                  </div>
                  <div className={styles.drInfo}>
                    <strong>{dr.full_name}</strong>
                    <span>{dr.specialty || 'General Practice'}</span>
                  </div>
                  {isUpdating ? <Loader2 className={styles.spinner} size={16} /> : <ArrowUpRight size={16} />}
                </button>
              ))}
              {doctors.length === 0 && (
                <div className={styles.loadingState}>
                  <p>No doctors registered in the system yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Custom Premium Toast Notification */}
      {toast && (
        <div className={`${styles.toast} ${toast.type === 'success' ? styles.toastSuccess : styles.toastError}`}>
          <div className={styles.toastInner}>
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} className={styles.toastCloseBtn}>
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
