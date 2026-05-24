'use client';

import dynamic from "next/dynamic";

const BookingWizard = dynamic(() => import("./BookingWizard"), {
  ssr: false,
  loading: () => (
    <div style={{ height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-canvas)' }}>
      <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Preparing virtual wizard...</p>
    </div>
  )
});

export default function BookingClient() {
  return <BookingWizard />;
}
