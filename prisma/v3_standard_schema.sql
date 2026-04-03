-- University HR Standardized Schema (Normalized & Secure) - Phase 1

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS leaves CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS designations CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;

-- 2. Create Tenant Table
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(100) UNIQUE NOT NULL,
    domain VARCHAR(255),
    database_name VARCHAR(100),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Create Departments (Normalization)
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    UNIQUE(tenant_id, name)
);

-- 4. Create Designations (Normalization)
CREATE TABLE designations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    UNIQUE(tenant_id, name)
);

-- 5. Create Users Table (Secure Auth)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'STAFF' CHECK (role IN ('ADMIN', 'STAFF', 'TEACHING', 'NON_TEACHING')),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 6. Create Employees Table (Consolidated & Normalized)
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,
    university_id VARCHAR(100) UNIQUE NOT NULL, -- Human-readable Bridge ID
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    designation_id UUID REFERENCES designations(id) ON DELETE SET NULL,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    join_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 7. Attendance Table (UUID Relationships)
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    check_in TIMESTAMP,
    check_out TIMESTAMP,
    status VARCHAR(50) NOT NULL DEFAULT 'ABSENT' CHECK (status IN ('PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'ON_LEAVE')),
    working_hours NUMERIC(5,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(employee_id, date)
);

-- 8. Leaves Table
CREATE TABLE leaves (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type VARCHAR(50) NOT NULL CHECK (leave_type IN ('CASUAL', 'SICK', 'EARNED', 'MATERNITY', 'PATERNITY', 'UNPAID')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 9. Documents Table
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    doc_type VARCHAR(100) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 10. Performance Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_employees_university_id ON employees(university_id);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_leaves_employee ON leaves(employee_id);
CREATE INDEX idx_tenants_subdomain ON tenants(subdomain);
