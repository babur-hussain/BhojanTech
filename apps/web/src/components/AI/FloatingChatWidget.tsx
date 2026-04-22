import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MessageSquare, X, Send, Mic, RefreshCw } from 'lucide-react';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

const QUICK_PROMPTS = [
    "Today's sales summary",
    "Which items are running low?",
    "Suggest today's special based on inventory",
    "Compare this week vs last week",
    "How much GST did I collect this month?",
    "Which waiter performed best today?"
];

// Fallback dummy ID for local development without full auth context
const DUMMY_RESTAURANT_ID = '64abcd1234567890abcd1234';

export default function FloatingChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Initialize Speech Recognition if supported
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = SpeechRecognition ? new SpeechRecognition() : null;

    if (recognition) {
        recognition.continuous = false;
        recognition.lang = 'en-IN'; // Indian English, supports mixing with Hindi to some degree
        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setInputValue((prev) => prev + (prev ? ' ' : '') + transcript);
            setIsListening(false);
        };
        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);
    }

    const toggleListen = () => {
        if (!recognition) {
            alert("Voice input is not supported in this browser.");
            return;
        }
        if (isListening) {
            recognition.stop();
            setIsListening(false);
        } else {
            recognition.start();
            setIsListening(true);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) scrollToBottom();
    }, [messages, isOpen]);

    const sendMessage = async (text: string) => {
        if (!text.trim() || isStreaming) return;

        const newMessageId = Date.now().toString();
        setMessages(prev => [...prev, { id: `u-${newMessageId}`, role: 'user', content: text }]);
        setInputValue('');
        setIsStreaming(true);

        const assistantMsgId = `a-${newMessageId}`;
        setMessages(prev => [...prev, { id: assistantMsgId, role: 'assistant', content: '' }]);

        try {
            const response = await fetch('http://localhost:8080/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    restaurantId: DUMMY_RESTAURANT_ID, // Use real restaurantId from user context in prod
                    message: text
                }),
            });

            if (!response.body) throw new Error("No response body");
            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            let done = false;
            while (!done) {
                const { value, done: doneReading } = await reader.read();
                done = doneReading;
                if (value) {
                    const chunk = decoder.decode(value, { stream: !done });
                    const lines = chunk.split('\n\n');
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const dataStr = line.replace('data: ', '').trim();
                            if (dataStr === '[DONE]') break;
                            try {
                                const data = JSON.parse(dataStr);
                                if (data.error) {
                                    setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: m.content + '\\n**Error:** ' + data.error } : m));
                                    break;
                                }
                                if (data.text) {
                                    setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: m.content + data.text } : m));
                                }
                            } catch (e) {
                                console.error("Parse error:", e);
                            }
                        }
                    }
                }
            }
        } catch (err) {
            setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: "**Error connecting to AI Assistant.**" } : m));
        } finally {
            setIsStreaming(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className={`fixed bottom-6 right-6 p-4 rounded-full shadow-2xl transition-transform hover:scale-110 z-50 focus:outline-none ${isOpen ? 'scale-0' : 'scale-100'} bg-[#F47E3E] text-white`}
            >
                <MessageSquare size={28} />
            </button>

            {/* Chat Drawer Widget */}
            <div className={`fixed bottom-6 right-6 w-[400px] h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col z-50 transition-all duration-300 origin-bottom-right ${isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'}`}>

                {/* Header */}
                <div className="bg-[#F47E3E] text-white p-4 rounded-t-2xl flex justify-between items-center shadow-md">
                    <div className="flex items-center space-x-2">
                        <MessageSquare size={20} />
                        <h3 className="font-semibold text-lg">AI Assistant</h3>
                    </div>
                    <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Messages list */}
                <div className="flex-1 p-4 overflow-y-auto bg-gray-50/50">
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-6 text-center text-gray-500 h-full mt-[-20px]">
                            <MessageSquare size={48} className="text-[#F47E3E] opacity-50 mb-4" />
                            <p className="mb-2">Hello! I am your AI Consultant.</p>
                            <p className="text-sm">I have secure access to today's operations data. How can I assist you?</p>
                        </div>
                    ) : (
                        messages.map((m) => (
                            <div key={m.id} className={`flex mb-4 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] rounded-2xl p-3 ${m.role === 'user' ? 'bg-[#F47E3E] text-white rounded-tr-sm' : 'bg-white shadow-sm border border-gray-100 text-gray-800 rounded-tl-sm prose prose-sm'}`}>
                                    {m.role === 'assistant' ? (
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                                    ) : (
                                        <p className="whitespace-pre-wrap">{m.content}</p>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                    {isStreaming && messages[messages.length - 1]?.role !== 'assistant' && (
                        <div className="flex justify-start mb-4">
                            <div className="bg-white shadow-sm border border-gray-100 p-3 rounded-2xl rounded-tl-sm flex space-x-2 items-center text-gray-400">
                                <RefreshCw className="animate-spin" size={16} /><span>Thinking...</span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-3 bg-white border-t border-gray-100 rounded-b-2xl">
                    <div className="flex overflow-x-auto space-x-2 scrollbar-none pb-2">
                        {QUICK_PROMPTS.map((prompt, idx) => (
                            <button
                                key={idx}
                                onClick={() => sendMessage(prompt)}
                                className="whitespace-nowrap px-3 py-1 bg-gray-100 hover:bg-orange-50 hover:text-[#F47E3E] hover:border-[#F47E3E] border border-transparent text-xs text-gray-600 rounded-full transition-colors"
                            >
                                {prompt}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center space-x-2 mt-2">
                        <button
                            onClick={toggleListen}
                            className={`p-2 rounded-full transition-colors ${isListening ? 'bg-red-100 text-red-500 animate-pulse' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                            title="Voice Input"
                        >
                            <Mic size={20} />
                        </button>
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && sendMessage(inputValue)}
                            placeholder="Ask anything about today's data..."
                            className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F47E3E]/50 focus:border-[#F47E3E]"
                        />
                        <button
                            onClick={() => sendMessage(inputValue)}
                            disabled={!inputValue.trim() || isStreaming}
                            className="p-2 bg-[#F47E3E] text-white rounded-full hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                        >
                            <Send size={20} />
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
