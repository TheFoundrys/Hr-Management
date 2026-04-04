-- Sample Data for University Scheduling System

-- 1. Departments
INSERT INTO departments (name, tenant_id) VALUES 
('School of Computer Science', 'default'),
('Department of Mathematics', 'default');

-- 2. Classrooms
INSERT INTO classrooms (room_number, capacity, tenant_id) VALUES 
('Lecture Hall 101', 120, 'default'),
('Lecture Hall 102', 120, 'default'),
('CS Lab Alpha', 40, 'default'),
('CS Lab Beta', 40, 'default');

-- 3. Time Slots (Standard Morning & Afternoon)
INSERT INTO time_slots (day, start_time, end_time, tenant_id) VALUES 
('Monday', '09:00:00', '10:00:00', 'default'),
('Monday', '10:00:00', '11:00:00', 'default'),
('Monday', '11:00:00', '12:00:00', 'default'),
('Tuesday', '09:00:00', '10:00:00', 'default'),
('Tuesday', '10:00:00', '11:00:00', 'default'),
('Tuesday', '11:00:00', '12:00:00', 'default'),
('Wednesday', '09:00:00', '10:00:00', 'default'),
('Wednesday', '10:00:00', '11:00:00', 'default'),
('Wednesday', '11:00:00', '12:00:00', 'default'),
('Thursday', '09:00:00', '10:00:00', 'default'),
('Thursday', '10:00:00', '11:00:00', 'default'),
('Thursday', '11:00:00', '12:00:00', 'default'),
('Friday', '09:00:00', '10:00:00', 'default'),
('Friday', '10:00:00', '11:00:00', 'default'),
('Friday', '11:00:00', '12:00:00', 'default');

-- 4. Initial Courses
-- Note: Requires IDs from previous inserts if using direct references.
-- Since IDs are UUIDs, user should use the Master Registry UI to link them,
-- OR we can use subqueries if needed.

-- For simplicity, let's just provide the structure and let the user add some Subjects/Faculty via the UI.
-- This ensures they test the "Add" functionality as well.
