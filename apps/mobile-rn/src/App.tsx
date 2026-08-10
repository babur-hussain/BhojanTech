/**
 * App Entry Point — React Native CLI
 *
 * This is the root component that should be registered in index.js:
 *   import App from './src/App';
 *   AppRegistry.registerComponent(appName, () => App);
 */

import React, { useEffect } from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import RootNavigator from './navigation/RootNavigator';
import {
    setupForegroundHandler,
    setupBackgroundHandler,
    requestNotificationPermission,
    getFCMToken,
    subscribeToRestaurant,
} from './services/notifications';
import { setupConnectivityListener, syncQueue } from './services/offline';
import { api } from './services/api';
import OfflineBanner from './components/OfflineBanner';
import { Colors } from './constants/theme';
import { useAuthStore } from './store/authStore';

export default function App() {
    const colorScheme = useColorScheme();
    const restaurantId = useAuthStore((s) => s.user?.restaurantId);

    useEffect(() => {
        // Setup push notification handlers
        setupForegroundHandler();
        setupBackgroundHandler();

        // Request notification permission and get FCM token
        requestNotificationPermission().then((enabled) => {
            if (enabled) {
                getFCMToken();
            }
        });

        // Setup Offline Connectivity Listener
        const unsubNetInfo = setupConnectivityListener((connected) => {
            if (connected) {
                // Background sync when reconnected
                syncQueue(api).catch(console.warn);
            }
        });

        return () => {
            unsubNetInfo();
        };
    }, []);

    // Subscribe to restaurant-specific FCM topic when authenticated
    useEffect(() => {
        if (restaurantId) {
            subscribeToRestaurant(restaurantId);
        }
    }, [restaurantId]);

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
                <StatusBar
                    barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
                    backgroundColor={Colors.cream}
                />
                <OfflineBanner />
                <RootNavigator />
                {/* <Toast /> */}
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}
