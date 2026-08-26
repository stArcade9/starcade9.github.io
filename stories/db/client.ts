import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle, type NeonDatabase } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from './schema';

// The app runs on the default Node.js runtime (not Edge), so we use Neon's
// WebSocket Pool driver rather than neon-http: it gives real, interactive
// db.transaction() support, which the POST .../complete route needs to
// atomically validate + write a completion and compute nextUnlockAt together
// (stories.md requires this to happen "in one database transaction").
neonConfig.webSocketConstructor = ws;

// Lazily initialised so importing this module (e.g. during `next build`'s
// route config collection, which evaluates route modules without a request
// context) never throws just because DATABASE_URL isn't set yet — only an
// actual query does.
let _db: NeonDatabase<typeof schema> | null = null;

function getDb(): NeonDatabase<typeof schema> {
  if (_db) return _db;
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set (see .env.example)');
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  _db = drizzle(pool, { schema });
  return _db;
}

export const db: NeonDatabase<typeof schema> = new Proxy({} as NeonDatabase<typeof schema>, {
  get(_target, prop) {
    const real = getDb();
    const value = Reflect.get(real, prop);
    // Methods like db.transaction()/db.select() close over `this` internally,
    // so they must stay bound to the real instance rather than the proxy.
    return typeof value === 'function' ? value.bind(real) : value;
  },
});
