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
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../../navigation/HomeStackNavigator';
import { getAssets, getCategories } from '../../services/assetService';
import { checkOverdueBookings } from '../../services/bookingService';
import type { Asset, Category } from '../../../../database/types/supabase';
import ErrorView from '../../components/ErrorView';
import SafeImage from '../../components/SafeImage';

type HomeScreenNavigationProp = NativeStackNavigationProp<HomeStackParamList, 'HomeScreen'>;

interface Props {
  navigation: HomeScreenNavigationProp;
}

const { width } = Dimensions.get('window');

const AD_DATA = [
  { id: '1', color: '#8B5CF6', text: '全新上市，全场优惠' },
  { id: '2', color: '#C4B5FD', text: '限时折扣，不容错过' },
  { id: '3', color: '#A78BFA', text: '优质精选，猜你喜欢' },
];

export default function HomeScreen({ navigation }: Props) {
  const [assets, setAssets] = useState<(Asset & { categories: Category })[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<boolean>(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      // 通过 service 层获取数据，不直接调用 supabase
      const [assetsData, categoriesData] = await Promise.all([
        getAssets(),
        getCategories(),
        // 兜底逾期检测：pg_cron 免费版不可用，每次进入首页时触发一次
        checkOverdueBookings().catch(() => {}),
      ]);
      setAssets(assetsData);
      setCategories(categoriesData);
    } catch (error) {
      // console.error('Error fetching data:', error);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const renderCategory = ({ item }: { item: Category }) => (
    <TouchableOpacity 
      style={styles.categoryHomeItem} 
      onPress={() => navigation.navigate('CategoryScreen', { categoryId: item.id })}
    >
      <View style={styles.categoryHomeIcon}>
        <Ionicons name={(item.icon || 'cube-outline') as any} size={28} color={theme.colors.primary} />
      </View>
      <Text style={styles.categoryHomeText} numberOfLines={1}>{item.name}</Text>
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
      <Text style={[styles.productPrice, { fontSize: 13, color: theme.colors.gray, fontWeight: 'normal' }]}>状态: {item.status === 'available' ? '现存' : item.status}</Text>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.searchBar} 
          onPress={() => navigation.navigate('CategoryScreen')}
        >
          <Ionicons name="search" size={20} color={theme.colors.gray} style={styles.searchIcon} />
          <TextInput 
            style={[styles.searchInput, Platform.OS === 'web' && { outlineStyle: 'none' } as any]} 
            placeholder="搜索热门商品..." 
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
          {AD_DATA.map((ad) => (
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
        <Text style={styles.sectionTitle}>为你推荐</Text>
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
      <FlatList
        data={assets}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        numColumns={2}
        ListHeaderComponent={renderHeader}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
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
});
