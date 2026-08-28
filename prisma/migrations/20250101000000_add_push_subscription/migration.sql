-- AlterTable
ALTER TABLE `notifications` MODIFY `message` VARCHAR(191) NOT NULL;

-- CreateTable
CREATE TABLE `push_subscriptions` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `endpoint` VARCHAR(512) NOT NULL,
    `keys` JSON NOT NULL,
    `expires_at` DATETIME NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `push_subscriptions_endpoint_key`(`endpoint`),
    INDEX `push_subscriptions_user_id_fkey`(`user_id`),
    CONSTRAINT `push_subscriptions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET `utf8mb4` COLLATE `utf8mb4_unicode_ci`;

-- CreateIndex
CREATE INDEX `push_subscriptions_user_id_fkey` ON `push_subscriptions`(`user_id`);
