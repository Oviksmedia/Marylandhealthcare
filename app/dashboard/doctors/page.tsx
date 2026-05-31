'use client';

import {
  Plus,
  Search,
  MoreHorizontal,
  Mail,
  Phone,
  Stethoscope,
  CheckCircle2,
  Users,
  X,
  Loader2,
  Calendar,
  Clock,
  Video,
  Building2,
  Trash2
} from "lucide-react";
import styles from "./doctors.module.css";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/app/lib/supabase";
import { addDoctorWithAuth, editDoctorProfile, deactivateDoctor, suspendDoctor, unsuspendDoctor, updateDoctorAvailability } from "./actions";

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Dropdown & Modal State
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  
  // Edit State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<any>(null);

  // Schedule State
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedDoctorForSchedule, setSelectedDoctorForSchedule] = useState<any>(null);
  const [doctorAppointments, setDoctorAppointments] = useState<any[]>([]);
  const [isScheduleLoading, setIsScheduleLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    specialty: "General Practice",
    phone: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Custom states for modern glassmorphic overlays and toasts
  const [confirmDeactivateState, setConfirmDeactivateState] = useState<{ id: string; name: string } | null>(null);
  const [confirmSuspendState, setConfirmSuspendState] = useState<{ id: string; name: string } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isDeactivating, setIsDeactivating] = useState<string | null>(null);
  const [isSuspending, setIsSuspending] = useState<string | null>(null);

  // Availability Editor State
  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
  const [selectedDoctorForAvailability, setSelectedDoctorForAvailability] = useState<any>(null);
  const [availability, setAvailability] = useState<any>({
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: []
  });
  const [activeDay, setActiveDay] = useState<string>("monday");
  const [isSavingAvail, setIsSavingAvail] = useState(false);


  const supabase = getSupabaseBrowserClient();

  // Automatically clear toast notification after 4 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  async function loadDoctors() {
    setIsLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'doctor')
      .is('deleted_at', null);
    setDoctors(data || []);
    setIsLoading(false);
  }

  useEffect(() => {
    loadDoctors();

    // Close dropdown on click outside
    function handleOutsideClick() {
      setActiveDropdownId(null);
    }
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, [supabase]);

  async function handleAddDoctor(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const result = await addDoctorWithAuth({
      fullName: formData.fullName,
      email: formData.email,
      specialty: formData.specialty,
      phone: formData.phone
    });

    if (!result.success) {
      setToast({ message: "Error adding doctor: " + result.error, type: 'error' });
    } else {
      setToast({ message: `Successfully registered Dr. ${formData.fullName}!`, type: 'success' });
      setIsModalOpen(false);
      setFormData({ fullName: "", email: "", specialty: "General Practice", phone: "" });
      loadDoctors();
    }
    setIsSubmitting(false);
  }

  async function handleEditDoctor(e: React.FormEvent) {
    e.preventDefault();
    if (!editingDoctor) return;
    setIsSubmitting(true);

    const result = await editDoctorProfile(editingDoctor.id, {
      fullName: formData.fullName,
      email: formData.email,
      specialty: formData.specialty,
      phone: formData.phone
    });

    if (!result.success) {
      setToast({ message: "Error updating doctor: " + result.error, type: 'error' });
    } else {
      setToast({ message: `Successfully updated Dr. ${formData.fullName}'s profile.`, type: 'success' });
      setIsEditModalOpen(false);
      setEditingDoctor(null);
      setFormData({ fullName: "", email: "", specialty: "General Practice", phone: "" });
      loadDoctors();
    }
    setIsSubmitting(false);
  }

  async function executeDeactivateDoctor(doctorId: string, doctorName: string) {
    setIsDeactivating(doctorId);
    try {
      const result = await deactivateDoctor(doctorId);
      if (!result.success) {
        setToast({ message: "Error deactivating doctor: " + result.error, type: 'error' });
      } else {
        setToast({ message: `Dr. ${doctorName} successfully deactivated.`, type: 'success' });
        loadDoctors();
      }
    } catch (err: any) {
      console.error("Deactivate error:", err);
      setToast({ message: "An error occurred: " + (err.message || err), type: 'error' });
    } finally {
      setIsDeactivating(null);
      setConfirmDeactivateState(null);
    }
  }

  async function executeSuspendDoctor(doctorId: string, doctorName: string) {
    setIsSuspending(doctorId);
    try {
      const result = await suspendDoctor(doctorId);
      if (!result.success) {
        setToast({ message: "Error suspending doctor: " + result.error, type: 'error' });
      } else {
        setToast({ message: `Dr. ${doctorName} has been suspended. They can no longer access the portal.`, type: 'success' });
        loadDoctors();
      }
    } catch (err: any) {
      setToast({ message: "An error occurred: " + (err.message || err), type: 'error' });
    } finally {
      setIsSuspending(null);
      setConfirmSuspendState(null);
    }
  }

  async function executeUnsuspendDoctor(doctorId: string, doctorName: string) {
    setIsSuspending(doctorId);
    try {
      const result = await unsuspendDoctor(doctorId);
      if (!result.success) {
        setToast({ message: "Error unsuspending doctor: " + result.error, type: 'error' });
      } else {
        setToast({ message: `Dr. ${doctorName} has been reactivated.`, type: 'success' });
        loadDoctors();
      }
    } catch (err: any) {
      setToast({ message: "An error occurred: " + (err.message || err), type: 'error' });
    } finally {
      setIsSuspending(null);
    }
  }

  async function handleViewSchedule(doctor: any) {
    setSelectedDoctorForSchedule(doctor);
    setIsScheduleLoading(true);
    setIsScheduleModalOpen(true);

    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('doctor_id', doctor.id)
      .order('scheduled_at', { ascending: false });

    if (error) {
      setToast({ message: "Error loading schedule: " + error.message, type: 'error' });
    } else {
      setDoctorAppointments(data || []);
    }
    setIsScheduleLoading(false);
  }

  async function handleSaveAvailability(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDoctorForAvailability) return;
    setIsSavingAvail(true);

    const result = await updateDoctorAvailability(selectedDoctorForAvailability.id, availability);

    if (!result.success) {
      setToast({ message: "Error updating availability: " + result.error, type: 'error' });
    } else {
      setToast({ message: `Successfully updated availability schedule for Dr. ${selectedDoctorForAvailability.full_name}.`, type: 'success' });
      setIsAvailabilityModalOpen(false);
      setSelectedDoctorForAvailability(null);
      loadDoctors();
    }
    setIsSavingAvail(false);
  }


  const filteredDoctors = doctors.filter(doc => 
    doc.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.specialty?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <h1>Medical Staff Directory</h1>
          <p>Manage your doctors, specialties, and clinical availability.</p>
        </div>
        <button className={styles.addBtn} onClick={() => setIsModalOpen(true)}>
          <Plus size={20} />
          Add New Doctor
        </button>
      </div>

      <div className={styles.controls}>
        <div className={styles.search}>
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Search by name or specialty..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className={styles.loadingContainer}><Loader2 className={styles.spinner} size={30} /></div>
      ) : (
        <div className={styles.grid}>
          {filteredDoctors.map((doctor) => (
            <div key={doctor.id} className={`${styles.doctorCard} ${doctor.is_active === false ? styles.doctorCardSuspended : ''}`}>
              <div className={styles.cardHeader}>
                <div className={styles.avatar}>
                  {doctor.full_name.split(' ').map((n: string) => n[0]).join('').slice(0,2)}
                </div>
                <div className={styles.moreMenuContainer}>
                  <button 
                    className={styles.moreBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveDropdownId(activeDropdownId === doctor.id ? null : doctor.id);
                    }}
                  >
                    <MoreHorizontal size={18} />
                  </button>
                  {activeDropdownId === doctor.id && (
                    <div className={styles.dropdownMenu} onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => {
                        setEditingDoctor(doctor);
                        setFormData({
                          fullName: doctor.full_name,
                          email: doctor.email || "",
                          specialty: doctor.specialty || "General Practice",
                          phone: doctor.phone || ""
                        });
                        setIsEditModalOpen(true);
                        setActiveDropdownId(null);
                      }}>Edit Profile</button>
                      <button onClick={() => {
                        setSelectedDoctorForAvailability(doctor);
                        const defaultAvailability = {
                          monday: ["08:00 AM", "08:30 AM", "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "01:00 PM", "01:30 PM", "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM"],
                          tuesday: ["08:00 AM", "08:30 AM", "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "01:00 PM", "01:30 PM", "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM"],
                          wednesday: ["08:00 AM", "08:30 AM", "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "01:00 PM", "01:30 PM", "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM"],
                          thursday: ["08:00 AM", "08:30 AM", "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "01:00 PM", "01:30 PM", "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM"],
                          friday: ["08:00 AM", "08:30 AM", "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "01:00 PM", "01:30 PM", "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM"]
                        };
                        setAvailability(doctor.availability || defaultAvailability);
                        setActiveDay("monday");
                        setIsAvailabilityModalOpen(true);
                        setActiveDropdownId(null);
                      }}>Set Availability</button>
                      {doctor.is_active !== false ? (
                        <button className={styles.dropdownSuspend} onClick={() => {
                          setConfirmSuspendState({ id: doctor.id, name: doctor.full_name });
                          setActiveDropdownId(null);
                        }}>Suspend Doctor</button>
                      ) : (
                        <button className={styles.dropdownReactivate} onClick={() => {
                          executeUnsuspendDoctor(doctor.id, doctor.full_name);
                          setActiveDropdownId(null);
                        }}>Reactivate Doctor</button>
                      )}
                      <button className={styles.dropdownDelete} onClick={() => {
                        setConfirmDeactivateState({ id: doctor.id, name: doctor.full_name });
                        setActiveDropdownId(null);
                      }}>Deactivate Doctor</button>
                    </div>
                  )}
                </div>
              </div>
              
              <div className={styles.cardContent}>
                <h3>{doctor.full_name}</h3>
                <div className={styles.specialtyBadge}>
                  <Stethoscope size={14} />
                  {doctor.specialty || 'General Practice'}
                </div>
                
                <div className={styles.contactInfo}>
                  <div className={styles.infoItem}>
                    <Mail size={14} />
                    <span>{doctor.email || 'doctor@marylandhealthcare.com.ng'}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <Phone size={14} />
                    <span>{doctor.phone || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className={styles.cardFooter}>
                <div className={`${styles.status} ${doctor.is_active === false ? styles.statusSuspended : ''}`}>
                  {doctor.is_active === false ? (
                    <>
                      <X size={14} />
                      <span>Suspended</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} />
                      <span>Active</span>
                    </>
                  )}
                </div>
                <button className={styles.viewBtn} onClick={() => handleViewSchedule(doctor)}>View Schedule</button>
              </div>
            </div>
          ))}

          {filteredDoctors.length === 0 && (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}><Users size={48} /></div>
              <h3>No doctors found</h3>
              <p>Try a different search term or add a new medical professional.</p>
              <button className={`${styles.addBtn} ${styles.addBtnMargin}`} onClick={() => setIsModalOpen(true)}>
                Add New Doctor
              </button>
            </div>
          )}
        </div>
      )}

      {/* Add Doctor Modal */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>Register New Doctor</h2>
              <button onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleAddDoctor} className={styles.modalForm}>
              <div className={styles.inputGroup}>
                <label>Full Name</label>
                <input 
                  type="text" 
                  required 
                  value={formData.fullName}
                  onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                  placeholder="e.g. Dr. Stephen Ekwelibe"
                />
              </div>
              
              <div className={styles.inputGroup}>
                <label>Email Address</label>
                <input 
                  type="email" 
                  required 
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="doctor@gmail.com"
                />
              </div>

              <div className={styles.inputGroup}>
                <label>Specialty</label>
                <select 
                  value={formData.specialty}
                  onChange={(e) => setFormData({...formData, specialty: e.target.value})}
                >
                  <option>General Practice</option>
                  <option>Mental Health</option>
                  <option>Pediatrics</option>
                  <option>Obstetrics</option>
                  <option>Internal Medicine</option>
                  <option>Diagnostic Laboratory</option>
                </select>
              </div>

              <div className={styles.inputGroup}>
                <label>Phone Number</label>
                <input 
                  type="tel" 
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="080XXXXXXXX"
                />
              </div>

              <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className={styles.spinner} size={20} /> : "Register Doctor"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Doctor Modal */}
      {isEditModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>Edit Doctor Profile</h2>
              <button onClick={() => {
                setIsEditModalOpen(false);
                setEditingDoctor(null);
                setFormData({ fullName: "", email: "", specialty: "General Practice", phone: "" });
              }}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleEditDoctor} className={styles.modalForm}>
              <div className={styles.inputGroup}>
                <label>Full Name</label>
                <input 
                  type="text" 
                  required 
                  value={formData.fullName}
                  onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                  placeholder="e.g. Dr. Stephen Ekwelibe"
                />
              </div>
              
              <div className={styles.inputGroup}>
                <label>Email Address</label>
                <input 
                  type="email" 
                  required 
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="doctor@gmail.com"
                />
              </div>

              <div className={styles.inputGroup}>
                <label>Specialty</label>
                <select 
                  value={formData.specialty}
                  onChange={(e) => setFormData({...formData, specialty: e.target.value})}
                >
                  <option>General Practice</option>
                  <option>Mental Health</option>
                  <option>Pediatrics</option>
                  <option>Obstetrics</option>
                  <option>Internal Medicine</option>
                  <option>Diagnostic Laboratory</option>
                </select>
              </div>

              <div className={styles.inputGroup}>
                <label>Phone Number</label>
                <input 
                  type="tel" 
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="080XXXXXXXX"
                />
              </div>

              <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className={styles.spinner} size={20} /> : "Save Changes"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Doctor Schedule Modal */}
      {isScheduleModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.scheduleModal}>
            <div className={`${styles.modalHeader} ${styles.scheduleModalHeader}`}>
              <div>
                <h2 className={styles.scheduleModalTitle}>Attending Clinical Schedule</h2>
                <p className={styles.scheduleModalDoctor}>Assigned to: {selectedDoctorForSchedule?.full_name}</p>
              </div>
              <button onClick={() => {
                setIsScheduleModalOpen(false);
                setSelectedDoctorForSchedule(null);
                setDoctorAppointments([]);
              }}><X size={20} /></button>
            </div>
            
            <div className={styles.scheduleContent}>
              {isScheduleLoading ? (
                <div className={styles.loadingContainer}>
                  <Loader2 className={styles.spinner} size={30} />
                  <p className={styles.loadingText}>Fetching assigned queue...</p>
                </div>
              ) : (
                <div className={styles.appointmentsWrapper}>
                  {doctorAppointments.length > 0 ? (
                    <table className={styles.scheduleTable}>
                      <thead>
                        <tr>
                          <th>Patient Name</th>
                          <th>Modality</th>
                          <th>Date / Time</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {doctorAppointments.map((apt) => (
                          <tr key={apt.id}>
                            <td>
                              <div className={styles.patientInfo}>
                                <strong className={styles.patientName}>{apt.patient_name}</strong>
                                <span className={styles.patientPhone}>{apt.patient_phone}</span>
                              </div>
                            </td>
                            <td>
                              <span className={`${styles.badge} ${apt.type === 'telemedicine' ? styles.badgeVirtual : styles.badgeClinic}`}>
                                {apt.type === 'telemedicine' ? 'Virtual' : 'Clinic'}
                              </span>
                            </td>
                            <td>
                              <div className={styles.timeInfo}>
                                <span>{new Date(apt.scheduled_at).toLocaleDateString()}</span>
                                <small className={styles.timeValue}>{new Date(apt.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                              </div>
                            </td>
                            <td>
                              <span className={styles.statusBadge} data-status={apt.status || 'confirmed'}>
                                {apt.status || 'Confirmed'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className={styles.emptySchedule}>
                      <Calendar size={48} className={styles.emptyScheduleIcon} />
                      <h3>No consultations scheduled</h3>
                      <p>This medical professional is currently free of any bookings.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Admin Doctor Availability Modal */}
      {isAvailabilityModalOpen && (
        <div className={styles.modalOverlay} onClick={() => {
          setIsAvailabilityModalOpen(false);
          setSelectedDoctorForAvailability(null);
        }}>
          <div className={styles.availabilityModal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h2>Set Availability Schedule</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Managing slots for: <strong>{selectedDoctorForAvailability?.full_name}</strong>
                </p>
              </div>
              <button onClick={() => {
                setIsAvailabilityModalOpen(false);
                setSelectedDoctorForAvailability(null);
              }}><X size={20} /></button>
            </div>

            <div style={{ padding: '0 2rem 2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className={styles.daySelector}>
                {['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].map((day) => (
                  <button
                    key={day}
                    type="button"
                    className={`${styles.dayTab} ${activeDay === day ? styles.activeDayTab : ""}`}
                    onClick={() => setActiveDay(day)}
                  >
                    {day}
                  </button>
                ))}
              </div>

              <div className={styles.availabilityGridSection}>
                <h3>Active Slots for {activeDay.charAt(0).toUpperCase() + activeDay.slice(1)}</h3>
                <div className={styles.slotsGrid}>
                  {[
                    "08:00 AM", "08:30 AM", "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM",
                    "01:00 PM", "01:30 PM", "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM"
                  ].map((slot) => {
                    const isSelected = (availability[activeDay] || []).includes(slot);
                    return (
                      <button
                        key={slot}
                        type="button"
                        className={`${styles.slotToggleChip} ${isSelected ? styles.activeSlotChip : ""}`}
                        onClick={() => {
                          setAvailability((prev: any) => {
                            const currentDaySlots = prev[activeDay] || [];
                            const updated = currentDaySlots.includes(slot)
                              ? currentDaySlots.filter((s: string) => s !== slot)
                              : [...currentDaySlots, slot];
                            return {
                              ...prev,
                              [activeDay]: updated
                            };
                          });
                        }}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                className={styles.saveAvailBtn}
                disabled={isSavingAvail}
                onClick={handleSaveAvailability}
              >
                {isSavingAvail ? <Loader2 className={styles.spinner} size={18} /> : "Update Availability Schedule"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Premium Glassmorphic Deactivation Modal */}
      {confirmSuspendState && (
        <div className={styles.modalOverlay} onClick={() => setConfirmSuspendState(null)}>
          <div className={styles.confirmSuspendModal} onClick={e => e.stopPropagation()}>
            <div className={styles.warningIcon}>
              <Clock size={28} color="var(--feedback-warning, #f59e0b)" />
            </div>
            <h2>Suspend Dr. {confirmSuspendState.name}?</h2>
            <p>
              This doctor will immediately lose access to the portal and will not be assigned new appointments.
              All their data, appointments, and clinical notes are fully preserved. You can reactivate them at any time.
            </p>
            <div className={styles.confirmSuspendBtns}>
              <button
                className={styles.suspendCancel}
                onClick={() => setConfirmSuspendState(null)}
                disabled={isSuspending !== null}
              >
                Cancel
              </button>
              <button
                className={styles.suspendConfirm}
                onClick={() => executeSuspendDoctor(confirmSuspendState.id, confirmSuspendState.name)}
                disabled={isSuspending !== null}
              >
                {isSuspending ? (
                  <><Loader2 className={styles.spinner} size={14} /> Suspending...</>
                ) : (
                  "Yes, Suspend"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDeactivateState && (
        <div className={styles.modalOverlay} onClick={() => setConfirmDeactivateState(null)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeaderCustom}>
              <div className={styles.warningIcon}>
                <Trash2 size={24} color="oklch(0.6 0.18 29)" />
              </div>
              <h3>Deactivate Medical Professional</h3>
            </div>
            <div className={styles.modalBody}>
              <p>
                Are you sure you want to deactivate <strong>&ldquo;{confirmDeactivateState.name}&rdquo;</strong>?
              </p>
              <div className={styles.warningBox}>
                <p>⚠️ <strong>CRITICAL WARNING:</strong> Deactivating this doctor will revoke their active portal sessions immediately. Any current virtual consultations will be paused and queued for reassignment. <strong>This action is fully logged.</strong></p>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button 
                onClick={() => setConfirmDeactivateState(null)} 
                className={styles.cancelBtn}
                disabled={isDeactivating !== null}
              >
                Cancel
              </button>
              <button 
                onClick={() => executeDeactivateDoctor(confirmDeactivateState.id, confirmDeactivateState.name)} 
                className={styles.confirmBtn}
                disabled={isDeactivating !== null}
              >
                {isDeactivating ? (
                  <>
                    <Loader2 className={styles.spinner} size={14} />
                    Deactivating...
                  </>
                ) : (
                  "Yes, Deactivate"
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
