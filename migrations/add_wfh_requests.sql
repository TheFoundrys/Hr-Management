-- Work-from-home requests (approval required; weekly limit enforced in app)
CREATE TABLE IF NOT EXISTS wfh_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  request_date DATE NOT NULL,
  is_half_day BOOLEAN DEFAULT FALSE,
  half_day_type VARCHAR(10) CHECK (half_day_type IS NULL OR half_day_type IN ('morning', 'afternoon')),
  reason TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wfh_tenant_status ON wfh_requests(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_wfh_employee_date ON wfh_requests(employee_id, request_date);
