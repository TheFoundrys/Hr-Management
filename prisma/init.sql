-- University Staff Management System - PostgreSQL Schema
-- Run this script to initialize all tables

-- Users table (authentication)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'teaching' CHECK (role IN ('admin', 'teaching', 'non-teaching')),
  tenant_id VARCHAR(100) NOT NULL DEFAULT 'default',
  employee_id VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);

-- Employees table
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) DEFAULT '',
  role VARCHAR(50) NOT NULL DEFAULT 'teaching' CHECK (role IN ('admin', 'teaching', 'non-teaching')),
  department VARCHAR(255) NOT NULL,
  designation VARCHAR(255) DEFAULT '',
  tenant_id VARCHAR(100) NOT NULL DEFAULT 'default',
  device_user_id VARCHAR(100) DEFAULT '',
  user_id UUID REFERENCES users(id),
  date_of_joining DATE DEFAULT CURRENT_DATE,
  salary_basic NUMERIC(12,2) DEFAULT 0,
  salary_hra NUMERIC(12,2) DEFAULT 0,
  salary_allowances NUMERIC(12,2) DEFAULT 0,
  salary_deductions NUMERIC(12,2) DEFAULT 0,
  bank_account VARCHAR(100) DEFAULT '',
  bank_name VARCHAR(255) DEFAULT '',
  bank_ifsc VARCHAR(50) DEFAULT '',
  address TEXT DEFAULT '',
  emergency_name VARCHAR(255) DEFAULT '',
  emergency_phone VARCHAR(50) DEFAULT '',
  emergency_relation VARCHAR(100) DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employees_tenant ON employees(tenant_id);
CREATE INDEX IF NOT EXISTS idx_employees_device ON employees(tenant_id, device_user_id);

-- Biometric logs table
CREATE TABLE IF NOT EXISTS biometric_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_user_id VARCHAR(100) NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  raw_data TEXT NOT NULL,
  device_id VARCHAR(100) DEFAULT 'ADMS',
  tenant_id VARCHAR(100) NOT NULL DEFAULT 'default',
  status INTEGER DEFAULT 0,
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bio_logs_tenant ON biometric_logs(tenant_id, device_user_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_bio_logs_unprocessed ON biometric_logs(processed, tenant_id);

-- Attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id VARCHAR(100) NOT NULL,
  tenant_id VARCHAR(100) NOT NULL DEFAULT 'default',
  date DATE NOT NULL,
  check_in TIMESTAMP,
  check_out TIMESTAMP,
  status VARCHAR(50) DEFAULT 'absent' CHECK (status IN ('present', 'absent', 'late', 'half-day', 'on-leave', 'holiday')),
  working_hours NUMERIC(5,2) DEFAULT 0,
  overtime NUMERIC(5,2) DEFAULT 0,
  notes TEXT DEFAULT '',
  source VARCHAR(50) DEFAULT 'biometric' CHECK (source IN ('biometric', 'manual', 'system')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, employee_id, date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_tenant_date ON attendance(tenant_id, date, status);

-- Leave table
CREATE TABLE IF NOT EXISTS leaves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id VARCHAR(100) NOT NULL,
  tenant_id VARCHAR(100) NOT NULL DEFAULT 'default',
  leave_type VARCHAR(50) NOT NULL CHECK (leave_type IN ('casual', 'sick', 'earned', 'maternity', 'paternity', 'unpaid', 'other')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days INTEGER NOT NULL,
  reason TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  approved_by VARCHAR(255),
  approved_at TIMESTAMP,
  comments TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leaves_tenant ON leaves(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_leaves_employee ON leaves(tenant_id, employee_id);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(100) NOT NULL,
  tenant_id VARCHAR(100) NOT NULL DEFAULT 'default',
  file_name VARCHAR(500) NOT NULL,
  file_type VARCHAR(100) DEFAULT '',
  file_size INTEGER DEFAULT 0,
  storage_path TEXT NOT NULL,
  category VARCHAR(100) DEFAULT 'OTHER',
  uploaded_by VARCHAR(255) DEFAULT 'system',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_tenant ON documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);

-- Payslip records table
CREATE TABLE IF NOT EXISTS payslip_records (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL,
  tenant_id VARCHAR(100) NOT NULL DEFAULT 'default',
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  basic_salary NUMERIC(12,2) DEFAULT 0,
  hra NUMERIC(12,2) DEFAULT 0,
  allowances NUMERIC(12,2) DEFAULT 0,
  deductions NUMERIC(12,2) DEFAULT 0,
  net_salary NUMERIC(12,2) DEFAULT 0,
  working_days INTEGER DEFAULT 0,
  present_days INTEGER DEFAULT 0,
  absent_days INTEGER DEFAULT 0,
  file_path TEXT,
  generated_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'generated',
  UNIQUE(user_id, month, year)
);

CREATE INDEX IF NOT EXISTS idx_payslip_tenant ON payslip_records(tenant_id);

SELECT 'All tables created successfully!' as result;
