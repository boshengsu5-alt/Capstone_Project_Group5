import { supabase } from '@/lib/supabase';
import type { Database } from '../../database/types/supabase';

// Define the expanded booking type that includes joined asset and borrower info
export type BookingWithDetails = Database['public']['Tables']['bookings']['Row'] & {
    assets: Pick<Database['public']['Tables']['assets']['Row'], 'name' | 'qr_code'> | null;
    profiles: Pick<Database['public']['Tables']['profiles']['Row'], 'full_name' | 'student_id'> | null;
};

export const bookingService = {
    /**
     * Fetch all bookings with asset and borrower details
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
            console.warn('Supabase fetch failed (using mock data fallback):', error.message || error);
            // For local development without a DB, return some mock data
            return this.getMockBookings();
        }

        // In case the DB is empty but connected, we can still show UI
        if (data && data.length === 0) {
            return this.getMockBookings(); // fallback for pure UI testing
        }

        // Due to Supabase types, we need to cast the joined result
        return (data as unknown) as BookingWithDetails[];
    },

    /**
     * Approve a booking request
     * @param id Booking ID
     * @param approverId Admin ID approving the request
     */
    async approveBooking(id: string, approverId?: string): Promise<boolean> {
        const payload: Database['public']['Tables']['bookings']['Update'] = {
            status: 'approved',
            approver_id: approverId || null
        };
        const { error } = await supabase
            .from('bookings')
            // @ts-expect-error Supabase strict types fail here due to missing Relationships in generated types
            .update(payload)
            .eq('id', id);

        if (error) {
            console.error('Error approving booking:', error);
            return false;
        }
        return true;
    },

    /**
     * Reject a booking request
     * @param id Booking ID
     * @param reason Rejection reason
     * @param approverId Admin ID rejecting the request
     */
    async rejectBooking(id: string, reason: string, approverId?: string): Promise<boolean> {
        const payload: Database['public']['Tables']['bookings']['Update'] = {
            status: 'rejected',
            rejection_reason: reason,
            approver_id: approverId || null
        };
        const { error } = await supabase
            .from('bookings')
            // @ts-expect-error Supabase strict types fail here due to missing Relationships in generated types
            .update(payload)
            .eq('id', id);

        if (error) {
            console.error('Error rejecting booking:', error);
            return false;
        }
        return true;
    },

    /**
     * Hardcoded mock bookings for UI development
     * Used as fallback if Supabase is disconnected or empty
     */
    getMockBookings(): BookingWithDetails[] {
        const now = new Date();
        const plusOneDay = new Date(now.getTime() + 86400000);
        const plusThreeDays = new Date(now.getTime() + 86400000 * 3);
        const minusTwoDays = new Date(now.getTime() - 86400000 * 2);

        return [
            {
                id: 'mock-1',
                asset_id: 'asset-1',
                borrower_id: 'user-1',
                approver_id: null,
                status: 'pending',
                start_date: plusOneDay.toISOString(),
                end_date: plusThreeDays.toISOString(),
                actual_return_date: null,
                pickup_photo_url: '',
                return_photo_url: '',
                notes: 'Need for weekend multimedia assignment',
                rejection_reason: '',
                created_at: minusTwoDays.toISOString(),
                updated_at: minusTwoDays.toISOString(),
                assets: { name: 'DJI Mavic 3 Pro', qr_code: 'UAV-001' },
                profiles: { full_name: 'Alice Student', student_id: 'S2026001' }
            },
            {
                id: 'mock-2',
                asset_id: 'asset-2',
                borrower_id: 'user-2',
                approver_id: 'admin-1',
                status: 'approved',
                start_date: plusOneDay.toISOString(),
                end_date: plusThreeDays.toISOString(),
                actual_return_date: null,
                pickup_photo_url: '',
                return_photo_url: '',
                notes: 'Approved for field trip',
                rejection_reason: '',
                created_at: minusTwoDays.toISOString(),
                updated_at: minusTwoDays.toISOString(),
                assets: { name: 'Sony A7R5 Body', qr_code: 'CAM-002' },
                profiles: { full_name: 'Bob Learner', student_id: 'S2026002' }
            },
            {
                id: 'mock-3',
                asset_id: 'asset-3',
                borrower_id: 'user-3',
                approver_id: 'admin-1',
                status: 'rejected',
                start_date: plusOneDay.toISOString(),
                end_date: plusThreeDays.toISOString(),
                actual_return_date: null,
                pickup_photo_url: '',
                return_photo_url: '',
                notes: 'Personal trip to Lapland',
                rejection_reason: 'Equipment is restricted for academic use only during peak periods.',
                created_at: minusTwoDays.toISOString(),
                updated_at: minusTwoDays.toISOString(),
                assets: { name: 'Insta360 X3', qr_code: 'CAM-004' },
                profiles: { full_name: 'Charlie Smith', student_id: 'S2026003' }
            }
        ];
    }
};
