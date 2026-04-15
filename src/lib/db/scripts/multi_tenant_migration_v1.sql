-- Migration to enable Super Admin role and ensure all tables have tenant_id

-- 1. Update users role constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'HR', 'HOD', 'STAFF', 'FACULTY', 'NON_TEACHING'));

-- 2. Add tenant_id to attendance if missing
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='attendance' AND column_name='tenant_id') THEN
        ALTER TABLE attendance ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 3. Add tenant_id to leaves if missing
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leaves' AND column_name='tenant_id') THEN
        ALTER TABLE leaves ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 4. Add tenant_id to documents if missing
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='tenant_id') THEN
        ALTER TABLE documents ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 5. Create a default Super Admin if needed (optional, depends on environment)
-- INSERT INTO tenants (id, name, subdomain) VALUES ('00000000-0000-0000-0000-000000000000', 'Global Admin', 'superadmin') ON CONFLICT DO NOTHING;
