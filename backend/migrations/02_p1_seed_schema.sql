-- UP MIGRATION 02: Seed Schema
-- This adds levels table and modifies existing questions table to be production-ready

CREATE TABLE IF NOT EXISTS levels (
  id INT PRIMARY KEY,
  code VARCHAR(50) UNIQUE,
  name VARCHAR(100),
  title VARCHAR(255),
  sort_order INT,
  is_active BOOLEAN DEFAULT TRUE
);

ALTER TABLE questions
  ADD COLUMN question_key VARCHAR(255) UNIQUE AFTER id,
  ADD COLUMN level_id INT AFTER question_key,
  ADD COLUMN material_link VARCHAR(255) NULL AFTER explanation,
  ADD COLUMN content_version INT DEFAULT 1 AFTER material_link,
  ADD COLUMN is_active BOOLEAN DEFAULT TRUE AFTER content_version,
  ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

ALTER TABLE questions
  ADD CONSTRAINT fk_question_level FOREIGN KEY (level_id) REFERENCES levels(id) ON DELETE SET NULL;
