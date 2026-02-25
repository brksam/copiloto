/** Permanent dark background with Co-piloto branding — never fades out */
export function Background() {
    return (
        <div className="grain-bg fixed inset-0 z-0 flex flex-col items-center justify-center bg-[#080808]">
            {/* Subtle radial glow */}
            <div
                className="pointer-events-none absolute inset-0"
                style={{
                    background: "radial-gradient(ellipse 600px 400px at 50% 45%, rgba(102,126,234,0.06) 0%, transparent 70%)",
                }}
            />

            {/* Logo */}
            <div className="splash-fade-in relative z-10 flex items-center gap-3">
                <span className="text-2xl text-white/20">✦</span>
                <h1 className="text-3xl font-light tracking-wide text-white/80">
                    Co-piloto
                </h1>
            </div>

            {/* Subtitle */}
            <p className="splash-fade-in-delay relative z-10 mt-3 text-sm font-light tracking-wide text-white/20">
                Assistente inteligente para farmácias
            </p>

            {/* Decorative line */}
            <div className="splash-fade-in-delay-2 relative z-10 mt-8">
                <div className="h-px w-16 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>
        </div>
    );
}
