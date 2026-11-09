import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radii, Spacing, Typography } from '../../theme/tokens';
import { buildMonthGrid, formatYYYYMMDD, MONTH_NAMES, WEEKDAYS } from '../../utils/calendar';
import { GlassCard } from './index';

export { formatYYYYMMDD };

export interface CalendarDayStatus {
  lunchReceived?: boolean;
  dinnerReceived?: boolean;
  hasCustomOverride?: boolean;
}

export interface CustomCalendarProps {
  year: number;
  month: number; // 0-indexed (0 = Jan, 11 = Dec)
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (dateStr: string) => void;
  onChangeMonth: (year: number, month: number) => void;
  dayStatuses?: Record<string, CalendarDayStatus>;
  cycleStartDate?: string;
}

export function CustomCalendar({
  year,
  month,
  selectedDate,
  onSelectDate,
  onChangeMonth,
  dayStatuses = {},
  cycleStartDate,
}: CustomCalendarProps) {
  const handlePrevMonth = () => {
    if (month === 0) {
      onChangeMonth(year - 1, 11);
    } else {
      onChangeMonth(year, month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 11) {
      onChangeMonth(year + 1, 0);
    } else {
      onChangeMonth(year, month + 1);
    }
  };

  const cells = buildMonthGrid(year, month);

  return (
    <GlassCard variant="elevated" padding="md">
      {/* Month Header */}
      <View style={styles.headerRow}>
        <Pressable onPress={handlePrevMonth} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={18} color={Colors.text.primary} />
        </Pressable>
        <View style={styles.monthTitleWrap}>
          <Text style={styles.monthTitle}>
            {MONTH_NAMES[month]} {year}
          </Text>
          {cycleStartDate ? (
            <Text style={styles.cycleCaption}>Active cycle since {cycleStartDate}</Text>
          ) : null}
        </View>
        <Pressable onPress={handleNextMonth} style={styles.navBtn}>
          <Ionicons name="chevron-forward" size={18} color={Colors.text.primary} />
        </Pressable>
      </View>

      {/* Weekday Labels */}
      <View style={styles.weekRow}>
        {WEEKDAYS.map((dayName) => (
          <View key={dayName} style={styles.weekCell}>
            <Text style={styles.weekText}>{dayName}</Text>
          </View>
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={styles.grid}>
        {cells.map((cell) => {
          if (!cell.day || !cell.dateStr) {
            return <View key={cell.key} style={styles.dayCell} />;
          }

          const isSelected = cell.dateStr === selectedDate;
          const status = dayStatuses[cell.dateStr];
          const lunchOk = status ? status.lunchReceived !== false : true;
          const dinnerOk = status ? status.dinnerReceived !== false : true;
          const isCycleStart = cycleStartDate === cell.dateStr;

          return (
            <Pressable
              key={cell.key}
              onPress={() => onSelectDate(cell.dateStr!)}
              style={[
                styles.dayCell,
                isSelected && styles.dayCellSelected,
                isCycleStart && !isSelected && styles.dayCellCycleStart,
              ]}
            >
              <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>
                {cell.day}
              </Text>
              <View style={styles.dotsRow}>
                {/* Lunch Dot */}
                <View
                  style={[
                    styles.mealDot,
                    lunchOk ? styles.dotReceived : styles.dotSkipped,
                    isSelected && lunchOk && styles.dotSelectedLight,
                  ]}
                />
                {/* Dinner Dot */}
                <View
                  style={[
                    styles.mealDot,
                    dinnerOk ? styles.dotReceived : styles.dotSkipped,
                    isSelected && dinnerOk && styles.dotSelectedLight,
                  ]}
                />
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Legend */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.mealDot, styles.dotReceived]} />
          <Text style={styles.legendText}>Meal Received (L / D)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.mealDot, styles.dotSkipped]} />
          <Text style={styles.legendText}>Skipped / Not Delivered</Text>
        </View>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.glass.cardSubtle,
    borderWidth: 1,
    borderColor: Colors.glass.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitleWrap: {
    alignItems: 'center',
  },
  monthTitle: {
    ...Typography.h3,
    color: Colors.text.primary,
  },
  cycleCaption: {
    fontSize: 11,
    color: Colors.brand.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  weekCell: {
    width: '14.28%',
    alignItems: 'center',
    paddingVertical: 4,
  },
  weekText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.text.muted,
    textTransform: 'uppercase',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 0.95,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.sm,
    marginVertical: 2,
  },
  dayCellSelected: {
    backgroundColor: Colors.brand.primary,
  },
  dayCellCycleStart: {
    borderWidth: 1.5,
    borderColor: Colors.brand.primary,
    backgroundColor: Colors.brand.primarySoft,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  dayTextSelected: {
    color: Colors.text.inverse,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  mealDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotReceived: {
    backgroundColor: Colors.semantic.positive,
  },
  dotSkipped: {
    backgroundColor: Colors.semantic.warning,
  },
  dotSelectedLight: {
    backgroundColor: '#A7F3D0',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: Spacing.sm,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.glass.borderSubtle,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendText: {
    fontSize: 11,
    color: Colors.text.muted,
    fontWeight: '600',
  },
});
