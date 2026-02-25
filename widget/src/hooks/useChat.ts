import { useCallback, useEffect, useRef, useState } from "react";
import type {
    ChatRequest,
    ChatResponse,
    FeedbackRequest,
    HistoryEntry,
    Message,
    ScreenContext,
} from "../types";

function getScreenContext(): ScreenContext {
    const activeEl = document.activeElement;
    let activeElementDesc = "none";
    if (activeEl && activeEl !== document.body) {
        const tag = activeEl.tagName.toLowerCase();
        const id = activeEl.id ? `#${activeEl.id}` : "";
        const name = activeEl.getAttribute("name")
            ? `[name="${activeEl.getAttribute("name")}"]`
            : "";
        activeElementDesc = `${tag}${id}${name}`;
    }

    return {
        current_url: window.location.href,
        page_title: document.title,
        active_element: activeElementDesc,
        timestamp: new Date().toISOString(),
    };
}

function buildHistory(messages: Message[]): HistoryEntry[] {
    return messages.map((m) => ({ role: m.role, content: m.content }));
}

const API_URL = "http://localhost:8000/chat";
const FEEDBACK_URL = "http://localhost:8000/feedback/";
const CONVERSATIONS_URL = "http://localhost:8000/conversations";
const TENANT_ID = "farmacia-teste";
const STORAGE_KEY = "copiloto_conversation_id";

const WELCOME_MESSAGE: Message = {
    id: "welcome",
    role: "assistant",
    content:
        "Olá 👋 Sou seu co-piloto inteligente.\nEstou aqui para ajudar com qualquer dúvida sobre o sistema.\nÉ só perguntar.",
    timestamp: new Date(),
};

function getOrCreateConversationId(): string {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const newId = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, newId);
    return newId;
}

export function useChat() {
    const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
    const [isLoading, setIsLoading] = useState(false);
    const [conversationId, setConversationId] = useState(getOrCreateConversationId);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const loadedRef = useRef(false);

    const scrollToBottom = useCallback(() => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 50);
    }, []);

    // ── Load existing messages on mount ──
    useEffect(() => {
        if (loadedRef.current) return;
        loadedRef.current = true;

        const loadHistory = async () => {
            try {
                const res = await fetch(
                    `${CONVERSATIONS_URL}/${conversationId}/messages`,
                    { headers: { "Content-Type": "application/json" } }
                );
                if (!res.ok) return; // 404 = new conversation, skip

                const data: Array<{ role: string; content: string; created_at: string }> =
                    await res.json();

                if (data.length > 0) {
                    const loaded: Message[] = data.map((m, i) => ({
                        id: `loaded-${i}`,
                        role: m.role as "user" | "assistant",
                        content: m.content,
                        timestamp: new Date(m.created_at),
                    }));
                    setMessages([WELCOME_MESSAGE, ...loaded]);
                    scrollToBottom();
                }
            } catch {
                // Silently ignore — first time or backend down
            }
        };

        loadHistory();
    }, [conversationId, scrollToBottom]);

    const sendMessage = useCallback(
        async (text: string) => {
            const trimmed = text.trim();
            if (!trimmed || isLoading) return;

            const userMessage: Message = {
                id: crypto.randomUUID(),
                role: "user",
                content: trimmed,
                timestamp: new Date(),
            };

            const history = buildHistory(messages);

            setMessages((prev) => [...prev, userMessage]);
            setIsLoading(true);
            scrollToBottom();

            try {
                const body: ChatRequest = {
                    message: trimmed,
                    tenant_id: TENANT_ID,
                    conversation_id: conversationId,
                    context: getScreenContext(),
                    history,
                };

                const res = await fetch(API_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                });

                if (!res.ok) {
                    throw new Error(`Erro ${res.status}: ${res.statusText}`);
                }

                const data: ChatResponse = await res.json();

                const assistantMessage: Message = {
                    id: crypto.randomUUID(),
                    role: "assistant",
                    content: data.response,
                    timestamp: new Date(),
                };

                setMessages((prev) => [...prev, assistantMessage]);
            } catch (error) {
                const errorMessage: Message = {
                    id: crypto.randomUUID(),
                    role: "assistant",
                    content:
                        "⚠️ Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.",
                    timestamp: new Date(),
                };
                setMessages((prev) => [...prev, errorMessage]);
            } finally {
                setIsLoading(false);
                scrollToBottom();
            }
        },
        [isLoading, messages, scrollToBottom, conversationId]
    );

    const sendFeedback = useCallback(
        async (messageId: string, rating: "positive" | "negative") => {
            const msgIndex = messages.findIndex((m) => m.id === messageId);
            if (msgIndex < 0) return;

            const assistantMsg = messages[msgIndex];
            let userMsg: Message | undefined;
            for (let i = msgIndex - 1; i >= 0; i--) {
                if (messages[i].role === "user") {
                    userMsg = messages[i];
                    break;
                }
            }

            setMessages((prev) =>
                prev.map((m) =>
                    m.id === messageId ? { ...m, feedbackGiven: rating } : m
                )
            );

            try {
                const body: FeedbackRequest = {
                    tenant_id: TENANT_ID,
                    message: userMsg?.content ?? "",
                    response: assistantMsg.content,
                    rating,
                    context: null,
                };
                await fetch(FEEDBACK_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                });
            } catch {
                // Silently ignore
            }
        },
        [messages]
    );

    const startNewConversation = useCallback(() => {
        const newId = crypto.randomUUID();
        localStorage.setItem(STORAGE_KEY, newId);
        setConversationId(newId);
        setMessages([WELCOME_MESSAGE]);
        loadedRef.current = true; // Don't try to load from a brand-new conversation
    }, []);

    return {
        messages,
        isLoading,
        sendMessage,
        sendFeedback,
        startNewConversation,
        messagesEndRef,
    };
}
