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
import { setupForegroundHandler, setupBackgroundHandler } from './services/notifications';
import { Colors } from './constants/theme';
// import Toast from 'react-native-toast-message';

export default function App() {
    const colorScheme = useColorScheme();

    useEffect(() => {
        // Setup push notification handlers
        setupForegroundHandler();
        setupBackgroundHandler();
    }, []);

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
                <StatusBar
                    barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
                    backgroundColor={Colors.cream}
                />
                <RootNavigator />
                {/* <Toast /> */}
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}
