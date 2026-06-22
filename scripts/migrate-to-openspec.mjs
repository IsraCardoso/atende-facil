#!/usr/bin/env node
/**
 * Migra documentação SDD legada (RNs + sprints) para estrutura OpenSpec.
 * Preserva rastreabilidade via legacy IDs e referências aos arquivos originais.
 */
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const RN_DIR = join(ROOT, 'docs/business-rules');
const SPRINT_DIR = join(ROOT, 'docs/sprints');
const OPENSPEC_DIR = join(ROOT, 'openspec');
const SPECS_DIR = join(OPENSPEC_DIR, 'specs');
const ARCHIVE_DIR = join(OPENSPEC_DIR, 'changes/archive');

/** @type {Record<string, string>} */
const RN_TO_CAPABILITY = {
  'RN-001': 'architecture-foundation',
  'RN-002': 'configuration',
  'RN-003': 'observability',
  'RN-004': 'multi-tenant',
  'RN-005': 'authentication',
  'RN-006': 'authorization',
  'RN-007': 'architecture-foundation',
  'RN-008': 'flow-engine',
  'RN-009': 'flow-engine',
  'RN-010': 'flow-engine',
  'RN-011': 'whatsapp-integration',
  'RN-012': 'whatsapp-integration',
  'RN-013': 'chatwoot-integration',
  'RN-014': 'conversations',
  'RN-015': 'domain-events',
  'RN-016': 'chatwoot-integration',
  'RN-017': 'chatwoot-integration',
  'RN-018': 'conversations',
  'RN-019': 'chatwoot-integration',
  'RN-020': 'flows',
  'RN-021': 'flows',
  'RN-022': 'flow-editor',
  'RN-023': 'flow-editor',
  'RN-024': 'persistence',
  'RN-025': 'security',
  'RN-026': 'chatwoot-integration',
  'RN-027': 'flow-scheduling',
  'RN-028': 'multi-tenant',
};

/** @type {Record<string, { title: string; description: string }>} */
const CAPABILITY_META = {
  'architecture-foundation': {
    title: 'Architecture Foundation',
    description: 'Hexagonal architecture, layer isolation, ports and adapters.',
  },
  configuration: {
    title: 'Configuration',
    description: 'Environment variables, secrets, and deployment configuration.',
  },
  observability: {
    title: 'Observability',
    description: 'Structured logging, correlation IDs, and operational visibility.',
  },
  'multi-tenant': {
    title: 'Multi-Tenant',
    description: 'Tenant isolation, identity from token, and per-tenant timezone.',
  },
  authentication: {
    title: 'Authentication',
    description: 'JWT bearer authentication and session security.',
  },
  authorization: {
    title: 'Authorization',
    description: 'RBAC and endpoint-level access control.',
  },
  'flow-engine': {
    title: 'Flow Engine',
    description: 'Deterministic conversational flow execution, nodes, and validation.',
  },
  'whatsapp-integration': {
    title: 'WhatsApp Integration',
    description: 'Provider-agnostic WhatsApp, webhooks, idempotency, and session locks.',
  },
  'chatwoot-integration': {
    title: 'Chatwoot Integration',
    description: 'Human handoff, reverse webhooks, embedded inbox, and tenant config.',
  },
  conversations: {
    title: 'Conversations',
    description: 'Conversation entity, state transitions, and auxiliary endpoints.',
  },
  'domain-events': {
    title: 'Domain Events',
    description: 'Domain events and Valkey pub/sub messaging.',
  },
  flows: {
    title: 'Flows',
    description: 'Flow CRUD, lifecycle, and Drizzle persistence.',
  },
  'flow-editor': {
    title: 'Flow Editor',
    description: 'Visual flow builder and local simulation.',
  },
  persistence: {
    title: 'Persistence',
    description: 'Mandatory Drizzle ORM usage and repository patterns.',
  },
  security: {
    title: 'Security',
    description: 'Transport security, rate limiting, and hardening.',
  },
  'flow-scheduling': {
    title: 'Flow Scheduling',
    description: 'Time-based flow activation and schedule management.',
  },
};

/** @type {Record<string, string>} */
const SPRINT_ARCHIVE_DATES = {
  'sprint-01': '2026-04-06',
  'sprint-02': '2026-04-08',
  'sprint-03': '2026-04-09',
  'sprint-04': '2026-04-13',
  'sprint-05': '2026-04-13',
  'sprint-06': '2026-04-14',
  'sprint-07': '2026-04-14',
  'sprint-08': '2026-04-14',
  'sprint-09': '2026-04-21',
  'sprint-10': '2026-04-21',
};

/**
 * @param {string} content
 * @param {string} heading
 */
function extractSection(content, heading) {
  const pattern = new RegExp(`## ${heading}\\s*\\n+([\\s\\S]*?)(?=\\n## |$)`, 'i');
  const match = content.match(pattern);
  return match ? match[1].trim() : '';
}

/**
 * @param {string} text
 */
function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

/**
 * @param {string} row
 */
function parseTableRow(row) {
  const cells = row
    .split('|')
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
  if (cells.length < 2) return null;
  if (cells[0].includes('---') || cells[0].toLowerCase() === 'situação') return null;
  return { situation: cells[0], behavior: cells[1] };
}

/**
 * @param {string} filePath
 */
async function parseRnFile(filePath) {
  const content = await readFile(filePath, 'utf8');
  const fileName = filePath.split(/[/\\]/).pop() ?? '';
  const idMatch = fileName.match(/^(RN-\d{3})/);
  const id = idMatch?.[1] ?? 'RN-???';
  const titleMatch = content.match(/^# RN-\d{3} — (.+)$/m);
  const title = titleMatch?.[1]?.trim() ?? id;
  const statusMatch = content.match(/\*\*Status:\*\*\s*`([^`]+)`/);
  const domainMatch = content.match(/\*\*Domínio:\*\*\s*(.+)$/m);
  const ruleBlock = extractSection(content, 'A Regra');
  const rule = ruleBlock.replace(/\*\*/g, '').trim();
  const conditionsBlock = extractSection(content, 'Condições e Exceções');
  const scenarios = [];
  for (const line of conditionsBlock.split('\n')) {
    if (!line.trim().startsWith('|')) continue;
    const parsed = parseTableRow(line);
    if (!parsed) continue;
    scenarios.push(parsed);
  }
  const traceBlock = extractSection(content, 'Rastreabilidade');
  const sprintMatch = traceBlock.match(/sprint-\d+/gi);
  const sprints = sprintMatch ? [...new Set(sprintMatch.map((s) => s.toLowerCase()))] : [];
  const relatedMatch = traceBlock.match(/RN-\d{3}/g);
  const related = relatedMatch ? [...new Set(relatedMatch.filter((r) => r !== id))] : [];
  return {
    id,
    title,
    fileName,
    status: statusMatch?.[1] ?? 'Ativa',
    domain: domainMatch?.[1]?.trim() ?? '',
    rule,
    scenarios,
    sprints,
    related,
    legacyPath: `docs/business-rules/${fileName}`,
  };
}

/**
 * @param {Awaited<ReturnType<typeof parseRnFile>>} rn
 */
function ensureNormativeRule(rule) {
  const cleaned = rule.replace(/^---\s*$/gm, '').replace(/\*\*/g, '').trim();
  if (/\b(SHALL|MUST)\b/.test(cleaned)) return cleaned;
  if (/\bdeve\b/i.test(cleaned)) {
    return cleaned.replace(/\bdeve\b/gi, 'MUST');
  }
  return `The system MUST enforce the following: ${cleaned}`;
}

/**
 * @param {Awaited<ReturnType<typeof parseRnFile>>} rn
 */
function rnToRequirementBlock(rn) {
  const reqName = `${rn.title} (legacy: ${rn.id})`;
  const lines = [`### Requirement: ${reqName}`, ensureNormativeRule(rn.rule), ''];
  if (rn.scenarios.length === 0) {
    lines.push('#### Scenario: Default behavior');
    lines.push('- **WHEN** the system operates under normal conditions');
    lines.push('- **THEN** the rule above MUST be enforced');
    lines.push('');
    return lines.join('\n');
  }
  for (const scenario of rn.scenarios) {
    const scenarioName = scenario.situation.slice(0, 80);
    lines.push(`#### Scenario: ${scenarioName}`);
    lines.push(`- **WHEN** ${scenario.situation}`);
    lines.push(`- **THEN** ${scenario.behavior}`);
    lines.push('');
  }
  lines.push(
    `> **Legacy:** [\`${rn.id}\`](../../${rn.legacyPath}) | **Status:** ${rn.status} | **Domain:** ${rn.domain}`,
  );
  if (rn.sprints.length > 0) {
    lines.push(`> **Implemented in:** ${rn.sprints.map((s) => `\`${s}\``).join(', ')}`);
  }
  if (rn.related.length > 0) {
    lines.push(`> **Related:** ${rn.related.join(', ')}`);
  }
  lines.push('');
  return lines.join('\n').trimEnd();
}

/**
 * @param {string} capability
 * @param {Awaited<ReturnType<typeof parseRnFile>>[]} rns
 */
function buildSpecMarkdown(capability, rns) {
  const meta = CAPABILITY_META[capability];
  const sorted = [...rns].sort((a, b) => a.id.localeCompare(b.id));
  const legacyIds = sorted.map((r) => r.id).join(', ');
  return [
    '## Purpose',
    '',
    meta?.description ?? `Specifications for ${capability}.`,
    '',
    `Migrated from legacy business rules: ${legacyIds}.`,
    'Source of truth for new work: this file. Legacy copies remain at `docs/business-rules/`.',
    'Traceability map: `docs/migration/rn-to-openspec-map.md`.',
    '',
    '## Requirements',
    '',
    ...sorted.map((rn) => rnToRequirementBlock(rn)),
    '',
  ].join('\n');
}

async function migrateRnsToSpecs() {
  const files = (await readdir(RN_DIR)).filter((f) => f.startsWith('RN-') && f.endsWith('.md'));
  /** @type {Map<string, Awaited<ReturnType<typeof parseRnFile>>[]>} */
  const byCapability = new Map();
  /** @type {Array<{ rn: string; capability: string; file: string }>} */
  const mapEntries = [];

  for (const file of files) {
    const rn = await parseRnFile(join(RN_DIR, file));
    const capability = RN_TO_CAPABILITY[rn.id];
    if (!capability) {
      throw new Error(`No capability mapping for ${rn.id}`);
    }
    if (!byCapability.has(capability)) byCapability.set(capability, []);
    byCapability.get(capability)?.push(rn);
    mapEntries.push({ rn: rn.id, capability, file: rn.legacyPath });
  }

  await rm(SPECS_DIR, { recursive: true, force: true });
  await mkdir(SPECS_DIR, { recursive: true });

  for (const [capability, rns] of byCapability) {
    const dir = join(SPECS_DIR, capability);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'spec.md'), buildSpecMarkdown(capability, rns), 'utf8');
  }

  mapEntries.sort((a, b) => a.rn.localeCompare(b.rn));
  const mapLines = [
    '# Mapa de Rastreabilidade: RN → OpenSpec',
    '',
    '> Gerado por `scripts/migrate-to-openspec.mjs`. Não editar IDs legacy manualmente.',
    '',
    '| RN legada | Capability OpenSpec | Arquivo spec | Arquivo legado |',
    '|-----------|---------------------|--------------|----------------|',
    ...mapEntries.map(
      (e) => `| ${e.rn} | \`${e.capability}\` | \`openspec/specs/${e.capability}/spec.md\` | \`${e.file}\` |`,
    ),
    '',
    '## Sprints arquivadas',
    '',
    '| Sprint | Archive OpenSpec | Documento legado |',
    '|--------|------------------|------------------|',
    ...Object.keys(SPRINT_ARCHIVE_DATES)
      .sort()
      .map((s) => {
        const date = SPRINT_ARCHIVE_DATES[s];
        return `| ${s} | \`openspec/changes/archive/${date}-${s}/\` | \`docs/sprints/${s}.md\` |`;
      }),
    '',
  ];
  await mkdir(join(ROOT, 'docs/migration'), { recursive: true });
  await writeFile(join(ROOT, 'docs/migration/rn-to-openspec-map.md'), mapLines.join('\n'), 'utf8');

  return { specCount: byCapability.size, rnCount: files.length };
}

/**
 * @param {string} sprintId e.g. sprint-01
 */
async function parseSprintFile(sprintId) {
  const path = join(SPRINT_DIR, `${sprintId}.md`);
  const content = await readFile(path, 'utf8');
  const titleMatch = content.match(/^# (.+)$/m);
  const title = titleMatch?.[1] ?? sprintId;
  const objectiveBlock = extractSection(content, 'Objetivo da Sprint');
  const objective = objectiveBlock.replace(/^>\s*/gm, '').trim();
  const deliverablesBlock = extractSection(content, 'Entregáveis') || extractSection(content, 'Entregaveis');
  const rnsBlock = extractSection(content, 'Regras de Negócio desta Sprint') || extractSection(content, 'Regras de Negocio desta Sprint');
  const planBlock = extractSection(content, 'Plano de Execução') || extractSection(content, 'Plano de Execucao');
  const outOfScope = extractSection(content, 'Fora do Escopo');
  const tasks = [];
  const taskPattern = /### T(\d{2}) · (.+)/g;
  let m;
  while ((m = taskPattern.exec(content)) !== null) {
    tasks.push({ id: `T${m[1]}`, name: m[2].trim() });
  }
  const setPattern = /SET-([A-Z]):\s*([^\n]+)/g;
  const sets = [];
  while ((m = setPattern.exec(planBlock)) !== null) {
    sets.push({ id: `SET-${m[1]}`, name: m[2].trim() });
  }
  const rnLinks = [...content.matchAll(/RN-\d{3}/g)].map((x) => x[0]);
  const uniqueRns = [...new Set(rnLinks)];
  return {
    sprintId,
    title,
    objective,
    deliverablesBlock,
    rnsBlock,
    planBlock,
    outOfScope,
    tasks,
    sets,
    uniqueRns,
    legacyPath: `docs/sprints/${sprintId}.md`,
  };
}

/**
 * @param {Awaited<ReturnType<typeof parseSprintFile>>} sprint
 */
function buildSprintProposal(sprint) {
  const capabilities = [...new Set(sprint.uniqueRns.map((rn) => RN_TO_CAPABILITY[rn]).filter(Boolean))];
  return [
    '## Why',
    '',
    sprint.objective || `Deliver scope defined in ${sprint.title}.`,
    '',
    '## What Changes',
    '',
    `Historical delivery from **${sprint.sprintId}** (archived migration).`,
    '',
    sprint.deliverablesBlock
      ? sprint.deliverablesBlock
          .split('\n')
          .filter((l) => l.trim().startsWith('|') && !l.includes('---'))
          .slice(1)
          .map((l) => {
            const cells = l.split('|').map((c) => c.trim()).filter(Boolean);
            return cells.length >= 2 ? `- ${cells[1]}` : null;
          })
          .filter(Boolean)
          .join('\n')
      : '- See legacy sprint document for deliverables.',
    '',
    '## Capabilities',
    '',
    '### New Capabilities',
    capabilities.length > 0
      ? capabilities.map((c) => `- \`${c}\`: requirements from ${sprint.sprintId}`).join('\n')
      : '- _(none — foundation or debt sprint)_',
    '',
    '### Modified Capabilities',
    '- _(archived — see main specs at `openspec/specs/`)_',
    '',
    '## Impact',
    '',
    `- Legacy sprint: [\`${sprint.sprintId}\`](../../${sprint.legacyPath})`,
    sprint.uniqueRns.length > 0 ? `- Business rules: ${sprint.uniqueRns.join(', ')}` : '',
    '',
    '## Legacy Reference',
    '',
    `> Full sprint document preserved at \`${sprint.legacyPath}\`.`,
    '',
  ]
    .filter((line) => line !== '')
    .join('\n');
}

/**
 * @param {Awaited<ReturnType<typeof parseSprintFile>>} sprint
 */
function buildSprintDesign(sprint) {
  return [
    '## Context',
    '',
    `Archived implementation of ${sprint.title}. Migrated from custom SDD workflow.`,
    '',
    '## Goals / Non-Goals',
    '',
    '### Goals',
    sprint.objective ? `- ${sprint.objective}` : `- Complete ${sprint.sprintId} scope`,
    '',
    '### Non-Goals',
    sprint.outOfScope
      ? sprint.outOfScope
          .split('\n')
          .filter((l) => l.trim().startsWith('-'))
          .join('\n')
      : '- See legacy sprint "Fora do Escopo" section',
    '',
    '## Decisions',
    '',
    '### Execution plan (legacy SETs)',
    '',
    '```',
    sprint.planBlock || 'See legacy sprint Plano de Execução',
    '```',
    '',
    sprint.sets.length > 0
      ? sprint.sets.map((s) => `- **${s.id}**: ${s.name}`).join('\n')
      : '- See legacy sprint for SET breakdown',
    '',
    '## Migration Plan',
    '',
    'N/A — already deployed. Specs consolidated in `openspec/specs/`.',
    '',
    '## Open Questions',
    '',
    '- None (archived delivery).',
    '',
  ].join('\n');
}

/**
 * @param {Awaited<ReturnType<typeof parseSprintFile>>} sprint
 */
function buildSprintTasks(sprint) {
  const lines = ['## 1. Legacy SETs and Tasks (completed)', ''];
  if (sprint.sets.length > 0) {
    let group = 2;
    for (const set of sprint.sets) {
      lines.push(`## ${group}. ${set.id}`);
      lines.push('');
      lines.push(`- [x] ${group}.0 ${set.name}`);
      lines.push('');
      group += 1;
    }
  }
  if (sprint.tasks.length > 0) {
    lines.push(`## ${sprint.sets.length + 2}. Individual tasks`);
    lines.push('');
    for (const task of sprint.tasks) {
      lines.push(`- [x] ${task.id} ${task.name}`);
    }
    lines.push('');
  }
  if (sprint.tasks.length === 0 && sprint.sets.length === 0) {
    lines.push('- [x] 1.1 Sprint completed — see legacy document for task breakdown');
    lines.push('');
  }
  lines.push('## Final');
  lines.push('');
  lines.push(`- [x] 99.0 Archive ${sprint.sprintId} — all deliverables shipped`);
  lines.push('');
  return lines.join('\n');
}

async function archiveSprints() {
  await rm(ARCHIVE_DIR, { recursive: true, force: true });
  await mkdir(ARCHIVE_DIR, { recursive: true });
  const sprintIds = Object.keys(SPRINT_ARCHIVE_DATES).sort();
  for (const sprintId of sprintIds) {
    const sprint = await parseSprintFile(sprintId);
    const date = SPRINT_ARCHIVE_DATES[sprintId];
    const archiveName = `${date}-${sprintId}`;
    const dir = join(ARCHIVE_DIR, archiveName);
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, '.openspec.yaml'),
      `schema: spec-driven\ncreated: ${date}\narchived: ${date}\nlegacySprint: ${sprintId}\n`,
      'utf8',
    );
    await writeFile(join(dir, 'proposal.md'), buildSprintProposal(sprint), 'utf8');
    await writeFile(join(dir, 'design.md'), buildSprintDesign(sprint), 'utf8');
    await writeFile(join(dir, 'tasks.md'), buildSprintTasks(sprint), 'utf8');
    await writeFile(
      join(dir, 'legacy-reference.md'),
      [
        `# Legacy Reference: ${sprintId}`,
        '',
        `- **Title:** ${sprint.title}`,
        `- **Document:** [\`${sprint.legacyPath}\`](../../../${sprint.legacyPath})`,
        `- **Changelog:** [\`docs/changelog/CHANGELOG.md\`](../../../docs/changelog/CHANGELOG.md)`,
        `- **RNs:** ${sprint.uniqueRns.length > 0 ? sprint.uniqueRns.join(', ') : 'see sprint doc'}`,
        '',
      ].join('\n'),
      'utf8',
    );
  }
  return sprintIds.length;
}

async function setupIdeasFolder() {
  const ideasDir = join(OPENSPEC_DIR, 'ideas');
  await mkdir(ideasDir, { recursive: true });
  await writeFile(
    join(ideasDir, 'README.md'),
    [
      '# Ideas',
      '',
      'Quick captures for future OpenSpec proposals. Use OpenSpec UI kanban or add `.md` files here.',
      '',
      'Workflow: Idea → `/opsx:propose` → `/opsx:apply` → `/opsx:archive`',
      '',
    ].join('\n'),
    'utf8',
  );
}

async function cleanupTestChange() {
  const testDir = join(OPENSPEC_DIR, 'changes/test-migration');
  await rm(testDir, { recursive: true, force: true });
  const changesDir = join(OPENSPEC_DIR, 'changes');
  await mkdir(changesDir, { recursive: true });
}

async function main() {
  console.log('Migrating RNs to openspec/specs/...');
  const { specCount, rnCount } = await migrateRnsToSpecs();
  console.log(`  ✓ ${rnCount} RNs → ${specCount} capability specs`);

  console.log('Archiving sprints 01–10...');
  const sprintCount = await archiveSprints();
  console.log(`  ✓ ${sprintCount} sprints archived`);

  await setupIdeasFolder();
  await cleanupTestChange();

  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
