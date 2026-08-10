import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Linking } from 'react-native';
import { Colors, Spacing, FontSize, Radius } from '../../constants/theme';
import { api } from '../../services/api';
import { Endpoints } from '../../constants/api';
import { inrFormat } from '../../utils/formatters';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';

interface BillPreview {
    subtotalINR: number;
    gstBreakup: any[];
    totalGSTINR: number;
    grandTotalINR: number;
    lineItems: any[];
}

export default function BillingScreen() {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { orderId } = route.params || {};
    const [preview, setPreview] = useState<BillPreview | null>(null);
    const [paymentMode, setPaymentMode] = useState<'CASH' | 'CARD' | 'UPI'>('CASH');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (orderId) {
            api<BillPreview>(Endpoints.BILLING_PREVIEW(orderId)).then(setPreview).catch(console.warn);
        }
    }, [orderId]);

    const handlePay = async () => {
        setLoading(true);
        try {
            await api(Endpoints.BILLING_PAY, {
                method: 'POST',
                body: { orderId, paymentMode, amountPaidINR: preview?.grandTotalINR },
            });
            Alert.alert('Payment Successful ✅', 'Table has been cleared.', [
                { text: 'OK', onPress: () => navigation.popToTop() },
            ]);
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Payment failed');
        } finally {
            setLoading(false);
        }
    };

    const MODES: Array<{ key: 'CASH' | 'CARD' | 'UPI'; label: string; emoji: string }> = [
        { key: 'CASH', label: 'Cash', emoji: '💵' },
        { key: 'CARD', label: 'Card', emoji: '💳' },
        { key: 'UPI', label: 'UPI', emoji: '📱' },
    ];

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.back}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Bill</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scroll}>
                {preview?.lineItems.map((item: any, idx: number) => (
                    <View key={idx} style={styles.lineItem}>
                        <Text style={styles.liName}>{item.quantity}× {item.name}</Text>
                        <Text style={styles.liPrice}>{inrFormat(item.lineTotal)}</Text>
                    </View>
                ))}

                <View style={styles.divider} />
                <View style={styles.summaryRow}>
                    <Text style={styles.summLabel}>Subtotal</Text>
                    <Text style={styles.summValue}>{inrFormat(preview?.subtotalINR || 0)}</Text>
                </View>
                <View style={styles.summaryRow}>
                    <Text style={styles.summLabel}>GST</Text>
                    <Text style={styles.summValue}>{inrFormat(preview?.totalGSTINR || 0)}</Text>
                </View>
                <View style={[styles.summaryRow, styles.grandRow]}>
                    <Text style={styles.grandLabel}>Grand Total</Text>
                    <Text style={styles.grandValue}>{inrFormat(preview?.grandTotalINR || 0)}</Text>
                </View>

                <Text style={styles.sectionTitle}>Payment Mode</Text>
                <View style={styles.modeRow}>
                    {MODES.map((m) => (
                        <TouchableOpacity
                            key={m.key}
                            style={[styles.modeBtn, paymentMode === m.key && styles.modeBtnActive]}
                            onPress={() => setPaymentMode(m.key)}
                        >
                            <Text style={styles.modeEmoji}>{m.emoji}</Text>
                            <Text style={[styles.modeLabel, paymentMode === m.key && styles.modeLabelActive]}>{m.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>

            <View style={styles.footer}>
                {paymentMode === 'UPI' ? (
                    <TouchableOpacity
                        style={[styles.payBtn, { backgroundColor: Colors.upi }, loading && styles.payBtnDisabled]}
                        onPress={async () => {
                            const upiLink = `upi://pay?pa=restaurant@upi&pn=Restaurant&am=${preview?.grandTotalINR}&cu=INR`;
                            try {
                                await Linking.openURL(upiLink);
                                // After successful redirect, we would ideally verify. For now, we proceed to handlePay.
                                handlePay();
                            } catch {
                                Alert.alert('UPI Error', 'No UPI app found on your phone. Please verify payment manually.', [
                                    { text: 'Verify Manually', onPress: handlePay },
                                    { text: 'Cancel', style: 'cancel' }
                                ]);
                            }
                        }}
                        disabled={loading || !preview}
                    >
                        <Text style={styles.payBtnText}>{loading ? 'Processing...' : `Open UPI App & Pay ${inrFormat(preview?.grandTotalINR || 0)}`}</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={[styles.payBtn, loading && styles.payBtnDisabled]}
                        onPress={handlePay}
                        disabled={loading || !preview}
                    >
                        <Text style={styles.payBtnText}>{loading ? 'Processing...' : `Pay ${inrFormat(preview?.grandTotalINR || 0)}`}</Text>
                    </TouchableOpacity>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.cream },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
    back: { fontSize: FontSize.base, color: Colors.saffron, fontWeight: '600', marginRight: Spacing.md },
    title: { fontSize: FontSize.lg, fontWeight: '900', color: Colors.maroon },
    scroll: { padding: Spacing.lg },
    lineItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm },
    liName: { fontSize: FontSize.base, color: Colors.gray700 },
    liPrice: { fontSize: FontSize.base, color: Colors.gray900, fontWeight: '600' },
    divider: { height: 1, backgroundColor: Colors.gray200, marginVertical: Spacing.lg },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
    summLabel: { fontSize: FontSize.base, color: Colors.gray500 },
    summValue: { fontSize: FontSize.base, color: Colors.gray700, fontWeight: '600' },
    grandRow: { marginTop: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: 2, borderTopColor: Colors.maroon },
    grandLabel: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.maroon },
    grandValue: { fontSize: FontSize.xl, fontWeight: '900', color: Colors.maroon },
    sectionTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.gray800, marginTop: Spacing.xxl, marginBottom: Spacing.md },
    modeRow: { flexDirection: 'row', justifyContent: 'space-between' },
    modeBtn: { flex: 1, alignItems: 'center', paddingVertical: Spacing.lg, borderRadius: Radius.lg, backgroundColor: Colors.white, marginHorizontal: 4, borderWidth: 2, borderColor: Colors.gray200 },
    modeBtnActive: { borderColor: Colors.saffron, backgroundColor: Colors.saffron + '10' },
    modeEmoji: { fontSize: 28, marginBottom: Spacing.xs },
    modeLabel: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.gray600 },
    modeLabelActive: { color: Colors.saffron },
    footer: { padding: Spacing.lg, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.gray200 },
    payBtn: { backgroundColor: Colors.success, borderRadius: Radius.lg, paddingVertical: Spacing.lg, alignItems: 'center' },
    payBtnDisabled: { opacity: 0.6 },
    payBtnText: { color: Colors.white, fontSize: FontSize.md, fontWeight: '800' },
});
