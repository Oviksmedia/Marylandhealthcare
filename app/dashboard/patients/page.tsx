'use client';

import { 
  Search, 
  User, 
  Clock, 
  FileText, 
  Loader2, 
  ArrowUpRight, 
  X,
  Phone,
  Mail,
  Activity,
  HeartPulse,
  Trash2
} from "lucide-react";
import styles from "./patients.module.css";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/app/lib/supabase";
import { deletePatient } from "../actions";
import { stripSystemMetadata } from "@/app/lib/telemedicine/note-utils";

export default function PatientsPage() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [uniquePatients, setUniquePatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Search & Details State
  const [searchQuery, setSearchQuery] = useState("");
  const [isDossierOpen, setIsDossierOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [patientHistory, setPatientHistory] = useState<any[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Custom premium modal & toast states
  const [confirmDeleteState, setConfirmDeleteState] = useState<{ email: string; name: string } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const supabase = getSupabaseBrowserClient();

  // Automatically clear toast notification after 4 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  async function loadData() {
    setIsLoading(true);

    const { data: apts } = await supabase
      .from('appointments')
      .select('*, clinical_notes:notes')
      .order('scheduled_at', { ascending: false });
    
    const aptList = apts || [];
    setAppointments(aptList);

    // Fetch doctors
    const { data: drs } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'doctor');
    setDoctors(drs || []);

    // Consolidate unique patients from appointments
    const patientsMap = new Map();
    
    aptList.forEach((apt: any) => {
      const email = (apt.patient_email || '').toLowerCase().trim();
      if (!email) return;

      const existing = patientsMap.get(email);
      if (!existing) {
        patientsMap.set(email, {
          name: apt.patient_name,
          email: apt.patient_email,
          phone: apt.patient_phone,
          totalVisits: 1,
          lastVisitDate: apt.scheduled_at,
          lastModality: apt.type === 'telemedicine' ? 'Virtual' : 'In-Clinic',
          description: apt.clinical_notes,
          hmo: apt.clinical_notes?.includes("HMO:") ? apt.clinical_notes.split("HMO:")[1].split("|")[0].trim() : "Private"
        });
      } else {
        existing.totalVisits += 1;
        // Since appointments are ordered descending, lastVisitDate is already the newest
        if (new Date(apt.scheduled_at) > new Date(existing.lastVisitDate)) {
          existing.lastVisitDate = apt.scheduled_at;
          existing.lastModality = apt.type === 'telemedicine' ? 'Virtual' : 'In-Clinic';
        }
      }
    });

    setUniquePatients(Array.from(patientsMap.values()));
    setIsLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [supabase]);

  async function executeDeletePatient(email: string, name: string) {
    setIsDeleting(email);
    try {
      const result = await deletePatient(email);
      if (result.success) {
        setToast({ message: `Successfully deleted patient "${name}" and all related records.`, type: 'success' });
        await loadData();
        if (selectedPatient?.email === email) {
          setIsDossierOpen(false);
          setSelectedPatient(null);
        }
      } else {
        setToast({ message: `Failed to delete patient: ${result.error}`, type: 'error' });
      }
    } catch (err: any) {
      console.error("Delete patient error:", err);
      setToast({ message: `An error occurred: ${err.message || err}`, type: 'error' });
    } finally {
      setIsDeleting(null);
      setConfirmDeleteState(null);
    }
  }

  // Load patient file timeline
  async function loadPatientFile(email: string) {
    setIsHistoryLoading(true);
    const { data } = await supabase
      .from('appointments')
      .select('*, clinical_notes:notes')
      .eq('patient_email', email)
      .order('scheduled_at', { ascending: false });
    
    setPatientHistory(data || []);
    setIsHistoryLoading(false);
  }

  // Filter Logic
  const filteredPatients = uniquePatients.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.phone.includes(searchQuery)
  );

  // Statistics
  const totalCount = uniquePatients.length;
  const returningCount = uniquePatients.filter(p => p.totalVisits > 1).length;
  const returningRate = totalCount ? Math.round((returningCount / totalCount) * 100) : 0;
  const virtualPreferred = uniquePatients.filter(p => p.lastModality === 'Virtual').length;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <h1>Patients Database</h1>
          <p>Consolidated directory of all unique patients, historical records, and clinical files.</p>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'oklch(0.96 0.01 193 / 0.8)' }}>
            <User size={24} color="var(--primary)" />
          </div>
          <div className={styles.statInfo}>
            <span>Unique Patients</span>
            <strong>{totalCount}</strong>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'oklch(0.96 0.01 193 / 0.8)' }}>
            <Activity size={24} color="var(--primary)" />
          </div>
          <div className={styles.statInfo}>
            <span>Returning Patient Rate</span>
            <strong>{returningRate}%</strong>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'oklch(0.96 0.01 193 / 0.8)' }}>
            <HeartPulse size={24} color="var(--primary)" />
          </div>
          <div className={styles.statInfo}>
            <span>Virtual Care Patrons</span>
            <strong>{virtualPreferred}</strong>
          </div>
        </div>
      </div>

      <div className={styles.controls}>
        <div className={styles.search}>
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Search by patient name, email, or phone..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className={styles.loadingState}>
          <Loader2 className={styles.spinner} size={30} />
          <p>Compiling historical client indexes...</p>
        </div>
      ) : (
        <div className={styles.tableCard}>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Patient Name</th>
                  <th>Contact Email</th>
                  <th>Contact Phone</th>
                  <th>Last Modality</th>
                  <th>Last Consultation</th>
                  <th>Total Visits</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map((patient, index) => (
                  <tr key={index}>
                    <td>
                      <div className={styles.patientNameRow}>
                        <div className={styles.avatar}>
                          {patient.name.split(' ').map((n: string) => n[0]).join('').slice(0,2)}
                        </div>
                        <strong>{patient.name}</strong>
                      </div>
                    </td>
                    <td>
                      <span className={styles.emailText}>{patient.email}</span>
                    </td>
                    <td>
                      <span className={styles.phoneText}>{patient.phone}</span>
                    </td>
                    <td>
                      <span className={`${styles.badge} ${patient.lastModality === 'Virtual' ? styles.badgeVirtual : styles.badgeClinic}`}>
                        {patient.lastModality}
                      </span>
                    </td>
                    <td>
                      <span>{new Date(patient.lastVisitDate).toLocaleDateString()}</span>
                    </td>
                    <td>
                      <strong className={styles.visitCount}>{patient.totalVisits} {patient.totalVisits > 1 ? 'visits' : 'visit'}</strong>
                    </td>
                    <td>
                      <div className={styles.actionButtons}>
                        <button 
                          className={styles.viewDossierBtn}
                          onClick={() => {
                            setSelectedPatient(patient);
                            loadPatientFile(patient.email);
                            setIsDossierOpen(true);
                          }}
                        >
                          <FileText size={14} />
                          View Dossier
                        </button>
                        <button 
                          className={styles.deletePatientBtn}
                          disabled={isDeleting !== null}
                          onClick={() => setConfirmDeleteState({ email: patient.email, name: patient.name })}
                        >
                          {isDeleting === patient.email ? (
                            <Loader2 className={styles.spinner} size={14} />
                          ) : (
                            <Trash2 size={14} />
                          )}
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredPatients.length === 0 && (
                  <tr>
                    <td colSpan={7} className={styles.emptyRow}>
                      <User size={40} />
                      <p>No patient indexes match your search criteria.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Patient Dossier Side Panel */}
      {isDossierOpen && (
        <div className={styles.sidePanelOverlay} onClick={() => setIsDossierOpen(false)}>
          <div className={styles.sidePanel} onClick={e => e.stopPropagation()}>
            <div className={styles.panelHeader}>
              <div>
                <h2>Clinical Patient Dossier</h2>
                <p>Profile & Complete History Timeline</p>
              </div>
              <button onClick={() => setIsDossierOpen(false)} className={styles.closeBtn}>
                <X size={20} />
              </button>
            </div>

            <div className={styles.panelContent}>
              <div className={styles.detailSection}>
                <label>PATIENT SPECIFICATIONS</label>
                <div className={styles.dossierProfile}>
                  <div className={styles.dossierAvatar}>
                    {selectedPatient?.name.split(' ').map((n: string) => n[0]).join('').slice(0,2)}
                  </div>
                  <div className={styles.dossierMeta}>
                    <h3>{selectedPatient?.name}</h3>
                    <div className={styles.dossierContact}>
                      <Mail size={13} /> {selectedPatient?.email}
                    </div>
                    <div className={styles.dossierContact}>
                      <Phone size={13} /> {selectedPatient?.phone}
                    </div>
                    <button 
                      className={styles.deletePatientDossierBtn}
                      disabled={isDeleting !== null}
                      onClick={() => setConfirmDeleteState({ email: selectedPatient.email, name: selectedPatient.name })}
                    >
                      {isDeleting === selectedPatient?.email ? (
                        <Loader2 className={styles.spinner} size={13} />
                      ) : (
                        <Trash2 size={13} />
                      )}
                      Delete Patient Profile
                    </button>
                  </div>
                </div>
              </div>

              <div className={styles.detailSection}>
                <label>HISTORICAL CLINICAL TIMELINE</label>
                {isHistoryLoading ? (
                  <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <Loader2 className={styles.spinner} size={24} />
                  </div>
                ) : (
                  <div className={styles.timeline}>
                    {patientHistory.map((item, idx) => {
                      const drName = doctors.find(d => d.id === item.doctor_id)?.full_name || 'Care Team';
                      return (
                        <div key={item.id} className={styles.timelineItem}>
                          <div className={styles.timelineDot} />
                          <div className={styles.timelineContent}>
                            <div className={styles.timelineHeader}>
                              <strong>{new Date(item.scheduled_at).toLocaleDateString()}</strong>
                              <span className={item.type === 'telemedicine' ? styles.badgeVirtual : styles.badgeClinic}>
                                {item.type === 'telemedicine' ? 'Virtual' : 'In-Clinic'}
                              </span>
                            </div>
                            <span className={styles.attendingDr}>Attending: {drName}</span>
                            <div className={styles.timelineNotes}>
                              <strong>Reason for Visit:</strong>
                              <p>{stripSystemMetadata(item.clinical_notes) || "Routine Consultation"}</p>
                              
                              <strong>Clinical Notes:</strong>
                              <p>{stripSystemMetadata(item.clinical_notes) || "No clinical diagnostic recorded yet."}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {patientHistory.length === 0 && (
                      <p className={styles.noHistory}>No timeline files registered.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Premium Glassmorphic Confirmation Modal */}
      {confirmDeleteState && (
        <div className={styles.modalOverlay} onClick={() => setConfirmDeleteState(null)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeaderCustom}>
              <div className={styles.warningIcon}>
                <Trash2 size={24} color="oklch(0.6 0.18 29)" />
              </div>
              <h3>Confirm Patient Deletion</h3>
            </div>
            <div className={styles.modalBody}>
              <p>
                Are you sure you want to permanently delete patient <strong>&ldquo;{confirmDeleteState.name}&rdquo;</strong>?
              </p>
              <div className={styles.warningBox}>
                <p>⚠️ <strong>CRITICAL WARNING:</strong> This action is fully compliant with the NDPA 2023. We will automatically soft-delete and pseudonymize all contact logs while preserving the clinical audit trail for medical records. <strong>This cannot be undone.</strong></p>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button 
                onClick={() => setConfirmDeleteState(null)} 
                className={styles.cancelBtn}
                disabled={isDeleting !== null}
              >
                Cancel
              </button>
              <button 
                onClick={() => executeDeletePatient(confirmDeleteState.email, confirmDeleteState.name)} 
                className={styles.confirmBtn}
                disabled={isDeleting !== null}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className={styles.spinner} size={14} />
                    Deleting...
                  </>
                ) : (
                  "Yes, Delete Patient"
                )}
              </button>
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
