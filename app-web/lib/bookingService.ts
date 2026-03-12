import { supabase } from '@/lib/supabase';
import type { Database, DamageReport, DamageReportStatus } from '../../database/types/supabase';

// ============================================================
// Booking Service (Web Admin). Web 管理端借用服务
// ============================================================

/** Booking with joined asset and borrower details. 包含资产和借用者详情的借用记录 */
export type BookingWithDetails = Database['public']['Tables']['bookings']['Row'] & {
    assets: Pick<Database['public']['Tables']['assets']['Row'], 'name' | 'qr_code'> | null;
    profiles: Pick<Database['public']['Tables']['profiles']['Row'], 'full_name' | 'student_id'> | null;
};

/** Damage report with joined asset and reporter details. 包含资产和报告者详情的损坏报告 */
export type DamageReportWithDetails = DamageReport & {
    assets: Pick<Database['public']['Tables']['assets']['Row'], 'name'> | null;
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
                assets ( name, qr_code ),
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
                assets ( name ),
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
        const { error } = await (supabase as any)
            .from('bookings')
            .update({ status })
            .eq('id', bookingId);

        if (error) {
            console.error('Error processing return:', error);
            return false;
        }
        return true;
    },

    /**
     * Create a damage report from return verification (admin-initiated).
     * 管理员在归还验证时创建损坏报告
     */
    async createDamageReport(bookingId: string, description: string, severity: string): Promise<boolean> {
        // 先获取 booking 详情以拿到 asset_id 和当前管理员 ID
        const { data: booking } = await supabase
            .from('bookings')
            .select('asset_id, borrower_id')
            .eq('id', bookingId)
            .single();

        if (!booking) {
            console.error('Booking not found for damage report');
            return false;
        }

        const { data: { user } } = await supabase.auth.getUser();

        const { error } = await (supabase as any)
            .from('damage_reports')
            .insert({
                booking_id: bookingId,
                asset_id: (booking as any).asset_id,
                reporter_id: user?.id ?? (booking as any).borrower_id,
                description,
                severity,
                photo_urls: [],
            });

        if (error) {
            console.error('Error creating damage report:', error);
            return false;
        }

        // 同时更新 booking 状态为 returned
        await (supabase as any)
            .from('bookings')
            .update({ status: 'returned' })
            .eq('id', bookingId);

        return true;
    },

    /**
     * Update damage report status with resolution notes.
     * 更新损坏报告状态和处理备注
     */
    async updateDamageReportStatus(id: string, status: string, notes: string): Promise<boolean> {
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

        return true;
    }
};
