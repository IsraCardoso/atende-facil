## ADDED Requirements

### Requirement: Cadastro de tenant via UI
O sistema MUST oferecer uma tela `/signup` que colete nome do tenant, slug, nome do administrador, e-mail e senha, e envie para `POST /auth/register-tenant`. Sucesso MUST redirecionar para `/login`. Falhas de validação (slug duplicado, e-mail duplicado) MUST ser exibidas de forma legível ao usuário.

#### Scenario: Cadastro bem-sucedido
- **WHEN** o usuário preenche o formulário de signup com dados válidos e um slug não usado
- **THEN** o tenant e o usuário admin são criados, e o usuário é redirecionado para `/login`

#### Scenario: Slug já em uso
- **WHEN** o usuário tenta cadastrar um slug que já existe
- **THEN** a tela exibe o erro `TENANT_SLUG_ALREADY_EXISTS` de forma legível, sem navegar

### Requirement: Login sem tenantSlug obrigatório
O `LoginUseCase` MUST resolver o tenant automaticamente a partir das memberships ativas do e-mail autenticado quando `tenantSlug` não for informado. Se exatamente uma membership ativa existir, o login prossegue nela. Se nenhuma existir, o comportamento é o mesmo de hoje (`AUTH_FORBIDDEN`). Se duas ou mais existirem, o sistema MUST retornar `AUTH_TENANT_AMBIGUOUS` com a lista de tenants candidatos (`slug`, `name`), sem completar o login. Quando `tenantSlug` é informado explicitamente, o comportamento MUST permanecer inalterado (resolução direta pelo slug).

#### Scenario: Usuário com uma única membership ativa, sem tenantSlug
- **WHEN** o usuário informa e-mail e senha corretos, sem `tenantSlug`, e tem exatamente uma membership `active`
- **THEN** o login é emitido normalmente para essa membership

#### Scenario: Usuário com múltiplas memberships ativas, sem tenantSlug
- **WHEN** o usuário informa e-mail e senha corretos, sem `tenantSlug`, e tem duas ou mais memberships `active`
- **THEN** o sistema responde `AUTH_TENANT_AMBIGUOUS` com a lista de tenants candidatos, sem emitir token

#### Scenario: Usuário sem nenhuma membership ativa, sem tenantSlug
- **WHEN** o usuário informa e-mail e senha corretos, sem `tenantSlug`, e não tem nenhuma membership `active`
- **THEN** o sistema responde `AUTH_FORBIDDEN`, mesmo comportamento de antes desta change

#### Scenario: tenantSlug informado explicitamente
- **WHEN** o usuário informa `tenantSlug` no corpo da requisição
- **THEN** o sistema resolve o tenant diretamente pelo slug, ignorando a resolução por e-mail (comportamento inalterado)

### Requirement: Seleção de tenant ambíguo na UI de login
Quando o login retornar `AUTH_TENANT_AMBIGUOUS`, a tela `/login` MUST exibir os tenants candidatos retornados como opções selecionáveis, permitindo ao usuário escolher e reenviar o login com o `tenantSlug` correspondente — sem exigir que o usuário digite o slug manualmente.

#### Scenario: Login ambíguo exibe seletor
- **WHEN** a resposta de `/auth/login` é `AUTH_TENANT_AMBIGUOUS` com uma lista de tenants
- **THEN** a tela exibe os nomes dos tenants candidatos como opções; selecionar uma reenvia o login com o `tenantSlug` correspondente
