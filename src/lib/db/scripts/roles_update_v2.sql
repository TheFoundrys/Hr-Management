-- Update roles constraint to include TEACHING, EMPLOYEE, and ensure all standard roles are covered
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'HR', 'HOD', 'STAFF', 'FACULTY', 'TEACHING', 'NON_TEACHING', 'EMPLOYEE', 'PENDING'));

-- Update employees table constraint
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_role_check;
ALTER TABLE employees ADD CONSTRAINT employees_role_check 
CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'HR', 'HOD', 'STAFF', 'FACULTY', 'TEACHING', 'NON_TEACHING', 'EMPLOYEE', 'PENDING'));
