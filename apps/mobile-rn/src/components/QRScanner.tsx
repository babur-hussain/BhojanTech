import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Spacing, FontSize, Radius } from '../constants/theme';
// In production:
// import { Camera, useCameraDevices } from 'react-native-vision-camera';
// import { useScanBarcodes, BarcodeFormat } from 'react-native-vision-camera';

interface QRScannerProps {
    onScan: (data: string) => void;
    onClose: () => void;
}

/**
 * QR Scanner Component
 *
 * Uses react-native-vision-camera for camera access.
 * In production, replace the placeholder below with the actual camera view.
 *
 * Usage:
 *   <QRScanner onScan={(data) => handleQR(data)} onClose={() => setShowScan(false)} />
 */
export default function QRScanner({ onScan, onClose }: QRScannerProps) {
    return (
        <View style={styles.container}>
            <View style={styles.cameraPlaceholder}>
                <Text style={styles.placeholderText}>📷 Camera Feed</Text>
                <Text style={styles.subtext}>Point at QR code on table</Text>
            </View>

            {/* Scan frame overlay */}
            <View style={styles.frame}>
                <View style={styles.corner} />
            </View>

            {/* Dev: simulate scan */}
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
    cameraPlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.gray900 },
    placeholderText: { fontSize: FontSize.xxl, color: Colors.gray400 },
    subtext: { fontSize: FontSize.sm, color: Colors.gray500, marginTop: Spacing.sm },
    frame: { position: 'absolute', width: 250, height: 250, borderWidth: 2, borderColor: Colors.saffron + '60', borderRadius: Radius.lg },
    corner: {},
    simBtn: { position: 'absolute', bottom: 100, backgroundColor: Colors.saffron, borderRadius: Radius.lg, paddingHorizontal: Spacing.xxl, paddingVertical: Spacing.md },
    simBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.base },
    closeBtn: { position: 'absolute', top: 60, right: 20, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: Radius.full, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
    closeBtnText: { color: Colors.white, fontSize: FontSize.base, fontWeight: '600' },
});
