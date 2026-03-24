import { supabase } from '@/lib/supabase';
import type { Database, DamageReport, DamageReportStatus } from '../../database/types/supabase';
import { auditService } from './auditService';

// ============================================================
// Booking Service (Web Admin). Web 管理端借用服务
// ============================================================

/** Booking with joined asset and borrower details. 包含资产和借用者详情的借用记录 */
export type BookingWithDetails = Database['public']['Tables']['bookings']['Row'] & {
    assets: Pick<Database['public']['Tables']['assets']['Row'], 'name' | 'qr_code' | 'images'> | null;
    profiles: Pick<Database['public']['Tables']['profiles']['Row'], 'full_name' | 'student_id'> | null;
};

/** Damage report with joined asset and reporter details. 包含资产和报告者详情的损坏报告 */
export type DamageReportWithDetails = DamageReport & {
    assets: Pick<Database['public']['Tables']['assets']['Row'], 'name' | 'qr_code' | 'images'> | null;
    profiles: Pick<Database['public']['Tables']['profiles']['Row'], 'full_name' | 'student_id'> | null;
};

export const bookingService = {
    /**
     * Fetch all bookings with asset and borrower details.
     * 获取所有借用记录，包含资产和借用者详情
     */
    async getBookings(): Promise<BookingWithDetails[]> {
        const { data, error } = await supabase
            .from('bookings')
            .select(`
                *,
                assets ( name, qr_code, images ),
                profiles!borrower_id ( full_name, student_id )
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching bookings:', error.message);
            return [];
        }

        return (data as unknown) as BookingWithDetails[];
    },

    /**
     * Approve a booking request.
     * 审批通过借用请求
     */
    async approveBooking(id: string, approverId?: string): Promise<boolean> {
        const payload: Database['public']['Tables']['bookings']['Update'] = {
            status: 'approved',
            approver_id: approverId || null
        };
        const { error } = await (supabase as any)
            .from('bookings')
            .update(payload)
            .eq('id', id);

        if (error) {
            console.error('Error approving booking:', error);
            return false;
        }

        // Audit log
        const { data: bookingInfo } = await supabase
            .from('bookings')
            .select('assets(name)')
            .eq('id', id)
            .single();
        
        await auditService.logAction({
            operation_type: 'APPROVE',
            resource_type: 'booking',
            resource_id: id,
            resource_name: (bookingInfo as any)?.assets?.name,
            change_description: `Approved booking request for ${(bookingInfo as any)?.assets?.name || 'unknown asset'}`
        });

        // 插入审批通过通知
        if (approverId) {
            const { data: booking } = await supabase
                .from('bookings')
                .select('borrower_id, assets(name)')
                .eq('id', id)
                .single();

            if (booking) {
                await (supabase as any).from('notifications').insert({
                    user_id: (booking as any).borrower_id,
                    type: 'booking_approved',
                    title: 'Booking Approved',
                    message: `Your booking for ${(booking as any).assets?.name ?? 'an asset'} has been approved.`,
                    metadata: { booking_id: id }
                });
            }
        }

        return true;
    },

    /**
     * Reject a booking request with reason.
     * 拒绝借用请求，需填写原因
     */
    async rejectBooking(id: string, reason: string, approverId?: string): Promise<boolean> {
        const payload: Database['public']['Tables']['bookings']['Update'] = {
            status: 'rejected',
            rejection_reason: reason,
            approver_id: approverId || null
        };
        const { error } = await (supabase as any)
            .from('bookings')
            .update(payload)
            .eq('id', id);

        if (error) {
            console.error('Error rejecting booking:', error);
            return false;
        }

        // Audit log
        const { data: bookingInfo } = await supabase
            .from('bookings')
            .select('assets(name)')
            .eq('id', id)
            .single();

        await auditService.logAction({
            operation_type: 'REJECT',
            resource_type: 'booking',
            resource_id: id,
            resource_name: (bookingInfo as any)?.assets?.name,
            change_description: `Rejected booking request. Reason: ${reason}`
        });

        // 插入审批拒绝通知
        const { data: booking } = await supabase
            .from('bookings')
            .select('borrower_id, assets(name)')
            .eq('id', id)
            .single();

        if (booking) {
            await (supabase as any).from('notifications').insert({
                user_id: (booking as any).borrower_id,
                type: 'booking_rejected',
                title: 'Booking Rejected',
                message: `Your booking has been rejected. Reason: ${reason}`,
                metadata: { booking_id: id }
            });
        }

        return true;
    },

    // ============================================================
    // Damage Report Methods. 损坏报告方法
    // ============================================================

    /**
     * Fetch all damage reports with asset and reporter details.
     * 获取所有损坏报告，包含资产和报告者详情
     */
    async getDamageReports(): Promise<DamageReportWithDetails[]> {
        const { data, error } = await supabase
            .from('damage_reports')
            .select(`
                *,
                assets ( name, qr_code, images ),
                profiles!reporter_id ( full_name, student_id )
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching damage reports:', error.message);
            return [];
        }

        return (data as unknown) as DamageReportWithDetails[];
    },

    /**
     * Process a return verification (admin confirms return is complete).
     * 处理归还验证（管理员确认归还完成）
     */
    async processReturn(bookingId: string, status: string): Promise<boolean> {
        // 同时获取 asset_id 以便更新资产状态
        const { data: booking, error: bookingFetchError } = await supabase
            .from('bookings')
            .select('asset_id, assets(name)')
            .eq('id', bookingId)
            .single();

        if (bookingFetchError || !booking) {
            console.error('Error fetching booking for return processing:', bookingFetchError);
            return false;
        }

        const { error } = await (supabase as any)
            .from('bookings')
            .update({ 
                status,
                rejection_reason: 'VERIFIED' 
            })
            .eq('id', bookingId);

        if (error) {
            console.error('Error processing return:', error);
            return false;
        }

        // 正常归还：将资产状态改回 available
        await (supabase as any)
            .from('assets')
            .update({ status: 'available' })
            .eq('id', (booking as any).asset_id);

        // Add Audit Log
        await auditService.logAction({
            operation_type: 'VERIFY',
            resource_type: 'booking',
            resource_id: bookingId,
            resource_name: (booking as any).assets?.name,
            change_description: 'Admin verified the return as intact. Asset status set to available.'
        });

        return true;
    },

    /**
     * Create a damage report from return verification (admin-initiated).
     * 管理员在归还验证时创建损坏报告
     */
    async createDamageReport(bookingId: string, description: string, severity: string, photoUrl?: string): Promise<{ success: boolean; scoreUpdated: boolean; oldScore?: number; newScore?: number }> {
        // 使用星号选择以确保获取所有原始字段
        const { data: booking, error: bookingError } = await supabase
            .from('bookings')
            .select(`
                *,
                assets ( name )
            `)
            .eq('id', bookingId)
            .single();

        if (bookingError || !booking) {
            console.error('Booking not found for damage report', bookingError);
            return { success: false, scoreUpdated: false };
        }

        const borrowerId = (booking as any).borrower_id;
        console.log(`DEBUG: Found borrower ID: ${borrowerId} for booking: ${bookingId}`);

        // 获取当前分数（用于验证）
        const { data: profileBefore } = await supabase
            .from('profiles')
            .select('credit_score')
            .eq('id', borrowerId)
            .single();
        const oldScore = (profileBefore as any)?.credit_score;
        console.log(`DEBUG: Old score for ${borrowerId} is ${oldScore}`);

        const { data: { user } } = await supabase.auth.getUser();

        // 插入损坏报告
        const { error: reportError } = await (supabase as any)
            .from('damage_reports')
            .insert({
                booking_id: bookingId,
                asset_id: (booking as any).asset_id,
                reporter_id: user?.id ?? borrowerId,
                description,
                severity,
                photo_urls: photoUrl ? [photoUrl] : [],
            });

        if (reportError) {
            console.error('Error creating damage report:', reportError);
            return { success: false, scoreUpdated: false };
        }

        // 扣除 20 积分
        console.log(`DEBUG: Calling RPC update_credit_score with p_delta: -20`);
        const { error: rpcError } = await (supabase as any).rpc('update_credit_score', {
            p_user_id: borrowerId,
            p_delta: -20,
            p_reason: `damage_report_${severity}`
        });

        if (rpcError) {
            console.error('DEBUG: RPC Error:', rpcError);
        }

        // 稍等 500ms 确保数据库完成更新（应对极致同步延迟）
        await new Promise(resolve => setTimeout(resolve, 500));

        // 再次获取分数
        const { data: profileAfter } = await supabase
            .from('profiles')
            .select('credit_score')
            .eq('id', borrowerId)
            .single();
        const newScore = (profileAfter as any)?.credit_score;
        console.log(`DEBUG: New score for ${borrowerId} is ${newScore}`);

        // 更新状态标记
        await (supabase as any)
            .from('bookings')
            .update({ status: 'returned', rejection_reason: 'VERIFIED' })
            .eq('id', bookingId);

        // 归还验证时报告损坏：将资产状态改为 maintenance
        await (supabase as any)
            .from('assets')
            .update({ status: 'maintenance' })
            .eq('id', (booking as any).asset_id);

        // 审计日志
        await auditService.logAction({
            operation_type: 'VERIFY',
            resource_type: 'booking',
            resource_id: bookingId,
            resource_name: (booking as any).assets?.name,
            change_description: `Admin reported damage (${severity}). Score change: ${oldScore} -> ${newScore}. ID: ${borrowerId}`
        });

        return { 
            success: true, 
            scoreUpdated: oldScore !== newScore,
            oldScore,
            newScore
        };
    },

    /**
     * Update damage report status with resolution notes.
     * 更新损坏报告状态和处理备注。
     * 当状态变为 resolved 时，根据严重程度扣减学生信用分。
     */
    async updateDamageReportStatus(id: string, status: string, notes: string): Promise<boolean> {
        // 先获取报告详情，用于信用分扣减
        const { data: report } = await supabase
            .from('damage_reports')
            .select('severity, booking_id')
            .eq('id', id)
            .single();

        const { error } = await (supabase as any)
            .from('damage_reports')
            .update({
                status: status as DamageReportStatus,
                resolution_notes: notes,
            })
            .eq('id', id);

        if (error) {
            console.error('Error updating damage report:', error);
            return false;
        }

        // Day 7 要求：管理员确认损坏（resolved）时，扣减信用分
        // minor: -10, moderate: -20, severe: -50
        if (status === 'resolved' && report) {
            const severityMap: Record<string, number> = {
                minor: -10,
                moderate: -20,
                severe: -50,
            };
            const delta = severityMap[(report as any).severity] ?? -10;

            // 获取借用者 ID
            const { data: booking } = await supabase
                .from('bookings')
                .select('borrower_id')
                .eq('id', (report as any).booking_id)
                .single();

            if (booking) {
                await (supabase as any).rpc('update_credit_score', {
                    p_user_id: (booking as any).borrower_id,
                    p_delta: delta,
                    p_reason: `damage_${(report as any).severity}`,
                });

                // 当状态变为 resolved 时，意味着维修完成，将资产状态改回 available
                const { data: damageReport } = await supabase
                    .from('damage_reports')
                    .select('asset_id')
                    .eq('id', id)
                    .single();

                if (damageReport) {
                    await (supabase as any)
                        .from('assets')
                        .update({ status: status === 'resolved' ? 'available' : 'maintenance' })
                        .eq('id', (damageReport as any).asset_id);
                }
            }
        }

        return true;
    }
};
