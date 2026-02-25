import { useState, type KeyboardEvent } from "react";

interface ChatInputProps {
    onSend: (message: string) => void;
    disabled: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
    const [value, setValue] = useState("");

    const handleSend = () => {
        if (value.trim() && !disabled) {
            onSend(value);
            setValue("");
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="px-4 pb-4 pt-2">
            <div
                className="flex items-center gap-2 rounded-[14px] px-3.5 py-1.5"
                style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.07)",
                }}
            >
                <input
                    type="text"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={disabled}
                    placeholder="Escreva aqui..."
                    className="flex-1 bg-transparent py-2 text-[13px] font-light text-white outline-none placeholder:text-white/20 disabled:opacity-40"
                />
                <button
                    onClick={handleSend}
                    disabled={disabled || !value.trim()}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] text-white transition-all active:scale-95 disabled:opacity-20"
                    style={{
                        background: "linear-gradient(135deg, #667eea, #764ba2)",
                    }}
                    aria-label="Enviar"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                        <path d="M3.105 2.288a.75.75 0 0 0-.826.95l1.414 4.926A1.5 1.5 0 0 0 5.135 9.25h6.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.086l-1.414 4.926a.75.75 0 0 0 .826.95 28.897 28.897 0 0 0 15.293-7.155.75.75 0 0 0 0-1.114A28.897 28.897 0 0 0 3.105 2.288Z" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
