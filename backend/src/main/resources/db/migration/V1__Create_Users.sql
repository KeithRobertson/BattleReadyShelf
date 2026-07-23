-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_users_email ON users(email);

-- Allowed emails for OAuth allowlist
CREATE TABLE IF NOT EXISTS allowed_emails (
    email VARCHAR(255) PRIMARY KEY,
    added_at TIMESTAMP WITH TIME ZONE NOT NULL
);
