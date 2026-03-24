import { supabase } from '@/lib/supabase';
import type { AuditLogInsert } from '@/types/database';
import { getCurrentUser } from './auth';

/**
 * Audit Service to handle system-wide activity logging.
 * 审计服务，处理系统范围内的活动日志记录。
 */
export const auditService = {
  /**
   * Log an administrative action.
   * 记录一项管理操作。
   * 
   * @param params - Log details including operation type, resource, and description.
   */
  async logAction(params: {
    operation_type: 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT' | 'VERIFY';
    resource_type: string;
    resource_id?: string;
    resource_name?: string;
    change_description: string;
    metadata?: Record<string, any>;
  }) {
    try {
      const user = await getCurrentUser();
      
      // Get user profile for operator_name
      let operatorName = user?.email || 'Unknown User';
      if (user?.id) {
        const { data: profile } = await (supabase as any)
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
        
        if (profile?.full_name) {
          operatorName = profile.full_name;
        }
      }

      const logEntry: AuditLogInsert = {
        operator_id: user?.id || null,
        operator_name: operatorName,
        operation_type: params.operation_type,
        resource_type: params.resource_type,
        resource_id: params.resource_id || null,
        resource_name: params.resource_name || null,
        change_description: params.change_description,
        metadata: params.metadata || {},
      };

      const { error } = await (supabase as any)
        .from('audit_logs')
        .insert(logEntry);

      if (error) {
        console.error('Failed to insert audit log:', error);
      }
    } catch (err) {
      console.error('Audit service error:', err);
    }
  },

  /**
   * Fetch audit logs ordered by creation time (newest first).
   * 获取按创建时间排序（最新優先）的审计日志。
   */
  async getLogs() {
    const { data, error } = await (supabase as any)
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching audit logs:', error);
      return [];
    }
    return data || [];
  }
};
