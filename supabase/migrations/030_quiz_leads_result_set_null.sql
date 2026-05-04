-- ════════════════════════════════════════════
-- TIQUIZ — quiz_leads.result_id → ON DELETE SET NULL
-- ════════════════════════════════════════════
--
-- The original FK from quiz_leads.result_id to quiz_results(id) was
-- created with no ON DELETE clause (default = NO ACTION), which means
-- Postgres rejects any DELETE on quiz_results the moment a lead points
-- at the row. That's how Gwenn's save kept failing with DELETE_FAILED:
-- the API tried to wipe + re-insert results, the FK said no, and her
-- edits never reached the DB.
--
-- The application code now does an in-place UPDATE for kept results
-- and a manual NULL-out of leads.result_id before deleting orphaned
-- ones. This migration moves that safety into the database itself so
-- the guarantee survives every possible code path — manual SQL
-- maintenance, future bugs, race conditions, you name it.
--
-- Lead row safety: untouched. Only result_id is nulled, and
-- result_title (snapshot column) is preserved. The dashboard reads
-- result_title with a fallback to the joined result name, so old
-- leads keep showing the result they were assigned to even after
-- their result row is deleted.
--
-- This change is safe to apply on a populated database:
--   • DROP CONSTRAINT does not touch any rows.
--   • ADD CONSTRAINT validates existing rows; since we're not changing
--     the referenced columns, every current row already complies.
--   • ON DELETE SET NULL only affects FUTURE deletes. Existing data is
--     not modified.

ALTER TABLE quiz_leads
  DROP CONSTRAINT IF EXISTS quiz_leads_result_id_fkey;

ALTER TABLE quiz_leads
  ADD CONSTRAINT quiz_leads_result_id_fkey
    FOREIGN KEY (result_id)
    REFERENCES quiz_results(id)
    ON DELETE SET NULL;
