import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, SafeAreaView, ActivityIndicator, Dimensions, StatusBar } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../../navigation/HomeStackNavigator';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { getAssetById, getReviewsByAssetId } from '../../services/assetService';
import type { Asset, Category } from '../../../../database/types/supabase';
import ReviewCard, { ReviewWithMeta } from '../../components/ReviewCard';
import { supabase } from '../../services/supabase';
import CalendarView from '../../components/CalendarView';
import ErrorView from '../../components/ErrorView';
import SafeImage from '../../components/SafeImage';
import { useTranslation } from 'react-i18next';

type Props = NativeStackScreenProps<HomeStackParamList, 'AssetDetailScreen'>;
type FullAsset = Asset & { categories: Category };

// 损坏赔偿系数，与 Web 端 DamageTable 保持一致 (§5.2)
const DAMAGE_ROWS = [
  { id: 'minor', coef: 0.2, color: '#f59e0b' },
  { id: 'moderate', coef: 0.5, color: '#f97316' },
  { id: 'severe', coef: 1.0, color: '#ef4444' },
];

/**
 * Compute asset age label and depreciation ratio from purchase date.
 * 根据购置日期计算设备年龄和折旧比例。
 */
function getDepreciationInfo(purchaseDate: string | null, t: any): { ratio: number; ageLabel: string; rateLabel: string } {
  if (!purchaseDate) return { ratio: 0.5, ageLabel: t('assetDetail.deprAgeLabels.unknown'), rateLabel: '50%' };
  const ms = Date.now() - new Date(purchaseDate).getTime();
  const years = ms / (1000 * 60 * 60 * 24 * 365.25);
  const totalMonths = Math.floor(ms / (1000 * 60 * 60 * 24 * 30.44));
  const y = Math.floor(totalMonths / 12);
  const m = totalMonths % 12;
  const ageLabel = y === 0 ? t('assetDetail.deprAgeLabels.months', { m }) : m === 0 ? t('assetDetail.deprAgeLabels.years', { y }) : t('assetDetail.deprAgeLabels.yearsAndMonths', { y, m });
  if (years <= 1) return { ratio: 1.0, ageLabel, rateLabel: '100%' };
  if (years <= 3) return { ratio: 0.8, ageLabel, rateLabel: '80%' };
  if (years <= 5) return { ratio: 0.5, ageLabel, rateLabel: '50%' };
  return { ratio: 0.2, ageLabel, rateLabel: '20%' };
}

const { width } = Dimensions.get('window');

export default function AssetDetailScreen({ route, navigation }: Props) {
  const { t, i18n } = useTranslation();
  const assetId = route.params?.id || '';
  const [asset, setAsset] = useState<FullAsset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDates, setSelectedDates] = useState<{ startDate: string, endDate: string } | null>(null);
  const [reviews, setReviews] = useState<ReviewWithMeta[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();

  const fetchAssetDetails = useCallback(async () => {
    if (!assetId) {
      setError(t('assetDetail.noId'));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [data, reviewsData, { data: { user } }] = await Promise.all([
        getAssetById(assetId),
        getReviewsByAssetId(assetId).catch(() => []),
        supabase.auth.getUser(),
      ]);
      if (data) {
        setAsset(data);
        setReviews(reviewsData as ReviewWithMeta[]);
        setCurrentUserId(user?.id);
      } else {
        setError(t('assetDetail.notFound'));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('assetDetail.fetchFailed'));
    } finally {
      setLoading(false);
    }
  }, [assetId]);

  useEffect(() => {
    fetchAssetDetails();
  }, [fetchAssetDetails]);

  const handleDateChange = (startDate: string, endDate: string) => {
    setSelectedDates({ startDate, endDate });
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ marginTop: 10, color: theme.colors.gray }}>{t('assetDetail.loading')}</Text>
      </View>
    );
  }

  if (error || !asset) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ErrorView 
          message={error || t("assetDetail.fetchFailed")} 
          onRetry={fetchAssetDetails} 
        />
        <TouchableOpacity 
          style={[styles.bookButton, { margin: 20, paddingHorizontal: 30 }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.bookButtonText}>{t('assetDetail.back')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // maintenance / retired 才是真正无法预约；borrowed 只是当前有人借，未来日期仍可预约
  const isBookable = asset.status === 'available' || asset.status === 'borrowed';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Product Image */}
        <View style={styles.imageContainer}>
          <SafeImage 
            uri={asset.images?.[0]} 
            style={styles.image} 
            resizeMode="cover" 
            placeholderSize={60} 
          />
        </View>

        <View style={styles.contentContainer}>
          {/* Header Info */}
          <View style={styles.header}>
            <View style={styles.titleInfo}>
              <Text style={styles.title}>{asset.name}</Text>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{i18n.language === 'zh' ? (asset.categories?.name_zh || asset.categories?.name || t('assetDetail.uncategorized')) : (asset.categories?.name || t('assetDetail.uncategorized'))}</Text>
              </View>
            </View>
            <Text style={styles.price}>¥{asset.purchase_price ?? t('assetDetail.negotiable')}{t('assetDetail.perDay')}</Text>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('assetDetail.descTitle')}</Text>
            <Text style={styles.descriptionText}>{asset.description || t('assetDetail.noDesc')}</Text>
          </View>

          {/* Details/Specs */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('assetDetail.infoTitle')}</Text>

            {/* 存放位置 */}
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={20} color={theme.colors.gray} style={styles.infoIcon} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>{t('assetDetail.location')}</Text>
                <Text style={styles.infoValue}>{asset.location || t('assetDetail.defaultLocation')}</Text>
              </View>
            </View>

            {/* 序列号 */}
            <View style={styles.infoRow}>
              <Ionicons name="barcode-outline" size={20} color={theme.colors.gray} style={styles.infoIcon} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>{t('assetDetail.serialNumber')}</Text>
                <Text style={[styles.infoValue, styles.monoText]}>{asset.serial_number || t('assetDetail.noSerial')}</Text>
              </View>
            </View>

            {/* 可用状态 */}
            <View style={styles.infoRow}>
              <Ionicons name="checkmark-circle-outline" size={20} color={theme.colors.gray} style={styles.infoIcon} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>{t('assetDetail.statusTitle')}</Text>
                <View style={[
                  styles.statusBadge,
                  asset.status === 'available' && styles.statusAvailable,
                  asset.status === 'borrowed' && styles.statusBorrowed,
                  asset.status === 'maintenance' && styles.statusMaintenance,
                  asset.status === 'retired' && styles.statusRetired,
                ]}>
                  <Text style={[
                    styles.statusBadgeText,
                    asset.status === 'available' && { color: '#10b981' },
                    asset.status === 'borrowed' && { color: '#3b82f6' },
                    asset.status === 'maintenance' && { color: '#f59e0b' },
                    asset.status === 'retired' && { color: theme.colors.danger },
                  ]}>
                    {asset.status === 'available' ? t('assetDetail.status.available')
                      : asset.status === 'borrowed' ? t('assetDetail.status.borrowed')
                      : asset.status === 'maintenance' ? t('assetDetail.status.maintenance')
                      : t('assetDetail.status.retired')}
                  </Text>
                </View>
              </View>
            </View>

            {/* 设备成色 */}
            <View style={styles.infoRow}>
              <Ionicons name="shield-checkmark-outline" size={20} color={theme.colors.gray} style={styles.infoIcon} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>{t('assetDetail.conditionTitle')}</Text>
                <View style={[
                  styles.conditionBadge,
                  asset.condition === 'new' && styles.conditionNew,
                  asset.condition === 'good' && styles.conditionGood,
                  asset.condition === 'fair' && styles.conditionFair,
                  asset.condition === 'poor' && styles.conditionPoor,
                  asset.condition === 'damaged' && styles.conditionDamaged,
                ]}>
                  <Text style={[
                    styles.conditionBadgeText,
                    asset.condition === 'new' && { color: '#10b981' },
                    asset.condition === 'good' && { color: '#3b82f6' },
                    asset.condition === 'fair' && { color: '#f59e0b' },
                    asset.condition === 'poor' && { color: '#f97316' },
                    asset.condition === 'damaged' && { color: theme.colors.danger },
                  ]}>
                    {asset.condition === 'new' ? t('assetDetail.condition.new')
                      : asset.condition === 'good' ? t('assetDetail.condition.good')
                      : asset.condition === 'fair' ? t('assetDetail.condition.fair')
                      : asset.condition === 'poor' ? t('assetDetail.condition.poor')
                      : t('assetDetail.condition.damaged')}
                  </Text>
                </View>
              </View>
            </View>

            {/* 设备类别 */}
            <View style={styles.infoRow}>
              <Ionicons name="pricetag-outline" size={20} color={theme.colors.gray} style={styles.infoIcon} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>{t('assetDetail.categoryTitle')}</Text>
                <Text style={styles.infoValue}>{i18n.language === 'zh' ? (asset.categories?.name_zh || asset.categories?.name || t('assetDetail.uncategorized')) : (asset.categories?.name || t('assetDetail.uncategorized'))}</Text>
              </View>
            </View>

          </View>

          {/* 损坏赔偿说明 — 仅在有购置价时显示 */}
          {asset.purchase_price != null && (() => {
            const depr = getDepreciationInfo(asset.purchase_date, t);
            const p = asset.purchase_price!;
            return (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('assetDetail.compensationTitle')}</Text>
                <View style={styles.compensationBox}>
                  <Text style={styles.compensationMeta}>
                    {t('assetDetail.compensationMeta', { age: depr.ageLabel, rate: depr.rateLabel })}
                  </Text>
                  {DAMAGE_ROWS.map(({ id, coef, color }, idx) => (
                    <View
                      key={id}
                      style={[
                        styles.compensationRow,
                        idx === DAMAGE_ROWS.length - 1 && { borderBottomWidth: 0 },
                      ]}
                    >
                      <Text style={[styles.compensationLabel, { color }]}>{t(`assetDetail.damageLabels.${id}`)}</Text>
                      <Text style={styles.compensationAmount}>
                        ¥{Math.round(p * depr.ratio * coef)}
                      </Text>
                    </View>
                  ))}
                  <Text style={styles.compensationNote}>
                    {t('assetDetail.compensationNote')}
                  </Text>
                </View>
              </View>
            );
          })()}

          {/* Calendar Section */}
          <View style={styles.calendarSection}>
            <Text style={styles.sectionTitle}>{t('assetDetail.selectPeriod')}</Text>
            <CalendarView
              assetId={asset.id}
              onDateChange={handleDateChange}
              disabled={!isBookable}
            />
          </View>

          {/* Reviews Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t('assetDetail.reviewsTitle')} {reviews.length > 0 ? `(${reviews.length})` : ''}
            </Text>
            {reviews.length === 0 ? (
              <Text style={styles.noReviews}>{t('assetDetail.noReviews')}</Text>
            ) : (
              reviews.map(review => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  currentUserId={currentUserId}
                />
              ))
            )}
          </View>

        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[
            styles.bookButton,
            (!selectedDates || !isBookable) && styles.bookButtonDisabled
          ]}
          onPress={() => {
            if (selectedDates && isBookable) {
              navigation.navigate('BookingFormScreen', {
                assetId: asset.id,
                startDate: selectedDates.startDate,
                endDate: selectedDates.endDate
              });
            }
          }}
          disabled={!selectedDates || !isBookable}
        >
          <Text style={styles.bookButtonText}>
            {!isBookable ? t('assetDetail.notAvailable') : (selectedDates ? t('assetDetail.bookNow') : t('assetDetail.selectDateFirst'))}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  imageContainer: {
    width: width,
    height: 300,
    backgroundColor: theme.colors.inputBackground,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative'
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderIcon: {
    opacity: 0.5
  },
  contentContainer: {
    padding: theme.spacing.lg,
    paddingBottom: 100, // Space for bottom bar
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.lg,
  },
  titleInfo: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.text,
    lineHeight: 30,
    marginBottom: 4,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryText: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  section: {
    marginBottom: theme.spacing.lg + 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  descriptionText: {
    fontSize: 15,
    color: theme.colors.text,
    lineHeight: 24,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.inputBackground,
    padding: theme.spacing.md,
    borderRadius: 8,
  },
  infoIcon: {
    marginRight: theme.spacing.md,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: theme.colors.gray,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    color: theme.colors.text,
    fontWeight: '500',
  },
  monoText: {
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.5,
  },
  // 状态徽章
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  statusAvailable: { backgroundColor: '#d1fae5', borderColor: '#6ee7b7' },
  statusBorrowed:  { backgroundColor: '#dbeafe', borderColor: '#93c5fd' },
  statusMaintenance: { backgroundColor: '#fef3c7', borderColor: '#fcd34d' },
  statusRetired:   { backgroundColor: '#fee2e2', borderColor: '#fca5a5' },
  statusBadgeText: { fontSize: 13, fontWeight: '600' },
  // 成色徽章
  conditionBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  conditionNew:     { backgroundColor: '#d1fae5', borderColor: '#6ee7b7' },
  conditionGood:    { backgroundColor: '#dbeafe', borderColor: '#93c5fd' },
  conditionFair:    { backgroundColor: '#fef3c7', borderColor: '#fcd34d' },
  conditionPoor:    { backgroundColor: '#ffedd5', borderColor: '#fdba74' },
  conditionDamaged: { backgroundColor: '#fee2e2', borderColor: '#fca5a5' },
  conditionBadgeText: { fontSize: 13, fontWeight: '600' },
  calendarSection: {
    marginTop: theme.spacing.sm,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.inputBackground,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 10,
  },
  bookButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  bookButtonDisabled: {
    backgroundColor: theme.colors.gray,
    opacity: 0.6,
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  noReviews: {
    fontSize: 14,
    color: theme.colors.gray,
    textAlign: 'center',
    paddingVertical: 16,
  },
  compensationBox: {
    backgroundColor: '#fff8f0',
    borderRadius: 8,
    padding: theme.spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: '#f97316',
  },
  compensationMeta: {
    fontSize: 12,
    color: theme.colors.gray,
    marginBottom: theme.spacing.sm,
  },
  compensationRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#fed7aa',
  },
  compensationLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  compensationAmount: {
    fontSize: 14,
    fontWeight: 'bold' as const,
    color: '#1f2937',
  },
  compensationNote: {
    fontSize: 11,
    color: theme.colors.gray,
    marginTop: theme.spacing.sm,
    textAlign: 'center' as const,
  },
});
