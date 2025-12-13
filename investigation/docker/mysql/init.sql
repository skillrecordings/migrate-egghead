-- Coursebuilder Test Database Schema
-- MySQL 8 compatible initialization script
-- Tables prefixed with egghead_ to match PlanetScale structure

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- Drop tables if they exist (for clean re-init)
DROP TABLE IF EXISTS `egghead_ContentResourceResource`;
DROP TABLE IF EXISTS `egghead_ContentResource`;
DROP TABLE IF EXISTS `egghead_User`;
DROP TABLE IF EXISTS `_migration_lesson_map`;
DROP TABLE IF EXISTS `_migration_course_map`;
DROP TABLE IF EXISTS `_migration_tag_map`;

-- ============================================================================
-- User Table
-- ============================================================================
CREATE TABLE `egghead_User` (
  `id` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `name` VARCHAR(255) DEFAULT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `egghead_User_email_unique` (`email`),
  KEY `egghead_User_email_idx` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- ContentResource Table
-- Main content entity (lessons, courses, videos, posts)
-- ============================================================================
CREATE TABLE `egghead_ContentResource` (
  `id` VARCHAR(255) NOT NULL,
  `type` VARCHAR(255) NOT NULL,
  `createdById` VARCHAR(255) NOT NULL,
  `fields` JSON DEFAULT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deletedAt` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `egghead_ContentResource_type_idx` (`type`),
  KEY `egghead_ContentResource_createdById_idx` (`createdById`),
  KEY `egghead_ContentResource_createdAt_idx` (`createdAt`),
  KEY `egghead_ContentResource_deletedAt_idx` (`deletedAt`),
  CONSTRAINT `egghead_ContentResource_createdById_fkey` 
    FOREIGN KEY (`createdById`) 
    REFERENCES `egghead_User` (`id`) 
    ON DELETE RESTRICT 
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- ContentResourceResource Table (many-to-many relationships)
-- Links resources together (e.g., lessons to courses)
-- ============================================================================
CREATE TABLE `egghead_ContentResourceResource` (
  `resourceOfId` VARCHAR(255) NOT NULL,
  `resourceId` VARCHAR(255) NOT NULL,
  `position` INT NOT NULL DEFAULT 0,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`resourceOfId`, `resourceId`),
  KEY `egghead_ContentResourceResource_resourceId_idx` (`resourceId`),
  KEY `egghead_ContentResourceResource_position_idx` (`position`),
  CONSTRAINT `egghead_ContentResourceResource_resourceOfId_fkey` 
    FOREIGN KEY (`resourceOfId`) 
    REFERENCES `egghead_ContentResource` (`id`) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE,
  CONSTRAINT `egghead_ContentResourceResource_resourceId_fkey` 
    FOREIGN KEY (`resourceId`) 
    REFERENCES `egghead_ContentResource` (`id`) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- ID Mapping Tables for URL Redirects
-- Maps legacy Rails IDs to new Coursebuilder IDs for redirect handling
-- ============================================================================

CREATE TABLE `_migration_tag_map` (
  `rails_id` INT NOT NULL PRIMARY KEY,
  `cb_id` VARCHAR(255) NOT NULL,
  `rails_name` VARCHAR(255),
  `rails_slug` VARCHAR(255),
  INDEX `idx_cb_id` (`cb_id`),
  INDEX `idx_rails_slug` (`rails_slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `_migration_course_map` (
  `rails_id` INT NOT NULL PRIMARY KEY,
  `cb_id` VARCHAR(255) NOT NULL,
  `rails_title` VARCHAR(500),
  `rails_slug` VARCHAR(255),
  `source_table` ENUM('series', 'playlists') DEFAULT 'series',
  INDEX `idx_cb_id` (`cb_id`),
  INDEX `idx_rails_slug` (`rails_slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `_migration_lesson_map` (
  `rails_id` INT NOT NULL PRIMARY KEY,
  `cb_id` VARCHAR(255) NOT NULL,
  `rails_title` VARCHAR(500),
  `rails_slug` VARCHAR(255),
  `video_resource_id` VARCHAR(255),
  INDEX `idx_cb_id` (`cb_id`),
  INDEX `idx_rails_slug` (`rails_slug`),
  INDEX `idx_video` (`video_resource_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- Grants (if needed for specific user access)
-- ============================================================================
-- GRANT ALL PRIVILEGES ON coursebuilder_test.* TO 'testuser'@'%';
-- FLUSH PRIVILEGES;
