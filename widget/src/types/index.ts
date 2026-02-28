export interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
    feedbackGiven?: "positive" | "negative";
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
    conversation_id?: string;
    screenshot?: string;
    context: ScreenContext;
    history: HistoryEntry[];
}

export interface ChatResponse {
    response: string;
}

export interface FeedbackRequest {
    tenant_id: string;
    message: string;
    response: string;
    rating: "positive" | "negative";
    context: ScreenContext | null;
}

