-- DOWN MIGRATION 02: Seed Schema Rollback
-- WARNING: ONLY FOR LOCAL/DEV/STAGING. NEVER RUN THIS ON PRODUCTION.

ALTER TABLE questions DROP FOREIGN KEY fk_question_level;
ALTER TABLE questions 
  DROP COLUMN question_key,
  DROP COLUMN level_id,
  DROP COLUMN material_link,
  DROP COLUMN content_version,
  DROP COLUMN is_active,
  DROP COLUMN updated_at;

DROP TABLE IF EXISTS levels;
