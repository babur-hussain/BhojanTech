import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontSize, Spacing } from '../constants/theme';
// import { useNetInfo } from '@react-native-community/netinfo';

interface OfflineBannerProps {
    isConnected?: boolean;
}

function OfflineBanner({ isConnected = true }: OfflineBannerProps) {
    if (isConnected) return null;

    return (
        <View style={styles.banner}>
            <Text style={styles.text}>📡 You are offline. Some features may be limited.</Text>
        </View>
    );
}

export default React.memo(OfflineBanner);

const styles = StyleSheet.create({
    banner: { backgroundColor: Colors.error, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg },
    text: { color: Colors.white, fontSize: FontSize.sm, fontWeight: '600', textAlign: 'center' },
});
