-- Day 11: Audit Logs System
-- Create audit_logs table to track critical operations
-- 审计日志表，记录管理员的关键操作
--
-- ROLLBACK:
--   DROP TABLE IF EXISTS public.audit_logs;

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    operator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    operator_name TEXT,          -- Fallback / Denormalized name for easier viewing
    operation_type TEXT NOT NULL, -- CREATE, UPDATE, DELETE, APPROVE, REJECT
    resource_type TEXT NOT NULL DEFAULT 'asset', -- asset, booking, etc.
    resource_id UUID,
    resource_name TEXT,
    change_description TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow admins/staff to read audit logs
CREATE POLICY "Admins and staff can read audit logs" 
ON public.audit_logs FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'staff')
  )
);

-- Allow authenticated users to insert audit logs (via services)
-- In a real production app, you might only allow system-level insertions or specific RLS triggers,
-- but here we'll allow insertions from the service layer.
CREATE POLICY "Authenticated users can insert audit logs" 
ON public.audit_logs FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_id ON public.audit_logs(resource_id);

-- Grant table-level permissions (required for RLS to work, same pattern as 004)
-- 授予表级别权限（RLS 生效的前提，与 004 保持一致）
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT INSERT ON public.audit_logs TO authenticated;
