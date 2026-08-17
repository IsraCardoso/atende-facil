/** Painel de chat simulado para testar o flow no browser (RN-023). */
import { useEffect, useId, useRef, useState } from "react";

type SimulationMessage = Readonly<{
  sender: "bot" | "user";
  text: string;
}>;

type Props = {
  messages: readonly SimulationMessage[];
  isComplete: boolean;
  onSend: (text: string) => void;
  onReset: () => void;
  onClose: () => void;
};

export function SimulationPanel({ messages, isComplete, onSend, onReset, onClose }: Props) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isComplete) {
      return;
    }
    onSend(input.trim());
    setInput("");
  };

  return (
    <div className="w-80 border-l border-gray-200 bg-white flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50">
        <h3 className="font-semibold text-sm text-gray-700">Simulacao</h3>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={onReset}
            className="text-xs px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg px-1"
          >
            &times;
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.map((msg, idx) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: append-only chat list — messages never reorder or get removed
            key={`${panelId}-${msg.sender}-${idx}`}
            className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] px-3 py-1.5 rounded-lg text-sm ${
                msg.sender === "user" ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-800"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {isComplete && (
          <div className="text-center text-xs text-gray-400 py-2">Simulacao encerrada</div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="border-t p-2 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isComplete ? "Encerrado" : "Digite..."}
          disabled={isComplete}
          className="flex-1 text-sm border rounded px-2 py-1.5 disabled:bg-gray-50"
        />
        <button
          type="submit"
          disabled={isComplete || !input.trim()}
          className="text-sm px-3 py-1.5 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          Enviar
        </button>
      </form>
    </div>
  );
}
