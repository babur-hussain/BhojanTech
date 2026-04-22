import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Colors, Radius } from '../constants/theme';
// In production: import LinearGradient from 'react-native-linear-gradient';

interface ShimmerPlaceholderProps {
    width: number | string;
    height: number;
    borderRadius?: number;
    style?: any;
}

/**
 * Shimmer Placeholder Component
 *
 * In production, use react-native-shimmer-placeholder with LinearGradient
 * for smooth loading animations. This is a simplified opacity-pulsing version.
 */
export default function ShimmerPlaceholder({
    width,
    height,
    borderRadius = Radius.md,
    style,
}: ShimmerPlaceholderProps) {
    const opacity = React.useRef(new Animated.Value(0.4)).current;

    React.useEffect(() => {
        const anim = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 0.4, duration: 800, useNativeDriver: true }),
            ]),
        );
        anim.start();
        return () => anim.stop();
    }, []);

    return (
        <Animated.View
            style={[
                styles.shimmer,
                { width: width as any, height, borderRadius, opacity },
                style,
            ]}
        />
    );
}

const styles = StyleSheet.create({
    shimmer: { backgroundColor: Colors.gray200 },
});
