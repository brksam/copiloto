import { useState, type KeyboardEvent } from "react";

const CORRECT_PASSWORD = "copiloto2025";

interface PasswordGateProps {
    onSuccess: () => void;
}

export function PasswordGate({ onSuccess }: PasswordGateProps) {
    const [password, setPassword] = useState("");
    const [error, setError] = useState(false);
    const [shaking, setShaking] = useState(false);

    const handleSubmit = () => {
        if (password === CORRECT_PASSWORD) {
            onSuccess();
        } else {
            setError(true);
            setShaking(true);
            setTimeout(() => setShaking(false), 500);
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className="fixed inset-0 z-[99998] flex items-center justify-center bg-[#080808]">
            {/* Subtle radial glow */}
            <div
                className="pointer-events-none absolute inset-0"
                style={{
                    background:
                        "radial-gradient(ellipse 500px 350px at 50% 45%, rgba(102,126,234,0.05) 0%, transparent 70%)",
                }}
            />

            <div className={`relative z-10 flex w-80 flex-col items-center gap-6 ${shaking ? "gate-shake" : ""}`}>
                {/* Logo */}
                <div className="flex items-center gap-2.5">
                    <span className="text-xl text-white/20">✦</span>
                    <h1 className="text-xl font-light tracking-wide text-white/80">
                        Co-piloto
                    </h1>
                </div>

                <p className="text-[13px] font-light text-white/25">
                    Digite a senha para acessar
                </p>

                {/* Password field */}
                <input
                    type="password"
                    value={password}
                    onChange={(e) => {
                        setPassword(e.target.value);
                        setError(false);
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Senha"
                    autoFocus
                    className="w-full rounded-xl border bg-transparent px-4 py-3 text-center text-sm font-light text-white outline-none transition-colors placeholder:text-white/15"
                    style={{
                        background: "rgba(255,255,255,0.03)",
                        borderColor: error
                            ? "rgba(239,68,68,0.5)"
                            : "rgba(255,255,255,0.08)",
                    }}
                />

                {/* Error message */}
                {error && (
                    <p className="text-[12px] font-light text-red-400/80">
                        Senha incorreta
                    </p>
                )}

                {/* Submit button */}
                <button
                    onClick={handleSubmit}
                    className="w-full rounded-xl py-3 text-[13px] font-medium text-white transition-all active:scale-[0.98]"
                    style={{
                        background: "linear-gradient(135deg, #667eea, #764ba2)",
                    }}
                >
                    Entrar
                </button>
            </div>
        </div>
    );
}
