// src/app/_layout.js
import { Ionicons } from '@expo/vector-icons';
import { Slot, Tabs, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { AppProvider } from '../context/AppContext';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { HomesProvider } from '../context/HomesContext';

const COLORS = {
  background: '#1a1a1a',
  card: '#2a2a2a',
  primary: '#9b59b6',
  accent: '#d4af37',
  text: '#ffffff',
  textMuted: '#707070',
};

function MainTabs() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: { backgroundColor: COLORS.card, borderTopColor: '#404040', borderTopWidth: 1 },
        headerStyle: { backgroundColor: COLORS.card, borderBottomColor: '#404040', borderBottomWidth: 1 },
        headerTintColor: COLORS.accent,
        headerTitleStyle: { fontWeight: 'bold', color: COLORS.text },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'index') iconName = focused ? 'checkmark-circle' : 'checkmark-circle-outline';
          else if (route.name === 'homes') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'recipes') iconName = focused ? 'restaurant' : 'restaurant-outline';
          else if (route.name === 'profile') iconName = focused ? 'person' : 'person-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      {/* Pestañas visibles */}
      <Tabs.Screen name="index" options={{ title: 'Tareas' }} />
      <Tabs.Screen name="homes" options={{ title: 'Casas' }} />
      <Tabs.Screen name="recipes" options={{ title: 'Recetas' }} />
      <Tabs.Screen name="profile" options={{ title: 'Perfil' }} />
      
      {/* Rutas ocultas de la barra inferior (href: null) */}
      <Tabs.Screen name="auth" options={{ href: null }} />
      <Tabs.Screen name="home-inventory" options={{ href: null }} />
      <Tabs.Screen name="home-shopping" options={{ href: null }} />
    </Tabs>
  );
}

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (loading) return;
    if (!user && pathname !== '/auth') router.replace('/auth');
    else if (user && pathname === '/auth') router.replace('/');
  }, [user, loading, pathname]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ color: COLORS.text, marginTop: 15, fontSize: 16 }}>Cargando Hestia...</Text>
      </View>
    );
  }

  if (!user) return <Slot />;
  return <MainTabs />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <HomesProvider>
        <AppProvider>
          <StatusBar style="light" />
          <RootLayoutNav />
        </AppProvider>
      </HomesProvider>
    </AuthProvider>
  );
}