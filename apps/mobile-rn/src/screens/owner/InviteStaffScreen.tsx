import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { Colors, Spacing, FontSize, Radius } from '../../constants/theme';
import { useStaffStore } from '../../store/staffStore';
import { UserRole } from '../../types';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

const ROLES: Array<{ key: string; label: string; emoji: string }> = [
    { key: 'WAITER', label: 'Waiter', emoji: '🍽️' },
    { key: 'KITCHEN_STAFF', label: 'Kitchen Staff', emoji: '👨‍🍳' },
    { key: 'MANAGER', label: 'Manager', emoji: '👔' },
];

export default function InviteStaffScreen() {
    const navigation = useNavigation<any>();
    const { inviteStaff } = useStaffStore();
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [role, setRole] = useState('WAITER');
    const [loading, setLoading] = useState(false);

    const handleInvite = async () => {
        if (!name.trim()) { Alert.alert('Error', 'Name is required'); return; }
        if (phone.length !== 10) { Alert.alert('Error', 'Enter a valid 10-digit phone number'); return; }

        setLoading(true);
        try {
            await inviteStaff(name.trim(), phone, role);
            ReactNativeHapticFeedback.trigger('notificationSuccess');
            Alert.alert('Invite Sent! ✅', `${name} has been invited as ${role.replace('_', ' ')}.`, [
                { text: 'OK', onPress: () => navigation.goBack() },
            ]);
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Could not send invite');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.back}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Invite Staff</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scroll}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="e.g. Rajesh Kumar"
                    placeholderTextColor={Colors.gray400}
                />

                <Text style={styles.label}>Phone Number</Text>
                <View style={styles.phoneRow}>
                    <View style={styles.prefix}>
                        <Text style={styles.prefixText}>+91</Text>
                    </View>
                    <TextInput
                        style={styles.phoneInput}
                        value={phone}
                        onChangeText={setPhone}
                        placeholder="98765 43210"
                        placeholderTextColor={Colors.gray400}
                        keyboardType="phone-pad"
                        maxLength={10}
                    />
                </View>

                <Text style={styles.label}>Role</Text>
                <View style={styles.roleRow}>
                    {ROLES.map((r) => (
                        <TouchableOpacity
                            key={r.key}
                            style={[styles.roleCard, role === r.key && styles.roleCardActive]}
                            onPress={() => setRole(r.key)}
                        >
                            <Text style={styles.roleEmoji}>{r.emoji}</Text>
                            <Text style={[styles.roleLabel, role === r.key && styles.roleLabelActive]}>{r.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.infoBox}>
                    <Text style={styles.infoText}>📲 An SMS invite will be sent with a deep link. The staff member can tap to join your restaurant.</Text>
                </View>

                <TouchableOpacity
                    style={[styles.inviteBtn, loading && { opacity: 0.6 }]}
                    onPress={handleInvite}
                    disabled={loading}
                >
                    <Text style={styles.inviteBtnText}>{loading ? 'Sending Invite...' : 'Send Invite'}</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.cream },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
    back: { fontSize: FontSize.base, color: Colors.saffron, fontWeight: '600', marginRight: Spacing.md },
    title: { fontSize: FontSize.lg, fontWeight: '900', color: Colors.maroon },
    scroll: { padding: Spacing.lg },
    label: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.gray600, marginBottom: Spacing.xs, marginTop: Spacing.lg },
    input: { backgroundColor: Colors.white, borderRadius: Radius.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, fontSize: FontSize.base, color: Colors.gray900, borderWidth: 1, borderColor: Colors.gray200 },
    phoneRow: { flexDirection: 'row' },
    prefix: { backgroundColor: Colors.gray100, borderRadius: Radius.md, justifyContent: 'center', paddingHorizontal: Spacing.lg, marginRight: Spacing.sm, borderWidth: 1, borderColor: Colors.gray200 },
    prefixText: { fontSize: FontSize.md, fontWeight: '600', color: Colors.gray700 },
    phoneInput: { flex: 1, backgroundColor: Colors.white, borderRadius: Radius.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, fontSize: FontSize.lg, color: Colors.gray900, letterSpacing: 2, borderWidth: 1, borderColor: Colors.gray200 },
    roleRow: { flexDirection: 'row', justifyContent: 'space-between' },
    roleCard: { flex: 1, alignItems: 'center', padding: Spacing.lg, borderRadius: Radius.lg, backgroundColor: Colors.white, marginHorizontal: 4, borderWidth: 2, borderColor: Colors.gray200 },
    roleCardActive: { borderColor: Colors.saffron, backgroundColor: Colors.saffron + '10' },
    roleEmoji: { fontSize: 28, marginBottom: Spacing.xs },
    roleLabel: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.gray600 },
    roleLabelActive: { color: Colors.saffron, fontWeight: '800' },
    infoBox: { backgroundColor: Colors.info + '10', borderRadius: Radius.lg, padding: Spacing.lg, marginTop: Spacing.xxl, borderWidth: 1, borderColor: Colors.info + '30' },
    infoText: { fontSize: FontSize.sm, color: Colors.gray600, lineHeight: 20 },
    inviteBtn: { backgroundColor: Colors.saffron, borderRadius: Radius.lg, paddingVertical: Spacing.lg, alignItems: 'center', marginTop: Spacing.xxl },
    inviteBtnText: { color: Colors.white, fontSize: FontSize.md, fontWeight: '800' },
});
