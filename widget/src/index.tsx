import { StrictMode, useCallback, useState } from "react";
import { createRoot } from "react-dom/client";
import { Background } from "./components/SplashScreen";
import { ChatWidget } from "./components/ChatWidget";
import { PasswordGate } from "./components/PasswordGate";
import "./index.css";

declare global {
    interface Window {
        electronAPI?: {
            isElectron: boolean;
            expand: () => void;
            collapse: () => void;
            toggle: () => void;
            dragStart: (screenX: number, screenY: number) => void;
            dragMove: (screenX: number, screenY: number) => void;
            dragEnd: () => void;
            captureScreen: () => Promise<string | null>;
        };
    }
}

const IS_ELECTRON = !!window.electronAPI?.isElectron;

function App() {
    const [authenticated, setAuthenticated] = useState(IS_ELECTRON); // skip password in Electron
    const handleAuth = useCallback(() => setAuthenticated(true), []);

    if (!authenticated) {
        return <PasswordGate onSuccess={handleAuth} />;
    }

    // In Electron: only the widget, no background
    if (IS_ELECTRON) {
        return <ChatWidget />;
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
