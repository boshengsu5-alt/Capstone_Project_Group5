import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { Calendar, LocaleConfig, DateData } from 'react-native-calendars';
import { format, addDays, isBefore, isEqual, parseISO } from 'date-fns';
import { getBookingsForAsset } from '../services/bookingService';
import { theme } from '../theme';

// 配置日历中文本地化
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

/**
 * Calendar component showing asset availability with date range selection.
 * 日历组件，展示资产可用性并支持日期范围选择
 */
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
            const bookings = await getBookingsForAsset(assetId);

            const marked: MarkedDates = {};
            bookings.forEach((booking: { start_date: string; end_date: string }) => {
                let current = parseISO(booking.start_date);
                const end = parseISO(booking.end_date);

                while (isBefore(current, end) || isEqual(current, end)) {
                    const dateString = format(current, 'yyyy-MM-dd');
                    marked[dateString] = {
                        disabled: true,
                        disableTouchEvent: true,
                        color: theme.colors.danger,
                        textColor: theme.colors.background,
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

    const handleDayPress = (day: DateData) => {
        const dateString = day.dateString;

        // 已被预订的日期不可选
        if (bookedDates[dateString]?.disabled) return;

        if (!selectionStart || (selectionStart && selectionEnd)) {
            // 开始新选择
            setSelectionStart(dateString);
            setSelectionEnd(null);
        } else {
            // 完成范围选择
            const start = parseISO(selectionStart);
            const end = parseISO(dateString);

            if (isBefore(end, start)) {
                // 结束日期在开始之前，重新设为起点
                setSelectionStart(dateString);
            } else {
                // 检查范围内是否有冲突
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
                color: theme.colors.authPrimary,
                textColor: theme.colors.background,
            };

            if (selectionEnd) {
                marked[selectionEnd] = {
                    ...marked[selectionEnd],
                    selected: true,
                    endingDay: true,
                    color: theme.colors.authPrimary,
                    textColor: theme.colors.background,
                };

                // 标记中间日期
                let current = addDays(parseISO(selectionStart), 1);
                const end = parseISO(selectionEnd);
                while (isBefore(current, end)) {
                    const ds = format(current, 'yyyy-MM-dd');
                    marked[ds] = {
                        ...marked[ds],
                        selected: true,
                        color: theme.colors.authLight,
                        textColor: theme.colors.background,
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
                <ActivityIndicator size="large" color={theme.colors.authPrimary} />
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
                    selectedDayBackgroundColor: theme.colors.authPrimary,
                    todayTextColor: theme.colors.authPrimary,
                    arrowColor: theme.colors.authPrimary,
                    monthTextColor: theme.colors.authBackground,
                    textMonthFontWeight: 'bold',
                }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: theme.spacing.sm,
        backgroundColor: theme.colors.background,
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
        color: theme.colors.authPrimary,
        fontSize: 14,
    }
});

export default CalendarView;
