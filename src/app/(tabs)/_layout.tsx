import { Tabs } from 'expo-router';
import { View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#06B6D4', // Cyan
        tabBarInactiveTintColor: '#94A3B8', // Slate gris
        tabBarStyle: {
          backgroundColor: '#131538', // Card sombre
          borderTopWidth: 0,
          elevation: 20,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.25,
          shadowRadius: 10,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 30 : 10,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          fontFamily: 'System',
        },
      }}
    >
      {/* 1. Feed Principal (Index) */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'EduSnap',
          tabBarLabel: 'Accueil',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'play-circle' : 'play-circle-outline'}
              size={26}
              color={color}
            />
          ),
        }}
      />

      {/* 2. Recherche & Découverte */}
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Découvrir',
          tabBarLabel: 'Explorer',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'compass' : 'compass-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />

      {/* 3. Bouton central "Créer" (Upload) */}
      <Tabs.Screen
        name="create"
        options={{
          title: 'Publier',
          tabBarLabel: 'Créer',
          tabBarIcon: ({ focused }) => (
            <View
              className={`w-12 h-12 rounded-full items-center justify-center -mt-5 bg-gradient-to-tr ${
                focused ? 'bg-cyan-500' : 'bg-indigo-600'
              } shadow-lg shadow-indigo-500/50 border-4 border-background`}
              style={{
                shadowColor: focused ? '#06B6D4' : '#4F46E5',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.4,
                shadowRadius: 6,
              }}
            >
              <Ionicons name="add" size={28} color="#FFFFFF" />
            </View>
          ),
        }}
      />

      {/* 4. Classement (Leaderboard) */}
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: 'Classement',
          tabBarLabel: 'Leaderboard',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'trophy' : 'trophy-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />

      {/* 5. Profil Utilisateur */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarLabel: 'Profil',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
