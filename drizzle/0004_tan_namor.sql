CREATE TABLE `expense_budgets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`category` text NOT NULL,
	`monthly_cents` integer NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `expense_budgets_category_unique` ON `expense_budgets` (`category`);--> statement-breakpoint
CREATE TABLE `expense_transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`description` text NOT NULL,
	`category` text NOT NULL,
	`account` text NOT NULL,
	`payment_method` text NOT NULL,
	`type` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_expense_transactions_date` ON `expense_transactions` (`date`);