import { DatabaseService } from "./database.js";

/**
 * Run database migrations, create all tables
 */
export function runMigrations(db: DatabaseService): void {
  const client = db.getRawDatabase();

  // Create Services table
  client.exec(`
    CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      url TEXT,
      protocol TEXT DEFAULT 'http',
      host TEXT,
      port INTEGER,
      path TEXT,
      connect_timeout INTEGER DEFAULT 60000,
      write_timeout INTEGER DEFAULT 60000,
      read_timeout INTEGER DEFAULT 60000,
      retries INTEGER DEFAULT 5,
      tags TEXT DEFAULT '[]',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create Routes table
  client.exec(`
    CREATE TABLE IF NOT EXISTS routes (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      service_id TEXT REFERENCES services(id) ON DELETE CASCADE,
      protocols TEXT DEFAULT '["http","https"]',
      methods TEXT,
      hosts TEXT,
      paths TEXT,
      headers TEXT,
      snis TEXT,
      sources TEXT,
      destinations TEXT,
      strip_path INTEGER DEFAULT 0,
      preserve_host INTEGER DEFAULT 0,
      regex_priority INTEGER DEFAULT 0,
      path_handling TEXT DEFAULT 'v0',
      tags TEXT DEFAULT '[]',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create Upstreams table
  client.exec(`
    CREATE TABLE IF NOT EXISTS upstreams (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      algorithm TEXT DEFAULT 'round-robin',
      hash_on TEXT DEFAULT 'none',
      hash_fallback TEXT DEFAULT 'none',
      slots INTEGER DEFAULT 10000,
      healthcheck TEXT,
      tags TEXT DEFAULT '[]',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create Targets table
  client.exec(`
    CREATE TABLE IF NOT EXISTS targets (
      id TEXT PRIMARY KEY,
      upstream_id TEXT REFERENCES upstreams(id) ON DELETE CASCADE,
      target TEXT NOT NULL,
      weight INTEGER DEFAULT 100,
      tags TEXT DEFAULT '[]',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create Consumers table
  client.exec(`
    CREATE TABLE IF NOT EXISTS consumers (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE,
      custom_id TEXT UNIQUE,
      tags TEXT DEFAULT '[]',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create Plugins table
  client.exec(`
    CREATE TABLE IF NOT EXISTS plugins (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      service_id TEXT REFERENCES services(id) ON DELETE CASCADE,
      route_id TEXT REFERENCES routes(id) ON DELETE CASCADE,
      consumer_id TEXT REFERENCES consumers(id) ON DELETE CASCADE,
      config TEXT,
      enabled INTEGER DEFAULT 1,
      run_on TEXT DEFAULT 'first',
      ordering TEXT,
      tags TEXT DEFAULT '[]',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create Credentials table
  client.exec(`
    CREATE TABLE IF NOT EXISTS credentials (
      id TEXT PRIMARY KEY,
      consumer_id TEXT REFERENCES consumers(id) ON DELETE CASCADE,
      credential_type TEXT NOT NULL,
      credential TEXT NOT NULL,
      tags TEXT DEFAULT '[]',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create indexes
  client.exec("CREATE INDEX IF NOT EXISTS idx_routes_service ON routes(service_id)");
  client.exec("CREATE INDEX IF NOT EXISTS idx_targets_upstream ON targets(upstream_id)");
  client.exec("CREATE INDEX IF NOT EXISTS idx_plugins_service ON plugins(service_id)");
  client.exec("CREATE INDEX IF NOT EXISTS idx_plugins_route ON plugins(route_id)");
  client.exec("CREATE INDEX IF NOT EXISTS idx_plugins_consumer ON plugins(consumer_id)");
  client.exec("CREATE INDEX IF NOT EXISTS idx_credentials_consumer ON credentials(consumer_id)");
}
