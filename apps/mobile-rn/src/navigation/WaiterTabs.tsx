import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Colors } from '../constants/theme';
import { View, Text } from 'react-native';

import TablesScreen from '../screens/waiter/TablesScreen';
import MyOrdersScreen from '../screens/waiter/MyOrdersScreen';
import ProfileScreen from '../screens/waiter/ProfileScreen';

const Tab = createBottomTabNavigator();

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
    const icons: Record<string, string> = {
        Tables: '🪑', 'My Orders': '📋', Profile: '👤',
    };
    return (
        <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 22 }}>{icons[label] || '•'}</Text>
            <Text style={{ fontSize: 10, color: focused ? Colors.saffron : Colors.gray400, fontWeight: focused ? '700' : '400' }}>
                {label}
            </Text>
        </View>
    );
}

export default function WaiterTabs() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarShowLabel: false,
                tabBarStyle: { backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.gray200, height: 60, paddingBottom: 6 },
                tabBarIcon: ({ focused }) => <TabIcon label={route.name} focused={focused} />,
            })}
        >
            <Tab.Screen name="Tables" component={TablesScreen} />
            <Tab.Screen name="My Orders" component={MyOrdersScreen} />
            <Tab.Screen name="Profile" component={ProfileScreen} />
        </Tab.Navigator>
    );
}
