-- =============================================
-- Author: Linpeng (💻 借用申请等待队列负责人)
-- Description: 初始化借用申请记录的演示数据
-- Date: 2026-03-07
-- =============================================

-- Ensure we have some test users in profiles first
INSERT INTO
    profiles (
        id,
        full_name,
        student_id,
        email,
        role,
        credit_score,
        department
    )
VALUES (
        '00000000-0000-0000-0000-000000000001',
        'Alice Student',
        'S2026001',
        'alice@student.unigear.edu',
        'student',
        150,
        'Computer Science'
    ),
    (
        '00000000-0000-0000-0000-000000000002',
        'Bob Learner',
        'S2026002',
        'bob@student.unigear.edu',
        'student',
        100,
        'Media Arts'
    ),
    (
        '00000000-0000-0000-0000-000000000003',
        'Admin Letao',
        'A001',
        'admin@unigear.edu',
        'admin',
        200,
        'Administration'
    ) ON CONFLICT (id) DO NOTHING;

-- Map to existing assets from previous init (assuming we know a few or generate new ones for safety)
-- We will just create 2 new test assets to ensure they exist, linked to a dummy category
INSERT INTO
    categories (
        id,
        name,
        name_zh,
        description
    )
VALUES (
        '11111111-1111-1111-1111-111111111111',
        'Test Equipment',
        '测试设备',
        'For booking mock data'
    ) ON CONFLICT (id) DO NOTHING;

INSERT INTO
    assets (
        id,
        category_id,
        name,
        serial_number,
        qr_code,
        condition,
        status,
        location
    )
VALUES (
        '22222222-2222-2222-2222-222222222221',
        '11111111-1111-1111-1111-111111111111',
        'Test Drone A',
        'SN-TEST-DRONE-A',
        'QR-TEST-A',
        'good',
        'available',
        'Lab 1'
    ),
    (
        '22222222-2222-2222-2222-222222222222',
        '11111111-1111-1111-1111-111111111111',
        'Test Camera B',
        'SN-TEST-CAM-B',
        'QR-TEST-B',
        'good',
        'borrowed',
        'Lab 2'
    ) ON CONFLICT (id) DO NOTHING;

-- Create Bookings mock data
INSERT INTO
    bookings (
        id,
        asset_id,
        borrower_id,
        status,
        start_date,
        end_date,
        notes
    )
VALUES
    -- Pending Request
    (
        '33333333-3333-3333-3333-333333333331',
        '22222222-2222-2222-2222-222222222221',
        '00000000-0000-0000-0000-000000000001',
        'pending',
        now() + interval '1 day',
        now() + interval '3 days',
        'Need this for my multimedia project weekend shoot.'
    ),
    -- Approved Request
    (
        '33333333-3333-3333-3333-333333333332',
        '22222222-2222-2222-2222-222222222221',
        '00000000-0000-0000-0000-000000000002',
        'approved',
        now() + interval '2 days',
        now() + interval '5 days',
        'Approved for field trip.'
    ),
    -- Active (Currently Borrowed)
    (
        '33333333-3333-3333-3333-333333333333',
        '22222222-2222-2222-2222-222222222222',
        '00000000-0000-0000-0000-000000000001',
        'active',
        now() - interval '2 days',
        now() + interval '1 day',
        'Currently using for event coverage.'
    ),
    -- Rejected Request
    (
        '33333333-3333-3333-3333-333333333334',
        '22222222-2222-2222-2222-222222222222',
        '00000000-0000-0000-0000-000000000002',
        'rejected',
        now() - interval '5 days',
        now() - interval '2 days',
        'Wanted the camera for vacation.'
    ) ON CONFLICT (id) DO NOTHING;

-- Update the rejection reason
UPDATE bookings
SET
    rejection_reason = 'Personal vacation is not a valid academic use case.'
WHERE
    id = '33333333-3333-3333-3333-333333333334';