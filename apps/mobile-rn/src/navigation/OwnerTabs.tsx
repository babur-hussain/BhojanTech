import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Colors } from '../constants/theme';
import { View, Text } from 'react-native';
import { useNotificationsStore } from '../store/notificationsStore';

import DashboardScreen from '../screens/owner/DashboardScreen';
import LiveOrdersScreen from '../screens/owner/LiveOrdersScreen';
import MenuManageScreen from '../screens/owner/MenuManageScreen';
import TableManageScreen from '../screens/owner/TableManageScreen';
import StaffScreen from '../screens/owner/StaffScreen';
import ReportsScreen from '../screens/owner/ReportsScreen';
import AIChatScreen from '../screens/owner/AIChatScreen';

const Tab = createBottomTabNavigator();

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
    const icons: Record<string, string> = {
        Dashboard: '📊', Orders: '📋', Tables: '🪑', Menu: '🍽️', Staff: '👥', Reports: '📈', 'AI Chat': '🤖',
    };
    return (
        <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 20 }}>{icons[label] || '•'}</Text>
            <Text style={{ fontSize: 9, color: focused ? Colors.saffron : Colors.gray400, fontWeight: focused ? '700' : '400' }}>
                {label}
            </Text>
        </View>
    );
}

export default function OwnerTabs() {
    const unreadCount = useNotificationsStore((s) => s.unreadCount);

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarShowLabel: false,
                tabBarStyle: { backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.gray200, height: 64, paddingBottom: 8 },
                tabBarActiveTintColor: Colors.saffron,
                tabBarInactiveTintColor: Colors.gray400,
                tabBarIcon: ({ focused }) => <TabIcon label={route.name} focused={focused} />,
                tabBarBadge: route.name === 'Orders' && unreadCount > 0 ? unreadCount : undefined,
                tabBarBadgeStyle: { backgroundColor: Colors.error, fontSize: 10, minWidth: 18, height: 18, lineHeight: 18 },
            })}
        >
            <Tab.Screen name="Dashboard" component={DashboardScreen} />
            <Tab.Screen name="Orders" component={LiveOrdersScreen} />
            <Tab.Screen name="Tables" component={TableManageScreen} />
            <Tab.Screen name="Menu" component={MenuManageScreen} />
            <Tab.Screen name="Staff" component={StaffScreen} />
            <Tab.Screen name="Reports" component={ReportsScreen} />
            <Tab.Screen name="AI Chat" component={AIChatScreen} />
        </Tab.Navigator>
    );
}
