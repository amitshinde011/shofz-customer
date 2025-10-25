-- ============================================================================
-- Add Indexes to viewanalytics for Fast View Count Queries
-- ============================================================================
-- This migration adds composite indexes to viewanalytics table to enable
-- fast COUNT queries for displaying view counts on products, shops, and offers
-- ============================================================================

-- Composite index for counting views by entity (most important)
-- This enables fast: SELECT COUNT(*) FROM viewanalytics WHERE entity_type = 'product' AND entity_id = 'xxx'
CREATE INDEX IF NOT EXISTS idx_viewanalytics_entity_type_id
  ON public.viewanalytics(entity_type, entity_id);

-- Index for counting unique viewers (for unique view counts if needed later)
CREATE INDEX IF NOT EXISTS idx_viewanalytics_entity_viewer
  ON public.viewanalytics(entity_type, entity_id, viewer_id);

-- Index for date-based queries (recent views, trending items)
CREATE INDEX IF NOT EXISTS idx_viewanalytics_entity_created
  ON public.viewanalytics(entity_type, entity_id, created_at DESC);

-- Index for session-based deduplication
CREATE INDEX IF NOT EXISTS idx_viewanalytics_session
  ON public.viewanalytics(session_id);

-- Index for viewer-based queries
CREATE INDEX IF NOT EXISTS idx_viewanalytics_viewer
  ON public.viewanalytics(viewer_id)
  WHERE viewer_id IS NOT NULL;

-- Comment explaining the optimization
COMMENT ON INDEX idx_viewanalytics_entity_type_id IS
  'Optimizes view count queries: SELECT COUNT(*) WHERE entity_type = ? AND entity_id = ?';
