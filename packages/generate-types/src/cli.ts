import fs from 'fs';
import path from 'path';
import type { QueryResponse } from 'agent-client';

function parseArgs(): { agentUrl: string; srcDir: string; outDir: string } {
  const args = process.argv.slice(2);
  let agentUrl = '';
  let srcDir = '';
  let outDir = '.';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--agent-url' && args[i + 1]) agentUrl = args[++i];
    else if (args[i] === '--src' && args[i + 1]) srcDir = args[++i];
    else if (args[i] === '--out' && args[i + 1]) outDir = args[++i];
    else if (args[i] === '--help' || args[i] === '-h') {
      console.log(
        'Usage: npx generate-types --agent-url <url> --src <dir> [--out <dir>]',
      );
      process.exit(0);
    }
  }

  if (!agentUrl) {
    console.error('Error: --agent-url is required');
    console.error(
      'Usage: npx generate-types --agent-url <url> --src <dir> [--out <dir>]',
    );
    process.exit(1);
  }
  if (!srcDir) {
    console.error('Error: --src is required');
    console.error(
      'Usage: npx generate-types --agent-url <url> --src <dir> [--out <dir>]',
    );
    process.exit(1);
  }

  return { agentUrl, srcDir, outDir };
}

function scanForCalls(dir: string): string[] {
  const calls = new Set<string>();
  const pattern = /agent\.call\(["'`]([^"'`]+)["'`]/g;

  function walk(dirPath: string) {
    for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
      const full = path.join(dirPath, entry.name);
      if (
        entry.isDirectory() &&
        entry.name !== 'node_modules' &&
        entry.name !== 'dist'
      ) {
        walk(full);
      } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
        const content = fs.readFileSync(full, 'utf8');
        for (const match of content.matchAll(pattern)) {
          calls.add(match[1]);
        }
      }
    }
  }

  walk(dir);
  return [...calls];
}

function toNamespaceName(query: string): string {
  return query
    .split(/\W+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('');
}

function shapeToTs(shape: unknown, indent = 0): string {
  const pad = '  '.repeat(indent);
  const inner = '  '.repeat(indent + 1);

  if (shape === null || shape === undefined) return 'null';
  if (typeof shape === 'string') return shape;
  if (Array.isArray(shape)) {
    const elem = shapeToTs(shape[0], indent);
    const needsWrap =
      typeof shape[0] === 'object' && shape[0] !== null && !Array.isArray(shape[0]);
    return needsWrap ? `Array<${elem}>` : `${elem}[]`;
  }
  if (typeof shape === 'object') {
    const entries = Object.entries(shape as Record<string, unknown>);
    if (entries.length === 0) return 'Record<string, never>';
    const fields = entries
      .map(([k, v]) => `${inner}${k}: ${shapeToTs(v, indent + 1)};`)
      .join('\n');
    return `{\n${fields}\n${pad}}`;
  }
  return 'unknown';
}

function emitNamespace(query: string, route: QueryResponse): string {
  const ns = toNamespaceName(query);
  const lines: string[] = [];

  lines.push(`/** agent.call("${query}") → ${route.method} ${route.path} */`);
  lines.push(`/** ${route.semantic} */`);
  lines.push(`export namespace ${ns} {`);

  if (route.path_params.length > 0) {
    lines.push(`  export interface PathParams {`);
    for (const p of route.path_params) {
      if (p.description) lines.push(`    /** ${p.description} */`);
      lines.push(`    ${p.name}${p.required ? '' : '?'}: ${p.type};`);
    }
    lines.push(`  }`);
  }

  if (route.query_params.length > 0) {
    lines.push(`  export interface QueryParams {`);
    for (const p of route.query_params) {
      if (p.description) lines.push(`    /** ${p.description} */`);
      lines.push(`    ${p.name}${p.required ? '' : '?'}: ${p.type};`);
    }
    lines.push(`  }`);
  }

  if (route.headers.length > 0) {
    lines.push(`  export interface Headers {`);
    for (const h of route.headers) {
      if (h.description) lines.push(`    /** ${h.description} */`);
      lines.push(`    ${h.name}${h.required ? '' : '?'}: ${h.type};`);
    }
    lines.push(`  }`);
  }

  if (route.body_shape !== null && route.body_shape !== undefined) {
    const bodyTs = shapeToTs(route.body_shape, 1);
    lines.push(`  export type Body = ${bodyTs};`);
  }

  const responseTs = shapeToTs(route.response_shape, 1);
  lines.push(`  export type Response = ${responseTs};`);

  if (route.errors.length > 0) {
    lines.push(
      `  export type ErrorStatus = ${route.errors.map((e) => e.status).join(' | ')};`,
    );
  }

  lines.push(`}`);
  return lines.join('\n');
}

function emitCallMap(entries: { query: string; ns: string; route: QueryResponse }[]): string {
  const lines: string[] = [];
  lines.push('export type AgentCallMap = {');
  for (const { query, ns, route } of entries) {
    lines.push(`  "${query}": {`);
    lines.push(`    response: ${ns}.Response;`);
    if (route.headers.length > 0) lines.push(`    headers: ${ns}.Headers;`);
    if (route.path_params.length > 0) lines.push(`    pathParams: ${ns}.PathParams;`);
    if (route.body_shape !== null && route.body_shape !== undefined) lines.push(`    body: ${ns}.Body;`);
    lines.push('  };');
  }
  lines.push('};');
  return lines.join('\n');
}

async function main() {
  const { agentUrl, srcDir, outDir } = parseArgs();
  const base = agentUrl.replace(/\/$/, '');
  const srcPath = path.resolve(srcDir);

  console.log(`Scanning ${srcPath} for agent.call(...) usages...`);
  const queries = scanForCalls(srcPath);

  if (queries.length === 0) {
    console.log('No agent.call(...) usages found.');
    process.exit(0);
  }

  console.log(`Found ${queries.length} unique call(s):`);
  for (const q of queries) console.log(`  "${q}"`);

  const cache: Record<string, QueryResponse> = {};
  const namespaces: string[] = [];
  const mapEntries: { query: string; ns: string; route: QueryResponse }[] = [];

  for (const query of queries) {
    process.stdout.write(`Resolving "${query}"... `);
    const res = await fetch(`${base}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });

    if (!res.ok) {
      console.error(`FAILED (${res.status} ${res.statusText})`);
      continue;
    }

    const route = (await res.json()) as QueryResponse;
    if (route.error) {
      console.error(`FAILED: ${route.error}`);
      continue;
    }

    cache[query] = route;
    const ns = toNamespaceName(query);
    namespaces.push(emitNamespace(query, route));
    mapEntries.push({ query, ns, route });
    console.log(`→ ${route.method} ${route.path}`);
  }

  const outPath = path.resolve(outDir);
  fs.mkdirSync(outPath, { recursive: true });

  const cachePath = path.join(outPath, 'agent-cache.json');
  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), 'utf8');
  console.log(`\nCache written to ${cachePath}`);

  const header = [
    `// Auto-generated by: npx generate-types`,
    `// Source: ${base}/query`,
    `// Calls: ${queries.join(', ')}`,
    '',
  ].join('\n');

  const typesPath = path.join(outPath, 'api-types.ts');
  const content = [header, ...namespaces, '', emitCallMap(mapEntries), ''].join('\n');
  fs.writeFileSync(typesPath, content, 'utf8');
  console.log(`Types written to ${typesPath}`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
