import { useCallback, useEffect, useRef, useState } from "react";
import { useChat } from "../hooks/useChat";
import { ChatInput } from "./ChatInput";
import { ChatMessage } from "./ChatMessage";

interface Position { x: number; y: number; }

export function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const { messages, isLoading, sendMessage, sendFeedback, startNewConversation, messagesEndRef } = useChat();

    // ── Drag ─────────────────────────────────────────────────────
    const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
    const [initialized, setInitialized] = useState(false);
    const dragRef = useRef<{
        isDragging: boolean; startX: number; startY: number;
        originX: number; originY: number; moved: boolean;
    }>({ isDragging: false, startX: 0, startY: 0, originX: 0, originY: 0, moved: false });

    useEffect(() => {
        setPosition({ x: window.innerWidth - 64, y: window.innerHeight - 64 });
        setInitialized(true);
    }, []);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        dragRef.current = {
            isDragging: true, startX: e.clientX, startY: e.clientY,
            originX: position.x, originY: position.y, moved: false,
        };
        e.preventDefault();
    }, [position]);

    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            const d = dragRef.current;
            if (!d.isDragging) return;
            const dx = e.clientX - d.startX, dy = e.clientY - d.startY;
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) d.moved = true;
            setPosition({
                x: Math.max(24, Math.min(window.innerWidth - 24, d.originX + dx)),
                y: Math.max(24, Math.min(window.innerHeight - 24, d.originY + dy)),
            });
        };
        const onUp = () => { dragRef.current.isDragging = false; };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
        return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    }, []);

    const handleClick = useCallback(() => {
        if (!dragRef.current.moved) setIsOpen(p => !p);
        dragRef.current.moved = false;
    }, []);

    const panelStyle = (): React.CSSProperties => {
        const pW = 360, pH = 540, gap = 12;
        let left = position.x - pW + 24, top = position.y - pH - gap;
        if (left < 8) left = position.x - 24;
        if (top < 8) top = position.y + 56;
        return { position: "fixed", left, top };
    };

    if (!initialized) return null;

    return (
        <>
            {/* ─── Glass Panel ─── */}
            {isOpen && (
                <div
                    className="glass-slide-up z-[9999] flex h-[540px] w-[360px] flex-col overflow-hidden rounded-3xl"
                    style={{
                        ...panelStyle(),
                        background: "rgba(255,255,255,0.03)",
                        backdropFilter: "blur(20px)",
                        WebkitBackdropFilter: "blur(20px)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        boxShadow: "0 32px 64px rgba(0,0,0,0.8)",
                    }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4">
                        <div className="flex items-center gap-2.5">
                            <span className="dot-blink inline-block h-2 w-2 rounded-full bg-[#4ade80]" />
                            <span className="text-[14px] font-medium text-white">
                                Co-piloto
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            {/* Nova conversa */}
                            <button
                                onClick={startNewConversation}
                                className="flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-light text-white/30 transition-colors hover:bg-white/10 hover:text-white/60"
                                style={{ background: "rgba(255,255,255,0.05)", borderRadius: "6px" }}
                                aria-label="Nova conversa"
                                title="Nova conversa"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3">
                                    <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                                </svg>
                                Nova
                            </button>
                            {/* Fechar */}
                            <button
                                onClick={() => setIsOpen(false)}
                                className="flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-white/10"
                                style={{ background: "rgba(255,255,255,0.05)", borderRadius: "6px" }}
                                aria-label="Fechar"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 text-white/40">
                                    <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Separator */}
                    <div className="mx-5 h-px bg-white/[0.06]" />

                    {/* Messages */}
                    <div className="glass-scrollbar flex-1 overflow-y-auto px-5 py-4">
                        {messages.map((msg) => (
                            <ChatMessage key={msg.id} message={msg} onFeedback={sendFeedback} />
                        ))}
                        {isLoading && (
                            <div className="mb-3 flex items-start gap-3">
                                <div
                                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] text-white"
                                    style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}
                                >✦</div>
                                <div className="flex items-center gap-1.5 pt-2">
                                    <span className="h-1 w-1 animate-bounce rounded-full bg-white/20 [animation-delay:-0.3s]" />
                                    <span className="h-1 w-1 animate-bounce rounded-full bg-white/20 [animation-delay:-0.15s]" />
                                    <span className="h-1 w-1 animate-bounce rounded-full bg-white/20" />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <ChatInput onSend={sendMessage} disabled={isLoading} />
                </div>
            )}

            {/* ─── Floating Button ─── */}
            <div
                className="group fixed z-[9999]"
                style={{ left: position.x - 24, top: position.y - 24 }}
            >
                {/* Tooltip */}
                {!isOpen && (
                    <div
                        className="pointer-events-none absolute bottom-full left-1/2 mb-3 -translate-x-1/2 whitespace-nowrap rounded-xl px-3.5 py-2 text-[11px] font-light text-white/50 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                        style={{
                            background: "rgba(255,255,255,0.05)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            backdropFilter: "blur(12px)",
                        }}
                    >
                        Precisa de ajuda?
                    </div>
                )}

                <button
                    onMouseDown={handleMouseDown}
                    onClick={handleClick}
                    className="flex h-12 w-12 cursor-grab items-center justify-center rounded-2xl text-white/60 transition-all duration-200 hover:text-white active:cursor-grabbing active:scale-95"
                    style={{
                        background: "rgba(255,255,255,0.06)",
                        border: isOpen
                            ? "1px solid rgba(102,126,234,0.4)"
                            : "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "16px",
                    }}
                    onMouseEnter={(e) => {
                        if (!isOpen) (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(102,126,234,0.4)";
                    }}
                    onMouseLeave={(e) => {
                        if (!isOpen) (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.1)";
                    }}
                    aria-label={isOpen ? "Fechar chat" : "Abrir assistente"}
                >
                    {isOpen ? (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    ) : (
                        <span className="text-sm">✦</span>
                    )}
                </button>
            </div>
        </>
    );
}
