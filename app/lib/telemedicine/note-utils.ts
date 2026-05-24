/**
 * Utility functions for isolating system metadata from clinical notes.
 */

/**
 * Strips out operational system metadata tags from clinical notes to keep them clean for clinical/patient viewing.
 */
export function stripSystemMetadata(notes: string | null | undefined): string {
  if (!notes) return "";
  return notes
    .replace(/\[REMINDER_SENT\]/g, "")
    .replace(/\[SYSTEM:[^\]]*\]/g, "")
    .replace(/\n*---\n*\[SYSTEM_METADATA:[^\]]*\]/g, "")
    .trim();
}

/**
 * Appends a system metadata tag to notes cleanly.
 */
export function appendSystemMetadata(notes: string | null | undefined, tag: string): string {
  const baseNotes = notes ? notes.trim() : "";
  if (baseNotes.includes(tag)) return baseNotes;
  return baseNotes ? `${baseNotes} ${tag}` : tag;
}
