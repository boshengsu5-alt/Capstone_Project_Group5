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

type Props = NativeStackScreenProps<HomeStackParamList, 'AssetDetailScreen'>;
type FullAsset = Asset & { categories: Category };

const { width } = Dimensions.get('window');

export default function AssetDetailScreen({ route, navigation }: Props) {
  const assetId = route.params?.id || '';
  const [asset, setAsset] = useState<FullAsset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDates, setSelectedDates] = useState<{ startDate: string, endDate: string } | null>(null);
  const [reviews, setReviews] = useState<ReviewWithMeta[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();

  const fetchAssetDetails = useCallback(async () => {
    if (!assetId) {
      setError('未提供设备 ID');
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
        setError('找不到该设备');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '获取设备详情失败');
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
        <Text style={{ marginTop: 10, color: theme.colors.gray }}>正在加载设备详情...</Text>
      </View>
    );
  }

  if (error || !asset) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ErrorView 
          message={error || "获取设备详情失败"} 
          onRetry={fetchAssetDetails} 
        />
        <TouchableOpacity 
          style={[styles.bookButton, { margin: 20, paddingHorizontal: 30 }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.bookButtonText}>返回</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isAvailable = asset.status === 'available';

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
                <Text style={styles.categoryText}>{asset.categories?.name_zh || asset.categories?.name || '未分类'}</Text>
              </View>
            </View>
            <Text style={styles.price}>¥{asset.purchase_price ?? '面议'}/天</Text>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>商品简介</Text>
            <Text style={styles.descriptionText}>{asset.description || '暂无详细描述。'}</Text>
          </View>

          {/* Details/Specs */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>设备信息</Text>

            {/* 存放位置 */}
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={20} color={theme.colors.gray} style={styles.infoIcon} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>存放位置</Text>
                <Text style={styles.infoValue}>{asset.location || '校内指定位置'}</Text>
              </View>
            </View>

            {/* 序列号 */}
            <View style={styles.infoRow}>
              <Ionicons name="barcode-outline" size={20} color={theme.colors.gray} style={styles.infoIcon} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>序列号</Text>
                <Text style={[styles.infoValue, styles.monoText]}>{asset.serial_number || '无编号'}</Text>
              </View>
            </View>

            {/* 可用状态 */}
            <View style={styles.infoRow}>
              <Ionicons name="checkmark-circle-outline" size={20} color={theme.colors.gray} style={styles.infoIcon} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>可用状态</Text>
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
                    {asset.status === 'available' ? '现存可借'
                      : asset.status === 'borrowed' ? '已借出'
                      : asset.status === 'maintenance' ? '维护中'
                      : '已退役'}
                  </Text>
                </View>
              </View>
            </View>

            {/* 设备成色 */}
            <View style={styles.infoRow}>
              <Ionicons name="shield-checkmark-outline" size={20} color={theme.colors.gray} style={styles.infoIcon} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>设备成色</Text>
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
                    {asset.condition === 'new' ? '全新'
                      : asset.condition === 'good' ? '良好'
                      : asset.condition === 'fair' ? '一般'
                      : asset.condition === 'poor' ? '较差'
                      : '损坏'}
                  </Text>
                </View>
              </View>
            </View>

            {/* 设备类别 */}
            <View style={styles.infoRow}>
              <Ionicons name="pricetag-outline" size={20} color={theme.colors.gray} style={styles.infoIcon} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>设备类别</Text>
                <Text style={styles.infoValue}>{asset.categories?.name_zh || asset.categories?.name || '未分类'}</Text>
              </View>
            </View>

          </View>

          {/* Calendar Section */}
          <View style={styles.calendarSection}>
            <Text style={styles.sectionTitle}>选择租期</Text>
            <CalendarView
              assetId={asset.id}
              onDateChange={handleDateChange}
              disabled={!isAvailable}
            />
          </View>

          {/* Reviews Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              用户评价 {reviews.length > 0 ? `(${reviews.length})` : ''}
            </Text>
            {reviews.length === 0 ? (
              <Text style={styles.noReviews}>暂无评价，成为第一个评价者吧！</Text>
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
            (!selectedDates || !isAvailable) && styles.bookButtonDisabled
          ]}
          onPress={() => {
            if (selectedDates && isAvailable) {
              navigation.navigate('BookingFormScreen', {
                assetId: asset.id,
                startDate: selectedDates.startDate,
                endDate: selectedDates.endDate
              });
            }
          }}
          disabled={!selectedDates || !isAvailable}
        >
          <Text style={styles.bookButtonText}>
            {!isAvailable ? '不可借用' : (selectedDates ? '立即预约' : '请先选择日期')}
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
});
