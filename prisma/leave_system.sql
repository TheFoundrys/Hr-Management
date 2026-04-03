-- University Leave Management System Schema

-- 1. Leave Types (CL, SL, EL, etc.)
CREATE TABLE IF NOT EXISTS leave_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(10) NOT NULL,
    max_per_year INTEGER NOT NULL,
    carry_forward BOOLEAN DEFAULT FALSE,
    is_paid BOOLEAN DEFAULT TRUE,
    requires_approval BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, code)
);

-- 2. Leave Balances (Per Employee, Per Year)
CREATE TABLE IF NOT EXISTS leave_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id VARCHAR(50) NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    year INTEGER NOT NULL,
    allocated_days NUMERIC(4,1) NOT NULL,
    used_days NUMERIC(4,1) DEFAULT 0,
    remaining_days NUMERIC(4,1) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, leave_type_id, year)
);

-- 3. Leave Requests
CREATE TABLE IF NOT EXISTS leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id VARCHAR(50) NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES leave_types(id),
    tenant_id UUID NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days NUMERIC(4,1) NOT NULL,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected, cancelled
    is_half_day BOOLEAN DEFAULT FALSE,
    half_day_type VARCHAR(10), -- morning, afternoon
    substitution_employee_id VARCHAR(50), -- Faculty substituting classes
    attachment_url TEXT, -- Medical certs or conference invites
    current_level INTEGER DEFAULT 1, -- 1=HOD, 2=Dean, 3=HR
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Leave Approvals (Multi-level)
CREATE TABLE IF NOT EXISTS leave_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    leave_request_id UUID NOT NULL REFERENCES leave_requests(id) ON DELETE CASCADE,
    approver_id VARCHAR(50) NOT NULL, -- References employees(employee_id)
    tenant_id UUID NOT NULL,
    level INTEGER NOT NULL, -- 1=HOD, 2=Dean, 3=HR
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    remarks TEXT,
    action_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Holidays
CREATE TABLE IF NOT EXISTS holidays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name VARCHAR(200) NOT NULL,
    date DATE NOT NULL,
    type VARCHAR(50), -- national, university
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, date)
);

-- Initial Seed for Leave Types (Example for University of KEKA)
-- Tenant: 60beec0c-7c6e-4687-b9c8-ef4bcfb8d972

INSERT INTO leave_types (tenant_id, name, code, max_per_year, carry_forward, is_paid) VALUES
('60beec0c-7c6e-4687-b9c8-ef4bcfb8d972', 'Casual Leave', 'CL', 12, FALSE, TRUE),
('60beec0c-7c6e-4687-b9c8-ef4bcfb8d972', 'Sick Leave', 'SL', 10, TRUE, TRUE),
('60beec0c-7c6e-4687-b9c8-ef4bcfb8d972', 'Earned Leave', 'EL', 15, TRUE, TRUE),
('60beec0c-7c6e-4687-b9c8-ef4bcfb8d972', 'Maternity Leave', 'ML', 90, FALSE, TRUE),
('60beec0c-7c6e-4687-b9c8-ef4bcfb8d972', 'On Duty', 'OD', 20, FALSE, TRUE),
('60beec0c-7c6e-4687-b9c8-ef4bcfb8d972', 'Loss of Pay', 'LOP', 365, FALSE, FALSE)
ON CONFLICT (tenant_id, code) DO NOTHING;

-- Initial Holidays for 2026
INSERT INTO holidays (tenant_id, name, date, type) VALUES
('60beec0c-7c6e-4687-b9c8-ef4bcfb8d972', 'New Year', '2026-01-01', 'national'),
('60beec0c-7c6e-4687-b9c8-ef4bcfb8d972', 'Republic Day', '2026-01-26', 'national'),
('60beec0c-7c6e-4687-b9c8-ef4bcfb8d972', 'Holi', '2026-03-03', 'national'),
('60beec0c-7c6e-4687-b9c8-ef4bcfb8d972', 'Independence Day', '2026-08-15', 'national'),
('60beec0c-7c6e-4687-b9c8-ef4bcfb8d972', 'Gandhi Jayanti', '2026-10-02', 'national'),
('60beec0c-7c6e-4687-b9c8-ef4bcfb8d972', 'Christmas', '2026-12-25', 'national')
ON CONFLICT (tenant_id, date) DO NOTHING;

-- Initialize Leave Balances for all 12 employees for 2026
INSERT INTO leave_balances (employee_id, leave_type_id, tenant_id, year, allocated_days, used_days, remaining_days)
SELECT 
    e.employee_id, 
    lt.id, 
    e.tenant_id, 
    2026, 
    lt.max_per_year, 
    0, 
    lt.max_per_year
FROM employees e
CROSS JOIN leave_types lt
WHERE e.tenant_id = '60beec0c-7c6e-4687-b9c8-ef4bcfb8d972'
ON CONFLICT (employee_id, leave_type_id, year) DO NOTHING;
