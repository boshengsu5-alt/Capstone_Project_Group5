import { supabase } from '@/lib/supabase';
import type { Database, DamageReport, DamageReportStatus } from '@/types/database';
import { auditService } from './auditService';

// ============================================================
// Booking Service (Web Admin). Web 管理端借用服务
// ============================================================

/** Booking with joined asset and borrower details. 包含资产和借用者详情的借用记录 */
export type BookingWithDetails = Database['public']['Tables']['bookings']['Row'] & {
    assets: Pick<Database['public']['Tables']['assets']['Row'], 'name' | 'qr_code' | 'images' | 'purchase_date' | 'purchase_price'> | null;
    profiles: Pick<Database['public']['Tables']['profiles']['Row'], 'full_name' | 'student_id'> | null;
    /** 学生端已提交的损坏报告（open/investigating 表示未处理）。 Student-submitted damage reports for this booking. */
    damage_reports: Array<{ id: string; status: string }> | null;
};

/** Damage report with joined asset, reporter, and borrower details. 包含资产、报告者和借用者详情的损坏报告 */
export type DamageReportWithDetails = DamageReport & {
    assets: Pick<Database['public']['Tables']['assets']['Row'], 'name' | 'qr_code' | 'images' | 'condition' | 'status' | 'purchase_price' | 'purchase_date'> | null;
    profiles: Pick<Database['public']['Tables']['profiles']['Row'], 'full_name' | 'student_id'> | null;
    bookings: {
        borrower_id: string;
        start_date: string;
        end_date: string;
        actual_return_date: string | null;
        /** 取货时拍摄的设备原始状态照片。Pickup condition photo taken by borrower. */
        pickup_photo_url: string | null;
        /** 归还时拍摄的设备状态照片。Return condition photo taken by borrower. */
        return_photo_url: string | null;
        profiles: Pick<Database['public']['Tables']['profiles']['Row'], 'full_name' | 'student_id'> | null;
    } | null;
};

// ============================================================
// Overdue Penalty Calculator. 逾期扣分计算器 (§7.1)
// ============================================================

/**
 * Calculate overdue credit penalty using tiered daily rates — FOR UI DISPLAY ONLY.
 * 按分级日费率计算逾期信用分扣减 — 仅用于 UI 预览展示。
 *
 * ⚠️  IMPORTANT: Actual credit deductions are handled exclusively by the three-node
 * PostgreSQL checkpoint system (check_overdue_bookings): Day 1 -10, Day 7 -15, Day 30 -25.
 * This function is NOT called during processReturn() or acknowledgeReturnWithExistingDamage().
 * 重要：实际扣分由数据库三节点检查系统统一处理（Day1 -10 / Day7 -15 / Day30 -25），
 * 此函数不在归还核验流程中调用，仅供 UI 参考展示。
 *
 * @param overdueDays - Number of days overdue. 逾期天数
 * @returns Penalty as a positive number (for display only). 扣分绝对值（仅展示用）
 */
export function calcOverduePenalty(overdueDays: number): number {
    if (overdueDays <= 0) return 0;
    let penalty = Math.min(overdueDays, 3) * 3;                          // 前 3 天
    if (overdueDays > 3) penalty += Math.min(overdueDays - 3, 4) * 5;   // 第 4-7 天
    if (overdueDays > 7) penalty += (overdueDays - 7) * 8;              // 第 7 天以后
    return Math.min(penalty, 50);                                         // 封顶 50
}

function getSeverityLabel(severity: string): string {
    return { minor: 'Minor', moderate: 'Moderate', severe: 'Severe' }[severity] ?? severity;
}

function getMetadataString(metadata: unknown, key: string): string | null {
    if (!metadata || typeof metadata !== 'object') return null;
    const value = (metadata as Record<string, unknown>)[key];
    return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function getMetadataNumber(metadata: unknown, key: string): number | null {
    if (!metadata || typeof metadata !== 'object') return null;
    const value = (metadata as Record<string, unknown>)[key];
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function getMetadataBoolean(metadata: unknown, key: string): boolean {
    if (!metadata || typeof metadata !== 'object') return false;
    return (metadata as Record<string, unknown>)[key] === true;
}

async function applyCreditDelta(userId: string, delta: number, reason: string): Promise<void> {
    const { error: rpcErr } = await (supabase as any).rpc('update_credit_score', {
        p_user_id: userId,
        p_delta: delta,
        p_reason: reason,
    });

    if (!rpcErr) return;

    const { data: profile } = await supabase
        .from('profiles')
        .select('credit_score')
        .eq('id', userId)
        .single();

    if (!profile) return;

    const newScore = Math.max(0, Math.min(200, (profile as any).credit_score + delta));
    await (supabase as any)
        .from('profiles')
        .update({ credit_score: newScore })
        .eq('id', userId);
}

async function getReturnBonusRevocationDelta(userId: string, bookingId: string): Promise<number> {
    const { data: notifications } = await (supabase as any)
        .from('notifications')
        .select('type, title, message, metadata')
        .eq('user_id', userId)
        .in('type', ['system', 'damage_reported']);

    if (!notifications || notifications.length === 0) return 0;

    const relatedNotifications = notifications.filter((notification: any) =>
        getMetadataString(notification.metadata, 'booking_id') === bookingId
    );
    if (relatedNotifications.length === 0) return 0;

    const alreadyRevoked = relatedNotifications.some((notification: any) => {
        if (getMetadataBoolean(notification.metadata, 'return_bonus_revoked')) return true;
        return getMetadataString(notification.metadata, 'reason') === 'return_bonus_reversed';
    });
    if (alreadyRevoked) return 0;

    const returnBonusNotification = relatedNotifications.find((notification: any) => {
        if (notification.type !== 'system') return false;

        const reason = getMetadataString(notification.metadata, 'reason');
        if (reason === 'return_bonus_granted') return true;

        return notification.title === 'Asset returned successfully'
            && typeof notification.message === 'string'
            && notification.message.includes('Credit score +5');
    });

    if (!returnBonusNotification) return 0;

    const explicitDelta = getMetadataNumber(returnBonusNotification.metadata, 'credit_delta');
    if (explicitDelta && explicitDelta > 0) return explicitDelta;

    return 5;
}

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
                assets ( name, qr_code, images, purchase_date, purchase_price ),
                profiles!borrower_id ( full_name, student_id ),
                damage_reports ( id, status )
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
        // 先获取 booking 详情，用于后续更新资产状态和通知
        const { data: booking } = await supabase
            .from('bookings')
            .select('borrower_id, asset_id, assets(name)')
            .eq('id', id)
            .single();

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

        // 审批通过 → 资产状态同步为 borrowed，防止同一资产被重复审批
        if (booking) {
            const { error: assetError } = await (supabase as any)
                .from('assets')
                .update({ status: 'borrowed' })
                .eq('id', (booking as any).asset_id);
            // 资产状态更新失败不应回滚已完成的审批，但必须记录以便排查
            if (assetError) {
                console.error('approveBooking: failed to update asset status to borrowed:', assetError);
            }
        }

        await auditService.logAction({
            operation_type: 'APPROVE',
            resource_type: 'booking',
            resource_id: id,
            resource_name: (booking as any)?.assets?.name,
            change_description: `Approved booking request for ${(booking as any)?.assets?.name || 'unknown asset'}. Asset status → borrowed.`
        });

        // 插入审批通过通知
        if (approverId && booking) {
            await (supabase as any).from('notifications').insert({
                user_id: (booking as any).borrower_id,
                type: 'booking_approved',
                title: 'Booking Approved',
                message: `Your booking for ${(booking as any).assets?.name ?? 'an asset'} has been approved.`,
                metadata: { booking_id: id }
            });
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
                assets ( name, qr_code, images, condition, status, purchase_price, purchase_date ),
                profiles!reporter_id ( full_name, student_id ),
                bookings ( borrower_id, start_date, end_date, actual_return_date, pickup_photo_url, return_photo_url, profiles!borrower_id ( full_name, student_id ) )
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
        // 获取 asset_id、借用者 ID 和日期信息，用于资产状态同步和逾期扣分
        const { data: booking, error: bookingFetchError } = await supabase
            .from('bookings')
            .select('asset_id, borrower_id, end_date, actual_return_date, assets(name)')
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

        // ── 逾期扣分由三节点 check_overdue_bookings() cron 统一处理，此处不重复扣 ──
        // Overdue credit deductions are handled exclusively by the checkpoint cron:
        //   Day 1 -10 / Day 7 -15 / Day 30 -25. processReturn() only confirms physical return.
        const endDate = (booking as any).end_date as string | null;
        const actualReturn = (booking as any).actual_return_date as string | null;

        await auditService.logAction({
            operation_type: 'VERIFY',
            resource_type: 'booking',
            resource_id: bookingId,
            resource_name: (booking as any).assets?.name,
            change_description: (() => {
                if (endDate && actualReturn) {
                    const days = Math.round(
                        (new Date(actualReturn).getTime() - new Date(endDate).getTime()) / (1000 * 60 * 60 * 24)
                    );
                    if (days > 0) return `Admin verified the return (overdue ${days}d). Asset → available. Overdue penalties already applied by checkpoint system.`;
                }
                return 'Admin verified the return as intact. Asset status set to available.';
            })(),
        });

        return true;
    },

    /**
     * Acknowledge a return where the student already submitted a damage report.
     * 确认归还：学生已在手机端提交损坏报告，管理员仅需核验归还，不重复创建报告。
     *
     * Differences from processReturn():
     * - Asset stays in 'maintenance' (not set to 'available', damage report already exists)
     * - No new damage report is created
     * - Overdue penalty still applies if applicable
     *
     * @param bookingId - Booking UUID to acknowledge. 要确认的借用 UUID
     * @returns true on success. 成功返回 true
     */
    async acknowledgeReturnWithExistingDamage(bookingId: string): Promise<boolean> {
        const { data: booking, error: fetchErr } = await supabase
            .from('bookings')
            .select('asset_id, borrower_id, end_date, actual_return_date, assets(name)')
            .eq('id', bookingId)
            .single();

        if (fetchErr || !booking) return false;

        // 标记借用已核验（booking → returned + VERIFIED）
        const { error } = await (supabase as any)
            .from('bookings')
            .update({ status: 'returned', rejection_reason: 'VERIFIED' })
            .eq('id', bookingId);

        if (error) return false;

        // 资产保持 maintenance 状态，等待损坏报告审核完成后由管理员手动重新上架
        // (Asset stays in maintenance; admin re-lists from Assets page after repair)
        await (supabase as any)
            .from('assets')
            .update({ status: 'maintenance' })
            .eq('id', (booking as any).asset_id);

        // 逾期扣分由三节点 check_overdue_bookings() cron 统一处理，此处不重复扣
        // Same as processReturn: overdue credit management is checkpoint system's responsibility.

        await auditService.logAction({
            operation_type: 'VERIFY',
            resource_type: 'booking',
            resource_id: bookingId,
            resource_name: (booking as any).assets?.name,
            change_description: 'Admin acknowledged return with pre-existing student damage report. Asset remains in maintenance.',
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
        const assetName = (booking as any).assets?.name ?? 'an asset';
        await (supabase as any).from('notifications').insert({
            user_id: borrowerId,
            type: 'damage_reported',
            title: 'Damage Report Filed — Review Pending',
            message: `Your borrowed item "${assetName}" was reported as damaged (${getSeverityLabel(severity)}). Credit score adjustment is pending review.`,
            metadata: {
                booking_id: bookingId,
                asset_id: assetId,
                asset_name: assetName,
                severity,
                stage: 'reported',
            },
        });

        // 更新借用状态为 returned，标记已核验 (prevent duplicate damage reports)
        await (supabase as any)
            .from('bookings')
            .update({ status: 'returned', rejection_reason: 'VERIFIED' })
            .eq('id', bookingId);

        // 资产进入维护状态，同时根据损坏程度更新 condition (minor→fair, moderate→poor, severe→damaged)
        // lost 时资产状态暂为 maintenance，等管理员确认后在 updateDamageReportStatus 改为 retired
        const conditionMap: Record<string, string> = { minor: 'fair', moderate: 'poor', severe: 'damaged', lost: 'damaged' };
        await (supabase as any)
            .from('assets')
            .update({ status: 'maintenance', condition: conditionMap[severity] ?? 'poor' })
            .eq('id', assetId);

        // ── 暂停未来预约（suspended 维修保留）────────────────────────
        // 找出该设备所有 pending/approved 且 start_date > now 的预约，改为 suspended
        // rejection_reason 设为 ASSET_MAINTENANCE 以便 restoreMaintenanceBookings 识别
        const now = new Date().toISOString();
        const { data: futureBookings } = await (supabase as any)
            .from('bookings')
            .select('id, borrower_id, start_date, assets(name)')
            .eq('asset_id', assetId)
            .in('status', ['pending', 'approved'])
            .gt('start_date', now);

        if (futureBookings && futureBookings.length > 0) {
            const futureIds = futureBookings.map((b: any) => b.id);
            await (supabase as any)
                .from('bookings')
                .update({ status: 'suspended', rejection_reason: 'ASSET_MAINTENANCE' })
                .in('id', futureIds);

            // 逐条发送暂停通知给受影响用户
            for (const fb of futureBookings) {
                await (supabase as any).from('notifications').insert({
                    user_id: fb.borrower_id,
                    type: 'booking_suspended',
                    title: '预约已暂停 — 设备维修中',
                    message: `您预约的「${(booking as any).assets?.name ?? '设备'}」因归还时发现损坏，已进入维修流程，您的预约（取货日：${new Date(fb.start_date).toLocaleDateString('en-CA')}）已暂时挂起。维修完成重新上架后将自动恢复，您也可以选择直接取消。`,
                    metadata: { booking_id: fb.id, asset_id: assetId },
                });
            }
        }
        // ─────────────────────────────────────────────────────────

        await auditService.logAction({
            operation_type: 'CREATE',
            resource_type: 'damage_report',
            resource_id: bookingId,
            resource_name: (booking as any).assets?.name,
            change_description: `Admin reported damage (${severity}). Asset set to maintenance. ${futureBookings?.length ?? 0} future booking(s) suspended. Pending review on Damage Reports page.`,
        });

        return true;
    },

    // ============================================================
    // Maintenance Booking Restore. 维修完成后恢复暂停预约
    // ============================================================

    /**
     * Restore or auto-cancel suspended bookings when an asset is re-listed.
     * 资产重新上架时，恢复或自动取消 ASSET_MAINTENANCE 暂停的预约。
     *
     * - start_date > now → restore to 'pending' (等待重新审批)
     * - start_date ≤ now → auto-cancel (取货日已过，无需等待)
     *
     * @param assetId - Asset UUID being re-listed. 重新上架的资产 UUID
     */
    /**
     * Check if an asset has any unresolved (open/investigating) damage reports.
     * 检查资产是否存在未处理的损坏报告（open/investigating）。
     *
     * Used to block re-listing until all damage claims are resolved.
     * 用于在损坏报告处理完毕前阻止重新上架。
     *
     * @param assetId - Asset UUID to check. 要检查的资产 UUID
     * @returns true if there are pending reports. 有未处理报告时返回 true
     */
    async hasPendingDamageReports(assetId: string): Promise<boolean> {
        const { data } = await (supabase as any)
            .from('damage_reports')
            .select('id')
            .eq('asset_id', assetId)
            .in('status', ['open', 'investigating'])
            .limit(1);
        return !!(data && data.length > 0);
    },

    async restoreMaintenanceBookings(assetId: string): Promise<void> {
        const now = new Date().toISOString();

        const { data: suspendedBookings } = await (supabase as any)
            .from('bookings')
            .select('id, borrower_id, start_date, assets(name)')
            .eq('asset_id', assetId)
            .eq('status', 'suspended')
            .eq('rejection_reason', 'ASSET_MAINTENANCE');

        if (!suspendedBookings || suspendedBookings.length === 0) return;

        const { data: assetData } = await supabase
            .from('assets')
            .select('name')
            .eq('id', assetId)
            .single();
        const assetName = (assetData as any)?.name ?? '设备';

        for (const sb of suspendedBookings) {
            const isFuture = sb.start_date > now;

            if (isFuture) {
                // 取货日未到 → 恢复为 pending，清空 ASSET_MAINTENANCE 标记
                await (supabase as any)
                    .from('bookings')
                    .update({ status: 'pending', rejection_reason: '' })
                    .eq('id', sb.id);

                await (supabase as any).from('notifications').insert({
                    user_id: sb.borrower_id,
                    type: 'booking_restored',
                    title: '好消息！设备已修好，预约已恢复',
                    message: `您暂停中的「${assetName}」预约（取货日：${new Date(sb.start_date).toLocaleDateString('en-CA')}）已自动恢复为待审批状态，请等待管理员重新审批。`,
                    metadata: { booking_id: sb.id, asset_id: assetId },
                });
            } else {
                // 取货日已过 → 自动取消，告知用户
                await (supabase as any)
                    .from('bookings')
                    .update({ status: 'cancelled', rejection_reason: 'ASSET_MAINTENANCE_EXPIRED' })
                    .eq('id', sb.id);

                await (supabase as any).from('notifications').insert({
                    user_id: sb.borrower_id,
                    type: 'booking_cancelled',
                    title: '预约已自动取消',
                    message: `您预约的「${assetName}」取货日（${new Date(sb.start_date).toLocaleDateString('en-CA')}）已过，因设备维修期间无法履约，预约已自动取消。如需借用请重新预约。`,
                    metadata: { booking_id: sb.id, asset_id: assetId },
                });
            }
        }
    },

    /**
     * Update damage report status, notes, and severity. Enforces one-way state flow.
     * 更新损坏报告状态、备注和严重程度。强制单向状态流转，防止终态回退重复扣分。
     *
     * State machine: open → investigating → resolved ✅ (terminal)
     *                open/investigating → dismissed  ✅ (terminal)
     * resolved/dismissed are terminal — any update attempt is rejected.
     *
     * @param id - Damage report UUID. 损坏报告 UUID
     * @param status - Target status. 目标状态
     * @param notes - Resolution notes. 处理备注
     * @param severity - Final severity (admin may adjust). 最终损坏程度（管理员可调整）
     */
    async updateDamageReportStatus(id: string, status: string, notes: string, severity: string): Promise<boolean> {
        const { data: report } = await supabase
            .from('damage_reports')
            .select('severity, booking_id, status, asset_id, reporter_id, auto_generated')
            .eq('id', id)
            .single();

        if (!report) return false;

        const previousStatus = (report as any).status as string;

        // 终态守卫：resolved/dismissed 不允许任何修改，防止重复扣分
        if (previousStatus === 'resolved' || previousStatus === 'dismissed') {
            console.warn(`[DamageReport] Rejected update: report ${id} is already in terminal state (${previousStatus})`);
            return false;
        }

        // 同时更新状态、备注和最终 severity（管理员审核后可修正学生申报的程度）
        const { error } = await (supabase as any)
            .from('damage_reports')
            .update({
                status: status as DamageReportStatus,
                resolution_notes: notes,
                severity,
            })
            .eq('id', id);

        if (error) {
            console.error('Error updating damage report:', error);
            return false;
        }

        if (status === 'investigating' && previousStatus === 'open') {
            const { data: booking } = await supabase
                .from('bookings')
                .select('borrower_id, assets ( name )')
                .eq('id', (report as any).booking_id)
                .single();

            if (booking) {
                const assetName = (booking as any).assets?.name ?? '设备';
                await (supabase as any).from('notifications').insert({
                    user_id: (booking as any).borrower_id,
                    type: 'damage_reported',
                    title: 'Damage Review Started',
                    message: `The damage report for "${assetName}" is now under investigation. We will notify you once the review is completed.`,
                    metadata: {
                        booking_id: (report as any).booking_id,
                        asset_id: (report as any).asset_id,
                        asset_name: assetName,
                        stage: 'investigating',
                        severity,
                    },
                });
            }
        }

        if (status === 'dismissed') {
            const { data: booking } = await supabase
                .from('bookings')
                .select('borrower_id, assets ( name )')
                .eq('id', (report as any).booking_id)
                .single();

            if (booking) {
                const assetName = (booking as any).assets?.name ?? '设备';
                await (supabase as any).from('notifications').insert({
                    user_id: (booking as any).borrower_id,
                    type: 'damage_reported',
                    title: 'Damage Report Dismissed',
                    message: `The damage report for "${assetName}" has been dismissed. No credit deduction or compensation will be applied.`,
                    metadata: {
                        booking_id: (report as any).booking_id,
                        asset_id: (report as any).asset_id,
                        asset_name: assetName,
                        stage: 'dismissed',
                        severity,
                    },
                });
            }
        }

        // 首次进入 resolved 时扣减信用分并发送最终处理通知，确保只扣一次
        // §5.3 三场景扣分逻辑（lost 特殊处理）：
        //   场景一：auto_generated=true（系统30天判定）→ 0分（逾期系统已扣满-50）
        //   场景二：reporter_id==borrower_id（用户主动自报）→ -30分（诚信从轻）
        //   场景三：reporter_id!=borrower_id（管理员发现调包）→ -50分（欺诈重罚）
        let resolvedDelta = 0; // 供审计日志使用
        if (status === 'resolved') {
            const isAutoGenerated = ((report as any).auto_generated as boolean) ?? false;
            const reporterId = ((report as any).reporter_id as string) ?? '';

            const { data: booking } = await supabase
                .from('bookings')
                .select('borrower_id, assets ( name, purchase_price, purchase_date )')
                .eq('id', (report as any).booking_id)
                .single();

            if (booking) {
                const borrowerId = (booking as any).borrower_id as string;

                // 根据场景计算 delta
                let delta: number;
                if (severity === 'lost') {
                    if (isAutoGenerated) {
                        delta = 0; // 场景一：逾期系统已扣满，不重复扣
                    } else if (reporterId === borrowerId) {
                        delta = -30; // 场景二：用户主动申报，从轻
                    } else {
                        delta = -50; // 场景三：管理员发现调包，重罚
                    }
                } else {
                    const severityMap: Record<string, number> = { minor: -5, moderate: -15, severe: -30 };
                    delta = severityMap[severity] ?? -10;
                }
                resolvedDelta = delta;

                // 信用分扣减（delta=0 时跳过，避免无意义记录）
                let returnBonusDelta = 0;
                if (delta !== 0) {
                    await applyCreditDelta(borrowerId, delta, `damage_${severity}`);

                    returnBonusDelta = await getReturnBonusRevocationDelta(
                        borrowerId,
                        (report as any).booking_id,
                    );
                    if (returnBonusDelta > 0) {
                        await applyCreditDelta(
                            borrowerId,
                            -returnBonusDelta,
                            `damage_return_bonus_reversal_${(report as any).booking_id}`,
                        );
                    }
                }

                // 计算赔偿金额（§5.2 公式）
                // lost 场景：用户自报 → 折旧价；系统/管理员 → 全款
                const price = (booking as any).assets?.purchase_price as number | null;
                const purchaseDate = (booking as any).assets?.purchase_date as string | null;
                let compensation: number | null = null;
                if (price != null) {
                    if (severity === 'lost') {
                        const isUserSelfReport = !isAutoGenerated && reporterId === borrowerId;
                        if (isUserSelfReport) {
                            const years = purchaseDate
                                ? (Date.now() - new Date(purchaseDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25)
                                : 2;
                            const depRatio = years <= 1 ? 1.0 : years <= 3 ? 0.8 : years <= 5 ? 0.5 : 0.2;
                            compensation = Math.round(price * depRatio); // 折旧价
                        } else {
                            compensation = Math.round(price); // 全款（无折旧）
                        }
                    } else {
                        const years = purchaseDate
                            ? (Date.now() - new Date(purchaseDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25)
                            : 2;
                        const depRatio = years <= 1 ? 1.0 : years <= 3 ? 0.8 : years <= 5 ? 0.5 : 0.2;
                        const coef = { minor: 0.2, moderate: 0.5, severe: 1.0 }[severity] ?? 0.5;
                        compensation = Math.round(price * depRatio * coef);
                    }
                }

                // 确认丢失 → 资产标记为 retired（不可再借）
                if (severity === 'lost') {
                    await (supabase as any)
                        .from('assets')
                        .update({ status: 'retired', condition: 'damaged' })
                        .eq('id', (report as any).asset_id);
                }

                const assetName = (booking as any).assets?.name ?? '设备';
                const totalCreditDelta = delta - returnBonusDelta;
                // lost+auto_generated 时 delta=0，通知措辞特殊处理（只告知赔偿，不说扣分）
                const creditMsg = delta === 0
                    ? '（逾期信用分已扣满，本次不额外扣减）'
                    : `Damage penalty: ${Math.abs(delta)} points.${returnBonusDelta > 0 ? ` Previous return bonus revoked: ${returnBonusDelta} points.` : ''} Total credit impact: ${Math.abs(totalCreditDelta)} points.`;
                await (supabase as any).from('notifications').insert({
                    user_id: borrowerId,
                    type: 'damage_reported',
                    title: severity === 'lost' ? '设备丢失已确认 — 请处理赔偿' : 'Damage Review Result — Credit Updated',
                    message: `Damage to "${assetName}" has been confirmed as ${getSeverityLabel(severity)}. ${creditMsg}${compensation != null ? ` Compensation due: ¥${compensation.toLocaleString()}.` : ''}`,
                    metadata: {
                        booking_id: (report as any).booking_id,
                        asset_id: (report as any).asset_id,
                        asset_name: assetName,
                        stage: 'resolved',
                        severity,
                        credit_delta: delta,
                        return_bonus_revoked: returnBonusDelta > 0,
                        return_bonus_delta: returnBonusDelta > 0 ? -returnBonusDelta : 0,
                        total_credit_delta: totalCreditDelta,
                        compensation,
                    },
                });
            }
        }

        // ── 审计日志：记录损坏报告每次状态变更 ──────────────────────
        const { data: assetData } = await (supabase as any)
            .from('assets')
            .select('name')
            .eq('id', (report as any).asset_id)
            .single();

        const statusLabels: Record<string, string> = {
            open: 'Open',
            investigating: 'Investigating',
            resolved: 'Resolved',
            dismissed: 'Dismissed',
        };
        let auditDesc = `Damage report status: ${statusLabels[previousStatus] ?? previousStatus} → ${statusLabels[status] ?? status}. Severity: ${severity}.`;
        if (status === 'resolved') {
            auditDesc += resolvedDelta === 0
                ? ' Credit delta: 0 (auto-generated lost report, overdue system already capped at -50).'
                : ` Credit delta: ${resolvedDelta}.`;
        } else if (status === 'dismissed') {
            auditDesc += ' No credit deduction.';
        }
        if (notes) auditDesc += ` Notes: ${notes}`;

        await auditService.logAction({
            operation_type: 'UPDATE',
            resource_type: 'damage_report',
            resource_id: id,
            resource_name: (assetData as any)?.name,
            change_description: auditDesc,
            metadata: {
                previous_status: previousStatus,
                new_status: status,
                severity,
                ...(notes ? { notes } : {}),
            },
        });
        // ─────────────────────────────────────────────────────────

        return true;
    }
};
