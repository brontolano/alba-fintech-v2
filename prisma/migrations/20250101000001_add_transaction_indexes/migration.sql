-- Add composite indexes for transaction query performance (reports, rekonsiliasi, trend charts)
SET FOREIGN_KEY_CHECKS=0;

CREATE INDEX `transactions_status_createdAt_idx` ON `transactions`(`status`, `created_at`);
CREATE INDEX `transactions_unitId_createdAt_idx` ON `transactions`(`unit_id`, `created_at`);
CREATE INDEX `transactions_type_createdAt_idx` ON `transactions`(`type`, `created_at`);

SET FOREIGN_KEY_CHECKS=0;
