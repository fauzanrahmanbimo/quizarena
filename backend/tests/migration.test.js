const fs = require('fs');
const path = require('path');

describe('Database Migration Scripts', () => {
  let upSql;
  let downSql;

  beforeAll(() => {
    upSql = fs.readFileSync(path.join(__dirname, '../migrations/01_p1_additive_schema.sql'), 'utf8');
    downSql = fs.readFileSync(path.join(__dirname, '../migrations/01_p1_down.sql'), 'utf8');
  });

  test('UP migration does NOT drop users, questions, levels or histories table', () => {
    expect(upSql.toLowerCase()).not.toContain('drop table histories');
    expect(upSql.toLowerCase()).not.toContain('drop table users');
    expect(upSql.toLowerCase()).not.toContain('drop table questions');
    expect(upSql.toLowerCase()).not.toContain('drop table levels');
  });

  test('UP migration adds required P1-A tables and tracking', () => {
    const expectedTables = ['quiz_attempts', 'quiz_answers', 'user_progress', 'diagnostic_results', 'schema_migrations'];
    for (const table of expectedTables) {
      expect(upSql.toLowerCase()).toContain(`create table if not exists ${table}`);
    }
  });

  test('quiz_attempts has idempotency key and constraints', () => {
    expect(upSql.toLowerCase()).toContain('client_attempt_id varchar');
    expect(upSql.toLowerCase()).toContain('unique key unique_attempt_per_user (user_id, client_attempt_id)');
  });

  test('DOWN migration drops new tables only and is warned', () => {
    expect(downSql.toLowerCase()).toContain('drop table if exists diagnostic_results');
    expect(downSql.toLowerCase()).toContain('drop table if exists user_progress');
    expect(downSql.toLowerCase()).toContain('drop table if exists quiz_answers');
    expect(downSql.toLowerCase()).toContain('drop table if exists quiz_attempts');
    expect(downSql.toLowerCase()).toContain('drop table if exists schema_migrations');
    expect(downSql.toLowerCase()).toContain('never run this on production');
  });
});
