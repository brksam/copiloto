import { StrictMode, useCallback, useState } from "react";
import { createRoot } from "react-dom/client";
import { Background } from "./components/SplashScreen";
import { ChatWidget } from "./components/ChatWidget";
import { PasswordGate } from "./components/PasswordGate";
import "./index.css";

function App() {
    const [authenticated, setAuthenticated] = useState(false);
    const handleAuth = useCallback(() => setAuthenticated(true), []);

    if (!authenticated) {
        return <PasswordGate onSuccess={handleAuth} />;
    }

    return (
        <>
            <Background />
            <ChatWidget />
        </>
    );
}

createRoot(document.getElementById("copiloto-root")!).render(
    <StrictMode>
        <App />
    </StrictMode>
);
