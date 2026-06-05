#!/usr/bin/env bun

/**
 * Propaga docs/ai/engineering.md e docs/ai/skills/ para todos os configs de IA.
 * Edite sempre em docs/ai/ e rode: bun run ai:sync
 */

import { mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

const GENERATED_HEADER =
  '<!-- GERADO AUTOMATICAMENTE — fonte canônica: docs/ai/ — edite lá e rode: bun run ai:sync -->\n\n'

function read(relPath: string): string {
  return readFileSync(join(ROOT, relPath), 'utf-8')
}

function write(relPath: string, content: string): void {
  mkdirSync(dirname(join(ROOT, relPath)), { recursive: true })
  writeFileSync(join(ROOT, relPath), content, 'utf-8')
  console.log(`  ✅ ${relPath}`)
}

// ── 1. Engineering rules ─────────────────────────────────────────────────────
const rules = read('docs/ai/engineering.md')

console.log('\n📐 Engineering rules:')

write('AGENTS.md', GENERATED_HEADER + rules)
write('.rules', GENERATED_HEADER + rules)
write('.windsurfrules', GENERATED_HEADER + rules)
write(
  '.cursor/rules/engineering.mdc',
  [
    '---',
    'description: Regras de engenharia para execução de sprints com IA',
    'globs: ["openspec/**", "docs/sprints/**", "docs/business-rules/**", "docs/decisions/**"]',
    'alwaysApply: true',
    '---',
    '',
    GENERATED_HEADER.trim(),
    '',
    rules,
  ].join('\n'),
)

// ── 2. Skills ─────────────────────────────────────────────────────────────────
interface SkillMeta {
  name: string
  description: string
}

const SKILL_META: Record<string, SkillMeta> = {
  'sprint-set-execution': {
    name: 'sprint-set-execution',
    description:
      'Executa uma sprint por sets em ordem definida no plano, com checkpoint obrigatório ao final de cada set e validação de critérios de aceite. Use quando o usuário pedir para implementar, continuar, ajustar ou revisar sets de uma sprint.',
  },
  'sprint-definition-rn-flow': {
    name: 'sprint-definition-rn-flow',
    description:
      'Estrutura e preenche a documentação da próxima sprint a partir do briefing do usuário, faz perguntas de clarificação, aguarda aprovação explícita e só então cria/atualiza as regras de negócio. Use quando o usuário pedir para planejar sprint, montar sprint, definir escopo, ou organizar RNs da sprint.',
  },
  'code-review': {
    name: 'code-review',
    description:
      'Realiza code review estruturado por severidade após cada set e ao final da sprint (antes do PR). Normalmente chamada automaticamente pela skill sprint-set-execution e pela Cadeia de Fechamento — não precisa ser invocada manualmente pelo usuário.',
  },
  'refactor-pass': {
    name: 'refactor-pass',
    description:
      'Executa uma passagem de refatoração ao final da sprint para reduzir débito técnico, remover duplicação e garantir consistência. Normalmente chamada automaticamente pela Cadeia de Fechamento da sprint-set-execution — não precisa ser invocada manualmente.',
  },
  'git-workflow': {
    name: 'git-workflow',
    description: 'Garante consistência no versionamento e qualidade dos commits e PRs.',
  },
  'dont-be-greedy': {
    name: 'dont-be-greedy',
    description:
      'Controla consumo de contexto em arquivos grandes. Use quando houver logs, CSV/JSON grandes, markdowns extensos ou qualquer arquivo potencialmente custoso em tokens para evitar overflow, lentidão e alucinação.',
  },
  'sprint-to-changelog': {
    name: 'sprint-to-changelog',
    description:
      'Gera a entrada de changelog ao final da sprint e registra decisões técnicas quando necessário. Normalmente chamada automaticamente como Passo 3 da Cadeia de Fechamento, após code-review sem críticos — não precisa ser invocada manualmente.',
  },
  'text-to-business-rule': {
    name: 'text-to-business-rule',
    description:
      'Converte descrição em texto livre para documento de Regra de Negócio no padrão do projeto. Use quando o usuário pedir para criar, estruturar, revisar ou refinar uma RN em docs/business-rules.',
  },
  'openspec-change-to-changelog': {
    name: 'openspec-change-to-changelog',
    description:
      'Atualiza docs/changelog/CHANGELOG.md ao concluir uma change OpenSpec. Use após /opsx:apply ou via /opsx-changelog, antes ou depois de /opsx-archive.',
  },
}

console.log('\n🎯 Skills (.cursor):')

const skillsDir = join(ROOT, 'docs/ai/skills')
const skillFiles = readdirSync(skillsDir).filter((f) => f.endsWith('.md'))

for (const skillFile of skillFiles) {
  const skillName = skillFile.replace('.md', '')
  const content = read(`docs/ai/skills/${skillFile}`)
  const meta = SKILL_META[skillName]

  if (!meta) {
    console.warn(`  ⚠️  Sem metadata para ${skillFile} — ignorando`)
    continue
  }

  const frontmatter = `---\nname: ${meta.name}\ndescription: ${meta.description}\n---\n\n`
  write(`.cursor/skills/${skillName}/SKILL.md`, frontmatter + GENERATED_HEADER + content)
}

console.log('\n✅ ai:sync concluído\n')
