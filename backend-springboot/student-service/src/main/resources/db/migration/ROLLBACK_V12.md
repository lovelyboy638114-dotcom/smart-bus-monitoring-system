# Database Rollback Strategy: V12__add_id_card_generation_columns

> [!WARNING]
> While forward-fixing via next version migrations (e.g. `V13__...`) is the standard production deployment practice, this document details the SQL commands required to cleanly drop the elements introduced in V12 in case of an emergency deployment rollback.

### Emergency Rollback Script

```sql
-- 1. Drop Indexes
DROP INDEX idx_student_status ON students;
DROP INDEX idx_student_generation ON students;
DROP INDEX idx_download_student ON id_card_download_history;

-- 2. Drop Tables
DROP TABLE IF EXISTS processed_student_events;
DROP TABLE IF EXISTS id_card_download_history;

-- 3. Drop Columns from students table
ALTER TABLE students
DROP COLUMN id_card_failure_code,
DROP COLUMN id_card_failure_message,
DROP COLUMN id_card_generation_stage,
DROP COLUMN id_card_generation_started_at,
DROP COLUMN id_card_generation_completed_at,
DROP COLUMN id_card_checksum,
DROP COLUMN id_card_file_size,
DROP COLUMN id_card_version,
DROP COLUMN version;

-- 4. Delete Flyway Migration Record (if manually cleaning dirty migration state)
DELETE FROM flyway_schema_history WHERE version = '12';
```
