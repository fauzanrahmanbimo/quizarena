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

CREATE TABLE IF NOT EXISTS questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  question_key VARCHAR(255) UNIQUE,
  level_id INT,
  category VARCHAR(255) NOT NULL,
  difficulty VARCHAR(50),
  question TEXT NOT NULL,
  options JSON NOT NULL,
  correct_index INT NOT NULL,
  explanation TEXT,
  material_link VARCHAR(255) NULL,
  content_version INT DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_question_level FOREIGN KEY (level_id) REFERENCES levels(id) ON DELETE SET NULL
);
