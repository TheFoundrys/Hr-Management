-- Simplified Seed Data for 12 Employees with TFU-XXXXX IDs and March 2026 Payroll
TRUNCATE TABLE employees CASCADE;
TRUNCATE TABLE payslip_records CASCADE;

-- Insert Employees aligned to tenant 60beec0c-7c6e-4687-b9c8-ef4bcfb8d972
INSERT INTO employees (university_id, employee_id, first_name, last_name, email, role, tenant_id, salary_basic, salary_hra, salary_allowances, salary_deductions, is_active) VALUES
('TFU-00001', 'TFU-00001', 'Arjun', 'Reddy', 'arjun.reddy@univ.edu', 'TEACHING', '60beec0c-7c6e-4687-b9c8-ef4bcfb8d972', 90000, 30000, 15000, 5000, true),
('TFU-00002', 'TFU-00002', 'Sneha', 'Sharma', 'sneha.sharma@univ.edu', 'TEACHING', '60beec0c-7c6e-4687-b9c8-ef4bcfb8d972', 80000, 25000, 12000, 4000, true),
('TFU-00003', 'TFU-00003', 'Vikram', 'Malhotra', 'vikram.malhotra@univ.edu', 'TEACHING', '60beec0c-7c6e-4687-b9c8-ef4bcfb8d972', 85000, 28000, 14000, 4500, true),
('TFU-00004', 'TFU-00004', 'Priya', 'Nair', 'priya.nair@univ.edu', 'TEACHING', '60beec0c-7c6e-4687-b9c8-ef4bcfb8d972', 75000, 22000, 11000, 3500, true),
('TFU-00005', 'TFU-00005', 'Rahul', 'Verma', 'rahul.verma@univ.edu', 'TEACHING', '60beec0c-7c6e-4687-b9c8-ef4bcfb8d972', 95000, 32000, 18000, 6000, true),
('TFU-00006', 'TFU-00006', 'Ananya', 'Das', 'ananya.das@univ.edu', 'TEACHING', '60beec0c-7c6e-4687-b9c8-ef4bcfb8d972', 70000, 20000, 10000, 3000, true),
('TFU-00007', 'TFU-00007', 'Suresh', 'Iyer', 'suresh.iyer@univ.edu', 'TEACHING', '60beec0c-7c6e-4687-b9c8-ef4bcfb8d972', 88000, 29000, 16000, 5500, true),
('TFU-00008', 'TFU-00008', 'Rajesh', 'Kumar', 'rajesh.kumar@univ.edu', 'STAFF', '60beec0c-7c6e-4687-b9c8-ef4bcfb8d972', 45000, 15000, 5000, 2000, true),
('TFU-00009', 'TFU-00009', 'Meera', 'Bai', 'meera.bai@univ.edu', 'STAFF', '60beec0c-7c6e-4687-b9c8-ef4bcfb8d972', 40000, 12000, 4000, 1500, true),
('TFU-00010', 'TFU-00010', 'Amit', 'Shah', 'amit.shah@univ.edu', 'STAFF', '60beec0c-7c6e-4687-b9c8-ef4bcfb8d972', 50000, 18000, 6000, 2500, true),
('TFU-00011', 'TFU-00011', 'Sunita', 'Devi', 'sunita.devi@univ.edu', 'STAFF', '60beec0c-7c6e-4687-b9c8-ef4bcfb8d972', 42000, 14000, 4500, 1800, true),
('TFU-00012', 'TFU-00012', 'Kavita', 'Rao', 'kavita.rao@univ.edu', 'STAFF', '60beec0c-7c6e-4687-b9c8-ef4bcfb8d972', 48000, 16000, 5500, 2200, true);

-- Insert Sample Payroll for March 2026
INSERT INTO payslip_records (id, user_id, tenant_id, month, year, basic_salary, hra, allowances, deductions, net_salary, status, generated_at) VALUES
('PAY-001', 'TFU-00001', '60beec0c-7c6e-4687-b9c8-ef4bcfb8d972', 3, 2026, 90000, 30000, 15000, 5000, 130000, 'processed', '2026-03-31'),
('PAY-002', 'TFU-00002', '60beec0c-7c6e-4687-b9c8-ef4bcfb8d972', 3, 2026, 80000, 25000, 12000, 4000, 113000, 'processed', '2026-03-31'),
('PAY-003', 'TFU-00003', '60beec0c-7c6e-4687-b9c8-ef4bcfb8d972', 3, 2026, 85000, 28000, 14000, 4500, 122500, 'processed', '2026-03-31'),
('PAY-004', 'TFU-00004', '60beec0c-7c6e-4687-b9c8-ef4bcfb8d972', 3, 2026, 75000, 22000, 11000, 3500, 104500, 'processed', '2026-03-31'),
('PAY-005', 'TFU-00005', '60beec0c-7c6e-4687-b9c8-ef4bcfb8d972', 3, 2026, 95000, 32000, 18000, 6000, 139000, 'processed', '2026-03-31'),
('PAY-006', 'TFU-00006', '60beec0c-7c6e-4687-b9c8-ef4bcfb8d972', 3, 2026, 70000, 20000, 10000, 3000, 97000, 'processed', '2026-03-31'),
('PAY-007', 'TFU-00007', '60beec0c-7c6e-4687-b9c8-ef4bcfb8d972', 3, 2026, 88000, 29000, 16000, 5500, 127500, 'processed', '2026-03-31'),
('PAY-008', 'TFU-00008', '60beec0c-7c6e-4687-b9c8-ef4bcfb8d972', 3, 2026, 45000, 15000, 5000, 2000, 63000, 'processed', '2026-03-31'),
('PAY-009', 'TFU-00009', '60beec0c-7c6e-4687-b9c8-ef4bcfb8d972', 3, 2026, 40000, 12000, 4000, 1500, 54500, 'processed', '2026-03-31'),
('PAY-010', 'TFU-00010', '60beec0c-7c6e-4687-b9c8-ef4bcfb8d972', 3, 2026, 50000, 18000, 6000, 2500, 71500, 'processed', '2026-03-31'),
('PAY-011', 'TFU-00011', '60beec0c-7c6e-4687-b9c8-ef4bcfb8d972', 3, 2026, 42000, 14000, 4500, 1800, 58700, 'processed', '2026-03-31'),
('PAY-012', 'TFU-00012', '60beec0c-7c6e-4687-b9c8-ef4bcfb8d972', 3, 2026, 48000, 16000, 5500, 2200, 67300, 'processed', '2026-03-31');
