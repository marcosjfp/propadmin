CREATE TABLE IF NOT EXISTS `properties` (
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
	`zipCode` varchar(10) NOT NULL,
	`status` enum('ativa','vendida','alugada','inativa') NOT NULL DEFAULT 'ativa',
	`agentId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `properties_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `property_images` (
	`id` int AUTO_INCREMENT NOT NULL,
	`propertyId` int NOT NULL,
	`url` longtext NOT NULL,
	`filename` varchar(255) NOT NULL,
	`originalName` varchar(255) NOT NULL,
	`mimeType` varchar(50) NOT NULL,
	`size` int NOT NULL,
	`isPrimary` boolean NOT NULL DEFAULT false,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `property_images_id` PRIMARY KEY(`id`)
);

ALTER TABLE `commissions` ADD CONSTRAINT `commissions_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `commissions` ADD CONSTRAINT `commissions_agentId_users_id_fk` FOREIGN KEY (`agentId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `properties` ADD CONSTRAINT `properties_agentId_users_id_fk` FOREIGN KEY (`agentId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `property_images` ADD CONSTRAINT `property_images_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE cascade ON UPDATE no action;
