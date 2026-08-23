-- DOWN MIGRATION: Rollback P1-A schema changes
-- WARNING: ONLY FOR LOCAL/DEV/STAGING. NEVER RUN THIS ON PRODUCTION.
-- Do not drop users, questions, or histories.

DROP TABLE IF EXISTS quiz_answers;
DROP TABLE IF EXISTS diagnostic_results;
DROP TABLE IF EXISTS quiz_attempts;
DROP TABLE IF EXISTS user_progress;
DROP TABLE IF EXISTS schema_migrations;
