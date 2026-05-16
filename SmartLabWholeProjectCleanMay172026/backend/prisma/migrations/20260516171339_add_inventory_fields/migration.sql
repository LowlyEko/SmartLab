-- CreateTable
CREATE TABLE `users` (
    `user_id` INTEGER NOT NULL AUTO_INCREMENT,
    `student_number` VARCHAR(191) NULL,
    `username` VARCHAR(191) NOT NULL,
    `first_name` VARCHAR(191) NOT NULL,
    `middle_name` VARCHAR(191) NULL,
    `last_name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(191) NULL,
    `contact_number` VARCHAR(191) NULL,
    `college` VARCHAR(191) NULL,
    `user_type` ENUM('STUDENT', 'LABORATORY_STAFF', 'LABORATORY_CHEMIST', 'ADMIN') NOT NULL DEFAULT 'STUDENT',
    `year_level` INTEGER NULL,
    `section` VARCHAR(191) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_student_number_key`(`student_number`),
    UNIQUE INDEX `users_username_key`(`username`),
    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventory_items` (
    `item_id` INTEGER NOT NULL AUTO_INCREMENT,
    `category` ENUM('GLASSWARE', 'EQUIPMENT', 'APPARATUS', 'SUPPLY', 'CHEMICAL') NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `brand` VARCHAR(191) NULL,
    `location` VARCHAR(191) NULL,
    `amount` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `unit` VARCHAR(191) NULL,
    `serial_number` VARCHAR(191) NULL,
    `property_number` VARCHAR(191) NULL,
    `equipment_code` VARCHAR(191) NULL,
    `calibration_date` DATETIME(3) NULL,
    `calibration_freq` VARCHAR(191) NULL,
    `hazard` VARCHAR(191) NULL,
    `expiry_date` DATETIME(3) NULL,
    `status` ENUM('AVAILABLE', 'LOW_STOCK', 'OUT_OF_STOCK', 'DEFECTIVE', 'FOR_REPAIR', 'FOR_DISPOSAL') NOT NULL DEFAULT 'AVAILABLE',
    `remarks` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`item_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reservations` (
    `reservation_id` INTEGER NOT NULL AUTO_INCREMENT,
    `group_number` VARCHAR(191) NULL,
    `reserving_student` INTEGER NOT NULL,
    `professor_id` INTEGER NULL,
    `custodian_id` INTEGER NULL,
    `date_requested` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `date_needed` DATETIME(3) NOT NULL,
    `time_start` DATETIME(3) NOT NULL,
    `time_end` DATETIME(3) NOT NULL,
    `activity_title` VARCHAR(191) NULL,
    `status` ENUM('TO_REVIEW', 'ALLOWED', 'REJECTED', 'CONDITIONAL') NOT NULL DEFAULT 'TO_REVIEW',
    `conditions_note` VARCHAR(191) NULL,
    `rejection_reason` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`reservation_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reservation_members` (
    `member_id` INTEGER NOT NULL AUTO_INCREMENT,
    `reservation_id` INTEGER NOT NULL,
    `student_id` INTEGER NOT NULL,

    UNIQUE INDEX `reservation_members_reservation_id_student_id_key`(`reservation_id`, `student_id`),
    PRIMARY KEY (`member_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reservation_items` (
    `res_item_id` INTEGER NOT NULL AUTO_INCREMENT,
    `reservation_id` INTEGER NOT NULL,
    `item_id` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,

    PRIMARY KEY (`res_item_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `accountability` (
    `accountability_id` INTEGER NOT NULL AUTO_INCREMENT,
    `reservation_id` INTEGER NOT NULL,
    `responsible_student` INTEGER NOT NULL,
    `professor_id` INTEGER NULL,
    `custodian_id` INTEGER NULL,
    `item_id` INTEGER NOT NULL,
    `item_description` VARCHAR(191) NOT NULL,
    `specifics` VARCHAR(191) NULL,
    `quantity_broken` INTEGER NOT NULL DEFAULT 1,
    `date_time_broken` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `resolution_status` ENUM('PENDING', 'RESOLVED', 'OVERDUE') NOT NULL DEFAULT 'PENDING',
    `resolution_notes` VARCHAR(191) NULL,
    `date_replaced` DATETIME(3) NULL,
    `received_by` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`accountability_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `activity_log` (
    `log_id` INTEGER NOT NULL AUTO_INCREMENT,
    `actor_id` INTEGER NULL,
    `action` VARCHAR(191) NOT NULL,
    `target_table` VARCHAR(191) NULL,
    `target_id` INTEGER NULL,
    `details` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`log_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `reservations` ADD CONSTRAINT `reservations_reserving_student_fkey` FOREIGN KEY (`reserving_student`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reservation_members` ADD CONSTRAINT `reservation_members_reservation_id_fkey` FOREIGN KEY (`reservation_id`) REFERENCES `reservations`(`reservation_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reservation_members` ADD CONSTRAINT `reservation_members_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reservation_items` ADD CONSTRAINT `reservation_items_reservation_id_fkey` FOREIGN KEY (`reservation_id`) REFERENCES `reservations`(`reservation_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reservation_items` ADD CONSTRAINT `reservation_items_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `inventory_items`(`item_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `accountability` ADD CONSTRAINT `accountability_reservation_id_fkey` FOREIGN KEY (`reservation_id`) REFERENCES `reservations`(`reservation_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `accountability` ADD CONSTRAINT `accountability_responsible_student_fkey` FOREIGN KEY (`responsible_student`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `accountability` ADD CONSTRAINT `accountability_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `inventory_items`(`item_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `activity_log` ADD CONSTRAINT `activity_log_actor_id_fkey` FOREIGN KEY (`actor_id`) REFERENCES `users`(`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;
