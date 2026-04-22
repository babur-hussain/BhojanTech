import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { useSocket } from '../hooks/useSocket';
import { Colors } from '../constants/theme';
import { linking } from './linking';

import AuthStack from './AuthStack';
import OwnerTabs from './OwnerTabs';
import WaiterTabs from './WaiterTabs';
import KitchenNavigator from './KitchenNavigator';

// Waiter sub-screens (pushed on top of tabs)
import OrderScreen from '../screens/waiter/OrderScreen';
import OrderSummaryScreen from '../screens/waiter/OrderSummaryScreen';
import BillingScreen from '../screens/waiter/BillingScreen';

const RootStack = createNativeStackNavigator();

function AppContent() {
    const { isAuthenticated, user } = useAuthStore();
    // Activate socket event listeners when authenticated
    useSocket();

    if (!isAuthenticated || !user) {
        return <AuthStack />;
    }

    switch (user.role) {
        case 'OWNER':
        case 'MANAGER':
            return <OwnerTabs />;
        case 'WAITER':
            return <WaiterStack />;
        case 'KITCHEN_STAFF':
            return <KitchenNavigator />;
        default:
            return <AuthStack />;
    }
}

// Waiter gets a stack wrapping the tabs to allow pushing order/billing screens
function WaiterStack() {
    return (
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
            <RootStack.Screen name="WaiterHome" component={WaiterTabs} />
            <RootStack.Screen name="OrderScreen" component={OrderScreen} />
            <RootStack.Screen name="OrderSummary" component={OrderSummaryScreen} />
            <RootStack.Screen name="Billing" component={BillingScreen} />
        </RootStack.Navigator>
    );
}

export default function RootNavigator() {
    const isLoading = useAuthStore((s) => s.isLoading);

    if (isLoading) {
        return (
            <View style={styles.splash}>
                <Text style={styles.splashEmoji}>🍛</Text>
                <ActivityIndicator size="large" color={Colors.saffron} />
            </View>
        );
    }

    return (
        <NavigationContainer linking={linking}>
            <AppContent />
        </NavigationContainer>
    );
}

const styles = StyleSheet.create({
    splash: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.cream },
    splashEmoji: { fontSize: 64, marginBottom: 24 },
});
