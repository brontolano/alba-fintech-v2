-- AlterTable
ALTER TABLE `transactions` ADD COLUMN `photo_url` VARCHAR(191) NULL;

-- The photoUrl field is optional. Existing transactions will have NULL photo_url.
