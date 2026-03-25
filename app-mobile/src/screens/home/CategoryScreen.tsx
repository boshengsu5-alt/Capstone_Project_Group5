import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, TextInput, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Dimensions } from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;
// 分类格子：3列，左右 padding 16 各一次，列间距 12 * 2
const CATEGORY_ITEM_WIDTH = (SCREEN_WIDTH - 32 - 24) / 3;
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../../navigation/HomeStackNavigator';
import { getCategories, getAssets, searchAssets } from '../../services/assetService';
import { theme } from '../../theme';
import type { Asset, Category } from '../../../../database/types/supabase';
import SafeImage from '../../components/SafeImage';

type Props = NativeStackScreenProps<HomeStackParamList, 'CategoryScreen'>;

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

export default function CategoryScreen({ navigation, route }: Props) {
  const categoryId = route.params?.categoryId;

  // ============================================================
  // 搜索模式（无 categoryId）状态
  // ============================================================
  const [searchText, setSearchText] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchResults, setSearchResults] = useState<(Asset & { categories: Category })[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // ============================================================
  // 分类商品模式（有 categoryId）状态
  // ============================================================
  const [assets, setAssets] = useState<(Asset & { categories: Category })[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryName, setCategoryName] = useState('');

  // ============================================================
  // 搜索模式：加载分类列表 + 自动聚焦输入框
  // ============================================================
  useEffect(() => {
    if (categoryId) return;
    (async () => {
      try {
        const data = await getCategories();
        setCategories(data);
      } catch (_) {
        // 分类加载失败时显示空列表
      }
      // 延迟聚焦，等页面动画完成后再弹出键盘
      setTimeout(() => inputRef.current?.focus(), 300);
    })();
  }, [categoryId]);

  // ============================================================
  // 搜索模式：输入文字时实时搜索
  // ============================================================
  useEffect(() => {
    if (categoryId) return;
    if (!searchText.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchAssets(searchText.trim());
        setSearchResults(results);
      } catch (_) {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300); // 防抖 300ms
    return () => clearTimeout(timer);
  }, [searchText, categoryId]);

  // ============================================================
  // 分类商品模式：加载该分类下的资产
  // ============================================================
  const fetchCategoryAssets = useCallback(async () => {
    if (!categoryId) return;
    setLoading(true);
    try {
      const [assetsData, categoriesData] = await Promise.all([
        getAssets(categoryId),
        getCategories(),
      ]);
      setAssets(assetsData);
      const found = categoriesData.find(c => c.id === categoryId);
      if (found) setCategoryName(found.name);
    } catch (_) {
      // 加载失败显示空列表
    } finally {
      setLoading(false);
    }
  }, [categoryId]);

  useEffect(() => {
    fetchCategoryAssets();
  }, [fetchCategoryAssets]);

  // ============================================================
  // 渲染：分类商品模式
  // ============================================================
  if (categoryId) {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      );
    }

    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <FlatList
          data={assets}
          keyExtractor={item => item.id}
          numColumns={2}
          columnWrapperStyle={styles.productRow}
          contentContainerStyle={styles.gridContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.productCard}
              onPress={() => navigation.navigate('AssetDetailScreen', { id: item.id })}
            >
              <SafeImage
                uri={item.images?.[0]}
                style={styles.productImage}
                placeholderSize={40}
              />
              <Text style={styles.productTitle} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.productStatus}>
                {item.status === 'available' ? '现存' : item.status}
              </Text>
            </TouchableOpacity>
          )}
          ListHeaderComponent={
            <Text style={styles.categoryHeader}>{categoryName}</Text>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>该分类下暂无商品</Text>
            </View>
          }
        />
      </SafeAreaView>
    );
  }

  // ============================================================
  // 渲染：搜索模式（无 categoryId）
  // ============================================================
  const showCategories = !searchText.trim();

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* 搜索框 */}
      <View style={styles.searchHeader}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={theme.colors.gray} style={{ marginRight: 8 }} />
          <TextInput
            ref={inputRef}
            style={[styles.searchInput, Platform.OS === 'web' && { outlineStyle: 'none' } as object]}
            placeholder="搜索商品名称..."
            placeholderTextColor={theme.colors.gray}
            value={searchText}
            onChangeText={setSearchText}
            returnKeyType="search"
            autoCorrect={false}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Ionicons name="close-circle" size={18} color={theme.colors.gray} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.cancelBtn}>
          <Text style={styles.cancelText}>取消</Text>
        </TouchableOpacity>
      </View>

      {/* 搜索中 loading */}
      {searching && (
        <View style={styles.searchingRow}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.searchingText}>搜索中...</Text>
        </View>
      )}

      {/* 有搜索词：显示搜索结果 */}
      {!showCategories && !searching && (
        <FlatList
          data={searchResults}
          keyExtractor={item => item.id}
          numColumns={2}
          columnWrapperStyle={styles.productRow}
          contentContainerStyle={styles.gridContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.productCard}
              onPress={() => navigation.navigate('AssetDetailScreen', { id: item.id })}
            >
              <SafeImage
                uri={item.images?.[0]}
                style={styles.productImage}
                placeholderSize={40}
              />
              <Text style={styles.productTitle} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.productStatus}>
                {item.status === 'available' ? '现存' : item.status}
              </Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>未找到「{searchText}」相关商品</Text>
            </View>
          }
        />
      )}

      {/* 无搜索词：显示分类网格 */}
      {showCategories && (
        <FlatList
          data={categories}
          keyExtractor={item => item.id}
          numColumns={3}
          columnWrapperStyle={styles.categoryRow}
          contentContainerStyle={styles.gridContent}
          ListHeaderComponent={
            <Text style={styles.sectionTitle}>全部分类</Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.categoryItem}
              onPress={() => navigation.push('CategoryScreen', { categoryId: item.id })}
            >
              <View style={styles.iconContainer}>
                <Ionicons
                  name={(categoryIconMap[item.name] || 'cube-outline') as never}
                  size={32}
                  color={theme.colors.primary}
                />
              </View>
              <Text style={styles.categoryText} numberOfLines={2}>{item.name}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>暂无分类数据</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // ---- 搜索头部 ----
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: theme.spacing.md,
    height: 40,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    color: theme.colors.text,
    fontSize: 15,
  },
  cancelBtn: {
    marginLeft: theme.spacing.sm,
    paddingHorizontal: 4,
  },
  cancelText: {
    color: theme.colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  searchingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    gap: 8,
  },
  searchingText: {
    color: theme.colors.gray,
    fontSize: 14,
  },
  // ---- 分类网格 ----
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  categoryItem: {
    width: CATEGORY_ITEM_WIDTH,
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 13,
    color: theme.colors.text,
    fontWeight: '500',
    textAlign: 'center',
  },
  // ---- 商品卡片 ----
  categoryHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  gridContent: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  productRow: {
    justifyContent: 'space-between',
  },
  categoryRow: {
    justifyContent: 'flex-start',
    gap: 12,
  },
  productCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.sm,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  productImage: {
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
    marginBottom: 4,
    fontWeight: '500',
  },
  productStatus: {
    fontSize: 13,
    color: theme.colors.gray,
  },
  // ---- 空状态 ----
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    color: theme.colors.gray,
    fontSize: 15,
  },
});
