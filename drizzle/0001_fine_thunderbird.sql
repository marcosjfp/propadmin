CREATE TABLE `commissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`propertyId` int NOT NULL,
	`agentId` int NOT NULL,
	`transactionType` enum('venda','aluguel') NOT NULL,
	`transactionAmount` int NOT NULL,
	`commissionRate` int NOT NULL,
	`commissionAmount` int NOT NULL,
	`status` enum('pendente','paga','cancelada') NOT NULL DEFAULT 'pendente',
	`paymentDate` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `commissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `properties` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`type` enum('apartamento','casa','terreno','comercial','outro') NOT NULL,
	`transactionType` enum('venda','aluguel') NOT NULL,
	`price` int NOT NULL,
	`size` int NOT NULL,
	`rooms` int NOT NULL,
	`bathrooms` int NOT NULL,
	`hasBackyard` boolean NOT NULL DEFAULT false,
	`hasLivingRoom` boolean NOT NULL DEFAULT true,
	`hasKitchen` boolean NOT NULL DEFAULT true,
	`address` text NOT NULL,
	`city` varchar(100) NOT NULL,
	`state` varchar(2) NOT NULL,
	`zipCode` varchar(10),
	`agentId` int NOT NULL,
	`status` enum('ativa','vendida','alugada','inativa') NOT NULL DEFAULT 'ativa',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `properties_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','agent','admin') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(20);--> statement-breakpoint
ALTER TABLE `users` ADD `isAgent` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `creci` varchar(50);