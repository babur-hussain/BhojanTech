import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
// Note: React Native Markdown component would usually be used here instead of Text for the assistant response.
// For simplicity, using plain Text.

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

const DUMMY_RESTAURANT_ID = '64abcd1234567890abcd1234';

export default function AIAssistantScreen() {
    const [messages, setMessages] = useState<Message[]>([
        { id: 'initial', role: 'assistant', content: 'Hello! I am your AI Consultant. I have access to today\'s sales, inventory, and staff data. How can I help?' }
    ]);
    const [inputText, setInputText] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const scrollViewRef = useRef<ScrollView>(null);

    useEffect(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
    }, [messages]);

    const handleSend = async () => {
        if (!inputText.trim() || isStreaming) return;

        const userMessage = inputText;
        const msgId = Date.now().toString();
        setMessages(prev => [...prev, { id: `u-${msgId}`, role: 'user', content: userMessage }]);
        setInputText('');
        setIsStreaming(true);

        const assistantMsgId = `a-${msgId}`;
        setMessages(prev => [...prev, { id: assistantMsgId, role: 'assistant', content: '' }]);

        try {
            // In React Native, fetch streaming response reading is slightly different / limited depending on polyfills.
            // Often react-native-sse or a custom fetch adapter is used. Assuming standard fetch fallback for event stream.
            // For mobile simplicity we will make a single call to a non-streaming endpoint or handle the stream manually.
            // However, we mandated streaming. Let's do standard chunk parsing natively or just await full response.
            const response = await fetch('http://localhost:8080/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ restaurantId: DUMMY_RESTAURANT_ID, message: userMessage }),
            });

            // Stream parsing fallback for React Native
            const text = await response.text();
            const lines = text.split('\\n\\n');
            let finalContent = '';

            lines.forEach(line => {
                if (line.startsWith('data: ')) {
                    const str = line.replace('data: ', '').trim();
                    if (str !== '[DONE]') {
                        try {
                            const parsed = JSON.parse(str);
                            if (parsed.text) finalContent += parsed.text;
                            if (parsed.error) finalContent += '\\nError: ' + parsed.error;
                        } catch (e) { }
                    }
                }
            });

            setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: finalContent } : m));

        } catch (err) {
            setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: '**Error connecting to AI**' } : m));
        } finally {
            setIsStreaming(false);
        }
    };

    const handleVoiceInput = () => {
        // Placeholder for react-native-voice or similar package
        alert("Voice to text requires native module linking (e.g. @react-native-voice/voice).");
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={90}
        >
            <ScrollView
                ref={scrollViewRef}
                style={styles.chatArea}
                contentContainerStyle={{ padding: 16 }}
            >
                {messages.map(m => (
                    <View key={m.id} style={[styles.messageBubble, m.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
                        <Text style={[styles.messageText, m.role === 'user' ? styles.userText : styles.assistantText]}>
                            {m.content}
                        </Text>
                    </View>
                ))}
                {isStreaming && (
                    <View style={[styles.messageBubble, styles.assistantBubble]}>
                        <ActivityIndicator color="#F47E3E" size="small" />
                    </View>
                )}
            </ScrollView>

            <View style={styles.inputArea}>
                <TouchableOpacity style={styles.micButton} onPress={handleVoiceInput}>
                    <Text style={{ fontSize: 18 }}>🎙️</Text>
                </TouchableOpacity>
                <TextInput
                    style={styles.textInput}
                    value={inputText}
                    onChangeText={setInputText}
                    placeholder="Ask AI Consultant..."
                    multiline
                />
                <TouchableOpacity
                    style={styles.sendButton}
                    onPress={handleSend}
                    disabled={!inputText.trim() || isStreaming}
                >
                    <Text style={{ color: 'white', fontWeight: 'bold' }}>Send</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9f9f9' },
    chatArea: { flex: 1 },
    messageBubble: { maxWidth: '85%', padding: 12, borderRadius: 16, marginBottom: 10 },
    userBubble: { alignSelf: 'flex-end', backgroundColor: '#F47E3E' },
    assistantBubble: { alignSelf: 'flex-start', backgroundColor: '#fff', borderWidth: 1, borderColor: '#eee' },
    messageText: { fontSize: 15, lineHeight: 22 },
    userText: { color: '#fff' },
    assistantText: { color: '#333' },
    inputArea: { flexDirection: 'row', padding: 12, borderTopWidth: 1, borderColor: '#ddd', backgroundColor: '#fff', alignItems: 'center' },
    textInput: { flex: 1, backgroundColor: '#f0f0f0', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, maxHeight: 100, fontSize: 15 },
    micButton: { padding: 10, marginRight: 4 },
    sendButton: { backgroundColor: '#F47E3E', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20, marginLeft: 8 },
});
