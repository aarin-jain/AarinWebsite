let initialization: Promise<void> | undefined;

export function initializeDatabase(db: D1Database): Promise<void> {
  if (!initialization) {
    initialization = createSchema(db).catch((error) => {
      initialization = undefined;
      throw error;
    });
  }

  return initialization;
}

async function createSchema(db: D1Database): Promise<void> {
  await db.batch([
    db.prepare(`
      CREATE TABLE IF NOT EXISTS contact_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        message TEXT NOT NULL,
        read_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        title TEXT NOT NULL,
        slug TEXT NOT NULL,
        excerpt TEXT DEFAULT '' NOT NULL,
        content TEXT NOT NULL,
        status TEXT DEFAULT 'draft' NOT NULL,
        author_id TEXT NOT NULL,
        published_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS posts_slug_unique ON posts (slug)"),
  ]);

  const columns = await db.prepare("PRAGMA table_info(contact_messages)").all<{ name: string }>();
  if (!columns.results.some((column) => column.name === "read_at")) {
    await db.prepare("ALTER TABLE contact_messages ADD COLUMN read_at TEXT").run();
  }
}
