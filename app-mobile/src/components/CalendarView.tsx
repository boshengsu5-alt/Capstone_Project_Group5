import React, { useState, useEffect } from 'react';
import {
    View, StyleSheet, ActivityIndicator, Text, TouchableOpacity,
    Modal, FlatList, SafeAreaView,
} from 'react-native';
import { Calendar, LocaleConfig, DateData } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { format, addDays, isBefore, isEqual, parseISO } from 'date-fns';
import { getBookingsForAsset } from '../services/bookingService';
import { theme } from '../theme';
import { useTranslation } from 'react-i18next';

// 配置日历中文本地化
LocaleConfig.locales['zh'] = {
    monthNames: ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'],
    monthNamesShort: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
    dayNames: ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'],
    dayNamesShort: ['日', '一', '二', '三', '四', '五', '六'],
    today: '今天'
};
LocaleConfig.locales['en'] = {
    monthNames: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    monthNamesShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    dayNames: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    dayNamesShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    today: 'Today'
};
LocaleConfig.defaultLocale = 'zh';

// 生成 08:00 ~ 22:00 每 30 分钟一个时间槽
const TIME_SLOTS: string[] = Array.from({ length: 29 }, (_, i) => {
    const totalMin = 8 * 60 + i * 30;
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
});

interface CalendarViewProps {
    assetId: string;
    onDateChange?: (startDate: string, endDate: string) => void;
    /** 禁用日历交互（设备不可借用时传 true）*/
    disabled?: boolean;
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
 * Calendar component showing asset availability with date range + time selection.
 * 日历组件，展示资产可用性并支持日期范围及精确到半小时的时间选择
 */
const CalendarView: React.FC<CalendarViewProps> = ({ assetId, onDateChange, disabled = false }) => {
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(false);
    const [bookedDates, setBookedDates] = useState<MarkedDates>({});
    const [selectionStart, setSelectionStart] = useState<string | null>(null);
    const [selectionEnd, setSelectionEnd] = useState<string | null>(null);
    const { t, i18n } = useTranslation();

    useEffect(() => {
        // Update day names based on language
        LocaleConfig.defaultLocale = i18n.language?.startsWith('zh') ? 'zh' : 'en';
    }, [i18n.language]);

    // 时间选择状态
    const [startTime, setStartTime] = useState<string>('09:00');
    const [endTime, setEndTime] = useState<string>('18:00');
    // 当前打开的时间选择器目标：'start' | 'end' | null
    const [timePickerTarget, setTimePickerTarget] = useState<'start' | 'end' | null>(null);

    useEffect(() => {
        if (assetId) fetchBookings();
    }, [assetId]);

    // 每当日期或时间变化时通知父组件
    useEffect(() => {
        if (selectionStart && selectionEnd && onDateChange) {
            onDateChange(
                `${selectionStart}T${startTime}:00`,
                `${selectionEnd}T${endTime}:00`,
            );
        }
    }, [selectionStart, selectionEnd, startTime, endTime]);

    const fetchBookings = async () => {
        try {
            setLoading(true);
            setFetchError(false);
            const bookings = await getBookingsForAsset(assetId);

            const marked: MarkedDates = {};
            bookings.forEach((booking: { start_date: string; end_date: string }) => {
                let current = parseISO(booking.start_date);
                const end = parseISO(booking.end_date);
                let isFirst = true;

                while (isBefore(current, end) || isEqual(current, end)) {
                    const dateString = format(current, 'yyyy-MM-dd');
                    const isLast = isEqual(addDays(current, 1), addDays(end, 1));
                    // period 标记类型要求首尾两天必须标 startingDay/endingDay，否则颜色不渲染
                    marked[dateString] = {
                        disabled: true,
                        disableTouchEvent: true,
                        color: theme.colors.danger,
                        textColor: theme.colors.background,
                        startingDay: isFirst,
                        endingDay: isLast || isEqual(current, end),
                    };
                    isFirst = false;
                    current = addDays(current, 1);
                }
            });

            setBookedDates(marked);
        } catch {
            setFetchError(true);
        } finally {
            setLoading(false);
        }
    };

    const handleDayPress = (day: DateData) => {
        const dateString = day.dateString;
        if (bookedDates[dateString]?.disabled) return;

        if (!selectionStart || (selectionStart && selectionEnd)) {
            // 第一次点击：设置开始日期，弹出取借时间选择
            setSelectionStart(dateString);
            setSelectionEnd(null);
            setTimePickerTarget('start');
        } else {
            const start = parseISO(selectionStart);
            const end = parseISO(dateString);

            if (isBefore(end, start)) {
                // 点的日期比开始日期早，重新设为开始日期并弹出取借时间
                setSelectionStart(dateString);
                setSelectionEnd(null);
                setTimePickerTarget('start');
            } else {
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
                    // 范围内有冲突，重新设为开始日期并弹出取借时间
                    setSelectionStart(dateString);
                    setSelectionEnd(null);
                    setTimePickerTarget('start');
                } else {
                    // 第二次点击：设置结束日期，弹出归还时间选择
                    setSelectionEnd(dateString);
                    setTimePickerTarget('end');
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
                color: theme.colors.primary,
                textColor: theme.colors.background,
            };
            if (selectionEnd) {
                marked[selectionEnd] = {
                    ...marked[selectionEnd],
                    selected: true,
                    endingDay: true,
                    color: theme.colors.primary,
                    textColor: theme.colors.background,
                };
                let current = addDays(parseISO(selectionStart), 1);
                const end = parseISO(selectionEnd);
                while (isBefore(current, end)) {
                    const ds = format(current, 'yyyy-MM-dd');
                    marked[ds] = {
                        ...marked[ds],
                        selected: true,
                        color: theme.colors.primaryLight,
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
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>{t('calendar.loading')}</Text>
            </View>
        );
    }

    if (fetchError) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.errorText}>{t('calendar.error')}</Text>
                <TouchableOpacity onPress={fetchBookings} style={styles.retryButton}>
                    <Text style={styles.retryText}>{t('calendar.retry')}</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const showTimePicker = selectionStart !== null && selectionEnd !== null;

    return (
        <View style={styles.container}>
            {/* 不可借用时显示遮罩，阻止所有日历交互 */}
            {disabled && (
                <View style={styles.disabledOverlay} pointerEvents="box-only">
                    <Ionicons name="lock-closed-outline" size={32} color={theme.colors.gray} />
                    <Text style={styles.disabledText}>{t('calendar.disabledAsset')}</Text>
                </View>
            )}
            <Calendar
                minDate={format(new Date(), 'yyyy-MM-dd')}
                markingType={'period'}
                markedDates={getMarkedDates()}
                onDayPress={handleDayPress}
                theme={{
                    selectedDayBackgroundColor: theme.colors.primary,
                    todayTextColor: theme.colors.primary,
                    arrowColor: theme.colors.primary,
                    monthTextColor: theme.colors.text,
                    textMonthFontWeight: 'bold',
                }}
            />

            {/* 时间选择区域：只有选完日期范围后才显示 */}
            {showTimePicker && (
                <View style={styles.timeSection}>
                    <Text style={styles.timeSectionTitle}>{t('calendar.selectTime')}</Text>

                    <TouchableOpacity
                        style={styles.timeRow}
                        onPress={() => setTimePickerTarget('start')}
                        activeOpacity={0.7}
                    >
                        <View style={styles.timeRowLeft}>
                            <Ionicons name="time-outline" size={18} color={theme.colors.primary} />
                            <Text style={styles.timeRowLabel}>{t('calendar.pickupTime')}</Text>
                        </View>
                        <View style={styles.timeValueWrap}>
                            <Text style={styles.timeValue}>{startTime}</Text>
                            <Ionicons name="chevron-forward" size={16} color={theme.colors.gray} />
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.timeRow}
                        onPress={() => setTimePickerTarget('end')}
                        activeOpacity={0.7}
                    >
                        <View style={styles.timeRowLeft}>
                            <Ionicons name="time-outline" size={18} color={theme.colors.primary} />
                            <Text style={styles.timeRowLabel}>{t('calendar.returnTime')}</Text>
                        </View>
                        <View style={styles.timeValueWrap}>
                            <Text style={styles.timeValue}>{endTime}</Text>
                            <Ionicons name="chevron-forward" size={16} color={theme.colors.gray} />
                        </View>
                    </TouchableOpacity>
                </View>
            )}

            {/* 时间选择 Modal */}
            <Modal
                visible={timePickerTarget !== null}
                animationType="slide"
                transparent
                onRequestClose={() => setTimePickerTarget(null)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setTimePickerTarget(null)}
                />
                <SafeAreaView style={styles.modalSheet}>
                    <View style={styles.modalHandle} />
                    <Text style={styles.modalTitle}>
                        {timePickerTarget === 'start' ? t('calendar.selectPickupTime') : t('calendar.selectReturnTime')}
                    </Text>
                    <FlatList
                        data={TIME_SLOTS}
                        keyExtractor={(item) => item}
                        showsVerticalScrollIndicator={false}
                        renderItem={({ item }) => {
                            const isSelected = timePickerTarget === 'start'
                                ? item === startTime
                                : item === endTime;
                            return (
                                <TouchableOpacity
                                    style={[styles.slotItem, isSelected && styles.slotItemSelected]}
                                    onPress={() => {
                                        if (timePickerTarget === 'start') {
                                            setStartTime(item);
                                        } else {
                                            setEndTime(item);
                                        }
                                        setTimePickerTarget(null);
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.slotText, isSelected && styles.slotTextSelected]}>
                                        {item}
                                    </Text>
                                    {isSelected && (
                                        <Ionicons name="checkmark" size={18} color={theme.colors.background} />
                                    )}
                                </TouchableOpacity>
                            );
                        }}
                    />
                </SafeAreaView>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: theme.colors.background,
        borderRadius: 12,
        marginVertical: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        overflow: 'hidden',
    },
    disabledOverlay: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(255,255,255,0.82)',
        zIndex: 10,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 12,
        gap: 10,
    },
    disabledText: {
        fontSize: 15,
        color: theme.colors.gray,
        fontWeight: '600',
    },
    centerContainer: {
        height: 300,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        color: theme.colors.primary,
        fontSize: 14,
    },
    errorText: {
        color: theme.colors.danger,
        fontSize: 14,
        marginBottom: 12,
    },
    retryButton: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 8,
    },
    retryText: {
        color: theme.colors.background,
        fontSize: 14,
        fontWeight: '600',
    },
    // ---- 时间选择区 ----
    timeSection: {
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: '#E5E7EB',
        paddingHorizontal: theme.spacing.md,
        paddingTop: theme.spacing.md,
        paddingBottom: theme.spacing.sm,
    },
    timeSectionTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: theme.spacing.sm,
    },
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: theme.spacing.sm,
        backgroundColor: theme.colors.inputBackground,
        borderRadius: 10,
        marginBottom: theme.spacing.sm,
    },
    timeRowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    timeRowLabel: {
        fontSize: 15,
        color: theme.colors.text,
    },
    timeValueWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    timeValue: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.primary,
    },
    // ---- Modal ----
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    modalSheet: {
        backgroundColor: theme.colors.background,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '60%',
        paddingHorizontal: theme.spacing.md,
        paddingBottom: theme.spacing.lg,
    },
    modalHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#E5E7EB',
        alignSelf: 'center',
        marginVertical: 12,
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: theme.colors.text,
        textAlign: 'center',
        marginBottom: theme.spacing.md,
    },
    slotItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: theme.spacing.md,
        borderRadius: 10,
        marginBottom: 6,
        backgroundColor: theme.colors.inputBackground,
    },
    slotItemSelected: {
        backgroundColor: theme.colors.primary,
    },
    slotText: {
        fontSize: 16,
        color: theme.colors.text,
    },
    slotTextSelected: {
        color: theme.colors.background,
        fontWeight: '700',
    },
});

export default CalendarView;
