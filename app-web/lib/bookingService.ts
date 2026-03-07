export interface BookingWithDetails {
    id: string;
    status: string;
}

export const bookingService = {
    async getBookings() {
        return [];
    },
    async approveBooking(id: string) {
        return true;
    },
    async rejectBooking(id: string, reason: string) {
        return true;
    }
};
