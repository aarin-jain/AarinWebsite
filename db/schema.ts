import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex, index } from "drizzle-orm/sqlite-core";

export const contactMessages = sqliteTable("contact_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  message: text("message").notNull(),
  readAt: text("read_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const posts = sqliteTable("posts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  excerpt: text("excerpt").notNull().default(""),
  content: text("content").notNull(),
  status: text("status", { enum: ["draft", "published"] }).notNull().default("draft"),
  authorId: text("author_id").notNull(),
  publishedAt: text("published_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  commentsEnabled: integer("comments_enabled", { mode: "boolean" }).notNull().default(true),
});

export const articleLikes = sqliteTable("article_likes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  postId: integer("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  visitorHash: text("visitor_hash").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("article_likes_post_visitor_unique").on(table.postId, table.visitorHash)]);

export const articleComments = sqliteTable("article_comments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  publicId: text("public_id").notNull().unique(),
  postId: integer("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  parentId: integer("parent_id"),
  name: text("name").notNull(),
  email: text("email").notNull(),
  body: text("body").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_article_comments_post_created").on(table.postId, table.createdAt)]);

export const commentReactions = sqliteTable("comment_reactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  commentId: integer("comment_id").notNull().references(() => articleComments.id, { onDelete: "cascade" }),
  visitorHash: text("visitor_hash").notNull(),
  reaction: text("reaction", { enum: ["like", "dislike"] }).notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("comment_reactions_comment_visitor_unique").on(table.commentId, table.visitorHash)]);

export const engagementRateLimits = sqliteTable("engagement_rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  expiresAt: text("expires_at").notNull(),
});

export const expenseTransactions = sqliteTable("expense_transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  account: text("account").notNull(),
  paymentMethod: text("payment_method").notNull(),
  type: text("type", { enum: ["expense", "income", "transfer"] }).notNull(),
  amountCents: integer("amount_cents").notNull(),
  notes: text("notes").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_expense_transactions_date").on(table.date)]);

export const expenseBudgets = sqliteTable("expense_budgets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  category: text("category").notNull().unique(),
  monthlyCents: integer("monthly_cents").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
