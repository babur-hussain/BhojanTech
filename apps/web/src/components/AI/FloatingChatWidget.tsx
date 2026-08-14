import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MessageSquare, X, Send, Mic, RefreshCw, Menu, PlusCircle, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

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
    const { user } = useAuth();
    const API_URL = import.meta.env.VITE_API_URL || 'https://server.bhojantech.lfvs.in/api';
    const currentRestaurantId = user?.restaurantId || DUMMY_RESTAURANT_ID;
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');

    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [sessionId, setSessionId] = useState<string | undefined>(undefined);
    const [sessions, setSessions] = useState<{ sessionId: string, firstMessage: string, updatedAt: string }[]>([]);
    const [showSidebar, setShowSidebar] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const fetchSessions = () => {
        fetch(`${API_URL}/ai/chat/sessions?restaurantId=${currentRestaurantId}`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        })
            .then(r => r.json())
            .then(data => {
                if (Array.isArray(data)) setSessions(data);
            })
            .catch(e => console.error("Could not load sessions", e));
    };

    useEffect(() => {
        if (isOpen) fetchSessions();
    }, [isOpen]);

    const loadSession = async (sid: string) => {
        setSessionId(sid);
        setShowSidebar(false);
        try {
            const res = await fetch(`${API_URL}/ai/chat/sessions/${sid}`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            const data = await res.json();
            if (Array.isArray(data)) {
                setMessages(data.map((m: any, i: number) => ({
                    id: m._id || `${sid}-${i}`,
                    role: m.role,
                    content: m.content
                })));
            }
        } catch (e) {
            console.error("Could not load session", e);
        }
    };

    const startNewSession = () => {
        setSessionId(undefined);
        setMessages([]);
        setShowSidebar(false);
    };

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
        // Use instant snap scrolling instead of 'smooth'. Calling 'smooth' dozens of times a second during streaming causes browser compositor ghosting artifacts!
        messagesEndRef.current?.scrollIntoView();
    };

    useEffect(() => {
        if (isOpen) scrollToBottom();
    }, [messages, isOpen]);

    const sendMessage = async (text: string) => {
        if (!text.trim() || isStreaming) return;

        const apiMessages = [...messages.map(m => ({ role: m.role, content: m.content })), { role: 'user', content: text }];

        const newMessageId = Date.now().toString();
        setMessages(prev => [...prev, { id: `u-${newMessageId}`, role: 'user', content: text }]);
        setInputValue('');
        setIsStreaming(true);

        const assistantMsgId = `a-${newMessageId}`;
        setMessages(prev => [...prev, { id: assistantMsgId, role: 'assistant', content: '' }]);

        try {
            const response = await fetch(`${API_URL}/ai/chat`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` })
                },
                body: JSON.stringify({
                    restaurantId: currentRestaurantId,
                    messages: apiMessages,
                    sessionId: sessionId
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
                                if (data.sessionId) {
                                    setSessionId(data.sessionId);
                                    fetchSessions(); // refresh the sidebar
                                    continue;
                                }
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
            <div className={`fixed bottom-6 right-6 w-[400px] h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col z-50 transition-all duration-300 origin-bottom-right ${isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'} overflow-hidden`}>

                {/* Header */}
                <div className="bg-[#F47E3E] text-white p-4 flex justify-between items-center shadow-md z-30 relative">
                    <div className="flex items-center space-x-2">
                        <button onClick={() => setShowSidebar(!showSidebar)} className="hover:bg-white/20 p-1 rounded transition-colors mr-1">
                            <Menu size={20} />
                        </button>
                        <MessageSquare size={20} />
                        <h3 className="font-semibold text-lg">AI Assistant</h3>
                    </div>
                    <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Sidebar Overlay */}
                <div className={`absolute top-[60px] left-0 bottom-[60px] w-3/4 bg-white shadow-2xl z-20 border-r border-gray-100 transition-transform duration-300 flex flex-col ${showSidebar ? 'translate-x-0' : '-translate-x-full'}`}>
                    <div className="p-4 border-b border-gray-100">
                        <button onClick={startNewSession} className="w-full flex items-center justify-center space-x-2 py-2 bg-orange-50 text-[#F47E3E] rounded-lg hover:bg-orange-100 transition-colors">
                            <PlusCircle size={18} />
                            <span className="font-medium">New Chat</span>
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2">
                        <div className="text-xs font-semibold text-gray-400 uppercase mb-2 px-2 flex items-center space-x-1"><Clock size={12} /> <span>Past Chats</span></div>
                        {sessions.length === 0 ? (
                            <p className="text-xs text-gray-400 px-2">No history yet.</p>
                        ) : (
                            sessions.map(s => (
                                <button key={s.sessionId} onClick={() => loadSession(s.sessionId)} className={`w-full text-left p-3 rounded-lg flex flex-col mb-1 transition-colors ${sessionId === s.sessionId ? 'bg-orange-50 border border-orange-100' : 'hover:bg-gray-50 border border-transparent'}`}>
                                    <span className="text-sm font-medium text-gray-700 truncate line-clamp-1 break-all">{s.firstMessage}</span>
                                    <span className="text-xs text-gray-400 mt-1">{new Date(s.updatedAt).toLocaleDateString()}</span>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Darken overlay for chat when sidebar is open */}
                {showSidebar && (
                    <div className="absolute inset-0 bg-black/10 z-10 top-[60px] bottom-[60px] transition-opacity" onClick={() => setShowSidebar(false)}></div>
                )}

                {/* Messages list */}
                <div className="flex-1 min-h-0 p-4 overflow-y-auto bg-gray-50/50">
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-6 text-center text-gray-500 h-full mt-[-20px]">
                            <MessageSquare size={48} className="text-[#F47E3E] opacity-50 mb-4" />
                            <p className="mb-2">Hello! I am your AI Consultant.</p>
                            <p className="text-sm">I have secure access to today's operations data. How can I assist you?</p>
                        </div>
                    ) : (
                        messages.map((m) => (
                            <div key={m.id} className={`flex mb-4 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] rounded-2xl p-3 ${m.role === 'user' ? 'bg-[#F47E3E] text-white rounded-tr-sm' : 'bg-white shadow-sm border border-gray-100 text-gray-800 rounded-tl-sm prose prose-sm min-h-[44px]'}`}>
                                    {m.role === 'assistant' ? (
                                        (m.content === '' && isStreaming) ? (
                                            <div className="flex space-x-1.5 items-center justify-center h-full pt-1.5 px-1">
                                                <span className="sr-only">Thinking...</span>
                                                <div className="w-2 h-2 bg-[#F47E3E] rounded-full animate-bounce [animation-delay:-0.3s] shadow-[0_0_5px_#F47E3E80]"></div>
                                                <div className="w-2 h-2 bg-[#F47E3E] rounded-full animate-bounce [animation-delay:-0.15s] shadow-[0_0_5px_#F47E3E80]"></div>
                                                <div className="w-2 h-2 bg-[#F47E3E] rounded-full animate-bounce shadow-[0_0_5px_#F47E3E80]"></div>
                                            </div>
                                        ) : (
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                                        )
                                    ) : (
                                        <p className="whitespace-pre-wrap">{m.content}</p>
                                    )}
                                </div>
                            </div>
                        ))
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
