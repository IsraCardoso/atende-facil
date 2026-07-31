/** Galeria de templates de fluxo prontos — ponto de partida pra quem não quer montar do zero. */

type FlowTemplateDefinition = Readonly<{
  startNodeId: string;
  nodes: readonly Record<string, unknown>[];
}>;

type FlowTemplate = Readonly<{
  id: string;
  name: string;
  description: string;
  definition: FlowTemplateDefinition;
}>;

const flowTemplates: readonly FlowTemplate[] = [
  {
    id: "boas-vindas",
    name: "Boas-vindas simples",
    description: "Uma mensagem de recepção e encerramento. Bom ponto de partida para customizar.",
    definition: {
      startNodeId: "welcome",
      nodes: [
        {
          id: "welcome",
          type: "message",
          text: "Olá! Bem-vindo ao nosso atendimento. Em breve alguém vai te responder.",
          nextNodeId: "end",
        },
        { id: "end", type: "end", summaryMessage: "Atendimento encerrado." },
      ],
    },
  },
  {
    id: "menu-faq",
    name: "Menu de opções (FAQ)",
    description:
      "Cliente escolhe entre horário de atendimento, endereço ou falar com um atendente.",
    definition: {
      startNodeId: "welcome",
      nodes: [
        {
          id: "welcome",
          type: "message",
          text: "Olá! Como posso ajudar?",
          nextNodeId: "menu",
        },
        {
          id: "menu",
          type: "option",
          prompt: "Escolha uma opção:",
          options: [
            { id: "1", label: "Horário de atendimento", nextNodeId: "hours" },
            { id: "2", label: "Endereço", nextNodeId: "address" },
            { id: "3", label: "Falar com atendente", nextNodeId: "transfer" },
          ],
        },
        {
          id: "hours",
          type: "message",
          text: "Atendemos de segunda a sexta, das 9h às 18h.",
          nextNodeId: "end",
        },
        {
          id: "address",
          type: "message",
          text: "Estamos localizados na Rua Exemplo, 123.",
          nextNodeId: "end",
        },
        {
          id: "transfer",
          type: "transfer",
          reason: "Cliente solicitou atendimento humano pelo menu.",
        },
        { id: "end", type: "end", summaryMessage: "Atendimento encerrado." },
      ],
    },
  },
  {
    id: "coleta-dados",
    name: "Coleta de dados + transferência",
    description: "Pede nome e motivo do contato, depois encaminha direto para um atendente.",
    definition: {
      startNodeId: "welcome",
      nodes: [
        {
          id: "welcome",
          type: "message",
          text: "Olá! Vou te ajudar a abrir um atendimento.",
          nextNodeId: "ask-name",
        },
        {
          id: "ask-name",
          type: "input",
          prompt: "Qual é o seu nome completo?",
          fieldKey: "customerName",
          nextNodeId: "ask-reason",
        },
        {
          id: "ask-reason",
          type: "input",
          prompt: "Qual o motivo do seu contato?",
          fieldKey: "contactReason",
          nextNodeId: "transfer",
        },
        {
          id: "transfer",
          type: "transfer",
          reason: "Coleta de dados concluída — encaminhado para atendente.",
        },
      ],
    },
  },
];

export type { FlowTemplate, FlowTemplateDefinition };
export { flowTemplates };
