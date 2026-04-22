import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Colors, Spacing, FontSize, Radius } from '../../constants/theme';
import { streamApi } from '../../services/api';
import { Endpoints } from '../../constants/api';
import { useAuthStore } from '../../store/authStore';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

const QUICK_PROMPTS = [
    "Today's sales summary",
    "Which items are running low?",
    "Suggest today's special",
    "GST collected this month?",
    "Best performing waiter?"
];

export default function AIChatScreen() {
    const [messages, setMessages] = useState<Message[]>([
        { id: 'init', role: 'assistant', content: 'Hello! I have access to your restaurant data. Ask me anything — revenue, inventory, staff performance, or menu suggestions.' }
    ]);
    const [input, setInput] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const scrollRef = useRef<ScrollView>(null);
    const restaurantId = useAuthStore((s) => s.user?.restaurantId || '');

    useEffect(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
    }, [messages]);

    const sendMessage = async (text: string) => {
        if (!text.trim() || isStreaming) return;
        const msgId = Date.now().toString();
        setMessages((prev) => [...prev, { id: `u-${msgId}`, role: 'user', content: text }]);
        setInput('');
        setIsStreaming(true);

        const assistantId = `a-${msgId}`;
        setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

        try {
            await streamApi(Endpoints.AI_CHAT, { restaurantId, message: text }, (chunk) => {
                setMessages((prev) =>
                    prev.map((m) => m.id === assistantId ? { ...m, content: m.content + chunk } : m)
                );
            });
        } catch {
            setMessages((prev) =>
                prev.map((m) => m.id === assistantId ? { ...m, content: 'Error connecting to AI.' } : m)
            );
        } finally {
            setIsStreaming(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>🤖 AI Assistant</Text>
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={90}
            >
                <ScrollView
                    ref={scrollRef}
                    style={styles.chatArea}
                    contentContainerStyle={{ padding: Spacing.lg }}
                >
                    {messages.map((m) => (
                        <View key={m.id} style={[styles.bubble, m.role === 'user' ? styles.userBubble : styles.aiBubble]}>
                            <Text style={[styles.bubbleText, m.role === 'user' ? styles.userText : styles.aiText]}>
                                {m.content}
                            </Text>
                        </View>
                    ))}
                    {isStreaming && messages[messages.length - 1]?.content === '' && (
                        <ActivityIndicator color={Colors.saffron} style={{ marginTop: Spacing.sm }} />
                    )}
                </ScrollView>

                <View style={styles.footer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
                        {QUICK_PROMPTS.map((p, i) => (
                            <TouchableOpacity key={i} style={styles.chip} onPress={() => sendMessage(p)}>
                                <Text style={styles.chipText}>{p}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                    <View style={styles.inputRow}>
                        <TextInput
                            style={styles.input}
                            value={input}
                            onChangeText={setInput}
                            placeholder="Ask about your restaurant..."
                            placeholderTextColor={Colors.gray400}
                            multiline
                        />
                        <TouchableOpacity
                            style={[styles.sendBtn, (!input.trim() || isStreaming) && styles.sendBtnDisabled]}
                            onPress={() => sendMessage(input)}
                            disabled={!input.trim() || isStreaming}
                        >
                            <Text style={styles.sendBtnText}>➤</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.cream },
    header: { backgroundColor: Colors.saffron, paddingVertical: Spacing.lg, paddingHorizontal: Spacing.lg },
    headerTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.white },
    chatArea: { flex: 1 },
    bubble: { maxWidth: '85%', borderRadius: Radius.xl, padding: Spacing.md, marginBottom: Spacing.md },
    userBubble: { alignSelf: 'flex-end', backgroundColor: Colors.saffron },
    aiBubble: { alignSelf: 'flex-start', backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.gray200 },
    bubbleText: { fontSize: FontSize.base, lineHeight: 22 },
    userText: { color: Colors.white },
    aiText: { color: Colors.gray800 },
    footer: { borderTopWidth: 1, borderTopColor: Colors.gray200, backgroundColor: Colors.white, paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },
    chips: { paddingVertical: Spacing.sm },
    chip: { backgroundColor: Colors.gray100, borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, marginRight: Spacing.sm },
    chipText: { fontSize: FontSize.xs, color: Colors.gray600 },
    inputRow: { flexDirection: 'row', alignItems: 'center' },
    input: { flex: 1, backgroundColor: Colors.gray50, borderRadius: Radius.full, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, fontSize: FontSize.base, maxHeight: 80 },
    sendBtn: { backgroundColor: Colors.saffron, borderRadius: Radius.full, width: 44, height: 44, justifyContent: 'center', alignItems: 'center', marginLeft: Spacing.sm },
    sendBtnDisabled: { opacity: 0.4 },
    sendBtnText: { color: Colors.white, fontSize: 20, fontWeight: '700' },
});
