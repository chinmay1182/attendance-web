-- ============================================================
-- MIGRATION: Add company_id to jobs table
-- Required for: Recruitment module data isolation
-- ⚠️  Run STEP 1 first, wait for it to succeed, then run STEP 2
-- ============================================================

-- ══════════════════════════════════════════════════════════
-- STEP 1: Add column + index (run this first, alone)
-- ══════════════════════════════════════════════════════════
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_jobs_company_id ON jobs(company_id);


-- ══════════════════════════════════════════════════════════
-- STEP 2: Backfill existing rows (run this AFTER step 1)
-- ══════════════════════════════════════════════════════════
-- Note: created_by is TEXT, users.id is UUID → cast required
UPDATE jobs j
SET company_id = (
    SELECT u.company_id
    FROM users u
    WHERE u.id = j.created_by::uuid
    LIMIT 1
)
WHERE j.created_by IS NOT NULL;


-- ══════════════════════════════════════════════════════════
-- VERIFICATION (optional — run after both steps)
-- ══════════════════════════════════════════════════════════
-- SELECT id, company_id, created_by FROM jobs LIMIT 10;

