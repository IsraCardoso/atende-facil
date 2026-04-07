/** Hook de simulacao local do flow. Importa packages/flow no browser, sem rede (RN-023). */

import { type Flow, type ProcessResult, processMessage, type Session } from "flow";
import { useCallback, useState } from "react";

type SimulationMessage = Readonly<{
  sender: "bot" | "user";
  text: string;
}>;

type SimulationState = Readonly<{
  isRunning: boolean;
  currentNodeId: string | null;
  messages: readonly SimulationMessage[];
  isComplete: boolean;
}>;

function createInitialSession(flow: Flow): Session {
  return {
    tenantId: flow.tenantId ?? "sim",
    phone: "sim-user",
    currentNodeId: null,
    mode: "bot",
    data: {},
  };
}

function extractNodeId(action: ProcessResult["action"]): string | null {
  if (action.kind === "ignored_non_bot_mode" || action.kind === "invalid_flow_state") {
    return null;
  }
  return action.nodeId;
}

function isTerminalAction(action: ProcessResult["action"]): boolean {
  return action.kind === "flow_completed" || action.kind === "transferred_to_human";
}

export function useFlowSimulation() {
  const [state, setState] = useState<SimulationState>({
    isRunning: false,
    currentNodeId: null,
    messages: [],
    isComplete: false,
  });
  const [flowRef, setFlowRef] = useState<Flow | null>(null);
  const [sessionRef, setSessionRef] = useState<Session | null>(null);

  const start = useCallback((definition: Record<string, unknown>) => {
    const flow = definition as unknown as Flow;
    setFlowRef(flow);
    const session = createInitialSession(flow);
    setSessionRef(session);

    const result: ProcessResult = processMessage(session, "", flow);

    const messages: SimulationMessage[] = result.outgoingMessages.map((text) => ({
      sender: "bot" as const,
      text,
    }));

    setState({
      isRunning: true,
      currentNodeId: extractNodeId(result.action),
      messages,
      isComplete: isTerminalAction(result.action),
    });

    setSessionRef(result.session);
  }, []);

  const sendMessage = useCallback(
    (text: string) => {
      if (!flowRef || !sessionRef || state.isComplete) {
        return;
      }

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, { sender: "user", text }],
      }));

      const result: ProcessResult = processMessage(sessionRef, text, flowRef);

      const botMessages: SimulationMessage[] = result.outgoingMessages.map((t) => ({
        sender: "bot" as const,
        text: t,
      }));

      setState((prev) => ({
        ...prev,
        currentNodeId: extractNodeId(result.action),
        messages: [...prev.messages, ...botMessages],
        isComplete: isTerminalAction(result.action),
      }));

      setSessionRef(result.session);
    },
    [flowRef, sessionRef, state.isComplete],
  );

  const reset = useCallback(() => {
    setState({ isRunning: false, currentNodeId: null, messages: [], isComplete: false });
    setFlowRef(null);
    setSessionRef(null);
  }, []);

  return { ...state, start, sendMessage, reset };
}
