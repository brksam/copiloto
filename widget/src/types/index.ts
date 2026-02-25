export interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
}

export interface ScreenContext {
    current_url: string;
    page_title: string;
    active_element: string;
    timestamp: string;
}

export interface HistoryEntry {
    role: "user" | "assistant";
    content: string;
}

export interface ChatRequest {
    message: string;
    tenant_id: string;
    context: ScreenContext;
    history: HistoryEntry[];
}

export interface ChatResponse {
    response: string;
}
