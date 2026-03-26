import { supabase } from '@/lib/supabase';
import type { AuditLog, AuditLogInsert } from '@/types/database';
import { getCurrentUser } from './auth';

/** AuditLog enriched with a resolved asset thumbnail. 附带资产缩略图的审计日志 */
export type AuditLogWithMeta = AuditLog & { _image_url: string | null };

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
   * Fetch audit logs ordered by creation time (newest first), enriched with asset thumbnails.
   * 获取按创建时间排序（最新优先）的审计日志，并附带对应的资产缩略图。
   *
   * Two extra queries are issued in batch:
   * 1. asset-type logs → assets(images) by resource_id
   * 2. booking/damage_report-type logs → bookings → assets(images) by resource_id
   * 两次批量查询附加图片，不影响日志本身的数据结构。
   */
  async getLogs(): Promise<AuditLogWithMeta[]> {
    const { data, error } = await (supabase as any)
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching audit logs:', error);
      return [];
    }

    const logs: AuditLog[] = data || [];
    const imageMap: Record<string, string | null> = {};

    // Collect unique resource IDs by type
    const assetIds = [...new Set(
      logs.filter(l => l.resource_type?.toLowerCase() === 'asset' && l.resource_id).map(l => l.resource_id!)
    )];
    const bookingIds = [...new Set(
      logs.filter(l => ['booking', 'damage_report'].includes(l.resource_type?.toLowerCase() ?? '') && l.resource_id).map(l => l.resource_id!)
    )];

    // Batch 1: asset-type → direct image lookup
    if (assetIds.length > 0) {
      const { data: assets } = await (supabase as any)
        .from('assets')
        .select('id, images')
        .in('id', assetIds);
      (assets ?? []).forEach((a: { id: string; images: string[] | null }) => {
        imageMap[a.id] = a.images?.[0] ?? null;
      });
    }

    // Batch 2: booking/damage_report → booking → asset image
    if (bookingIds.length > 0) {
      const { data: bookings } = await (supabase as any)
        .from('bookings')
        .select('id, assets(images)')
        .in('id', bookingIds);
      (bookings ?? []).forEach((b: { id: string; assets: { images: string[] | null } | null }) => {
        imageMap[b.id] = b.assets?.images?.[0] ?? null;
      });
    }

    return logs.map(l => ({
      ...l,
      _image_url: l.resource_id ? (imageMap[l.resource_id] ?? null) : null,
    }));
  }
};
