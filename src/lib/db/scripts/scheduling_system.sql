-- University Scheduling System Expansion
-- Run this script to add scheduling tables to the existing HR system

-- Departments (Refined)
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  tenant_id VARCHAR(100) NOT NULL DEFAULT 'default',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Courses
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  department_id UUID REFERENCES departments(id),
  year INTEGER NOT NULL,
  semester INTEGER NOT NULL,
  tenant_id VARCHAR(100) NOT NULL DEFAULT 'default',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Subjects
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  course_id UUID REFERENCES courses(id),
  hours_per_week INTEGER NOT NULL,
  tenant_id VARCHAR(100) NOT NULL DEFAULT 'default',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Classrooms
CREATE TABLE IF NOT EXISTS classrooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_number VARCHAR(50) NOT NULL,
  capacity INTEGER NOT NULL,
  tenant_id VARCHAR(100) NOT NULL DEFAULT 'default',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Time Slots (Mon-Sat, e.g. 09:00 - 10:00)
CREATE TABLE IF NOT EXISTS time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day VARCHAR(20) NOT NULL CHECK (day IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  tenant_id VARCHAR(100) NOT NULL DEFAULT 'default',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Faculty Subjects (Assignment)
CREATE TABLE IF NOT EXISTS faculty_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id UUID REFERENCES users(id),
  subject_id UUID REFERENCES subjects(id),
  tenant_id VARCHAR(100) NOT NULL DEFAULT 'default',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(faculty_id, subject_id)
);

-- Timetable
CREATE TABLE IF NOT EXISTS timetable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id),
  subject_id UUID REFERENCES subjects(id),
  faculty_id UUID REFERENCES users(id),
  classroom_id UUID REFERENCES classrooms(id),
  time_slot_id UUID REFERENCES time_slots(id),
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_by UUID REFERENCES users(id),
  tenant_id VARCHAR(100) NOT NULL DEFAULT 'default',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for scheduling performance
CREATE INDEX IF NOT EXISTS idx_timetable_lookup ON timetable(course_id, time_slot_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_timetable_faculty ON timetable(faculty_id, time_slot_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_timetable_room ON timetable(classroom_id, time_slot_id, tenant_id);

-- Update users table roles constraint (optional, but good for data integrity)
-- Note: In production we might use an ALTER TABLE if we want to be strict.
-- For this exercise, we'll assume 'admin', 'teaching', 'non-teaching' are existing.
-- We can map HOD/Faculty to 'teaching' or add new roles.
-- Let's stick with the existing ones for now to avoid breaking existing code.
