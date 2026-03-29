/**
 * Re-export all types from the single source of truth.
 * 从唯一事实来源重新导出所有类型
 *
 * Web team: import from '@/types/database' as before.
 * All types originate from database/types/supabase.ts.
 * Web 团队：照旧从 '@/types/database' 导入，实际来源为 database/types/supabase.ts
 */
export type {
    UserRole,
    AssetCondition,
    AssetStatus,
    WarrantyStatus,
    BookingStatus,
    DamageSeverity,
    DamageReportStatus,
    CompensationStatus,
    CompensationRecordType,
    NotificationType,
    Profile,
    Category,
    Asset,
    Booking,
    DamageReport,
    Notification,
    CreditScoreLog,
    CompensationCase,
    CompensationRecord,
    Review,
    AuditLog,
    ProfileInsert,
    CategoryInsert,
    AssetInsert,
    BookingInsert,
    DamageReportInsert,
    NotificationInsert,
    CompensationCaseInsert,
    CompensationRecordInsert,
    ReviewInsert,
    AuditLogInsert,
    ProfileUpdate,
    CategoryUpdate,
    AssetUpdate,
    BookingUpdate,
    DamageReportUpdate,
    NotificationUpdate,
    CompensationCaseUpdate,
    ReviewUpdate,
    ReviewReply,
    ReviewReplyInsert,
    Database,
} from '../../database/types/supabase';

/** Asset creation payload (omit auto-generated fields). 创建资产的表单载荷 */
export type { AssetInsert as CreateAssetPayload } from '../../database/types/supabase';
