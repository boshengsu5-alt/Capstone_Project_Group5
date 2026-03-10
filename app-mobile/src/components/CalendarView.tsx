import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { theme } from '../theme';

export interface CalendarViewProps {
  markedDates?: Record<string, any>;
  onDayPress?: (day: DateData) => void;
}

export default function CalendarView({ markedDates, onDayPress }: CalendarViewProps) {
  // 红色圆圈表示已预订（不可选），绿色或无标记表示可用
  // The parent component should pass markedDates formatted such as:
  // {
  //   '2024-03-20': { disabled: true, startingDay: true, color: '#EF4444', endingDay: true },
  //   '2024-03-25': { selected: true, selectedColor: '#10B981' }
  // }
  
  return (
    <View style={styles.container}>
      <Calendar
        markingType={'period'}
        monthFormat={'yyyy年 MM月'}
        onDayPress={onDayPress}
        markedDates={markedDates}
        theme={{
          todayTextColor: theme.colors.primary,
          arrowColor: theme.colors.primary,
          textDayFontWeight: '500',
          textMonthFontWeight: 'bold',
          textDayHeaderFontWeight: '500',
          selectedDayBackgroundColor: theme.colors.primary,
          selectedDayTextColor: '#ffffff',
          'stylesheet.calendar.header': {
             dayTextAtIndex0: { color: theme.colors.danger },
             dayTextAtIndex6: { color: theme.colors.danger }
          }
        } as any}
        minDate={new Date().toISOString().split('T')[0]} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    paddingBottom: 8,
  }
});
