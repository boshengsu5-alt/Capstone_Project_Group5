import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, SafeAreaView, ActivityIndicator, Dimensions, StatusBar } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../../navigation/HomeStackNavigator';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { getAssetById } from '../../services/assetService';
import type { Asset, Category } from '../../../../database/types/supabase';
import CalendarView from '../../components/CalendarView';
import ErrorView from '../../components/ErrorView';

type Props = NativeStackScreenProps<HomeStackParamList, 'AssetDetailScreen'>;
type FullAsset = Asset & { categories: Category };

const { width } = Dimensions.get('window');

export default function AssetDetailScreen({ route, navigation }: Props) {
  const assetId = route.params?.id || '';
  const [asset, setAsset] = useState<FullAsset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDates, setSelectedDates] = useState<{ startDate: string, endDate: string } | null>(null);

  const fetchAssetDetails = useCallback(async () => {
    if (!assetId) {
      setError('未提供设备 ID');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await getAssetById(assetId);
      if (data) {
        setAsset(data);
      } else {
        setError('找不到该设备');
      }
    } catch (err: any) {
      setError(err.message || '获取设备详情失败');
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
          {asset.images && asset.images.length > 0 ? (
            <Image source={{ uri: asset.images[0] }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={styles.placeholderIcon}>
              <Ionicons name="camera-outline" size={60} color="#ccc" />
            </View>
          )}
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

            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={20} color={theme.colors.gray} style={styles.infoIcon} />
              <View>
                <Text style={styles.infoLabel}>存放位置</Text>
                <Text style={styles.infoValue}>{asset.location || '校内指定位置'}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="barcode-outline" size={20} color={theme.colors.gray} style={styles.infoIcon} />
              <View>
                <Text style={styles.infoLabel}>状态 & 编号</Text>
                <Text style={[styles.infoValue, { color: isAvailable ? '#10b981' : theme.colors.danger }]}>
                  {isAvailable ? '现存可借' : '借出/不可用'} · {asset.serial_number || '无编号'}
                </Text>
              </View>
            </View>
          </View>

          {/* Calendar Section */}
          <View style={styles.calendarSection}>
            <Text style={styles.sectionTitle}>选择租期</Text>
            <CalendarView
              assetId={asset.id}
              onDateChange={handleDateChange}
            />
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
  infoLabel: {
    fontSize: 12,
    color: theme.colors.gray,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    color: theme.colors.text,
    fontWeight: '500',
  },
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
  }
});
