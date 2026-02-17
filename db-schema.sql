-- PostgreSQL database schema for Advanced Cloud Deployment

-- Tasks table
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    tags TEXT[],
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
    user_id UUID NOT NULL,
    recurrence_rule_id UUID REFERENCES recurrence_rules(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Reminders table
CREATE TABLE reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
    delivery_status VARCHAR(20) DEFAULT 'scheduled' CHECK (delivery_status IN ('scheduled', 'delivered', 'failed')),
    delivery_attempts INTEGER DEFAULT 0,
    delivered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Recurrence rules table
CREATE TABLE recurrence_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
    interval_count INTEGER DEFAULT 1 CHECK (interval_count > 0),
    end_date TIMESTAMP WITH TIME ZONE,
    occurrence_count INTEGER,
    days_of_week INTEGER[], -- 0=Sunday, 1=Monday, ..., 6=Saturday
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Audit log entries table
CREATE TABLE audit_log_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'completed')),
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('Task', 'Reminder', 'RecurrenceRule')),
    entity_id UUID NOT NULL,
    old_values JSONB,
    new_values JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
);

-- Events table for tracking processed events
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    subject_id UUID NOT NULL,
    subject_type VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed BOOLEAN DEFAULT FALSE
);

-- Indexes for performance
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_created_at ON tasks(created_at);
CREATE INDEX idx_reminders_task_id ON reminders(task_id);
CREATE INDEX idx_reminders_user_id ON reminders(user_id);
CREATE INDEX idx_reminders_scheduled_time ON reminders(scheduled_time);
CREATE INDEX idx_reminders_delivery_status ON reminders(delivery_status);
CREATE INDEX idx_audit_log_entries_user_id ON audit_log_entries(user_id);
CREATE INDEX idx_audit_log_entries_entity_type ON audit_log_entries(entity_type);
CREATE INDEX idx_audit_log_entries_entity_id ON audit_log_entries(entity_id);
CREATE INDEX idx_audit_log_entries_timestamp ON audit_log_entries(timestamp);
CREATE INDEX idx_events_event_type ON events(event_type);
CREATE INDEX idx_events_subject_id ON events(subject_id);
CREATE INDEX idx_events_processed ON events(processed);