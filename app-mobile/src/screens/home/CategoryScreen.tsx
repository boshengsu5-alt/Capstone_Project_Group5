import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, SafeAreaView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../../navigation/HomeStackNavigator';
import { getCategories } from '../../services/assetService';
import { theme } from '../../theme';
import type { Category } from '../../../../database/types/supabase';

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

export default function CategoryScreen({ navigation }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await getCategories();
        setCategories(data);
      } catch (error) {
        // 分类加载失败时显示空列表
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const renderCategory = ({ item }: { item: Category }) => (
    <TouchableOpacity
      style={styles.categoryItem}
      onPress={() => navigation.navigate('HomeScreen', { categoryId: item.id })}
    >
      <View style={styles.iconContainer}>
        <Ionicons name={(categoryIconMap[item.name] || 'cube-outline') as any} size={32} color={theme.colors.primary} />
      </View>
      <Text style={styles.categoryText}>{item.name}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={categories}
        renderItem={renderCategory}
        keyExtractor={item => item.id}
        numColumns={3}
        contentContainerStyle={styles.gridOverlay}
        columnWrapperStyle={styles.row}
        ListEmptyComponent={
          <View style={styles.loadingContainer}>
            <Text style={{ color: theme.colors.gray }}>暂无分类数据</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  gridOverlay: {
    padding: theme.spacing.md,
  },
  row: {
    justifyContent: 'flex-start',
  },
  categoryItem: {
    width: '33.33%',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    paddingHorizontal: 4,
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
  }
});
