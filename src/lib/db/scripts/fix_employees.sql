-- Standardize Employees Table for University Hierarchy

-- 1. Create Designations table (missing from initial setup)
CREATE TABLE IF NOT EXISTS designations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  tenant_id VARCHAR(100) NOT NULL DEFAULT 'default',
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Alter Employees table to support relational structure
-- Note: We wrap in a block to handle existing columns gracefully
DO $$ 
BEGIN
    -- Add department_id if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='department_id') THEN
        ALTER TABLE employees ADD COLUMN department_id UUID REFERENCES departments(id);
    END IF;

    -- Add designation_id if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='designation_id') THEN
        ALTER TABLE employees ADD COLUMN designation_id UUID REFERENCES designations(id);
    END IF;

    -- Add manager_id if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='manager_id') THEN
        ALTER TABLE employees ADD COLUMN manager_id UUID REFERENCES employees(id);
    END IF;

    -- Rename university_id if it was employee_id
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='employee_id' AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='university_id')) THEN
        ALTER TABLE employees RENAME COLUMN employee_id TO university_id;
    END IF;
    
    -- Ensure first_name and last_name exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='first_name') THEN
        ALTER TABLE employees ADD COLUMN first_name VARCHAR(100);
        ALTER TABLE employees ADD COLUMN last_name VARCHAR(100);
    END IF;
END $$;
