import { BookingWithDetails } from '@/lib/bookingService';

export default function ApprovalModal({
    isOpen,
    booking,
    onClose,
    onApprove,
    onReject
}: {
    isOpen: boolean;
    booking: BookingWithDetails | null;
    onClose: () => void;
    onApprove: (id: string) => void;
    onReject: (id: string, reason: string) => void;
}) {
    if (!isOpen) return null;
    return <div>Approval Modal Placeholder</div>;
}
