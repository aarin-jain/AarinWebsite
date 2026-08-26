CREATE TABLE `article_comments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`public_id` text NOT NULL,
	`post_id` integer NOT NULL,
	`parent_id` integer,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`body` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `article_comments_public_id_unique` ON `article_comments` (`public_id`);--> statement-breakpoint
CREATE INDEX `idx_article_comments_post_created` ON `article_comments` (`post_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `article_likes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`post_id` integer NOT NULL,
	`visitor_hash` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `article_likes_post_visitor_unique` ON `article_likes` (`post_id`,`visitor_hash`);--> statement-breakpoint
CREATE TABLE `comment_reactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`comment_id` integer NOT NULL,
	`visitor_hash` text NOT NULL,
	`reaction` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`comment_id`) REFERENCES `article_comments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `comment_reactions_comment_visitor_unique` ON `comment_reactions` (`comment_id`,`visitor_hash`);--> statement-breakpoint
CREATE TABLE `engagement_rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `posts` ADD `comments_enabled` integer DEFAULT true NOT NULL;