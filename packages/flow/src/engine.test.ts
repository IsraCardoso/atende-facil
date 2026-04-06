import { describe, expect, it } from "vitest";

import { processMessage, RUNTIME_LOOP_GUARD_LIMIT } from "./engine";
import type { Flow, Session } from "./types";

function createSession(overrides: Partial<Session> = {}): Session {
  return {
    tenantId: "tenant-01",
    phone: "5511999999999",
    currentNodeId: null,
    mode: "bot",
    data: {},
    ...overrides,
  };
}

function createBaseFlow(): Flow {
  return {
    id: "flow-01",
    tenantId: "tenant-01",
    startNodeId: "welcome",
    nodes: [
      {
        id: "welcome",
        type: "message",
        text: "Bem-vindo!",
        nextNodeId: "menu",
      },
      {
        id: "menu",
        type: "option",
        prompt: "Escolha uma opcao:",
        invalidResponseMessage: "Opcao invalida no menu.",
        options: [
          {
            id: "opt-name",
            label: "Informar nome",
            aliases: ["nome", "meu nome"],
            nextNodeId: "collect-name",
          },
          {
            id: "opt-human",
            label: "Atendente",
            aliases: ["humano", "suporte"],
            nextNodeId: "handoff",
          },
        ],
      },
      {
        id: "collect-name",
        type: "input",
        prompt: "Digite seu nome:",
        fieldKey: "name",
        emptyResponseMessage: "Nome obrigatorio.",
        nextNodeId: "finish",
      },
      {
        id: "handoff",
        type: "transfer",
        reason: "request_human_support",
        message: "Encaminhando para atendimento humano.",
      },
      {
        id: "finish",
        type: "end",
        summaryMessage: "Fluxo finalizado.",
      },
    ],
  };
}

describe("processMessage", () => {
  it("should send welcome and wait on option when starting flow", () => {
    const flow = createBaseFlow();
    const session = createSession();

    const result = processMessage(session, "oi", flow);

    expect(result.outgoingMessages).toEqual(["Bem-vindo!", "Escolha uma opcao:"]);
    expect(result.action).toEqual({
      kind: "awaiting_user_input",
      nodeId: "menu",
      nodeType: "option",
    });
    expect(result.session.currentNodeId).toBe("menu");
    expect(result.debug.consumedIncomingMessage).toBe(false);
  });

  it("should navigate option by numeric input", () => {
    const flow = createBaseFlow();
    const session = createSession({
      currentNodeId: "menu",
    });

    const result = processMessage(session, "1", flow);

    expect(result.outgoingMessages).toEqual(["Digite seu nome:"]);
    expect(result.action).toEqual({
      kind: "awaiting_user_input",
      nodeId: "collect-name",
      nodeType: "input",
    });
    expect(result.debug.consumedIncomingMessage).toBe(true);
    expect(result.debug.matchedOptionId).toBe("opt-name");
  });

  it("should navigate option by alias and transfer to human", () => {
    const flow = createBaseFlow();
    const session = createSession({
      currentNodeId: "menu",
    });

    const result = processMessage(session, "Suporte", flow);

    expect(result.outgoingMessages).toEqual(["Encaminhando para atendimento humano."]);
    expect(result.action).toEqual({
      kind: "transferred_to_human",
      nodeId: "handoff",
      reason: "request_human_support",
    });
    expect(result.session.mode).toBe("waiting_human");
    expect(result.events[0]?.type).toBe("SessionTransferredToHuman");
  });

  it("should keep option node on invalid input", () => {
    const flow = createBaseFlow();
    const session = createSession({
      currentNodeId: "menu",
    });

    const result = processMessage(session, "invalido", flow);

    expect(result.outgoingMessages).toEqual(["Opcao invalida no menu.", "Escolha uma opcao:"]);
    expect(result.action).toEqual({
      kind: "awaiting_user_input",
      nodeId: "menu",
      nodeType: "option",
    });
    expect(result.session.currentNodeId).toBe("menu");
  });

  it("should collect input value and complete flow", () => {
    const flow = createBaseFlow();
    const session = createSession({
      currentNodeId: "collect-name",
    });

    const result = processMessage(session, " Israel ", flow);

    expect(result.action).toEqual({
      kind: "flow_completed",
      nodeId: "finish",
    });
    expect(result.session.currentNodeId).toBeNull();
    expect(result.session.data.name).toBe("Israel");
    expect(result.debug.collectedFieldKey).toBe("name");
    expect(result.events[0]?.type).toBe("SessionFlowCompleted");
  });

  it("should keep input node when value is blank", () => {
    const flow = createBaseFlow();
    const session = createSession({
      currentNodeId: "collect-name",
    });

    const result = processMessage(session, "   ", flow);

    expect(result.outgoingMessages).toEqual(["Nome obrigatorio.", "Digite seu nome:"]);
    expect(result.action).toEqual({
      kind: "awaiting_user_input",
      nodeId: "collect-name",
      nodeType: "input",
    });
    expect(result.session.currentNodeId).toBe("collect-name");
  });

  it("should ignore processing when session mode is not bot", () => {
    const flow = createBaseFlow();
    const session = createSession({
      mode: "waiting_human",
      currentNodeId: "menu",
    });

    const result = processMessage(session, "1", flow);

    expect(result.action).toEqual({
      kind: "ignored_non_bot_mode",
      mode: "waiting_human",
    });
    expect(result.session).toEqual(session);
    expect(result.outgoingMessages).toEqual([]);
  });

  it("should return invalid state when current node does not exist", () => {
    const flow = createBaseFlow();
    const session = createSession({
      currentNodeId: "missing-node",
    });

    const result = processMessage(session, "oi", flow);

    expect(result.action).toEqual({
      kind: "invalid_flow_state",
      issueCode: "MISSING_CURRENT_NODE",
      message: "Sessao aponta para no inexistente no fluxo.",
    });
  });

  it("should trigger runtime loop guard for automatic cycles", () => {
    const loopFlow: Flow = {
      id: "loop-flow",
      tenantId: "tenant-01",
      startNodeId: "a",
      nodes: [
        {
          id: "a",
          type: "message",
          text: "A",
          nextNodeId: "b",
        },
        {
          id: "b",
          type: "message",
          text: "B",
          nextNodeId: "a",
        },
      ],
    };
    const session = createSession();

    const result = processMessage(session, "oi", loopFlow);

    expect(result.action).toEqual({
      kind: "invalid_flow_state",
      issueCode: "RUNTIME_LOOP_GUARD_TRIGGERED",
      message: "Fluxo interrompido por protecao de loop automatico.",
    });
    expect(result.debug.transitionCount).toBe(RUNTIME_LOOP_GUARD_LIMIT + 1);
    expect(result.debug.warnings).toContain("Loop automatico detectado durante o processamento.");
  });
});
