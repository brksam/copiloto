import ReactMarkdown from "react-markdown";
import type { Message } from "../types";

interface ChatMessageProps {
    message: Message;
    onFeedback?: (messageId: string, rating: "positive" | "negative") => void;
}

export function ChatMessage({ message, onFeedback }: ChatMessageProps) {
    const isUser = message.role === "user";

    if (isUser) {
        return (
            <div className="mb-3 flex justify-end">
                <div
                    className="max-w-[80%] px-3.5 py-2.5 text-[13px] font-light leading-relaxed text-white/90"
                    style={{
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: "14px 14px 4px 14px",
                    }}
                >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="group mb-4">
            <div className="flex items-start gap-3">
                {/* Gradient avatar */}
                <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] text-white"
                    style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}
                >
                    ✦
                </div>
                <div className="min-w-0 flex-1 text-[13px] font-light leading-[1.6] text-[#bbb]">
                    <div className="prose-glass">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                </div>
            </div>

            {/* Feedback buttons */}
            {message.id !== "welcome" && (
                <div className="ml-10 mt-1.5 flex h-5 items-center gap-1">
                    {message.feedbackGiven ? (
                        <span className="text-[10px] text-[#555]">
                            Obrigado pelo feedback
                        </span>
                    ) : (
                        <div className="flex items-center gap-0.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                            <button
                                onClick={() => onFeedback?.(message.id, "positive")}
                                className="flex h-5 w-5 items-center justify-center rounded text-[11px] text-[#444] transition-colors hover:text-[#4ade80]"
                                aria-label="Feedback positivo"
                            >
                                👍
                            </button>
                            <button
                                onClick={() => onFeedback?.(message.id, "negative")}
                                className="flex h-5 w-5 items-center justify-center rounded text-[11px] text-[#444] transition-colors hover:text-[#ef4444]"
                                aria-label="Feedback negativo"
                            >
                                👎
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
