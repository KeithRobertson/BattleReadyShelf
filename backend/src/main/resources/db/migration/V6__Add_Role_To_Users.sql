-- RBAC: role-based access control for users
CREATE TYPE user_role AS ENUM ('USER', 'ADMIN', 'SUPERADMIN');

ALTER TABLE users
    ADD COLUMN role user_role NOT NULL DEFAULT 'USER';
