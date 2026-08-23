-- UP MIGRATION: Additive schema for P1-A
-- Do not drop existing `histories` table.

-- 1. Levels (optional but good for referential integrity if needed, though P0 levels are static)
CREATE TABLE IF NOT EXISTS levels (
  id INT PRIMARY KEY,
  unlock_threshold INT DEFAULT 70
);

-- 2. Quiz Attempts
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_attempt_id VARCHAR(100) NOT NULL,
  user_id INT NOT NULL,
  attempt_type ENUM('diagnostic', 'practice', 'timed_quiz') NOT NULL,
  level_id INT NULL,
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP NOT NULL,
  total_questions INT NOT NULL,
  correct_count INT NOT NULL,
  incorrect_count INT NOT NULL,
  unanswered_count INT NOT NULL,
  accuracy INT NOT NULL,
  average_answer_time INT NOT NULL,
  passed BOOLEAN NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_attempt_per_user (user_id, client_attempt_id),
  INDEX idx_user_type (user_id, attempt_type),
  INDEX idx_completed_at (completed_at)
);

-- 3. Quiz Answers
CREATE TABLE IF NOT EXISTS quiz_answers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  attempt_id INT NOT NULL,
  question_id VARCHAR(50) NOT NULL, -- P0 uses string or number IDs. Using VARCHAR(50) for compatibility.
  topic VARCHAR(50) NOT NULL,
  selected_option_id INT NULL,
  correct_option_id INT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  time_spent INT NOT NULL,
  FOREIGN KEY (attempt_id) REFERENCES quiz_attempts(id) ON DELETE CASCADE
);

-- 4. Diagnostic Results
CREATE TABLE IF NOT EXISTS diagnostic_results (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  attempt_id INT NOT NULL,
  recommended_level INT NOT NULL,
  weak_topics_json JSON NOT NULL,
  completed_at TIMESTAMP NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (attempt_id) REFERENCES quiz_attempts(id) ON DELETE CASCADE
);

-- 5. User Progress
CREATE TABLE IF NOT EXISTS user_progress (
  user_id INT PRIMARY KEY,
  recommended_level INT NULL,
  highest_unlocked_level INT DEFAULT 1,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
