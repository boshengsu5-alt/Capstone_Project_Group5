import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme';
type SectionKey = 'status' | 'borrowing' | 'returning' | 'credit' | 'compensation';

const SECTION_CONFIG: Array<{ key: SectionKey; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: 'status', icon: 'git-branch-outline' },
  { key: 'borrowing', icon: 'calendar-outline' },
  { key: 'returning', icon: 'return-up-back-outline' },
  { key: 'credit', icon: 'shield-checkmark-outline' },
  { key: 'compensation', icon: 'receipt-outline' },
];

export default function HelpManualScreen() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 120);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.heroIconWrap}>
            <Ionicons name="book-outline" size={24} color={theme.colors.primary} />
          </View>
          <Text style={styles.heroTitle}>{t('helpManual.title')}</Text>
          <Text style={styles.heroText}>{t('helpManual.intro')}</Text>
        </View>

        <View style={styles.section}>
          {SECTION_CONFIG.map(({ key, icon }) => {
            const items = t(`helpManual.sections.${key}.items`, { returnObjects: true }) as string[];

            return (
              <View key={key} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.iconWrap}>
                    <Ionicons name={icon} size={18} color={theme.colors.primary} />
                  </View>
                  <Text style={styles.cardTitle}>{t(`helpManual.sections.${key}.title`)}</Text>
                </View>

                <View style={styles.bulletList}>
                  {items.map((item, index) => (
                    <View key={`${key}-${index}`} style={styles.bulletRow}>
                      <View style={styles.bulletDot} />
                      <Text style={styles.bulletText}>{item}</Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.noteCard}>
          <Ionicons name="alert-circle-outline" size={18} color="#B45309" />
          <Text style={styles.noteText}>{t('helpManual.note')}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  heroCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  heroIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F3F0FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 8,
  },
  heroText: {
    fontSize: 14,
    color: theme.colors.gray,
    lineHeight: 22,
  },
  section: {
    gap: theme.spacing.md,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: theme.spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F3F0FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  bulletList: {
    gap: 10,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
    marginTop: 7,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 22,
  },
  noteCard: {
    marginTop: theme.spacing.lg,
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  noteText: {
    flex: 1,
    color: theme.colors.gray,
    fontSize: 13,
    lineHeight: 20,
  },
});
