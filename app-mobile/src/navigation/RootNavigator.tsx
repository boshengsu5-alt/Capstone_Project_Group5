import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Session } from '@supabase/supabase-js';

import MainTabNavigator from './MainTabNavigator';
import AuthStackNavigator from './AuthStackNavigator';
import { onAuthStateChange, getSession } from '../services/authService';
import { theme } from '../theme';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  // undefined = 初始化中，null = 未登录，Session = 已登录
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [debugState, setDebugState] = useState<string>('Initializing');

  useEffect(() => {
    // console.log('[DEBUG] RootNavigator: mounted');
    setDebugState('Mounted, checking auth...');
    
    // 先启动 listener，避免 getSession() 异步期间漏掉 auth 事件
    const { data: listener } = onAuthStateChange((s) => {
      // console.log('[DEBUG] RootNavigator: onAuthStateChange called with:', s ? s.user.email : 'null');
      setDebugState('Auth listener triggered');
      setSession(s);
    });

    // console.log('[DEBUG] RootNavigator: calling getSession');
    setDebugState('Calling getSession...');
    // 并行获取初始会话
    getSession()
      .then((s) => {
        // console.log('[DEBUG] RootNavigator: getSession resolved with:', s ? s.user.email : 'null');
        setDebugState('getSession resolved');
        setSession(s);
      })
      .catch((err) => {
        // console.error('[DEBUG] RootNavigator: getSession error:', err);
        setDebugState('getSession error: ' + err.message);
        setSession(null);
      });

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  if (session === undefined) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        {__DEV__ && <Text style={{ marginTop: 20, color: '#666' }}>{debugState}</Text>}
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {session ? (
          <Stack.Screen name="Main" component={MainTabNavigator} />
        ) : (
          <Stack.Screen name="Auth" component={AuthStackNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.authBackground,
  },
});
