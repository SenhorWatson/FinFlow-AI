import { createFileRoute } from "@tanstack/react-router";
import { ChatInterface } from "@/components/chat/ChatInterface";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Chat — FinFlow AI" },
      { name: "description", content: "Converse com a Lumi para registrar suas finanças." },
    ],
  }),
  component: ChatPage,
});

function ChatPage() {
  return (
    <div className="flex h-[calc(100dvh-72px)] flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <span className="text-sm font-bold">L</span>
          </div>
          <div>
            <h1 className="text-base font-semibold leading-tight">Lumi</h1>
            <p className="text-xs text-muted-foreground">Assistente Financeira</p>
          </div>
        </div>
      </header>
      <ChatInterface />
    </div>
  );
}
