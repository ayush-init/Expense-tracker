import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  AmountDisplay,
  EmptyState,
  GlassButton,
  GlassCard,
  ListRow,
  MemberAvatar,
  ScreenLayout,
  StatusChip,
} from '../../components/ui';
import { useApp } from '../../context/AppContext';
import { Colors, Radii, Spacing, Typography } from '../../theme/tokens';
import { NotificationItem } from '../../types/models';

export default function ActivityScreen() {
  const router = useRouter();
  const {
    currentUser,
    activeHousehold,
    members,
    notifications,
    unreadNotificationCount,
    activityLogs,
    markNotificationRead,
    markAllNotificationsRead,
  } = useApp();

  const [tab, setTab] = useState<'notifications' | 'audit'>('notifications');

  const getMemberName = (uid: string) =>
    members.find((m) => m.userId === uid)?.profile.fullName ?? 'Roommate';

  const handleNotificationPress = async (item: NotificationItem) => {
    if (!item.isRead) {
      await markNotificationRead(item.id);
    }
    if (item.relatedEntityType === 'expense') {
      router.push('/(tabs)/expenses');
    } else if (item.relatedEntityType === 'payment') {
      router.push('/(tabs)/payments');
    } else if (item.relatedEntityType === 'meal' || item.relatedEntityType === 'food_cycle') {
      router.push('/(tabs)/food');
    }
  };

  return (
    <ScreenLayout>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.overline}>
            {activeHousehold?.name.toUpperCase() ?? 'HOUSEHOLD'} • LIVE FEED
          </Text>
          <Text style={styles.title}>Notifications & Activity</Text>
        </View>
        {unreadNotificationCount > 0 ? (
          <GlassButton
            title="Mark All Read"
            variant="secondary"
            size="sm"
            icon="checkmark-done-outline"
            onPress={markAllNotificationsRead}
          />
        ) : null}
      </View>

      {/* Mode Switcher */}
      <View style={styles.modeTabs}>
        <Pressable
          onPress={() => setTab('notifications')}
          style={[styles.modeTab, tab === 'notifications' && styles.modeTabActive]}
        >
          <Text
            style={[
              styles.modeTabText,
              tab === 'notifications' && styles.modeTabTextActive,
            ]}
          >
            My Notifications ({unreadNotificationCount} unread)
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setTab('audit')}
          style={[styles.modeTab, tab === 'audit' && styles.modeTabActive]}
        >
          <Text style={[styles.modeTabText, tab === 'audit' && styles.modeTabTextActive]}>
            Full Household Audit Feed ({activityLogs.length})
          </Text>
        </Pressable>
      </View>

      {tab === 'notifications' ? (
        <GlassCard style={styles.card}>
          <Text style={styles.sectionCaption}>
            Targeted alerts for {currentUser?.fullName}. You only receive notifications when an
            expense, repayment, meal edit, or food settlement affects you.
          </Text>
          {notifications.length === 0 ? (
            <EmptyState
              icon="notifications-off-outline"
              title="No Notifications Yet"
              message="When a roommate includes you in an expense or records a payment to you, it will appear here."
            />
          ) : (
            notifications.map((notif, idx) => {
              const actorName = getMemberName(notif.actorUserId);
              return (
                <ListRow
                  key={notif.id}
                  onPress={() => handleNotificationPress(notif)}
                  title={notif.title}
                  subtitle={notif.body}
                  meta={`${new Date(notif.createdAt).toLocaleString('en-IN')} • Tap to open ${
                    notif.relatedEntityType ?? 'record'
                  }`}
                  leftElement={<MemberAvatar name={actorName} />}
                  rightElement={
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      {notif.amountPaise ? (
                        <AmountDisplay
                          paise={notif.amountPaise}
                          size="sm"
                          tone={notif.affectsBalance ? 'brand' : 'default'}
                        />
                      ) : null}
                      <StatusChip
                        label={
                          !notif.isRead
                            ? 'Unread • Balance Impact'
                            : notif.affectsBalance
                            ? 'Affects Balance'
                            : 'Info'
                        }
                        tone={!notif.isRead ? 'warning' : notif.affectsBalance ? 'info' : 'neutral'}
                      />
                    </View>
                  }
                  showDivider={idx < notifications.length - 1}
                />
              );
            })
          )}
        </GlassCard>
      ) : (
        <GlassCard style={styles.card}>
          <Text style={styles.sectionCaption}>
            Complete chronological household log showing who performed each action, when, and
            whether it affects {currentUser?.fullName}'s balance.
          </Text>
          {activityLogs.length === 0 ? (
            <EmptyState
              icon="list-outline"
              title="No Household Activity Yet"
              message="All expenses, meal updates, food cycle settlements, and repayments are logged here."
            />
          ) : (
            activityLogs.map((log, idx) => {
              const actorName = getMemberName(log.actorUserId);
              const affectsMe = currentUser
                ? log.affectedUserIds.includes(currentUser.id)
                : false;

              return (
                <ListRow
                  key={log.id}
                  onPress={() => {
                    if (log.entityType === 'expense') router.push('/(tabs)/expenses');
                    if (log.entityType === 'payment') router.push('/(tabs)/payments');
                    if (log.entityType === 'meal' || log.entityType === 'food_cycle')
                      router.push('/(tabs)/food');
                  }}
                  title={log.summary}
                  subtitle={`By ${actorName} • ${new Date(log.createdAt).toLocaleString('en-IN')}`}
                  meta={
                    log.reason
                      ? `Reason: ${log.reason}`
                      : `Related: ${log.entityType.toUpperCase()}`
                  }
                  leftElement={<MemberAvatar name={actorName} />}
                  rightElement={
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      {log.amountPaise ? (
                        <AmountDisplay paise={log.amountPaise} size="sm" />
                      ) : null}
                      <StatusChip
                        label={affectsMe ? 'Affects You' : 'Other Roommates'}
                        tone={affectsMe ? 'positive' : 'neutral'}
                      />
                    </View>
                  }
                  showDivider={idx < activityLogs.length - 1}
                />
              );
            })
          )}
        </GlassCard>
      )}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  overline: {
    ...Typography.overline,
    color: Colors.brand.primary,
  },
  title: {
    ...Typography.h1,
    color: Colors.text.primary,
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: Colors.background.secondary,
    borderRadius: Radii.md,
    padding: 4,
    marginBottom: Spacing.md,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: Radii.sm,
    alignItems: 'center',
  },
  modeTabActive: {
    backgroundColor: Colors.glass.cardElevated,
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text.muted,
  },
  modeTabTextActive: {
    color: Colors.brand.primary,
  },
  card: {
    marginBottom: Spacing.md,
  },
  sectionCaption: {
    ...Typography.caption,
    color: Colors.text.secondary,
    marginBottom: Spacing.sm,
  },
});
