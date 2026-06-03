'use client';

import { 
  Search, 
  Calendar, 
  Video, 
  Building2, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ArrowUpRight, 
  Download, 
  Loader2,
  X
} from "lucide-react";
import styles from "./appointments.module.css";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/app/lib/supabase";
import { updateAppointmentStatus, saveClinicalNotes } from "../actions";
import { stripSystemMetadata } from "@/app/lib/telemedicine/note-utils";

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Custom premium toast notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const getAppointmentAmount = (apt: any) => {
    if (!apt) return 0;
    if (apt.amount) return Number(apt.amount);
    return 0;
  };
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");

  // Details Panel State
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedAptDetails, setSelectedAptDetails] = useState<any>(null);
  const [notesText, setNotesText] = useState("");
  const [patientHistory, setPatientHistory] = useState<any[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

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

  async function loadData() {
    setIsLoading(true);
    try {
      const { data: apts } = await supabase
        .from('appointments')
        .select('*, clinical_notes:notes')
        .order('scheduled_at', { ascending: false });
      
      setAppointments(apts || []);

      // Fetch doctors list for names
      const { data: drs } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'doctor');
      setDoctors(drs || []);
    } catch (e) {
      console.error("Failed to load appointments data:", e);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [supabase]);

  // Load History
  async function loadPatientHistory(email: string) {
    setIsHistoryLoading(true);
    const { data } = await supabase
      .from('appointments')
      .select('*, clinical_notes:notes')
      .eq('patient_email', email)
      .order('scheduled_at', { ascending: false });
    
    setPatientHistory(data || []);
    setIsHistoryLoading(false);
  }

  // Update Status
  async function handleUpdateStatus(status: string) {
    if (!selectedAptDetails) return;
    setIsUpdating(true);

    const result = await updateAppointmentStatus(selectedAptDetails.id, status);

    if (!result.success) {
      setToast({ message: "Error updating status: " + result.error, type: 'error' });
    } else {
      setToast({ message: `Successfully marked consultation as ${status}!`, type: 'success' });
      setIsDetailsOpen(false);
      loadData(); // Refresh main list
    }
    setIsUpdating(false);
  }

  // Save Notes
  async function handleSaveNotes() {
    if (!selectedAptDetails) return;
    setIsUpdating(true);

    const result = await saveClinicalNotes(selectedAptDetails.id, notesText);

    if (!result.success) {
      setToast({ message: "Error saving notes: " + result.error, type: 'error' });
    } else {
      const updatedApt = { ...selectedAptDetails, doctor_notes: notesText };
      setSelectedAptDetails(updatedApt);

      setAppointments(appointments.map(a =>
        a.id === selectedAptDetails.id ? { ...a, doctor_notes: notesText } : a
      ));
      setToast({ message: "Clinical notes updated successfully!", type: 'success' });
    }
    setIsUpdating(false);
  }

  // Export to CSV
  function handleExportCSV() {
    if (filteredApts.length === 0) {
      setToast({ message: "No consultation data available to export.", type: 'error' });
      return;
    }

    const headers = ["Appointment ID", "Patient Name", "Email", "Phone", "Type", "Scheduled Date", "Amount", "Status", "Clinical Notes"];
    const rows = filteredApts.map(apt => [
      apt.id,
      apt.patient_name,
      apt.patient_email,
      apt.patient_phone,
      apt.type === 'telemedicine' ? 'Virtual' : 'In-Clinic',
      new Date(apt.scheduled_at).toLocaleString(),
      getAppointmentAmount(apt),
      apt.status || 'Confirmed',
      stripSystemMetadata(apt.clinical_notes).replace(/"/g, '""')
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `MHC_Appointments_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Filter Logic
  const filteredApts = appointments.filter(apt => {
    const matchesSearch = 
      apt.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.patient_phone.includes(searchQuery) ||
      apt.patient_email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || (apt.status || "confirmed").toLowerCase() === statusFilter.toLowerCase();
    const matchesType = typeFilter === "all" || apt.type === typeFilter;
    
    let matchesDate = true;
    if (dateFilter) {
      const aptDateString = new Date(apt.scheduled_at).toISOString().split('T')[0];
      matchesDate = aptDateString === dateFilter;
    }

    return matchesSearch && matchesStatus && matchesType && matchesDate;
  });

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <h1>Appointments Archive</h1>
          <p>Search, filter, and export the complete patient consultation records.</p>
        </div>
        <button className={styles.exportBtn} onClick={handleExportCSV}>
          <Download size={18} />
          Export to CSV
        </button>
      </div>

      <div className={styles.filtersWrapper}>
        <div className={styles.search}>
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Search patient name, phone, or email..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className={styles.filtersRow}>
          <div className={styles.filterGroup}>
            <label>Modality</label>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="all">All Visits</option>
              <option value="telemedicine">Virtual (Telemedicine)</option>
              <option value="in_clinic">In-Clinic</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label>Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label>Date</label>
            <input 
              type="date" 
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>
          
          {(searchQuery || statusFilter !== "all" || typeFilter !== "all" || dateFilter) && (
            <button 
              className={styles.resetBtn}
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
                setTypeFilter("all");
                setDateFilter("");
              }}
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className={styles.loadingState}>
          <Loader2 className={styles.spinner} size={30} />
          <p>Retrieving records from database...</p>
        </div>
      ) : (
        <div className={styles.tableCard}>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Patient Name</th>
                  <th>Type</th>
                  <th>Date & Time</th>
                  <th>Doctor Assigned</th>
                  <th>Status</th>
                  <th>Financials</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredApts.map((apt) => {
                  const assignedDr = doctors.find(d => d.id === apt.doctor_id);
                  const isCompleted = apt.status === 'completed';
                  const isCancelled = apt.status === 'cancelled';
                  
                  return (
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
                      <td>
                        {assignedDr ? (
                          <span className={styles.doctorName}>{assignedDr.full_name}</span>
                        ) : (
                          <span className={styles.unassigned}>Not Assigned</span>
                        )}
                      </td>
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
                        <strong className={styles.amount}>NGN {getAppointmentAmount(apt).toLocaleString()}</strong>
                      </td>
                      <td>
                        <button 
                          className={styles.iconBtn}
                          onClick={() => {
                            setSelectedAptDetails(apt);
                            setIsDetailsOpen(true);
                          }}
                        >
                          <ArrowUpRight size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredApts.length === 0 && (
                  <tr>
                    <td colSpan={7} className={styles.emptyRow}>
                      <Clock size={40} />
                      <p>No matching appointment records found.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Slide-out Patient Details Panel */}
      {isDetailsOpen && (
        <div className={styles.sidePanelOverlay} onClick={() => setIsDetailsOpen(false)}>
          <div className={styles.sidePanel} onClick={e => e.stopPropagation()}>
            <div className={styles.panelHeader}>
              <div>
                <h2>Consultation File</h2>
                <p>Ref: {selectedAptDetails?.id.slice(0, 8)}</p>
              </div>
              <button 
                onClick={() => {
                  setIsDetailsOpen(false);
                  setPatientHistory([]);
                }} 
                className={styles.closeBtn}
              >
                <X size={20} />
              </button>
            </div>

            <div className={styles.panelContent}>
              <div className={styles.detailSection}>
                <label>PATIENT DOSSIER</label>
                <div className={styles.detailItem}>
                  <strong>{selectedAptDetails?.patient_name}</strong>
                  <span>{selectedAptDetails?.patient_email}</span>
                  <span>{selectedAptDetails?.patient_phone}</span>
                </div>
              </div>

              <div className={styles.detailSection}>
                <label>APPOINTMENT DETAILS</label>
                <div className={styles.detailRow}>
                  <div>
                    <span>Scheduled Date</span>
                    <strong>{new Date(selectedAptDetails?.scheduled_at).toLocaleDateString()}</strong>
                  </div>
                  <div>
                    <span>Scheduled Time</span>
                    <strong>{new Date(selectedAptDetails?.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
                  </div>
                </div>
                <div className={styles.detailRow}>
                  <div>
                    <span>Modality</span>
                    <strong style={{ color: 'var(--primary)' }}>
                      {selectedAptDetails?.type === 'telemedicine' ? 'Virtual Consultation' : 'In-Clinic Visit'}
                    </strong>
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
                <label>SYMPTOMS / CLINICAL COMPLAINT</label>
                <div className={styles.clinicalNotes}>
                  {stripSystemMetadata(selectedAptDetails?.clinical_notes) || "No complaint or description registered."}
                </div>
              </div>

              <div className={styles.detailSection}>
                <label>CLINICAL CONSULTATION NOTES</label>
                <textarea 
                  className={styles.notesInput}
                  placeholder="Enter medical diagnostics, prescriptions, dosage, and follow-up directives..."
                  value={notesText}
                  onChange={(e) => setNotesText(e.target.value)}
                  rows={6}
                />
                <button 
                  className={styles.btnSave} 
                  onClick={handleSaveNotes}
                  disabled={isUpdating}
                >
                  {isUpdating ? <Loader2 className={styles.spinner} size={16} /> : "Update Medical Record"}
                </button>
              </div>

              {selectedAptDetails?.meet_link && (
                <div className={styles.detailSection}>
                  <label>VIRTUAL CONSULTATION</label>
                  <a href={selectedAptDetails.meet_link} target="_blank" rel="noopener noreferrer" className={styles.panelLink}>
                    <Video size={16} />
                    Join Virtual Clinic
                  </a>
                </div>
              )}

              <div className={styles.detailSection}>
                <label>PATIENT HISTORICAL RECORD</label>
                <button 
                  className={styles.btnHistory} 
                  onClick={() => loadPatientHistory(selectedAptDetails.patient_email)}
                  disabled={isHistoryLoading}
                >
                  {isHistoryLoading ? <Loader2 className={styles.spinner} size={16} /> : <Clock size={16} />}
                  Load Historical File
                </button>

                {patientHistory.length > 0 && (
                  <div className={styles.historyList}>
                    {patientHistory.filter(h => h.id !== selectedAptDetails.id).map((history) => (
                      <div key={history.id} className={styles.historyItem}>
                        <div className={styles.historyMeta}>
                          <strong>{new Date(history.scheduled_at).toLocaleDateString()}</strong>
                          <span>{history.type === 'telemedicine' ? 'Virtual' : 'Clinic'}</span>
                        </div>
                        <p>{stripSystemMetadata(history.doctor_notes || history.clinical_notes) || "No notes recorded."}</p>
                      </div>
                    ))}
                    {patientHistory.filter(h => h.id !== selectedAptDetails.id).length === 0 && (
                      <p className={styles.noHistory}>No past consultation records registered for this patient.</p>
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
                    Mark Patient Completed
                  </button>
                )}
                {(selectedAptDetails?.status === 'pending' || selectedAptDetails?.status === 'confirmed') && (
                  <button 
                    className={styles.btnCancel} 
                    onClick={() => handleUpdateStatus('cancelled')}
                    disabled={isUpdating}
                  >
                    <XCircle size={18} />
                    Cancel Consultation
                  </button>
                )}
              </div>
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
