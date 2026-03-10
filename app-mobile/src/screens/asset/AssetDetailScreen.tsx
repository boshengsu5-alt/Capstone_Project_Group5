import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, SafeAreaView, Dimensions, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../../navigation/HomeStackNavigator';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import CalendarView from '../../components/CalendarView';
import { supabase } from '../../services/supabase';
import type { Asset } from '../../../../database/types/supabase';

type Props = NativeStackScreenProps<HomeStackParamList, 'AssetDetailScreen'>;

const { width } = Dimensions.get('window');

const conditionMap: Record<string, string> = {
  new: '全新',
  good: '良好',
  fair: '一般',
  poor: '较差',
  damaged: '损坏'
};

export default function AssetDetailScreen({ route, navigation }: Props) {
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAsset = async () => {
      try {
        const { data, error } = await supabase
          .from('assets')
          .select('*')
          .eq('id', route.params.id)
          .single();
        if (error) throw error;
        setAsset(data);
      } catch (err) {
        console.error('Error fetching asset details:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAsset();
  }, [route.params.id]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  if (!asset) {
    return (
      <SafeAreaView style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text>未找到商品信息</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Placeholder for Product Image */}
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
            <Text style={styles.title}>{asset.name}</Text>
            <Text style={styles.price}>{asset.status === 'available' ? '现存可借' : asset.status}</Text>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>商品简介</Text>
            <Text style={styles.descriptionText}>{asset.description}</Text>
          </View>

          {/* Details/Specs */}
          <View style={styles.section}>
             <Text style={styles.sectionTitle}>设备信息</Text>
             
             <View style={styles.infoRow}>
               <Ionicons name="location-outline" size={20} color={theme.colors.gray} style={styles.infoIcon} />
               <View>
                 <Text style={styles.infoLabel}>存放位置</Text>
                 <Text style={styles.infoValue}>{asset.location || '暂无位置信息'}</Text>
               </View>
             </View>

             <View style={styles.infoRow}>
               <Ionicons name="hardware-chip-outline" size={20} color={theme.colors.gray} style={styles.infoIcon} />
               <View>
                 <Text style={styles.infoLabel}>物理状况</Text>
                 <Text style={styles.infoValue}>{conditionMap[asset.condition] || asset.condition}</Text>
               </View>
             </View>

             <View style={styles.infoRow}>
               <Ionicons name="shield-checkmark-outline" size={20} color={theme.colors.gray} style={styles.infoIcon} />
               <View>
                 <Text style={styles.infoLabel}>保修状态</Text>
                 <Text style={styles.infoValue}>{asset.warranty_status === 'active' ? '保修期内' : asset.warranty_status === 'expired' ? '已过期' : '无保修'}</Text>
               </View>
             </View>
          </View>

          {/* Calendar Section */}
          <View style={styles.calendarSection}>
            <Text style={styles.sectionTitle}>借用日历</Text>
            <CalendarView 
              markedDates={{
                '2026-03-12': { color: '#EF4444', textColor: 'white', disabled: true, startingDay: true, endingDay: true },
                '2026-03-13': { color: '#EF4444', textColor: 'white', disabled: true, startingDay: true, endingDay: true },
                '2026-03-15': { color: '#10B981', textColor: 'white', startingDay: true, endingDay: true }
              }}
              onDayPress={(day: any) => console.log('Selected day', day)}
            />
          </View>

        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity 
          style={styles.bookButton}
          onPress={() => navigation.navigate('BookingFormScreen', { assetId: asset.id })}
        >
          <Text style={styles.bookButtonText}>立即预约</Text>
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
  imageContainer: {
    width: width,
    height: 300,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative'
  },
  image: {
    width: '100%',
    height: '100%',
    position: 'absolute'
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
  title: {
    flex: 1,
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginRight: theme.spacing.md,
    lineHeight: 30,
  },
  price: {
    fontSize: 20,
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
    color: '#4B5563',
    lineHeight: 24,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    backgroundColor: '#F9FAFB',
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
  calendarPlaceholder: {
    height: 180,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  calendarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: 12,
    marginBottom: 4,
  },
  calendarSubText: {
    fontSize: 14,
    color: theme.colors.gray,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
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
  bookButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  }
});
