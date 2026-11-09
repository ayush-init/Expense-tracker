import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  AmountDisplay,
  EmptyState,
  GlassButton,
  GlassCard,
  GlassInput,
  GlassModal,
  ListRow,
  MemberAvatar,
  MemberPill,
  ScreenLayout,
  StatusChip,
} from '../components/ui';
import { CustomCalendar } from '../components/ui/CustomCalendar';
import { Colors, Spacing, Typography } from '../theme/tokens';

export default function SandboxScreen() {
  const [selectedDate, setSelectedDate] = useState('2026-11-10');
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(10);
  const [modalOpen, setModalOpen] = useState(false);
  const [inputVal, setInputVal] = useState('');

  return (
    <ScreenLayout>
      <Text style={styles.heading}>RoomSync • Light Glassmorphism UI Sandbox</Text>
      <Text style={styles.subheading}>
        Phase 2 Component Verification — Strictly Light Theme Only
      </Text>

      <GlassCard variant="elevated" style={styles.section}>
        <Text style={styles.sectionTitle}>1. Financial Amount Displays (Paise Engine)</Text>
        <View style={styles.rowBetween}>
          <AmountDisplay label="My Spending (Month)" paise={485000} size="hero" tone="brand" />
          <AmountDisplay label="Net Owed to Me" paise={120000} size="lg" tone="positive" showSign />
        </View>
      </GlassCard>

      <GlassCard style={styles.section}>
        <Text style={styles.sectionTitle}>2. Roommate Identity Pills & Avatars</Text>
        <View style={styles.wrapRow}>
          <MemberPill name="Ayush" selected role="Admin" />
          <MemberPill name="Yuvraj" selected />
          <MemberPill name="Vansh" />
        </View>
      </GlassCard>

      <GlassCard style={styles.section}>
        <Text style={styles.sectionTitle}>3. Interactive Meal Calendar</Text>
        <CustomCalendar
          year={year}
          month={month}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          onChangeMonth={(y, m) => {
            setYear(y);
            setMonth(m);
          }}
          cycleStartDate="2026-11-01"
          dayStatuses={{
            '2026-11-05': { lunchReceived: true, dinnerReceived: false },
            '2026-11-08': { lunchReceived: false, dinnerReceived: false },
          }}
        />
      </GlassCard>

      <GlassCard style={styles.section}>
        <Text style={styles.sectionTitle}>4. Inputs, Chips & Buttons</Text>
        <GlassInput
          label="Expense Title"
          placeholder="e.g., Fresh Vegetables & Milk"
          value={inputVal}
          onChangeText={setInputVal}
          leftIcon="cart-outline"
        />
        <View style={styles.wrapRow}>
          <StatusChip label="Settled" tone="positive" icon="checkmark-circle" />
          <StatusChip label="Pending Confirmation" tone="warning" icon="time-outline" />
          <StatusChip label="You Owe ₹200" tone="negative" icon="arrow-up-circle" />
        </View>
        <View style={[styles.wrapRow, { marginTop: Spacing.sm }]}>
          <GlassButton title="Open Glass Modal" icon="layers-outline" onPress={() => setModalOpen(true)} />
          <GlassButton title="Secondary" variant="secondary" onPress={() => {}} />
        </View>
      </GlassCard>

      <GlassCard style={styles.section}>
        <Text style={styles.sectionTitle}>5. Structured List Rows</Text>
        <ListRow
          title="Yuvraj added Groceries"
          subtitle="Shared equally between Ayush, Yuvraj & Vansh"
          meta="Today • Paid via Google Pay (GPay)"
          leftElement={<MemberAvatar name="Yuvraj" />}
          rightElement={<AmountDisplay paise={60000} size="sm" tone="brand" />}
          showDivider
        />
        <EmptyState
          title="All Caught Up"
          message="No pending disputes in your household."
        />
      </GlassCard>

      <GlassModal
        visible={modalOpen}
        title="Light Glassmorphism Sheet"
        subtitle="Frosted translucent bottom modal"
        onClose={() => setModalOpen(false)}
      >
        <Text style={{ color: Colors.text.secondary, marginBottom: Spacing.md }}>
          Verified modal sheet layout for quick actions, meal edits, and payment confirmation.
        </Text>
        <GlassButton title="Done" onPress={() => setModalOpen(false)} />
      </GlassModal>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  heading: {
    ...Typography.h1,
    color: Colors.text.primary,
  },
  subheading: {
    ...Typography.body,
    color: Colors.text.muted,
    marginBottom: Spacing.md,
  },
  section: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...Typography.h3,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
});
