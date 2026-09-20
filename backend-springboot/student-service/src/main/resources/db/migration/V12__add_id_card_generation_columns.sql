ALTER TABLE students
ADD COLUMN id_card_failure_code VARCHAR(50) NULL,
ADD COLUMN id_card_failure_message VARCHAR(255) NULL,
ADD COLUMN id_card_generation_stage VARCHAR(50) DEFAULT 'QUEUED',
ADD COLUMN id_card_generation_started_at DATETIME NULL,
ADD COLUMN id_card_generation_completed_at DATETIME NULL,
ADD COLUMN id_card_checksum VARCHAR(100) NULL,
ADD COLUMN id_card_file_size BIGINT NULL,
ADD COLUMN id_card_version INT DEFAULT 1,
ADD COLUMN version BIGINT DEFAULT 0;

CREATE TABLE id_card_download_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(50) NOT NULL,
    downloaded_by VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL,
    ip_address VARCHAR(50) NOT NULL,
    user_agent VARCHAR(255) NOT NULL,
    downloaded_at DATETIME NOT NULL
);

CREATE TABLE processed_student_events (
    event_id VARCHAR(100) PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    student_id VARCHAR(50) NOT NULL,
    correlation_id VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL,
    processed_at DATETIME NOT NULL,
    processing_duration_ms BIGINT DEFAULT 0,
    CONSTRAINT uq_event_id_type UNIQUE (event_id, event_type)
);

CREATE INDEX idx_student_status ON students(id_card_status);
CREATE INDEX idx_student_generation ON students(id_card_generation_started_at);
CREATE INDEX idx_download_student ON id_card_download_history(student_id);
