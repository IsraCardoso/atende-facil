## ADDED Requirements

### Requirement: Configurações incluem integração WhatsApp
A área de Configurações do admin MUST agrupar preferências do tenant, incluindo integração WhatsApp, com navegação clara e layout consistente com demais páginas admin (`AppShell`, `PageHeader`, padding `p-6`).

#### Scenario: Acesso à integração
- **WHEN** usuário autenticado navega para `/settings`
- **THEN** visualiza seção ou aba "Integração WhatsApp" além das configurações existentes (ex.: fuso horário)

#### Scenario: Layout consistente
- **WHEN** página de integração é renderizada
- **THEN** usa mesmo espaçamento, tipografia e componentes do design system (`packages/ui`) que Agendamentos e Fluxos

#### Scenario: Responsividade
- **WHEN** viewport mobile (<768px)
- **THEN** card de integração e dialog de QR permanecem usáveis sem overflow horizontal
