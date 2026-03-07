import { BookingWithDetails } from '@/lib/bookingService';

export default function BookingTable({
    bookings,
    onReview
}: {
    bookings: BookingWithDetails[];
    onReview: (booking: BookingWithDetails) => void;
}) {
    return <div>Booking Table Placeholder</div>;
}
