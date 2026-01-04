-- Add foreign key constraints to establish relationships between tables

-- Add foreign key from properties.agentId to users.id
ALTER TABLE `properties` ADD CONSTRAINT `properties_agentId_users_id_fk` 
  FOREIGN KEY (`agentId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- Add foreign key from commissions.propertyId to properties.id
ALTER TABLE `commissions` ADD CONSTRAINT `commissions_propertyId_properties_id_fk` 
  FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- Add foreign key from commissions.agentId to users.id
ALTER TABLE `commissions` ADD CONSTRAINT `commissions_agentId_users_id_fk` 
  FOREIGN KEY (`agentId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- Create indexes for better query performance on foreign keys
CREATE INDEX `properties_agentId_idx` ON `properties`(`agentId`);
CREATE INDEX `commissions_propertyId_idx` ON `commissions`(`propertyId`);
CREATE INDEX `commissions_agentId_idx` ON `commissions`(`agentId`);
CREATE INDEX `commissions_status_idx` ON `commissions`(`status`);
