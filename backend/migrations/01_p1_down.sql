-- DOWN MIGRATION: Rollback P1-A schema changes

DROP TABLE IF EXISTS diagnostic_results;
DROP TABLE IF EXISTS user_progress;
DROP TABLE IF EXISTS quiz_answers;
DROP TABLE IF EXISTS quiz_attempts;
DROP TABLE IF EXISTS levels;
