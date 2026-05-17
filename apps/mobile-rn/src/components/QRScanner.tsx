import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Colors, Spacing, FontSize, Radius } from '../constants/theme';
import { Camera, useCameraDevice, useCodeScanner } from 'react-native-vision-camera';

interface QRScannerProps {
    onScan: (data: string) => void;
    onClose: () => void;
}

/**
 * QR Scanner Component
 *
 * Uses react-native-vision-camera for camera access.
 */
export default function QRScanner({ onScan, onClose }: QRScannerProps) {
    const [hasPermission, setHasPermission] = useState(false);
    const device = useCameraDevice('back');
    const cooldownRef = useRef(false);

    useEffect(() => {
        (async () => {
            const status = await Camera.requestCameraPermission();
            setHasPermission(status === 'granted');
            if (status !== 'granted') {
                Alert.alert('Permission required', 'Camera permission is needed to scan QR codes.');
            }
        })();
    }, []);

    const codeScanner = useCodeScanner({
        codeTypes: ['qr', 'ean-13', 'code-128', 'code-39', 'upc-a'],
        onCodeScanned: (codes) => {
            if (cooldownRef.current) return;
            const code = codes[0]?.value;
            if (code) {
                cooldownRef.current = true;
                onScan(code);
                // Simple cooldown to prevent multi-fires
                setTimeout(() => { cooldownRef.current = false; }, 1500);
            }
        }
    });

    if (!hasPermission) {
        return (
            <View style={styles.container}>
                <Text style={{ color: 'white' }}>No Camera Permission</Text>
                <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                    <Text style={styles.closeBtnText}>✕ Close</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (device == null) {
        return (
            <View style={styles.container}>
                <Text style={{ color: 'white' }}>No Camera Device Found</Text>
                <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                    <Text style={styles.closeBtnText}>✕ Close</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Camera
                style={StyleSheet.absoluteFill}
                device={device}
                isActive={true}
                codeScanner={codeScanner}
            />

            {/* Scan frame overlay */}
            <View style={styles.frame}>
                <View style={styles.corner} />
            </View>

            {/* Optional Dev: simulate scan */}
            <TouchableOpacity style={styles.simBtn} onPress={() => onScan('restaurantapp://table?id=T5')}>
                <Text style={styles.simBtnText}>Simulate Scan (Dev)</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <Text style={styles.closeBtnText}>✕ Close</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
    frame: { position: 'absolute', width: 250, height: 250, borderWidth: 2, borderColor: Colors.saffron + '60', borderRadius: Radius.lg },
    corner: {},
    simBtn: { position: 'absolute', bottom: 100, backgroundColor: Colors.saffron, borderRadius: Radius.lg, paddingHorizontal: Spacing.xxl, paddingVertical: Spacing.md },
    simBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.base },
    closeBtn: { position: 'absolute', top: 60, right: 20, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: Radius.full, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
    closeBtnText: { color: Colors.white, fontSize: FontSize.base, fontWeight: '600' },
});
