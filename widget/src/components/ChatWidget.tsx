import { useState } from "react";
import { useChat } from "../hooks/useChat";
import { ChatInput } from "./ChatInput";
import { ChatMessage } from "./ChatMessage";

export function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const { messages, isLoading, sendMessage, messagesEndRef } = useChat();

    return (
        <div className="fixed bottom-4 right-4 z-[9999]" style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
            {/* ─── Chat Panel ─── */}
            {isOpen && (
                <div className="widget-slide-up mb-2 flex h-[450px] w-[320px] flex-col overflow-hidden rounded-xl bg-white shadow-lg shadow-black/10">
                    {/* Compact Header */}
                    <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
                        <div className="flex items-center gap-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-50 text-xs">
                                ✦
                            </div>
                            <span className="text-[13px] font-medium text-gray-700">
                                Copiloto Farma
                            </span>
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="flex h-6 w-6 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                            aria-label="Minimizar chat"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                className="h-3.5 w-3.5"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M5 10a.75.75 0 0 1 .75-.75h8.5a.75.75 0 0 1 0 1.5h-8.5A.75.75 0 0 1 5 10Z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto px-3 py-3 custom-scrollbar">
                        {messages.length === 0 && (
                            <div className="flex h-full flex-col items-center justify-center gap-1.5 text-center">
                                <div className="text-2xl opacity-40">✦</div>
                                <p className="text-xs text-gray-400">
                                    Como posso ajudar?
                                </p>
                            </div>
                        )}

                        {messages.map((msg) => (
                            <ChatMessage key={msg.id} message={msg} />
                        ))}

                        {/* Loading indicator */}
                        {isLoading && (
                            <div className="mb-2 flex justify-start">
                                <div className="flex items-center gap-1 rounded-lg bg-gray-50 px-3 py-2">
                                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-300 [animation-delay:-0.3s]" />
                                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-300 [animation-delay:-0.15s]" />
                                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-300" />
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <ChatInput onSend={sendMessage} disabled={isLoading} />
                </div>
            )}

            {/* ─── Floating Icon Button ─── */}
            {!isOpen && (
                <div className="group relative">
                    {/* Tooltip */}
                    <div className="pointer-events-none absolute bottom-full right-0 mb-2 whitespace-nowrap rounded-lg bg-gray-800 px-3 py-1.5 text-xs text-white opacity-0 shadow-md transition-opacity duration-200 group-hover:opacity-100">
                        Precisa de ajuda?
                        <div className="absolute -bottom-1 right-4 h-2 w-2 rotate-45 bg-gray-800" />
                    </div>

                    <button
                        onClick={() => setIsOpen(true)}
                        className="widget-pulse flex h-12 w-12 items-center justify-center rounded-full bg-white/85 text-indigo-600 shadow-md shadow-black/8 ring-1 ring-black/5 backdrop-blur-md transition-all duration-200 hover:scale-105 hover:bg-white hover:shadow-lg active:scale-95"
                        aria-label="Abrir assistente"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="h-5 w-5"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z"
                            />
                        </svg>
                    </button>
                </div>
            )}
        </div>
    );
}
