// Opens Node's built-in SQLite as a stand-in for Cloudflare D1, so you can run MtaaCare with no installs.
// Node 22.13+ and 23.4+ have it built in. Node 22.5–22.12 need a flag, so we restart with it.
// Older Node versions get a clear message.
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

// Hide Node's "SQLite is experimental" notice: it is harmless and looks like an error.
const emitWarning = process.emitWarning;
process.emitWarning = (warning, ...rest) =>
  String(warning?.message ?? warning).includes('SQLite') ? undefined : emitWarning.call(process, warning, ...rest);

export async function loadSqlite(callerUrl) {
  try {
    return (await import('node:sqlite')).DatabaseSync;
  } catch {
    const [major, minor] = process.versions.node.split('.').map(Number);
    const canFlag = major > 22 || (major === 22 && minor >= 5);
    if (canFlag && !process.execArgv.includes('--experimental-sqlite')) {
      const r = spawnSync(process.execPath, ['--experimental-sqlite', '--no-warnings', fileURLToPath(callerUrl), ...process.argv.slice(2)], { stdio: 'inherit' });
      process.exit(r.status ?? 1);
    }
    console.error(`\nMtaaCare needs Node.js 22.5 or newer to run on your computer. You have ${process.version}.`);
    console.error('Install the LTS version from https://nodejs.org, open a new terminal, and run this again.\n');
    process.exit(1);
  }
}

// A tiny D1 look-alike on top of SQLite.
export function d1(sqlite) {
  return {
    prepare(sql) {
      const make = args => ({
        bind: (...a) => make(a),
        first: async () => sqlite.prepare(sql).get(...args) ?? null,
        all: async () => ({ results: sqlite.prepare(sql).all(...args) }),
        run: async () => ({ meta: { changes: sqlite.prepare(sql).run(...args).changes } })
      });
      return make([]);
    }
  };
}
