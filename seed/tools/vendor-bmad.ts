/* Thin wrappers to run select vendored BMAD tools within DevAI seed runtime.
 * These are optional helpers for build/format flows and are not exposed as MCP tools directly.
 */
import path from 'node:path';

type RunResult = { content: Array<{ type: 'text'; text: string }> };

function ok(text: string): RunResult {
  return { content: [{ type: 'text', text }] };
}

export async function runBmadWebBuilder(args: {
  agentOrTeam: string;
  outDir?: string;
}): Promise<RunResult> {
  const modPath = path.resolve(
    process.cwd(),
    'seed/vendor/bmad-tools/builders/web-builder.js'
  );
  const mod = await import(modPath);
  if (typeof mod.build !== 'function' && typeof mod.default !== 'function') {
    return ok('web-builder not available');
  }
  const buildFn = (mod.build || mod.default) as (a: any) => Promise<any>;
  const res = await buildFn({
    id: args.agentOrTeam,
    outDir: args.outDir || 'dist',
  });
  return ok(`web-builder: ${JSON.stringify(res)}`);
}

export async function runBmadYamlFormat(args: {
  filePath: string;
}): Promise<RunResult> {
  const modPath = path.resolve(
    process.cwd(),
    'seed/vendor/bmad-tools/yaml-format.js'
  );
  const mod = await import(modPath);
  const format = (mod.format || mod.default) as (p: string) => Promise<any>;
  const res = await format(args.filePath);
  return ok(`yaml-format: ${JSON.stringify(res)}`);
}

export async function runBmadFlatten(args: {
  inputPath: string;
  outPath: string;
}): Promise<RunResult> {
  const aggPath = path.resolve(
    process.cwd(),
    'seed/vendor/bmad-tools/flattener/aggregate.js'
  );
  const mod = await import(aggPath);
  const flatten = (mod.flatten || mod.default) as (
    i: string,
    o: string
  ) => Promise<any>;
  const res = await flatten(args.inputPath, args.outPath);
  return ok(`flattener: ${JSON.stringify(res)}`);
}

export async function runBmadVersionBump(args: {
  level?: 'patch' | 'minor' | 'major';
}): Promise<RunResult> {
  const modPath = path.resolve(
    process.cwd(),
    'seed/vendor/bmad-tools/version-bump.js'
  );
  try {
    const mod = await import(modPath);
    const bump = (mod.bumpVersion || mod.default) as (
      t?: string
    ) => Promise<any>;
    const res = await bump(args.level || 'patch');
    return ok(`version-bump: ${JSON.stringify(res)}`);
  } catch (e: any) {
    return ok(`version-bump not available: ${e?.message || String(e)}`);
  }
}

export async function runBmadResolveDeps(args: {
  agentOrTeam: string;
}): Promise<RunResult> {
  const resolverPath = path.resolve(
    process.cwd(),
    'seed/vendor/bmad-tools/lib/dependency-resolver.js'
  );
  try {
    const Res =
      (await import(resolverPath)).default || (await import(resolverPath));
    const root = path.resolve(process.cwd(), 'docs/devai-method');
    const resolver = new (Res as any)(root);
    let res: any;
    if (args.agentOrTeam.endsWith('.yaml')) {
      res = await resolver.resolveTeamDependencies(
        args.agentOrTeam.replace(/\.yaml$/, '')
      );
    } else {
      res = await resolver.resolveAgentDependencies(args.agentOrTeam);
    }
    return ok(
      `deps: ${JSON.stringify(
        res && {
          ok: true,
          counts: {
            resources: Array.isArray(res.resources) ? res.resources.length : 0,
            agents: Array.isArray(res.agents)
              ? res.agents.length
              : res.agent
              ? 1
              : 0,
          },
        }
      )}`
    );
  } catch (e: any) {
    return ok(`deps not available: ${e?.message || String(e)}`);
  }
}
