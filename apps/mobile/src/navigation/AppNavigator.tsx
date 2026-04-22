import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '@restaurant/types';
import LoginScreen from '../screens/LoginScreen';
import MenuScreen from '../screens/MenuScreen';
import TablesScreen from '../screens/TablesScreen';
import OrderScreen from '../screens/OrderScreen';
import KDSScreen from '../screens/KDSScreen';
import InventoryScreen from '../screens/InventoryScreen';
import StaffDashboardScreen from '../screens/StaffDashboardScreen';
import OwnerDashboardScreen from '../screens/OwnerDashboardScreen';
import AIAssistantScreen from '../screens/AIAssistantScreen';
import { View, Text } from 'react-native';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Mock Screens
const Dashboard = () => <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text>Dashboard</Text></View>;
const Orders = () => <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text>Orders</Text></View>;

function OrderStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tables" component={TablesScreen} />
      <Stack.Screen name="OrderDetails" component={OrderScreen} />
    </Stack.Navigator>
  );
}

function TabNavigator() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <Tab.Navigator screenOptions={{ tabBarActiveTintColor: '#800000', tabBarInactiveTintColor: '#666' }}>
      {user.role === UserRole.OWNER && (
        <Tab.Screen name="Dashboard" component={OwnerDashboardScreen} />
      )}
      {user.role === UserRole.MANAGER && (
        <Tab.Screen name="Dashboard" component={Dashboard} />
      )}
      {(user.role === UserRole.OWNER || user.role === UserRole.MANAGER) && (
        <Tab.Screen name="Menu" component={MenuScreen} />
      )}
      {(user.role === UserRole.OWNER || user.role === UserRole.MANAGER || user.role === UserRole.WAITER) && (
        <Tab.Screen name="Active Orders" component={Orders} />
      )}
      {(user.role === UserRole.OWNER || user.role === UserRole.MANAGER || user.role === UserRole.WAITER) && (
        <Tab.Screen name="Tables" component={OrderStack} />
      )}
      {(user.role === UserRole.OWNER || user.role === UserRole.MANAGER || user.role === UserRole.KITCHEN_STAFF) && (
        <Tab.Screen name="Kitchen" component={KDSScreen} />
      )}
      {(user.role === UserRole.OWNER || user.role === UserRole.MANAGER) && (
        <Tab.Screen name="Inventory" component={InventoryScreen} />
      )}
      {(user.role === UserRole.OWNER || user.role === UserRole.MANAGER) && (
        <Tab.Screen name="AI Assistant" component={AIAssistantScreen} />
      )}
      <Tab.Screen name="My Schedule" component={StaffDashboardScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <Stack.Screen name="Main" component={TabNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
