import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ChatWidget } from "./components/ChatWidget";
import "./index.css";

createRoot(document.getElementById("copiloto-root")!).render(
    <StrictMode>
        <ChatWidget />
    </StrictMode>
);
