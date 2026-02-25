import { useCallback, useRef, useState } from "react";
import type {
    ChatRequest,
    ChatResponse,
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
const TENANT_ID = "farmacia-teste";

export function useChat() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = useCallback(() => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 50);
    }, []);

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

            // Capture history BEFORE adding the new user message
            const history = buildHistory(messages);

            setMessages((prev) => [...prev, userMessage]);
            setIsLoading(true);
            scrollToBottom();

            try {
                const body: ChatRequest = {
                    message: trimmed,
                    tenant_id: TENANT_ID,
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
        [isLoading, messages, scrollToBottom]
    );

    return { messages, isLoading, sendMessage, messagesEndRef };
}
