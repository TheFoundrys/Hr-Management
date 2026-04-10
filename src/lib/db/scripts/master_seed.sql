-- master_seed.sql
-- 1. Restore Departments
INSERT INTO departments (id, name, tenant_id) VALUES 
('0bd710c2-bb92-4c77-a67f-013573f25cc0', 'Administration', '60beec0c-7c6e-4687-b9c8-ef4bcfb8d972'),
('5e2f16e4-9645-4de9-9e8c-f9e4f5a3b2c1', 'Teaching', '60beec0c-7c6e-4687-b9c8-ef4bcfb8d972')
ON CONFLICT (id) DO NOTHING;

-- 2. Restore Admin User
INSERT INTO users (id, name, email, password_hash, role, tenant_id, is_active, is_verified) VALUES
('b2a9e3d4-c5f6-4a1b-9c8d-e7f0a1b2c3d4', 'Arjun Reddy', 'arjun.reddy@univ.edu', '$2a$10$y6mMTIn9bYfCq8jG9j5M4.oG2.I/68q8Y6I.tY21.T/58oI1.tY21', 'admin', '60beec0c-7c6e-4687-b9c8-ef4bcfb8d972', true, true)
ON CONFLICT (email) DO NOTHING;

-- 3. Link Admin to Employee (TFU-00001)
UPDATE employees SET 
  user_id = 'b2a9e3d4-c5f6-4a1b-9c8d-e7f0a1b2c3d4',
  department_id = '0bd710c2-bb92-4c77-a67f-013573f25cc0'
WHERE employee_id = 'TFU-00001';
