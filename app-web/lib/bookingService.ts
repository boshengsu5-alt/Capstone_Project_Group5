import { supabase } from '@/lib/supabase';
import type { Database, DamageReport, DamageReportStatus } from '@/types/database';
import { auditService } from './auditService';

// ============================================================
// Booking Service (Web Admin). Web 管理端借用服务
// ============================================================

/** Booking with joined asset and borrower details. 包含资产和借用者详情的借用记录 */
export type BookingWithDetails = Database['public']['Tables']['bookings']['Row'] & {
    assets: Pick<Database['public']['Tables']['assets']['Row'], 'name' | 'qr_code' | 'images'> | null;
    profiles: Pick<Database['public']['Tables']['profiles']['Row'], 'full_name' | 'student_id'> | null;
};

/** Damage report with joined asset, reporter, and borrower details. 包含资产、报告者和借用者详情的损坏报告 */
export type DamageReportWithDetails = DamageReport & {
    assets: Pick<Database['public']['Tables']['assets']['Row'], 'name' | 'qr_code' | 'images' | 'condition' | 'status'> | null;
    profiles: Pick<Database['public']['Tables']['profiles']['Row'], 'full_name' | 'student_id'> | null;
    bookings: {
        borrower_id: string;
        profiles: Pick<Database['public']['Tables']['profiles']['Row'], 'full_name' | 'student_id'> | null;
    } | null;
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
                assets ( name, qr_code, images, condition, status ),
                profiles!reporter_id ( full_name, student_id ),
                bookings ( borrower_id, profiles!borrower_id ( full_name, student_id ) )
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

        // 标记归还已验证（借用 rejection_reason 字段，因当前 schema 无 verified 状态）
        // TODO: 建议新增 BookingStatus 'completed' 替代此 hack
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
    async createDamageReport(bookingId: string, description: string, severity: string, photoUrl?: string): Promise<boolean> {
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
            return false;
        }

        const borrowerId = (booking as any).borrower_id;
        const { data: { user } } = await supabase.auth.getUser();

        // 插入损坏报告（信用分扣减在 updateDamageReportStatus resolved 时统一处理，避免双重扣减）
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
            return false;
        }

        // 标记归还已验证（借用 rejection_reason 字段，因当前 schema 无 verified 状态）
        await (supabase as any)
            .from('bookings')
            .update({ status: 'returned', rejection_reason: 'VERIFIED' })
            .eq('id', bookingId);

        // 归还验证时报告损坏：资产进入维护状态，同时更新 condition (minor→fair, moderate→poor, severe→damaged)
        const conditionMap: Record<string, string> = { minor: 'fair', moderate: 'poor', severe: 'damaged' };
        await (supabase as any)
            .from('assets')
            .update({ status: 'maintenance', condition: conditionMap[severity] ?? 'poor' })
            .eq('id', (booking as any).asset_id);

        // 审计日志
        await auditService.logAction({
            operation_type: 'VERIFY',
            resource_type: 'booking',
            resource_id: bookingId,
            resource_name: (booking as any).assets?.name,
            change_description: `Admin reported damage (${severity}). Borrower: ${borrowerId}`
        });

        return true;
    },

    /**
     * Report damage (admin-initiated). Creates an 'open' damage report.
     * 管理员报告损坏，创建状态为 open 的损坏报告，等待在 Damage Reports 页面审核处理。
     *
     * 信用分不在此处扣减！仅在 Damage Reports 页面将状态改为 resolved 时
     * 由 updateDamageReportStatus() 统一扣减，确保流程清晰、不重复扣分。
     * (Credit deduction happens ONLY in updateDamageReportStatus when → resolved)
     */
    async reportDamage(bookingId: string, severity: string, description: string): Promise<boolean> {
        const { data: booking, error: bookingError } = await supabase
            .from('bookings')
            .select('*, assets ( name )')
            .eq('id', bookingId)
            .single();

        if (bookingError || !booking) {
            console.error('Booking not found for damage report:', bookingError);
            return false;
        }

        const borrowerId = (booking as any).borrower_id;
        const assetId = (booking as any).asset_id;
        const { data: { user } } = await supabase.auth.getUser();

        // 以 open 状态创建损坏报告，等待管理员在 Damage Reports 页面审核 (open → investigating → resolved)
        const { error: reportError } = await (supabase as any)
            .from('damage_reports')
            .insert({
                booking_id: bookingId,
                asset_id: assetId,
                reporter_id: user?.id ?? borrowerId,
                description,
                severity,
                photo_urls: [],
            });

        if (reportError) {
            console.error('Error creating damage report:', reportError);
            return false;
        }

        // 给借用者发送损坏通知（此时仅告知已报告，信用分待审核后扣减）
        const severityLabel: Record<string, string> = { minor: 'Minor', moderate: 'Moderate', severe: 'Severe' };
        await (supabase as any).from('notifications').insert({
            user_id: borrowerId,
            type: 'damage_reported',
            title: 'Damage Reported — Under Review',
            message: `Your borrowed item "${(booking as any).assets?.name ?? 'an asset'}" was reported as damaged (${severityLabel[severity] ?? severity}). Credit score adjustment is pending review.`,
            metadata: { booking_id: bookingId, severity },
        });

        // 更新借用状态为 returned，标记已核验 (prevent duplicate damage reports)
        await (supabase as any)
            .from('bookings')
            .update({ status: 'returned', rejection_reason: 'VERIFIED' })
            .eq('id', bookingId);

        // 资产进入维护状态，同时根据损坏程度更新 condition (minor→fair, moderate→poor, severe→damaged)
        const conditionMap: Record<string, string> = { minor: 'fair', moderate: 'poor', severe: 'damaged' };
        await (supabase as any)
            .from('assets')
            .update({ status: 'maintenance', condition: conditionMap[severity] ?? 'poor' })
            .eq('id', assetId);

        await auditService.logAction({
            operation_type: 'CREATE',
            resource_type: 'damage_report',
            resource_id: bookingId,
            resource_name: (booking as any).assets?.name,
            change_description: `Admin reported damage (${severity}). Asset set to maintenance. Pending review on Damage Reports page.`,
        });

        return true;
    },

    /**
     * Update damage report status with resolution notes.
     * 更新损坏报告状态和处理备注。
     * 当状态变为 resolved 时，根据严重程度扣减学生信用分。
     */
    async updateDamageReportStatus(id: string, status: string, notes: string): Promise<boolean> {
        // 先获取报告详情（含当前状态），用于判断是否需要扣减信用分
        const { data: report } = await supabase
            .from('damage_reports')
            .select('severity, booking_id, status, asset_id')
            .eq('id', id)
            .single();

        if (!report) {
            console.error('Damage report not found:', id);
            return false;
        }

        const previousStatus = (report as any).status;

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

        // 仅当状态从 非resolved 变为 resolved 时才扣减信用分，防止双重扣分
        if (status === 'resolved' && previousStatus !== 'resolved') {
            // 统一扣分标准：与 reportDamageAndDeduct 保持一致 (minor:-10, moderate:-20, severe:-30)
            const severityMap: Record<string, number> = {
                minor: -10,
                moderate: -20,
                severe: -30,
            };
            const delta = severityMap[(report as any).severity] ?? -10;

            const { data: booking } = await supabase
                .from('bookings')
                .select('borrower_id, assets ( name )')
                .eq('id', (report as any).booking_id)
                .single();

            if (booking) {
                const { error: rpcErr } = await (supabase as any).rpc('update_credit_score', {
                    p_user_id: (booking as any).borrower_id,
                    p_delta: delta,
                    p_reason: `damage_${(report as any).severity}`,
                });

                if (rpcErr) {
                    // 回退方案：管理员身份直接更新信用分
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('credit_score')
                        .eq('id', (booking as any).borrower_id)
                        .single();
                    if (profile) {
                        const newScore = Math.max(0, Math.min(200, (profile as any).credit_score + delta));
                        await (supabase as any)
                            .from('profiles')
                            .update({ credit_score: newScore })
                            .eq('id', (booking as any).borrower_id);
                    }
                }

                // 给借用者发送扣分通知
                const severityLabel: Record<string, string> = { minor: 'Minor', moderate: 'Moderate', severe: 'Severe' };
                await (supabase as any).from('notifications').insert({
                    user_id: (booking as any).borrower_id,
                    type: 'damage_reported',
                    title: 'Credit Score Deducted — Damage Resolved',
                    message: `Damage report for "${(booking as any).assets?.name ?? 'an asset'}" has been resolved (${severityLabel[(report as any).severity] ?? (report as any).severity}). ${Math.abs(delta)} credit points have been deducted.`,
                    metadata: { booking_id: (report as any).booking_id, severity: (report as any).severity, delta },
                });
            }
        }

        // resolved 仅代表"损坏报告已处理/信用分已扣减"，不代表资产已修好。
        // 资产仍保持 maintenance 状态，管理员确认修复后需在 Assets 页面手动改回 available。
        // (Resolved = claim processed & credit deducted. Asset stays in maintenance
        //  until admin manually restores it from the Assets page after actual repair.)

        return true;
    }
};
