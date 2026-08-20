CREATE DATABASE IF NOT EXISTS quizarena;
USE quizarena;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category VARCHAR(100),
  difficulty VARCHAR(50),
  question TEXT NOT NULL,
  options JSON NOT NULL,
  correct_index INT NOT NULL,
  explanation TEXT,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS histories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  mode VARCHAR(50),
  level_id INT NULL,
  category_filter VARCHAR(50),
  difficulty_filter VARCHAR(50),
  total_questions INT NOT NULL,
  correct_count INT NOT NULL,
  wrong_count INT NOT NULL,
  skipped_count INT NOT NULL,
  accuracy INT NOT NULL,
  duration_seconds INT NOT NULL,
  question_details JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
