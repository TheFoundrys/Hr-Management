-- Final Schema Fix for System-wide Compatibility

DO $$ 
BEGIN
    -- Ensure university_id exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='university_id') THEN
        ALTER TABLE employees ADD COLUMN university_id VARCHAR(100) UNIQUE;
    END IF;

    -- Ensure employee_id exists (for legacy HR parts like Payroll/Attendance)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='employee_id') THEN
        ALTER TABLE employees ADD COLUMN employee_id VARCHAR(100) UNIQUE;
    END IF;

    -- Map existing data if any
    UPDATE employees SET university_id = employee_id WHERE university_id IS NULL AND employee_id IS NOT NULL;
    UPDATE employees SET employee_id = university_id WHERE employee_id IS NULL AND university_id IS NOT NULL;

    -- Add missing HOD/Dean columns if needed
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='first_name') THEN
        ALTER TABLE employees ADD COLUMN first_name VARCHAR(255);
        ALTER TABLE employees ADD COLUMN last_name VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='manager_id') THEN
        ALTER TABLE employees ADD COLUMN manager_id UUID REFERENCES employees(id);
    END IF;

END $$;
