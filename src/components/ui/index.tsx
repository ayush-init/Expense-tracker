import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, getMemberPalette, Radii, Shadows, Spacing, Typography } from '../../theme/tokens';
import { formatINR } from '../../utils/currency';

// ============================================================================
// 1. ScreenLayout — Bright Ambient Background with Soft Glassmorphic Orbs
// ============================================================================
export interface ScreenLayoutProps {
  children: React.ReactNode;
  scrollable?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
  header?: React.ReactNode;
}

export function ScreenLayout({
  children,
  scrollable = true,
  contentContainerStyle,
  header,
}: ScreenLayoutProps) {
  return (
    <SafeAreaView style={styles.screenRoot} edges={['top', 'left', 'right']}>
      {/* Ambient Light Glassmorphic Soft Background Orbs */}
      <View pointerEvents="none" style={styles.ambientContainer}>
        <View style={[styles.orb, styles.orbTopRight]} />
        <View style={[styles.orb, styles.orbBottomLeft]} />
        <View style={[styles.orb, styles.orbCenter]} />
      </View>

      {header}

      {scrollable ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, styles.scrollContent, contentContainerStyle]}>
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}

// ============================================================================
// 2. GlassCard — Frosted Translucent Surface with Crisp Specular Border
// ============================================================================
export interface GlassCardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'subtle' | 'highlight';
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  padding?: keyof typeof Spacing;
}

export function GlassCard({
  children,
  variant = 'default',
  style,
  onPress,
  padding = 'md',
}: GlassCardProps) {
  const variantStyle =
    variant === 'elevated'
      ? styles.cardElevated
      : variant === 'subtle'
      ? styles.cardSubtle
      : variant === 'highlight'
      ? styles.cardHighlight
      : styles.cardDefault;

  const content = (
    <View style={[styles.cardBase, variantStyle, { padding: Spacing[padding] }, style]}>
      {children}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [pressed && { opacity: 0.92, transform: [{ scale: 0.995 }] }]}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

// ============================================================================
// 3. GlassButton — Primary, Secondary, Ghost & Danger Fintech Buttons
// ============================================================================
export interface GlassButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function GlassButton({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  disabled = false,
  style,
}: GlassButtonProps) {
  const isDisabled = disabled || loading;

  const bgStyle =
    variant === 'primary'
      ? styles.btnPrimary
      : variant === 'secondary'
      ? styles.btnSecondary
      : variant === 'danger'
      ? styles.btnDanger
      : variant === 'success'
      ? styles.btnSuccess
      : styles.btnGhost;

  const textStyle =
    variant === 'primary' || variant === 'danger' || variant === 'success'
      ? styles.btnTextInverse
      : variant === 'secondary'
      ? styles.btnTextPrimary
      : styles.btnTextSecondary;

  const sizeStyle =
    size === 'sm' ? styles.btnSm : size === 'lg' ? styles.btnLg : styles.btnMd;

  const iconColor =
    variant === 'primary' || variant === 'danger' || variant === 'success'
      ? Colors.text.inverse
      : Colors.brand.primary;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.btnBase,
        bgStyle,
        sizeStyle,
        isDisabled && styles.btnDisabled,
        pressed && !isDisabled && { opacity: 0.88, transform: [{ scale: 0.99 }] },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={iconColor} />
      ) : (
        <View style={styles.btnInner}>
          {icon && (
            <Ionicons
              name={icon}
              size={size === 'sm' ? 16 : 18}
              color={iconColor}
              style={{ marginRight: 6 }}
            />
          )}
          <Text style={[styles.btnTextBase, textStyle, size === 'sm' && { fontSize: 13 }]}>
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

// ============================================================================
// 4. GlassInput — Frosted Input Field with Label, Icon & Error Message
// ============================================================================
export interface GlassInputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  prefixText?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

export function GlassInput({
  label,
  error,
  helperText,
  leftIcon,
  prefixText,
  containerStyle,
  style,
  ...rest
}: GlassInputProps) {
  return (
    <View style={[styles.inputWrapper, containerStyle]}>
      {label ? <Text style={styles.inputLabel}>{label}</Text> : null}
      <View style={[styles.inputContainer, error ? styles.inputContainerError : null]}>
        {leftIcon ? (
          <Ionicons
            name={leftIcon}
            size={18}
            color={Colors.text.muted}
            style={{ marginRight: 8 }}
          />
        ) : null}
        {prefixText ? <Text style={styles.inputPrefix}>{prefixText}</Text> : null}
        <TextInput
          placeholderTextColor={Colors.text.subtle}
          style={[styles.inputField, style]}
          {...rest}
        />
      </View>
      {error ? (
        <Text style={styles.inputErrorText}>{error}</Text>
      ) : helperText ? (
        <Text style={styles.inputHelperText}>{helperText}</Text>
      ) : null}
    </View>
  );
}

// ============================================================================
// 5. AmountDisplay — Formatted Paise Currency Display with Semantic Coloring
// ============================================================================
export interface AmountDisplayProps {
  paise: number;
  size?: 'sm' | 'md' | 'lg' | 'hero';
  tone?: 'default' | 'positive' | 'negative' | 'warning' | 'brand';
  showSign?: boolean;
  label?: string;
  sublabel?: string;
  style?: StyleProp<TextStyle>;
}

export function AmountDisplay({
  paise,
  size = 'md',
  tone = 'default',
  showSign = false,
  label,
  sublabel,
  style,
}: AmountDisplayProps) {
  const color =
    tone === 'positive'
      ? Colors.semantic.positive
      : tone === 'negative'
      ? Colors.semantic.negative
      : tone === 'warning'
      ? Colors.semantic.warning
      : tone === 'brand'
      ? Colors.brand.primary
      : Colors.text.primary;

  const fontStyle =
    size === 'hero'
      ? Typography.heroAmount
      : size === 'lg'
      ? Typography.h1
      : size === 'md'
      ? Typography.h2
      : Typography.bodyStrong;

  return (
    <View>
      {label ? <Text style={styles.amountLabel}>{label}</Text> : null}
      <Text style={[fontStyle, { color }, style]}>
        {formatINR(paise, { showSign })}
      </Text>
      {sublabel ? <Text style={styles.amountSublabel}>{sublabel}</Text> : null}
    </View>
  );
}

// ============================================================================
// 6. MemberAvatar & MemberChip — Roommate Identity Badges (Ayush, Yuvraj, Vansh)
// ============================================================================
export interface MemberAvatarProps {
  name: string;
  size?: number;
  selected?: boolean;
  subtitle?: string;
  rightElement?: React.ReactNode;
  onPress?: () => void;
}

export function MemberAvatar({ name, size = 38 }: { name: string; size?: number }) {
  const palette = getMemberPalette(name);
  const initials = name
    .trim()
    .split(/\s+/)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('');

  return (
    <View
      style={[
        styles.avatarCircle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: palette.bg,
          borderColor: palette.border,
        },
      ]}
    >
      <Text style={[styles.avatarInitials, { color: palette.text, fontSize: size * 0.38 }]}>
        {initials || '?'}
      </Text>
    </View>
  );
}

export function MemberPill({
  name,
  selected = false,
  role,
  onPress,
}: {
  name: string;
  selected?: boolean;
  role?: string;
  onPress?: () => void;
}) {
  const palette = getMemberPalette(name);
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.memberPill,
        selected
          ? { backgroundColor: palette.bg, borderColor: palette.accent, borderWidth: 1.5 }
          : { backgroundColor: Colors.glass.cardSubtle, borderColor: Colors.glass.borderSubtle },
      ]}
    >
      <MemberAvatar name={name} size={24} />
      <Text
        style={[
          styles.memberPillName,
          { color: selected ? palette.text : Colors.text.secondary },
        ]}
      >
        {name}
      </Text>
      {role ? <Text style={styles.memberRoleBadge}>{role}</Text> : null}
      {selected ? (
        <Ionicons name="checkmark-circle" size={16} color={palette.accent} style={{ marginLeft: 4 }} />
      ) : null}
    </Pressable>
  );
}

// ============================================================================
// 7. StatusChip — Semantic Pill Badge
// ============================================================================
export interface StatusChipProps {
  label: string;
  tone?: 'positive' | 'negative' | 'warning' | 'info' | 'neutral';
  icon?: keyof typeof Ionicons.glyphMap;
}

export function StatusChip({ label, tone = 'neutral', icon }: StatusChipProps) {
  const palette =
    tone === 'positive'
      ? { bg: Colors.semantic.positiveBg, border: Colors.semantic.positiveBorder, text: Colors.semantic.positive }
      : tone === 'negative'
      ? { bg: Colors.semantic.negativeBg, border: Colors.semantic.negativeBorder, text: Colors.semantic.negative }
      : tone === 'warning'
      ? { bg: Colors.semantic.warningBg, border: Colors.semantic.warningBorder, text: Colors.semantic.warning }
      : tone === 'info'
      ? { bg: Colors.semantic.infoBg, border: Colors.semantic.infoBorder, text: Colors.semantic.info }
      : { bg: 'rgba(148, 163, 184, 0.14)', border: 'rgba(148, 163, 184, 0.3)', text: Colors.text.secondary };

  return (
    <View style={[styles.chipBase, { backgroundColor: palette.bg, borderColor: palette.border }]}>
      {icon ? (
        <Ionicons name={icon} size={12} color={palette.text} style={{ marginRight: 4 }} />
      ) : null}
      <Text style={[styles.chipText, { color: palette.text }]}>{label}</Text>
    </View>
  );
}

// ============================================================================
// 8. ListRow — Structured Financial & Activity Row
// ============================================================================
export interface ListRowProps {
  title: string;
  subtitle?: string;
  meta?: string;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
  onPress?: () => void;
  showDivider?: boolean;
}

export function ListRow({
  title,
  subtitle,
  meta,
  leftElement,
  rightElement,
  onPress,
  showDivider = false,
}: ListRowProps) {
  const row = (
    <View style={[styles.listRow, showDivider && styles.listRowDivider]}>
      {leftElement ? <View style={styles.listRowLeft}>{leftElement}</View> : null}
      <View style={styles.listRowBody}>
        <Text style={styles.listRowTitle} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.listRowSubtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
        {meta ? <Text style={styles.listRowMeta}>{meta}</Text> : null}
      </View>
      {rightElement ? <View style={styles.listRowRight}>{rightElement}</View> : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [pressed && { opacity: 0.78 }]}>
        {row}
      </Pressable>
    );
  }
  return row;
}

// ============================================================================
// 9. GlassModal — Bottom Sheet / Frosted Dialog
// ============================================================================
export interface GlassModalProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}

export function GlassModal({ visible, title, subtitle, onClose, children }: GlassModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>{title}</Text>
              {subtitle ? <Text style={styles.modalSubtitle}>{subtitle}</Text> : null}
            </View>
            <Pressable onPress={onClose} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={20} color={Colors.text.secondary} />
            </Pressable>
          </View>
          <ScrollView
            style={{ maxHeight: 540 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ============================================================================
// 10. Loading, Empty & Error States
// ============================================================================
export function LoadingState({ label = 'Syncing household records...' }: { label?: string }) {
  return (
    <GlassCard variant="subtle" style={styles.stateBox}>
      <ActivityIndicator size="large" color={Colors.brand.primary} />
      <Text style={styles.stateTitle}>{label}</Text>
    </GlassCard>
  );
}

export function EmptyState({
  icon = 'sparkles-outline',
  title,
  message,
  actionTitle,
  onAction,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  actionTitle?: string;
  onAction?: () => void;
}) {
  return (
    <GlassCard variant="subtle" style={styles.stateBox}>
      <View style={styles.emptyIconCircle}>
        <Ionicons name={icon} size={26} color={Colors.brand.primary} />
      </View>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateMessage}>{message}</Text>
      {actionTitle && onAction ? (
        <GlassButton
          title={actionTitle}
          onPress={onAction}
          size="sm"
          style={{ marginTop: Spacing.sm }}
        />
      ) : null}
    </GlassCard>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <GlassCard variant="subtle" style={[styles.stateBox, { borderColor: Colors.semantic.negativeBorder }]}>
      <Ionicons name="alert-circle-outline" size={28} color={Colors.semantic.negative} />
      <Text style={[styles.stateTitle, { color: Colors.semantic.negative }]}>Something went wrong</Text>
      <Text style={styles.stateMessage}>{message}</Text>
      {onRetry ? (
        <GlassButton
          title="Try Again"
          onPress={onRetry}
          variant="secondary"
          size="sm"
          style={{ marginTop: Spacing.sm }}
        />
      ) : null}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screenRoot: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  ambientContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    borderRadius: 9999,
  },
  orbTopRight: {
    width: 300,
    height: 300,
    top: -90,
    right: -80,
    backgroundColor: Colors.background.orbBlue,
  },
  orbBottomLeft: {
    width: 280,
    height: 280,
    bottom: 60,
    left: -90,
    backgroundColor: Colors.background.orbCyan,
  },
  orbCenter: {
    width: 240,
    height: 240,
    top: '36%',
    right: -60,
    backgroundColor: Colors.background.orbIndigo,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: 110,
  },
  cardBase: {
    borderRadius: Radii.xl,
    borderWidth: 1,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(16px)',
      } as ViewStyle,
      default: {},
    }),
  },
  cardDefault: {
    backgroundColor: Colors.glass.card,
    borderColor: Colors.glass.border,
    ...Shadows.glass,
  },
  cardElevated: {
    backgroundColor: Colors.glass.cardElevated,
    borderColor: Colors.glass.border,
    ...Shadows.elevated,
  },
  cardSubtle: {
    backgroundColor: Colors.glass.cardSubtle,
    borderColor: Colors.glass.borderSubtle,
    ...Shadows.subtle,
  },
  cardHighlight: {
    backgroundColor: Colors.glass.cardHighlight,
    borderColor: Colors.glass.borderAccent,
    ...Shadows.glass,
  },
  btnBase: {
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  btnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSm: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: Radii.md,
  },
  btnMd: {
    paddingVertical: 13,
    paddingHorizontal: 18,
  },
  btnLg: {
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  btnPrimary: {
    backgroundColor: Colors.brand.primary,
    ...Shadows.subtle,
  },
  btnSecondary: {
    backgroundColor: Colors.glass.cardElevated,
    borderWidth: 1,
    borderColor: Colors.glass.borderAccent,
  },
  btnGhost: {
    backgroundColor: 'transparent',
  },
  btnDanger: {
    backgroundColor: Colors.semantic.negative,
  },
  btnSuccess: {
    backgroundColor: Colors.semantic.positive,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnTextBase: {
    fontSize: 15,
    fontWeight: '700',
  },
  btnTextInverse: {
    color: Colors.text.inverse,
  },
  btnTextPrimary: {
    color: Colors.brand.primary,
  },
  btnTextSecondary: {
    color: Colors.text.secondary,
  },
  inputWrapper: {
    marginBottom: Spacing.sm,
  },
  inputLabel: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.text.secondary,
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.glass.input,
    borderWidth: 1,
    borderColor: Colors.glass.borderSubtle,
    borderRadius: Radii.md,
    paddingHorizontal: 14,
    minHeight: 48,
  },
  inputContainerError: {
    borderColor: Colors.semantic.negative,
  },
  inputPrefix: {
    ...Typography.bodyStrong,
    color: Colors.text.secondary,
    marginRight: 6,
  },
  inputField: {
    flex: 1,
    fontSize: 15,
    color: Colors.text.primary,
    paddingVertical: 10,
  },
  inputErrorText: {
    ...Typography.caption,
    color: Colors.semantic.negative,
    marginTop: 4,
  },
  inputHelperText: {
    ...Typography.caption,
    color: Colors.text.muted,
    marginTop: 4,
  },
  amountLabel: {
    ...Typography.overline,
    color: Colors.text.muted,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  amountSublabel: {
    ...Typography.caption,
    color: Colors.text.muted,
    marginTop: 2,
  },
  avatarCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  avatarInitials: {
    fontWeight: '800',
  },
  memberPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: Radii.pill,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  memberPillName: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },
  memberRoleBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.text.muted,
    marginLeft: 6,
    textTransform: 'uppercase',
  },
  chipBase: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  listRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.glass.borderSubtle,
  },
  listRowLeft: {
    marginRight: 12,
  },
  listRowBody: {
    flex: 1,
    paddingRight: 8,
  },
  listRowTitle: {
    ...Typography.bodyStrong,
    color: Colors.text.primary,
  },
  listRowSubtitle: {
    ...Typography.caption,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  listRowMeta: {
    fontSize: 11,
    color: Colors.text.muted,
    marginTop: 3,
  },
  listRowRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.glass.modalOverlay,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.background.primary,
    borderTopLeftRadius: Radii.xxl,
    borderTopRightRadius: Radii.xxl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.glass.border,
    ...Shadows.elevated,
  },
  modalHandle: {
    width: 42,
    height: 5,
    borderRadius: 999,
    backgroundColor: Colors.text.subtle,
    alignSelf: 'center',
    marginBottom: Spacing.sm,
    opacity: 0.45,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  modalTitle: {
    ...Typography.h2,
    color: Colors.text.primary,
  },
  modalSubtitle: {
    ...Typography.caption,
    color: Colors.text.muted,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.glass.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.glass.borderSubtle,
  },
  stateBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    marginVertical: Spacing.sm,
  },
  emptyIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.brand.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  stateTitle: {
    ...Typography.h3,
    color: Colors.text.primary,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  stateMessage: {
    ...Typography.body,
    color: Colors.text.muted,
    textAlign: 'center',
    marginTop: 4,
  },
});
