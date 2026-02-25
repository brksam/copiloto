import ReactMarkdown from "react-markdown";
import type { Message } from "../types";

interface ChatMessageProps {
    message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
    const isUser = message.role === "user";

    return (
        <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-2`}>
            <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-[13px] leading-relaxed ${isUser
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-50 text-gray-700"
                    }`}
            >
                {isUser ? (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                ) : (
                    <div className="prose prose-sm max-w-none prose-p:my-0.5 prose-ul:my-0.5 prose-ol:my-0.5 prose-li:my-0 prose-headings:my-1 prose-pre:bg-gray-100 prose-pre:text-gray-700 prose-code:text-indigo-600 prose-code:bg-indigo-50 prose-code:px-1 prose-code:rounded prose-code:text-xs">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                )}
            </div>
        </div>
    );
}
