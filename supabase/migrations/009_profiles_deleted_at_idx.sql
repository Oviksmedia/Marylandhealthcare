-- Create partial index on profiles(deleted_at) to avoid sequential scans on active users checks
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON public.profiles(deleted_at) WHERE deleted_at IS NULL;
