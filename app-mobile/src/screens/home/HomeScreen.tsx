import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  ScrollView, 
  FlatList, 
  SafeAreaView, 
  Platform, 
  StatusBar, 
  Dimensions,
  TouchableOpacity,
  Image,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../../navigation/HomeStackNavigator';
import { getAssets, getCategories } from '../../services/assetService';
import { checkOverdueBookings } from '../../services/bookingService';
import type { Asset, Category } from '../../../../database/types/supabase';
import ErrorView from '../../components/ErrorView';
import SafeImage from '../../components/SafeImage';
import { useTranslation } from 'react-i18next';

type Props = NativeStackScreenProps<HomeStackParamList, 'HomeScreen'>;

// 数据库存的是 emoji，Ionicons 无法渲染，需要映射为有效图标名
const categoryIconMap: Record<string, string> = {
  'Audio & Sound': 'musical-notes-outline',
  'Books & Materials': 'book-outline',
  'Cameras & Media': 'camera-outline',
  'Drones': 'airplane-outline',
  'Electronics': 'laptop-outline',
  'Furniture': 'bed-outline',
  'Keys & Access': 'key-outline',
  'Lab Equipment': 'flask-outline',
  'Other': 'cube-outline',
  'Sports & Fitness': 'football-outline',
};

const { width } = Dimensions.get('window');

const getAdData = (t: any) => [
  { id: '1', color: '#8B5CF6', text: t('home.ad1') },
  { id: '2', color: '#C4B5FD', text: t('home.ad2') },
  { id: '3', color: '#A78BFA', text: t('home.ad3') },
];

const PAGE_SIZE = 10;

export default function HomeScreen({ navigation, route }: Props) {
  const { t, i18n } = useTranslation();
  const [assets, setAssets] = useState<(Asset & { categories: Category })[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // 从 CategoryScreen 传入的分类筛选 ID
  const categoryId = route.params?.categoryId;

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(false);
    setPage(0);
    setHasMore(true);
    // 兜底逾期检测：pg_cron 免费版不可用，每次进入首页时触发一次（fire-and-forget）
    checkOverdueBookings().catch(() => {});
    try {
      // 通过 service 层获取数据，不直接调用 supabase
      const [assetsData, categoriesData] = await Promise.all([
        getAssets(categoryId, 0, PAGE_SIZE),
        getCategories(),
      ]);
      setAssets(assetsData);
      setCategories(categoriesData);
      setHasMore(assetsData.length >= PAGE_SIZE);
    } catch (err) {
      if (!isRefresh) {
        setError(true);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [categoryId]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const moreAssets = await getAssets(categoryId, nextPage, PAGE_SIZE);
      if (moreAssets.length < PAGE_SIZE) setHasMore(false);
      setAssets(prev => [...prev, ...moreAssets]);
      setPage(nextPage);
    } catch (err) {
      // 加载更多失败不影响已有数据
    } finally {
      setLoadingMore(false);
    }
  }, [page, loadingMore, hasMore, categoryId]);

  const onRefresh = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const renderCategory = ({ item }: { item: Category }) => (
    <TouchableOpacity 
      style={styles.categoryHomeItem} 
      onPress={() => navigation.navigate('CategoryScreen', { categoryId: item.id })}
    >
      <View style={styles.categoryHomeIcon}>
        <Ionicons name={(categoryIconMap[item.name] || 'cube-outline') as any} size={28} color={theme.colors.primary} />
      </View>
      <Text style={styles.categoryHomeText} numberOfLines={1}>
        {i18n.language?.startsWith('zh') ? item.name_zh : item.name}
      </Text>
    </TouchableOpacity>
  );

  const renderProduct = ({ item }: { item: Asset & { categories: Category } }) => (
    <TouchableOpacity 
      style={styles.productCard} 
      onPress={() => navigation.navigate('AssetDetailScreen', { id: item.id })}
    >
      <SafeImage 
        uri={item.images?.[0]} 
        style={styles.productImagePlaceholder} 
        placeholderSize={40} 
      />
      <Text style={styles.productTitle} numberOfLines={1}>{item.name}</Text>
      <Text style={[styles.productPrice, { fontSize: 13, color: theme.colors.gray, fontWeight: 'normal' }]}>
        {t('home.status', { status: t(`assetDetail.status.${item.status}`) })}
      </Text>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <>
      <View style={styles.header}>
        <View style={styles.headerTopRight}>
          <TouchableOpacity 
            style={styles.langButton}
            onPress={() => i18n.changeLanguage(i18n.language === 'en' ? 'zh' : 'en')}
          >
            <Text style={styles.langButtonText}>{i18n.language?.startsWith('en') ? '中文' : 'EN'}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity 
          style={styles.searchBar} 
          onPress={() => navigation.navigate('CategoryScreen')}
        >
          <Ionicons name="search" size={20} color={theme.colors.gray} style={styles.searchIcon} />
          <TextInput 
            style={[styles.searchInput, Platform.OS === 'web' && { outlineStyle: 'none' } as any]} 
            placeholder={t('home.searchPlaceholder')} 
            placeholderTextColor={theme.colors.gray}
            editable={false} // Make it un-editable so the whole bar triggers navigation
            pointerEvents="none"
          />
        </TouchableOpacity>
      </View>

      <View style={styles.carouselContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          pagingEnabled
        >
          {getAdData(t).map((ad) => (
            <View key={ad.id} style={[styles.adSlide, { backgroundColor: ad.color }]}>
              <Text style={styles.adText}>{ad.text}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      <View style={styles.categoriesContainer}>
        <FlatList
          data={categories}
          horizontal
          renderItem={renderCategory}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryListContent}
        />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('home.recommendation')}</Text>
      </View>
    </>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ErrorView onRetry={fetchData} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View pointerEvents="none" style={styles.topBackground} />
      <FlatList
        data={assets}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        numColumns={2}
        ListHeaderComponent={renderHeader}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loadingMore ? (
          <View style={styles.footerLoader}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
          </View>
        ) : null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  topBackground: {
    position: 'absolute',
    top: Platform.OS === 'android' ? -(StatusBar.currentHeight ?? 0) : 0,
    left: 0,
    right: 0,
    height: 440 + (Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0),
    backgroundColor: theme.colors.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  header: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg + 10,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTopRight: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 12,
  },
  langButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
  },
  langButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: theme.spacing.md,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    color: theme.colors.text,
  },
  carouselContainer: {
    height: 150,
    marginTop: -30,
    marginHorizontal: theme.spacing.md,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
    marginBottom: theme.spacing.md,
  },
  adSlide: {
    width: width - theme.spacing.md * 2,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  adText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  categoriesContainer: {
    marginBottom: theme.spacing.lg,
  },
  categoryListContent: {
    paddingHorizontal: theme.spacing.md,
  },
  categoryHomeItem: {
    alignItems: 'center',
    marginRight: theme.spacing.md,
    width: 65,
  },
  categoryHomeIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryHomeText: {
    fontSize: 12,
    color: theme.colors.text,
    textAlign: 'center',
    fontWeight: '500',
  },
  sectionHeader: {
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  listContent: {
    flexGrow: 1,
    backgroundColor: theme.colors.background,
    paddingBottom: theme.spacing.lg,
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
  },
  productCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  productImagePlaceholder: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    marginBottom: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productTitle: {
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: 6,
    fontWeight: '500',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.danger,
  },
  footerLoader: {
    paddingVertical: theme.spacing.lg,
    alignItems: 'center' as const,
  },
});
