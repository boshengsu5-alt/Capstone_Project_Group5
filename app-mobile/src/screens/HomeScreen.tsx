import React from 'react';
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
  Dimensions 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';

const { width } = Dimensions.get('window');

const AD_DATA = [
  { id: '1', color: '#8B5CF6', text: '全新上市，全场优惠' },
  { id: '2', color: '#C4B5FD', text: '限时折扣，不容错过' },
  { id: '3', color: '#A78BFA', text: '优质精选，猜你喜欢' },
];

const PRODUCT_DATA = [
  { id: '1', title: '特级咖啡豆', price: '¥99' },
  { id: '2', title: '智能保温杯', price: '¥199' },
  { id: '3', title: '无线蓝牙耳机', price: '¥299' },
  { id: '4', title: '机械键盘', price: '¥399' },
  { id: '5', title: '人体工学椅', price: '¥899' },
  { id: '6', title: '护眼台灯', price: '¥159' },
];

export default function HomeScreen() {
  const renderProduct = ({ item }: { item: any }) => (
    <View style={styles.productCard}>
      <View style={styles.productImagePlaceholder}>
        <Ionicons name="image-outline" size={40} color={theme.colors.gray} />
      </View>
      <Text style={styles.productTitle} numberOfLines={1}>{item.title}</Text>
      <Text style={styles.productPrice}>{item.price}</Text>
    </View>
  );

  const renderHeader = () => (
    <>
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={theme.colors.gray} style={styles.searchIcon} />
          <TextInput 
            style={[styles.searchInput, Platform.OS === 'web' && { outlineStyle: 'none' } as any]} 
            placeholder="搜索热门商品..." 
            placeholderTextColor={theme.colors.gray}
          />
        </View>
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
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>为你推荐</Text>
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={PRODUCT_DATA}
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
    borderRadius: 8,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.sm,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
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