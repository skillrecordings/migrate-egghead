-- Coursebuilder Test Database Seed Data
-- System user for migrations and test data

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- ============================================================================
-- System Migration User
-- Used as createdById for all migrated content
-- ============================================================================
INSERT INTO `egghead_User` (`id`, `email`, `name`, `createdAt`, `updatedAt`)
VALUES (
  'c903e890-0970-4d13-bdee-ea535aaaf69b',
  'system@egghead.io',
  'System Migration User',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
) ON DUPLICATE KEY UPDATE
  `email` = VALUES(`email`),
  `name` = VALUES(`name`),
  `updatedAt` = CURRENT_TIMESTAMP;

-- ============================================================================
-- Verification Queries (commented out, run manually if needed)
-- ============================================================================

-- Verify system user exists:
-- SELECT * FROM egghead_User WHERE id = 'c903e890-0970-4d13-bdee-ea535aaaf69b';

-- Check table counts:
-- SELECT 
--   (SELECT COUNT(*) FROM egghead_User) as users,
--   (SELECT COUNT(*) FROM egghead_ContentResource) as content_resources,
--   (SELECT COUNT(*) FROM egghead_ContentResourceResource) as relationships;
