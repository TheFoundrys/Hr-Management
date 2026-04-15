SELECT id, name, email, role, is_active FROM users WHERE role = 'PENDING' OR is_active = false;
