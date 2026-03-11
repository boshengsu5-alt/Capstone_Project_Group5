import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { supabase } from '../services/supabase';
import { format, addDays, isBefore, isAfter, parseISO, isEqual } from 'date-fns';

// Configure calendar locale
LocaleConfig.locales['zh'] = {
    monthNames: ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'],
    monthNamesShort: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
    dayNames: ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'],
    dayNamesShort: ['日', '一', '二', '三', '四', '五', '六'],
    today: '今天'
};
LocaleConfig.defaultLocale = 'zh';

interface CalendarViewProps {
    assetId: string;
    onDateChange?: (startDate: string, endDate: string) => void;
}

interface MarkedDates {
    [date: string]: {
        disabled?: boolean;
        disableTouchEvent?: boolean;
        color?: string;
        textColor?: string;
        startingDay?: boolean;
        endingDay?: boolean;
        selected?: boolean;
        marked?: boolean;
        activeOpacity?: number;
    };
}

const CalendarView: React.FC<CalendarViewProps> = ({ assetId, onDateChange }) => {
    const [loading, setLoading] = useState(true);
    const [bookedDates, setBookedDates] = useState<MarkedDates>({});
    const [selectionStart, setSelectionStart] = useState<string | null>(null);
    const [selectionEnd, setSelectionEnd] = useState<string | null>(null);

    useEffect(() => {
        if (assetId) {
            fetchBookings();
        }
    }, [assetId]);

    const fetchBookings = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('bookings')
                .select('start_date, end_date, status')
                .eq('asset_id', assetId)
                .in('status', ['approved', 'active', 'pending', 'returned']);

            if (error) throw error;

            const marked: MarkedDates = {};
            data.forEach((booking: any) => {
                let current = parseISO(booking.start_date);
                const end = parseISO(booking.end_date);

                while (isBefore(current, end) || isEqual(current, end)) {
                    const dateString = format(current, 'yyyy-MM-dd');
                    marked[dateString] = {
                        disabled: true,
                        disableTouchEvent: true,
                        color: '#EF4444',
                        textColor: 'white',
                        selected: true,
                    };
                    current = addDays(current, 1);
                }
            });

            setBookedDates(marked);
        } catch (error) {
            console.error('[CalendarView] Error fetching bookings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDayPress = (day: any) => {
        const dateString = day.dateString;

        // Don't allow selecting booked dates
        if (bookedDates[dateString]?.disabled) return;

        if (!selectionStart || (selectionStart && selectionEnd)) {
            // Start new selection
            setSelectionStart(dateString);
            setSelectionEnd(null);
        } else {
            // Complete range selection
            const start = parseISO(selectionStart);
            const end = parseISO(dateString);

            if (isBefore(end, start)) {
                // If end is before start, make it the new start
                setSelectionStart(dateString);
            } else {
                // Check if any booked dates are in between
                let hasConflict = false;
                let current = start;
                while (isBefore(current, end) || isEqual(current, end)) {
                    if (bookedDates[format(current, 'yyyy-MM-dd')]?.disabled) {
                        hasConflict = true;
                        break;
                    }
                    current = addDays(current, 1);
                }

                if (hasConflict) {
                    // Reset if there's a conflict
                    setSelectionStart(dateString);
                } else {
                    setSelectionEnd(dateString);
                    if (onDateChange) {
                        onDateChange(selectionStart, dateString);
                    }
                }
            }
        }
    };

    const getMarkedDates = () => {
        const marked: MarkedDates = { ...bookedDates };

        if (selectionStart) {
            marked[selectionStart] = {
                ...marked[selectionStart],
                selected: true,
                startingDay: true,
                color: '#6366F1',
                textColor: 'white',
            };

            if (selectionEnd) {
                marked[selectionEnd] = {
                    ...marked[selectionEnd],
                    selected: true,
                    endingDay: true,
                    color: '#6366F1',
                    textColor: 'white',
                };

                // Mark dates in between
                let current = addDays(parseISO(selectionStart), 1);
                const end = parseISO(selectionEnd);
                while (isBefore(current, end)) {
                    const ds = format(current, 'yyyy-MM-dd');
                    marked[ds] = {
                        ...marked[ds],
                        selected: true,
                        color: '#A5B4FC', // Lighter purple for middle
                        textColor: 'white',
                    };
                    current = addDays(current, 1);
                }
            }
        }

        return marked;
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#6366F1" />
                <Text style={styles.loadingText}>加载预订信息...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Calendar
                markingType={'period'}
                markedDates={getMarkedDates()}
                onDayPress={handleDayPress}
                theme={{
                    selectedDayBackgroundColor: '#6366F1',
                    todayTextColor: '#6366F1',
                    arrowColor: '#6366F1',
                    monthTextColor: '#1E1B4B',
                    textMonthFontWeight: 'bold',
                }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 8,
        backgroundColor: '#fff',
        borderRadius: 12,
        marginVertical: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    centerContainer: {
        height: 300,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        color: '#6366F1',
        fontSize: 14,
    }
});

export default CalendarView;
