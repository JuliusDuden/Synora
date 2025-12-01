import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

// Screens
import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import NotesListScreen from '../screens/NotesListScreen';
import NoteEditorScreen from '../screens/NoteEditorScreen';
import TasksScreen from '../screens/TasksScreen';
import ProjectsScreen from '../screens/ProjectsScreen';
import IdeasScreen from '../screens/IdeasScreen';
import HabitsScreen from '../screens/HabitsScreen';
import SnippetsScreen from '../screens/SnippetsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SearchScreen from '../screens/SearchScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Notes') {
            iconName = focused ? 'document-text' : 'document-text-outline';
          } else if (route.name === 'Tasks') {
            iconName = focused ? 'checkbox' : 'checkbox-outline';
          } else if (route.name === 'More') {
            iconName = focused ? 'menu' : 'menu-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Notes" component={NotesListScreen} />
      <Tab.Screen name="Tasks" component={TasksScreen} />
      <Tab.Screen name="More" component={MoreNavigator} />
    </Tab.Navigator>
  );
}

function MoreNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="MoreList"
        component={MoreListScreen}
        options={{ title: 'More' }}
      />
      <Stack.Screen name="Projects" component={ProjectsScreen} />
      <Stack.Screen name="Ideas" component={IdeasScreen} />
      <Stack.Screen name="Habits" component={HabitsScreen} />
      <Stack.Screen name="Snippets" component={SnippetsScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}

// More List Screen
function MoreListScreen({ navigation }: any) {
  const { logout } = useAuth();

  const menuItems = [
    { title: 'Projects', icon: 'folder', screen: 'Projects' },
    { title: 'Ideas', icon: 'bulb', screen: 'Ideas' },
    { title: 'Habits', icon: 'checkmark-circle', screen: 'Habits' },
    { title: 'Snippets', icon: 'code-slash', screen: 'Snippets' },
    { title: 'Settings', icon: 'settings', screen: 'Settings' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      {menuItems.map((item) => (
        <TouchableOpacity
          key={item.screen}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#e5e5e5',
          }}
          onPress={() => navigation.navigate(item.screen)}
        >
          <Ionicons name={item.icon as any} size={24} color="#6366f1" />
          <Text style={{ marginLeft: 16, fontSize: 16 }}>{item.title}</Text>
        </TouchableOpacity>
      ))}
      
      <TouchableOpacity
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 16,
          marginTop: 'auto',
          borderTopWidth: 1,
          borderTopColor: '#e5e5e5',
        }}
        onPress={logout}
      >
        <Ionicons name="log-out-outline" size={24} color="#ef4444" />
        <Text style={{ marginLeft: 16, fontSize: 16, color: '#ef4444' }}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null; // Or a loading screen
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="NoteEditor" component={NoteEditorScreen} />
            <Stack.Screen name="Search" component={SearchScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// Need to import these
import { View, Text, TouchableOpacity } from 'react-native';
