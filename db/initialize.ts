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
    db.prepare(`
      CREATE TABLE IF NOT EXISTS article_likes (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        visitor_hash TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS article_likes_post_visitor_unique ON article_likes (post_id, visitor_hash)"),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS article_comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        public_id TEXT NOT NULL,
        post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        parent_id INTEGER REFERENCES article_comments(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        body TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS article_comments_public_id_unique ON article_comments (public_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_article_comments_post_created ON article_comments (post_id, created_at)"),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS comment_reactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        comment_id INTEGER NOT NULL REFERENCES article_comments(id) ON DELETE CASCADE,
        visitor_hash TEXT NOT NULL,
        reaction TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS comment_reactions_comment_visitor_unique ON comment_reactions (comment_id, visitor_hash)"),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS engagement_rate_limits (
        key TEXT PRIMARY KEY NOT NULL,
        count INTEGER NOT NULL,
        expires_at TEXT NOT NULL
      )
    `),
  ]);

  const columns = await db.prepare("PRAGMA table_info(contact_messages)").all<{ name: string }>();
  if (!columns.results.some((column) => column.name === "read_at")) {
    await db.prepare("ALTER TABLE contact_messages ADD COLUMN read_at TEXT").run();
  }

  const postColumns = await db.prepare("PRAGMA table_info(posts)").all<{ name: string }>();
  if (!postColumns.results.some((column) => column.name === "comments_enabled")) {
    await db.prepare("ALTER TABLE posts ADD COLUMN comments_enabled INTEGER DEFAULT 1 NOT NULL").run();
  }
}
