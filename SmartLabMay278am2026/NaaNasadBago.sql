-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: localhost    Database: smartlab_schema
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `accountability`
--

DROP TABLE IF EXISTS `accountability`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `accountability` (
  `accountability_id` int NOT NULL AUTO_INCREMENT,
  `student_id` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `student_name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `reservation_id` int DEFAULT NULL,
  `date_borrowed` date NOT NULL,
  `member_name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `materials_broken` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `prof_name` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `subject` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `time_start` time DEFAULT NULL,
  `time_end` time DEFAULT NULL,
  `program_course_section` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `deadline` date DEFAULT NULL,
  `remarks` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `date_replaced` date DEFAULT NULL,
  `received_by` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `email_stage` enum('none','student','professor','dean','resolved') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'none',
  `feedback_token` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `last_notified_at` timestamp NULL DEFAULT NULL,
  `prof_email` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `prof_responded_at` timestamp NULL DEFAULT NULL,
  `prof_response` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `resolved` tinyint(1) NOT NULL DEFAULT '0',
  `resolved_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`accountability_id`),
  UNIQUE KEY `accountability_feedback_token_key` (`feedback_token`),
  KEY `fk_accountability_reservation` (`reservation_id`),
  KEY `fk_accountability_admin` (`received_by`),
  KEY `idx_accountability_student` (`student_id`),
  KEY `idx_accountability_stage` (`email_stage`),
  KEY `idx_accountability_resolved` (`resolved`),
  CONSTRAINT `fk_accountability_admin` FOREIGN KEY (`received_by`) REFERENCES `admin` (`admin_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_accountability_reservation` FOREIGN KEY (`reservation_id`) REFERENCES `reservation` (`reservation_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_accountability_student` FOREIGN KEY (`student_id`) REFERENCES `student` (`student_id`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `accountability`
--

LOCK TABLES `accountability` WRITE;
/*!40000 ALTER TABLE `accountability` DISABLE KEYS */;
INSERT INTO `accountability` VALUES (16,'2024-00392',NULL,1,'2026-05-23','12','12','12','12','10:04:00','22:04:00','12',NULL,'Resolved','2026-05-23',NULL,'2026-05-22 22:04:21','2026-05-22 22:14:29','resolved',NULL,'2026-05-22 22:07:51','adlaongaming5th@gmail.com','2026-05-22 22:07:48','Signed off via email link',1,'2026-05-22 22:09:21'),(17,'2024-00392',NULL,2,'2026-05-23','12','12','12','12','18:33:00','06:33:00','12',NULL,'Resolved','2026-05-23',NULL,'2026-05-22 22:33:33','2026-05-22 22:35:05','resolved',NULL,'2026-05-22 22:34:04','adlaongaming5th@gmail.com','2026-05-22 22:34:02','Signed off via email link',1,'2026-05-22 22:35:05'),(18,'2024-00392',NULL,2,'2026-05-26','1223134','Aluminum Pan','12','12','17:37:00','05:37:00','12',NULL,'Resolved','2026-05-26',NULL,'2026-05-26 05:38:02','2026-05-26 13:25:49','resolved','e1fb1702b35fbd1afb5ce3671527a0df2ab37fe8f86a57bf6020552a44f7b9c2','2026-05-26 05:38:06','adlaongaming5th@gmail.com',NULL,NULL,1,'2026-05-26 05:54:58'),(22,'2024-00392',NULL,14,'2026-05-27','21','1','12','12','05:33:00','17:33:00','12','2026-05-27','Resolved','2026-05-26',NULL,'2026-05-26 13:34:10','2026-05-26 13:39:43','resolved',NULL,'2026-05-26 13:35:25','adlaongaming5th@gmail.com','2026-05-26 13:35:22','Signed off via email link',1,'2026-05-26 13:38:24');
/*!40000 ALTER TABLE `accountability` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `accountability_logs`
--

DROP TABLE IF EXISTS `accountability_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `accountability_logs` (
  `log_id` int NOT NULL AUTO_INCREMENT,
  `accountability_id` int NOT NULL,
  `stage` enum('none','student','professor','dean','resolved') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `action` enum('email_sent','response_received','escalated','resolved','reopened','note_added') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `notes` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `performed_by` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`log_id`),
  KEY `idx_log_accountability` (`accountability_id`),
  CONSTRAINT `fk_log_accountability` FOREIGN KEY (`accountability_id`) REFERENCES `accountability` (`accountability_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `accountability_logs`
--

LOCK TABLES `accountability_logs` WRITE;
/*!40000 ALTER TABLE `accountability_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `accountability_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `accountability_members`
--

DROP TABLE IF EXISTS `accountability_members`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `accountability_members` (
  `id` int NOT NULL AUTO_INCREMENT,
  `accountability_id` int NOT NULL,
  `member_name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `member_order` tinyint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_am_accountability` (`accountability_id`),
  CONSTRAINT `fk_am_accountability` FOREIGN KEY (`accountability_id`) REFERENCES `accountability` (`accountability_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `accountability_members`
--

LOCK TABLES `accountability_members` WRITE;
/*!40000 ALTER TABLE `accountability_members` DISABLE KEYS */;
/*!40000 ALTER TABLE `accountability_members` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `admin`
--

DROP TABLE IF EXISTS `admin`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin` (
  `admin_id` int NOT NULL AUTO_INCREMENT,
  `first_name` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_name` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`admin_id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admin`
--

LOCK TABLES `admin` WRITE;
/*!40000 ALTER TABLE `admin` DISABLE KEYS */;
INSERT INTO `admin` VALUES (1,'Admin1','Admin','admin1@cas.com','$2a$10$eVB0KFzth6OrQ6dj3HAh2O695TawMpb7UtErGuvULw4yD.3jcqMPS','laboratory_staff',1,'2026-05-19 20:54:59','2026-05-19 20:54:59'),(2,'Admin2','Admin','admin2@cas.com','$2a$10$WzsL23qwh3FVDJnnuaRo/uEEzPg279f9YaMDOJJepaJQrcwyVnr8m','laboratory_chemist',1,'2026-05-19 20:55:32','2026-05-19 20:55:32'),(3,'Admin3','Admin','admin3@cas.com','$2a$10$SlnnjFdUn3mKhEQiJ6ph/O9aWP.aQ7K7COFvwvMlCjNeQaOQHL9hW','laboratory_staff',1,'2026-05-19 20:56:03','2026-05-19 20:56:03'),(4,'Adlaon','Luke','adlaongaming76@gmail.com','$2a$10$C8m0C5IGDDaIldWRzExRPePiMx2RT.yzhGByK/h9sGRtlK.pUCu66','laboratory_chemist',1,'2026-05-20 05:30:22','2026-05-20 05:30:22');
/*!40000 ALTER TABLE `admin` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `calendar_events`
--

DROP TABLE IF EXISTS `calendar_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `calendar_events` (
  `event_id` int unsigned NOT NULL AUTO_INCREMENT,
  `label` varchar(255) NOT NULL,
  `date` date NOT NULL,
  `type` varchar(20) NOT NULL DEFAULT 'man',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`event_id`),
  KEY `idx_calendar_date` (`date`),
  KEY `fk_calendar_admin` (`created_by`),
  CONSTRAINT `fk_calendar_admin` FOREIGN KEY (`created_by`) REFERENCES `admin` (`admin_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `calendar_events`
--

LOCK TABLES `calendar_events` WRITE;
/*!40000 ALTER TABLE `calendar_events` DISABLE KEYS */;
INSERT INTO `calendar_events` VALUES (1,'wla','2026-05-27','man',NULL,'2026-05-26 13:02:02');
/*!40000 ALTER TABLE `calendar_events` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inventory_apparatus`
--

DROP TABLE IF EXISTS `inventory_apparatus`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventory_apparatus` (
  `apparatus_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `apparatus_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location_id` bigint unsigned NOT NULL,
  `remarks` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `quantity` int NOT NULL DEFAULT '0',
  `brand` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`apparatus_id`),
  KEY `fk_apparatus_location` (`location_id`),
  CONSTRAINT `fk_apparatus_location` FOREIGN KEY (`location_id`) REFERENCES `locations` (`location_id`)
) ENGINE=InnoDB AUTO_INCREMENT=124 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventory_apparatus`
--

LOCK TABLES `inventory_apparatus` WRITE;
/*!40000 ALTER TABLE `inventory_apparatus` DISABLE KEYS */;
INSERT INTO `inventory_apparatus` VALUES (1,'Alcohol lamp',NULL,2,NULL,29,NULL),(2,'Alligator clips',NULL,2,'(1) damaged',0,NULL),(3,'Aluminum Pan',NULL,2,NULL,24,NULL),(4,'Ammeter',NULL,2,NULL,11,NULL),(5,'Aspirator',NULL,2,NULL,23,NULL),(7,'Bunsen burner',NULL,2,NULL,17,NULL),(8,'Burette brush',NULL,2,NULL,21,NULL),(9,'Burette clamp',NULL,2,NULL,17,NULL),(10,'Calorimeter',NULL,2,NULL,18,NULL),(11,'Claw clamp',NULL,2,NULL,40,NULL),(12,'Clay triangle',NULL,2,NULL,71,NULL),(13,'Compass',NULL,2,'DEFECTIVE',59,NULL),(14,'Crucible tong',NULL,2,NULL,66,NULL),(15,'Crucible w/ cover','30 mL',2,'107 Crucible; 90 Cover',0,NULL),(16,'Desiccator',NULL,3,'4 with cap, 2 no cap',0,NULL),(17,'Dissecting Set: Diamond needle',NULL,2,NULL,11,NULL),(18,'Dissecting Set: Forceps',NULL,2,NULL,26,NULL),(19,'Dissecting Set: Kelly Forceps',NULL,2,NULL,5,NULL),(20,'Dissecting Set: Knife',NULL,2,NULL,15,NULL),(21,'Dissecting Set: Magnifying Glass',NULL,2,NULL,19,NULL),(22,'Dissecting Set: Probe',NULL,2,NULL,18,NULL),(23,'Dissecting Set: Scalpel','Stainless steel holder',2,NULL,26,NULL),(24,'Dissecting Set: Scalpel','Black plastic holder',2,NULL,15,NULL),(25,'Dissecting Set: Scalpel holder','#3',2,NULL,20,NULL),(26,'Dissecting Set: Scalpel holder','#4',2,NULL,12,NULL),(27,'Dissecting Set: scissor',NULL,2,NULL,30,NULL),(28,'Dissecting Set: Section Lifter',NULL,2,NULL,26,NULL),(29,'Dissecting Set: spatula',NULL,2,NULL,30,NULL),(30,'Dissecting Pan',NULL,2,NULL,20,NULL),(31,'Dissolved Oxygen Meter',NULL,1,NULL,3,NULL),(32,'Double beam balance',NULL,2,'needs to be calibrated',12,NULL),(33,'Dynamic Cart',NULL,2,NULL,12,NULL),(34,'Evaporating dish','60 mL',2,NULL,38,NULL),(35,'Evaporating dish','75 mL',2,NULL,12,NULL),(36,'Evaporating dish','100 mL',2,NULL,39,NULL),(37,'Evaporating dish','125 mL',2,NULL,1,NULL),(38,'Evaporating dish','270 mL',2,NULL,1,NULL),(39,'Extension clamp',NULL,2,NULL,26,NULL),(40,'Friction Board',NULL,2,NULL,12,NULL),(41,'Friction Table',NULL,2,NULL,17,NULL),(42,'Force table',NULL,2,NULL,44,NULL),(43,'Funnel holder',NULL,2,NULL,41,NULL),(44,'Hand Refractometer',NULL,1,NULL,5,NULL),(45,'Hand Tally Meter',NULL,1,NULL,2,NULL),(46,'Hemacytometer',NULL,1,NULL,7,NULL),(47,'Hygrometer',NULL,2,NULL,36,NULL),(48,'Inclined plane',NULL,2,NULL,4,NULL),(49,'Iron clamp',NULL,2,'4 Working; 17 Not Working Needs to procure',21,NULL),(50,'Iron ring',NULL,2,NULL,46,NULL),(51,'Laboratory spoon','Plastic',2,NULL,9,NULL),(52,'Laboratory spoon','Stainless steel',2,NULL,8,NULL),(53,'Magnet','Horse shoe, red & blue poles',2,NULL,12,NULL),(54,'Magnet','Straight, red & blue poles',2,NULL,51,NULL),(55,'Magnet','Gray poles',2,NULL,6,NULL),(56,'Magnet','Red poles',2,NULL,2,NULL),(57,'Magnet','Bars',2,'9 unopened',11,NULL),(58,'Magnetic compass',NULL,2,NULL,8,NULL),(59,'Magnifying glass','Black plastic holder',2,NULL,52,NULL),(60,'Magnifying glass','Metal holder',2,NULL,15,NULL),(61,'Metal Soil Borer',NULL,1,NULL,1,NULL),(62,'Meter stick','Yellow',2,NULL,36,NULL),(63,'Meter stick','Brown',2,'Old',28,NULL),(64,'Mirror',NULL,2,NULL,4,NULL),(65,'Mortar and pestle',NULL,2,'86 Mortars; 108 Pestles',0,NULL),(66,'Multitester',NULL,2,'9 Sanwa; 8 Creston',17,NULL),(67,'Ocular micrometer',NULL,1,NULL,3,NULL),(68,'Pantograph',NULL,2,NULL,28,NULL),(69,'Pinch Cock Clamp',NULL,2,NULL,32,NULL),(70,'Pipette tip box/rack','for 1000µl',5,NULL,1,NULL),(71,'Pipette tip box/rack','for 200µl',5,NULL,1,NULL),(72,'Pipette tip box/rack','for 10µl',1,NULL,3,NULL),(73,'Pipettor','2µ-20µl',1,NULL,1,NULL),(74,'Pipettor','20µ-200µl',1,NULL,1,NULL),(75,'Pipettor','100µ-1000µl',1,NULL,1,NULL),(76,'Prism',NULL,2,NULL,18,NULL),(77,'Protractor',NULL,2,NULL,21,NULL),(78,'Psychrometer',NULL,1,NULL,10,NULL),(79,'Pulley',NULL,2,NULL,64,NULL),(80,'Ruler','Plastic',2,NULL,45,NULL),(81,'Salinometer',NULL,2,NULL,23,NULL),(82,'Scissors','Black plastic holder',2,NULL,15,NULL),(83,'Secchi disk',NULL,1,NULL,1,NULL),(84,'Set of Weights','1 gram - 100 grams',2,NULL,1,NULL),(85,'Set of Weights','10 grams - 200 grams',2,NULL,6,NULL),(86,'Set of Weights','10 grams - 1 kg',2,NULL,6,NULL),(87,'Set of Weights','5 grams - 500 grams',2,'Weights are not complete',6,NULL),(88,'Set of Weights','Slotted weights',2,NULL,1,NULL),(89,'Sieve','5-50µm',1,NULL,1,NULL),(90,'Sieve','25µm',1,NULL,1,NULL),(91,'Sieve','38µm',1,NULL,1,NULL),(92,'Sieve','45µm',1,NULL,1,NULL),(93,'Sieve','63µm',1,NULL,1,NULL),(94,'Sieve','75µm',1,NULL,1,NULL),(95,'Sieve','0.560mm',1,NULL,1,NULL),(96,'Slide Staining Glass Jar',NULL,1,NULL,0,NULL),(97,'Slide Trays',NULL,1,NULL,10,NULL),(98,'Spatula',NULL,2,NULL,49,NULL),(99,'Spoonula',NULL,2,NULL,3,NULL),(100,'Spring balance','5N',2,NULL,20,NULL),(101,'Spring balance','8N - 10 N',2,NULL,4,NULL),(102,'Spring balance','20 N',2,NULL,10,NULL),(103,'Stage micrometer',NULL,1,NULL,6,NULL),(104,'Test tube brush',NULL,2,NULL,123,NULL),(105,'Test tube holder',NULL,2,NULL,191,NULL),(106,'Test tube rack',NULL,2,NULL,77,NULL),(107,'Thermometer','Alcohol',2,NULL,18,NULL),(108,'Thermometer','Mercury',2,NULL,40,NULL),(109,'Transect tape',NULL,2,NULL,6,NULL),(110,'Triangular file',NULL,2,NULL,4,NULL),(111,'Triple beam balance',NULL,2,'needs to be calibrated',8,NULL),(112,'Tripod',NULL,2,NULL,15,NULL),(113,'Tuning Fork',NULL,2,NULL,40,NULL),(114,'Vernier caliper',NULL,2,'23 in box; 26 opened',49,NULL),(115,'Voltmeter',NULL,2,NULL,15,NULL),(116,'Wash bottle',NULL,2,NULL,16,NULL),(117,'Waterbath',NULL,2,NULL,15,NULL),(118,'Weight hanger',NULL,2,NULL,37,NULL),(119,'Wire gauze',NULL,2,NULL,92,NULL),(120,'Wire stirrer',NULL,2,NULL,5,NULL),(121,'Wooden block',NULL,2,NULL,58,NULL),(123,'1','1234513',2,'12213423231134',122,'12123441');
/*!40000 ALTER TABLE `inventory_apparatus` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inventory_chemicals`
--

DROP TABLE IF EXISTS `inventory_chemicals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventory_chemicals` (
  `chemical_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `barcode` bigint DEFAULT NULL,
  `item_code` int DEFAULT NULL,
  `location` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `date_in` date DEFAULT NULL,
  `expiration_date` date DEFAULT NULL,
  `chemical_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `brand_manufacturer` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cas_no` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `storage_group` int DEFAULT NULL,
  `state` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `hazard` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remarks` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `container_size` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `quantity` int DEFAULT NULL,
  PRIMARY KEY (`chemical_id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventory_chemicals`
--

LOCK TABLES `inventory_chemicals` WRITE;
/*!40000 ALTER TABLE `inventory_chemicals` DISABLE KEYS */;
INSERT INTO `inventory_chemicals` VALUES (1,8902729589342,2,'E-215-CSLB CABINET A','2025-12-15',NULL,'Copper(II) sulphate AR','Techno Pharmachem','7758-99-8',NULL,'S','I, ET','unopened','500g',500),(2,8902729589342,3,'E-215-CSLB CABINET A','2025-12-15',NULL,'Copper(II) sulphate AR','Techno Pharmachem','7758-99-8',NULL,'S','I, ET','unopened','500g',500),(3,8902729589342,4,'E-215-CSLB CABINET A','2025-12-15',NULL,'Copper(II) sulphate AR','Techno Pharmachem','7758-99-8',NULL,'S','I, ET','unopened','500g',500),(4,8902729512876,5,'E-215-CSLB CABINET A','2024-10-10',NULL,'EDTA, disodium salt dihydrate','Himedia','6381-92-6',NULL,'S',NULL,'unopened','500g',500),(5,8902729589366,6,'E-215-CSLB CABINET A','2024-10-10',NULL,'EDTA, free acid, Hi-LR','Himedia','60-00-4',NULL,'S','I','unopened','500g',500),(6,NULL,7,'E-215-CSLB CABINET A','2023-11-03',NULL,'Ferric sulfate',NULL,'10028-22-5',NULL,'S','I',NULL,'500g',200),(7,928379,8,'E-215-CSLB CABINET A','2023-11-03','2023-03-01','Iron(III) chloride ferrice, anhydrous','Labmerck','7705-08-0',NULL,'S','I, CO, AT',NULL,'500g',450);
/*!40000 ALTER TABLE `inventory_chemicals` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inventory_equipment`
--

DROP TABLE IF EXISTS `inventory_equipment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventory_equipment` (
  `equipment_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `equipment_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `brand` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `model` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `serial_no` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `property_number` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `equipment_code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location_id` bigint unsigned NOT NULL,
  `calibration_date` date DEFAULT NULL,
  `calibration_frequency` enum('Annual','Semi-Annual','Monthly','As Needed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('FUNCTIONAL','NOT FUNCTIONAL','FOR REPAIR','NEW') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'FUNCTIONAL',
  `remarks` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `quantity` int NOT NULL DEFAULT '1',
  PRIMARY KEY (`equipment_id`),
  KEY `fk_equipment_location` (`location_id`),
  CONSTRAINT `fk_equipment_location` FOREIGN KEY (`location_id`) REFERENCES `locations` (`location_id`)
) ENGINE=InnoDB AUTO_INCREMENT=125 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventory_equipment`
--

LOCK TABLES `inventory_equipment` WRITE;
/*!40000 ALTER TABLE `inventory_equipment` DISABLE KEYS */;
INSERT INTO `inventory_equipment` VALUES (1,'Analytical Balance','SHIMADZU','ATY224','D307521295','236-02-2013-03-00-1969',NULL,5,'2023-01-19','Annual','FUNCTIONAL','FUNCTIONAL - Max. 220g',1),(2,'Analytical Balance','SHIMADZU','ATY224','D307521294','236-02-2013-03-00-1968',NULL,5,'2023-01-19','Annual','FUNCTIONAL','FUNCTIONAL - Max. 220g',1),(3,'Analytical Balance','OHAUS','PA214','1290330407',NULL,NULL,5,'2023-01-19','Annual','FUNCTIONAL','FUNCTIONAL - Max. 210g',1),(4,'Analytical Balance','OHAUS','AR2130','1225070114','236-02-2013-03-00-1967',NULL,5,'2023-01-19','Annual','FUNCTIONAL','FUNCTIONAL - Max. 210g - Lacks power cord',1),(5,'Atomic Absorption Spectrophotometer (AAS)','SHIMADZU','AA-7000','A309251','164233090001',NULL,1,'2023-09-01','Annual','FUNCTIONAL','FUNCTIONAL',1),(6,'Binocular Compound Microscope','AMSCOPE','B490B','1144748-2','164233020029','051A',1,'2023-11-01','Annual','FOR REPAIR','FOR REPAIR - Coarse adjustment knob not working',1),(7,'Binocular Compound Microscope','AMSCOPE','B490B','1144748-15','164233020031','052A',1,'2021-11-25','Annual','FOR REPAIR','FOR REPAIR Coarse adjustment knob not working',1),(8,'Binocular Compound Microscope','AMSCOPE','B490B','1144748-12','164233020025','053A',1,'2021-11-25','Annual','FOR REPAIR','FOR REPAIR - Loose coarse adjustment knob',1),(9,'Binocular Compound Microscope','AMSCOPE','B490B','1144748-8','164233020024','054A',1,NULL,'Annual','FOR REPAIR','FOR REPAIR - Coarse adjustment knob not working - HPO not working',1),(10,'Binocular Compound Microscope','AMSCOPE','B490B','1144748-5','236-02-2013-03-00-1995','055A',1,'2023-11-01','Annual','FOR REPAIR','FOR REPAIR - Can\'t focus',1),(11,'Binocular Compound Microscope','AMSCOPE','B490B','1144748-13','236-02-2013-03-00-1996','056A',1,'2023-11-01','Annual','FUNCTIONAL','FUNCTIONAL - No HPO',1),(12,'Binocular Compound Microscope','AMSCOPE','B490B','1144748-9','164233020022','057A',1,'2023-11-01','Annual','FOR REPAIR','FOR REPAIR - Fine adjustment knob damage - Only Scanner is the functional objective',1),(13,'Binocular Compound Microscope','AMSCOPE','B490B','1144748-3','236-02-2013-03-00-1990','058A',1,'2023-11-01','Annual','FUNCTIONAL','FUNCTIONAL',1),(14,'Binocular Compound Microscope','AMSCOPE','B490B','1144748-14','236-02-2013-03-00-1993','059A',1,'2023-11-01','Annual','FOR REPAIR','FOR REPAIR - Loose coarse adjustment knob',1),(15,'Binocular Compound Microscope','AMSCOPE','B490B','1144748-6','164233020026','060A',1,'2023-11-01','Annual','FOR REPAIR','FOR REPAIR - Damaged knob - Not turning on',1),(16,'Binocular Compound Microscope','AMSCOPE','B490B','1144748-4','236-02-2013-03-00-1987','061A',1,'2021-11-25','Annual','FOR REPAIR','FOR REPAIR - Loose coarse adjustment knob',1),(17,'Binocular Compound Microscope','AMSCOPE','B490B','1144748-11','236-02-2013-03-00-1986','062A',1,'2023-11-01','Annual','FOR REPAIR','FOR REPAIR - Not turning on - Coarse adjusment knob not working',1),(18,'Binocular Compound Microscope','AMSCOPE','B490B','1144748-7','236-02-2013-03-00-1984','063A',1,'2021-11-25','Annual','FOR REPAIR','FOR REPAIR - Loose coarse adjustment knob',1),(19,'Binocular Compound Microscope','AMSCOPE','B490B','1144748-10','236-02-2013-03-00-1985','064A',1,'2023-11-01','Annual','FOR REPAIR','FOR REPAIR - Loose coarse adjustment knob',1),(20,'Binocular Compound Microscope','AMSCOPE','B490B','1144748-1','236-02-2013-03-00-1998','065A',1,'2023-11-01','Annual','FUNCTIONAL','FUNCTIONAL',1),(21,'Binocular Compound Microscope','SPECTRUM',NULL,'SPEC 003','236-02-2013-03-00-2028','089A',1,NULL,'Annual','FOR REPAIR','FOR REPAIR - Not turning on',1),(22,'Binocular Compound Microscope','SPECTRUM',NULL,'SPEC 001','236-02-2013-03-00-2029','093A',1,NULL,'Annual','FOR REPAIR','FOR REPAIR - Not turning on - HPO not working',1),(23,'Binocular Compound Microscope','SWIFT',NULL,'2322100','2025-05-14-030001-01','SW 006',1,NULL,'Annual','NEW','NEW',1),(24,'Binocular Compound Microscope','SWIFT',NULL,'2321741','2025-05-14-030002-01','SW 007',1,NULL,'Annual','NEW','NEW',1),(25,'Binocular Compound Microscope','SWIFT',NULL,'2322146','2025-05-14-030003-01','SW 008',1,NULL,'Annual','NEW','NEW',1),(26,'Binocular Night Vision','NV400-B',NULL,NULL,NULL,NULL,1,NULL,NULL,'FUNCTIONAL','FUNCTIONAL',1),(27,'Binoculars For Wildlife','NIGHTFOX SWIFT',NULL,NULL,NULL,NULL,1,NULL,NULL,'FUNCTIONAL','FUNCTIONAL',1),(28,'Blender','OSTERIZER',NULL,NULL,NULL,NULL,1,NULL,NULL,'NOT FUNCTIONAL','NOT FUNCTIONAL',1),(29,'Blender','IMARFLEX',NULL,NULL,NULL,NULL,1,NULL,NULL,'FUNCTIONAL','FUNCTIONAL',1),(30,'Blender','OSTERIZER',NULL,NULL,NULL,NULL,5,NULL,NULL,'FUNCTIONAL','FUNCTIONAL - Ang taklob buslot',1),(31,'Centrifuge','HERAEUS CHRIST',NULL,NULL,'236-02-2013-03-00-1953',NULL,1,'2023-01-19','Annual','FUNCTIONAL','FUNCTIONAL',1),(32,'Centrifuge','PHYSICIAN\'S COMPACT',NULL,NULL,'236-02-2013-03-00-1',NULL,1,'2023-01-19','Annual','FUNCTIONAL','FUNCTIONAL',1),(33,'Centrifuge','BOECO','C-28A',NULL,NULL,NULL,5,'2023-01-19','Annual','FUNCTIONAL','FUNCTIONAL',1),(34,'Circulating Vacuum Water Pump','SHIMADZU','SHZ-DIII(A)','20210112030006',NULL,NULL,5,NULL,'Annual','FUNCTIONAL','FUNCTIONAL',1),(35,'Circulating Vacuum Water Pump','SHIMADZU','SHZ-DIII(A)','20210112030007',NULL,NULL,5,NULL,'Annual','FUNCTIONAL','FUNCTIONAL',1),(36,'Clinometer','SUUNTO',NULL,'22138276',NULL,NULL,1,NULL,NULL,'FUNCTIONAL','FUNCTIONAL',1),(37,'Compound microscope, XSP',NULL,NULL,NULL,'CAS-MDLE-MSC-001(2/4)',NULL,1,NULL,NULL,'FUNCTIONAL',NULL,1),(38,'Digital Lux Meter','DR. METER','LX1330B',NULL,NULL,NULL,1,NULL,NULL,'FUNCTIONAL','FUNCTIONAL',1),(39,'Electric Autoclave','HIRAYAMA','HV-50','30320072816',NULL,NULL,5,NULL,'Annual','FUNCTIONAL','FUNCTIONAL',1),(40,'Electric Distillation Machine','AQUATRON','A4000',NULL,'16423302001',NULL,5,'2023-01-19','Annual','FUNCTIONAL','FUNCTIONAL',1),(41,'Electric Oven','DIGISYSTEM LABORATORY  INSTRUMENTS','B-53',NULL,'221-022013-03-00-0317',NULL,5,NULL,'Annual','FUNCTIONAL','FUNCTIONAL',1),(42,'Electric Stove','US TRADITION',NULL,NULL,NULL,NULL,5,NULL,'Annual','NOT FUNCTIONAL','NOT FUNCTIONAL - Power cord defective',1),(43,'Electric Water Bath','SHANGHAI JINGKE  INTRUMENTS','JK-WW-600',NULL,NULL,'WB-01',5,NULL,'Annual','FOR REPAIR','FOR REPAIR -Melted socket',1),(44,'Electric Water Bath','SHANGHAI JINGKE  INTRUMENTS','JK-WW-600',NULL,NULL,'WB-02',5,NULL,'Annual','FUNCTIONAL','FUNCTIONAL',1),(45,'External Drive','ASUS','SDRW-08D2S-U','N3D0AP074544',NULL,NULL,1,NULL,NULL,'FUNCTIONAL','FUNCTIONAL',1),(46,'Flourescence Microscope','OPTIKA',NULL,NULL,'236-02-2013-03-00-1983',NULL,1,NULL,'Annual','FUNCTIONAL','FUNCTIONAL',1),(47,'Flourescence Microscope','OPTIKA',NULL,NULL,NULL,NULL,1,NULL,'Annual','FUNCTIONAL','FUNCTIONAL',1),(48,'Fourier Transform Infrared Spectrophotometer (FTIR)','SHIMADZU','IRAffinity-1','A213750',NULL,NULL,1,'2023-09-01','Annual','NOT FUNCTIONAL','NOT FUNCTIONAL - Mirrors are for replacement',1),(49,'Fume Hood','BIOBASE',NULL,NULL,'16423388002',NULL,5,NULL,'Annual','FUNCTIONAL','FUNCTIONAL',1),(50,'Fume Hood','BIOBASE','FH1200','FH12Z0225',NULL,NULL,3,NULL,'Annual','FUNCTIONAL','FUNCTIONAL',1),(51,'Furnace','VULCAN','3-550','DKW151112V',NULL,NULL,3,NULL,'Annual','FUNCTIONAL','FUNCTIONAL',1),(52,'GPS','GARMIN','ETREX 30x','010-01508-10',NULL,NULL,1,NULL,NULL,'FUNCTIONAL','FUNCTIONAL',1),(53,'GPS','GARMIN','GPSMAP 64x','65J040371',NULL,NULL,1,NULL,NULL,'FUNCTIONAL','FUNCTIONAL',1),(54,'Hot Plate','THERMOSCIENTIFIC','HPA2230M','C1706130631981',NULL,NULL,3,'2023-01-19','Annual','FUNCTIONAL','FUNCTIONAL',1),(55,'Hot Plate','THERMOSCIENTIFIC','HPA2230M','C1706130631983','236-02-2013-03-00-1978',NULL,3,'2023-01-19','Annual','FUNCTIONAL','FUNCTIONAL',1),(56,'Hot Plate','THERMOSCIENTIFIC','HPA2230M','C1706130631985','236-02-2013-03-00-1981',NULL,3,'2023-01-19','Annual','FUNCTIONAL','FUNCTIONAL',1),(57,'Hot Plate','THERMOSCIENTIFIC','HPA2230M','C1706130311272','236-02-2013-03-00-1980',NULL,3,'2023-01-19','Annual','FUNCTIONAL','FUNCTIONAL',1),(58,'Hot Plate','THERMOSCIENTIFIC','HPA2230M','C1706130631984',NULL,NULL,3,'2023-01-19','Annual','FUNCTIONAL','FUNCTIONAL',1),(59,'Hot Plate with Magnetic Stirrer','LMS','HTS-1003','1013-1002',NULL,NULL,3,NULL,'Annual','FUNCTIONAL','FUNCTIONAL',1),(60,'Incident Light Microscope',NULL,NULL,'1606002',NULL,NULL,5,'2023-11-01','Annual','FUNCTIONAL','FUNCTIONAL',1),(61,'Incubator','THERMO SCIENTIFIC',NULL,NULL,'223-02-IT2013-03-00-1500',NULL,5,'2023-01-19','Annual','FUNCTIONAL','FUNCTIONAL',1),(62,'Laboratory Oven','THERMO SCIENTIFIC','OGS60','41568484','221-02-2013-03-00-0316',NULL,3,'2023-01-18','Annual','FUNCTIONAL','FUNCTIONAL',1),(63,'Laboratory Storage Refrigerator','BIOBASE','BXC-AOSTA',NULL,'16423616001',NULL,5,'2023-01-19','Annual','FUNCTIONAL','FUNCTIONAL',1),(64,'Laboratory Storage Refrigerator','BIOBASE','BXC-AOSTA',NULL,'223-01-2013-03-00-1774',NULL,5,'2024-01-19','Annual','FUNCTIONAL','FUNCTIONAL',1),(65,'Laboratory Storage Refrigerator','BIOBASE','BXC-AOSTA',NULL,'223-01-2013-03-00-1773',NULL,5,'2025-01-19','Annual','FUNCTIONAL','FUNCTIONAL',1),(66,'Laminar Flow',NULL,NULL,NULL,'16423623001',NULL,5,NULL,'Annual','FUNCTIONAL','FUNCTIONAL',1),(67,'Laminar Flow',NULL,NULL,NULL,NULL,NULL,4,NULL,'Annual','FUNCTIONAL','FUNCTIONAL',1),(68,'Laser Distance Meter','SNDWAY','SW-TG100',NULL,NULL,NULL,1,NULL,NULL,'FUNCTIONAL','FUNCTIONAL',1),(69,'Microtome',NULL,NULL,NULL,'236-02-2013-03-00-1564',NULL,1,NULL,NULL,'FUNCTIONAL','FUNCTIONAL - Blade is blunt',1),(70,'Microwave Oven','SHARP','R-240L(S)','80100623',NULL,NULL,5,NULL,'Annual','FUNCTIONAL','FUNCTIONAL',1),(71,'Monocular Compound Microscope','CARTON',NULL,'CARTON 10153','236-02-2013-03-00-2010','066A',1,NULL,NULL,'NOT FUNCTIONAL','NOT FUNCTIONAL',1),(72,'Monocular Compound Microscope','CARTON',NULL,'CARTON 10149','236-02-2013-03-00-2013','067A',1,NULL,NULL,'NOT FUNCTIONAL','NOT FUNCTIONAL - No HPO objective -No stage clip',1),(73,'Monocular Compound Microscope','CARTON',NULL,'CARTON 10147','236-02-2013-03-00-2009','068A',1,NULL,'Annual','FUNCTIONAL','FUNCTIONAL',1),(74,'Monocular Compound Microscope','CARTON',NULL,'CARTON 10157','236-02-2013-03-00-2008','069A',1,NULL,NULL,'NOT FUNCTIONAL','NOT FUNCTIONAL - Not turning on',1),(75,'Monocular Compound Microscope','CARTON',NULL,'CARTON 10158','236-02-2013-03-00-2011','070A',1,NULL,NULL,'NOT FUNCTIONAL','NOT FUNCTIONAL',1),(76,'Monocular Compound Microscope','CARTON',NULL,'CARTON 10146','236-02-2013-03-00-2012','071A',1,NULL,NULL,'FUNCTIONAL',NULL,1),(77,'Monocular Compound Microscope','CARTON',NULL,'CARTON 10148','236-02-2013-03-00-2006','072A',1,NULL,'Annual','FUNCTIONAL','FUNCTIONAL',1),(78,'Monocular Compound Microscope','CARTON',NULL,'CARTON 10159','236-02-2013-03-00-2005','073A',1,NULL,NULL,'NOT FUNCTIONAL','NOT FUNCTIONAL - Loose coarse adjustment knob - Damaged stage clip',1),(79,'Monocular Compound Microscope','CARTON',NULL,'CARTON 10156','236-02-2013-03-00-2007','074A',1,NULL,NULL,'NOT FUNCTIONAL','NOT FUNCTIONAL - Not turning on',1),(80,'Monocular Compound Microscope','CARTON',NULL,'CARTON 10146','236-02-2013-03-00-2004','075A',1,NULL,NULL,'NOT FUNCTIONAL','NOT FUNCTIONAL -Defective wire',1),(81,'Monocular Compound Microscope','CE',NULL,'CE 272890','236-02-2013-03-00-2016','076A',1,NULL,NULL,'NOT FUNCTIONAL','NOT FUNCTIONAL - Defective wire',1),(82,'Monocular Compound Microscope','CE',NULL,'CE 272874','236-02-2013-03-00-2015','077A',1,NULL,NULL,'NOT FUNCTIONAL','NOT FUNCTIONAL - Flickering light when turned on',1),(83,'Monocular Compound Microscope','CE',NULL,'CE 272886','236-02-2013-03-00-2014','078A',1,NULL,'Annual','NOT FUNCTIONAL','NOT FUNCTIONAL - Not turning on - Blur HPO imaging',1),(84,'Monocular Compound Microscope','LW SCIENTIFIC',NULL,'LWS 491','236-02-2013-03-00-2017','079A',1,NULL,'Annual','FUNCTIONAL','FUNCTIONAL',1),(85,'Monocular Compound Microscope','LW SCIENTIFIC',NULL,'LWS 490','236-02-2013-03-00-2024','080A',1,NULL,'Annual','FUNCTIONAL','FUNCTIONAL',1),(86,'Monocular Compound Microscope','LW SCIENTIFIC',NULL,'LWS 391','236-02-2013-03-00-2018','081A',1,NULL,'Annual','FUNCTIONAL','FUNCTIONAL -Can\'t focus on HPO - Stage is loose on HPO',1),(87,'Monocular Compound Microscope','LW SCIENTIFIC',NULL,'LWS 488','236-02-2013-03-00-2019','082A',1,NULL,'Annual','FUNCTIONAL','FUNCTIONAL',1),(88,'Monocular Compound Microscope','LW SCIENTIFIC',NULL,'LWS 405','236-02-2013-03-00-2025','083A',1,NULL,NULL,'NOT FUNCTIONAL','NOT FUNCTIONAL - Not turning on - No eyepiece',1),(89,'Monocular Compound Microscope','LW SCIENTIFIC',NULL,'LWS 486','236-02-2013-03-00-2021','084A',1,NULL,NULL,'NOT FUNCTIONAL','NOT FUNCTIONAL - Not turning on',1),(90,'Monocular Compound Microscope','LW SCIENTIFIC',NULL,'LWS 386','236-02-2013-03-00-2023','085A',1,NULL,'Annual','FUNCTIONAL','FUNCTIONAL',1),(91,'Monocular Compound Microscope','LW SCIENTIFIC',NULL,'LWS 398','236-02-2013-03-00-2002','086A',1,NULL,'Annual','FOR REPAIR','FOR REPAIR - Can\'t focus',1),(92,'Monocular Compound Microscope','LW SCIENTIFIC',NULL,'LWS 381','236-02-2013-03-00-2022','087A',1,NULL,NULL,'NOT FUNCTIONAL','NOT FUNCTIONAL - Not turning on',1),(93,'Monocular Compound Microscope','LW SCIENTIFIC',NULL,'LWS 396','236-02-2013-03-00-2026','088A',1,NULL,NULL,'NOT FUNCTIONAL','NOT FUNCTIONAL -Emits smoke when turned on',1),(94,'Monocular Compound Microscope','SPECTRUM',NULL,'SPEC 005','236-02-2013-03-00-2031','090A',1,NULL,'Annual','FUNCTIONAL','FUNCTIONAL',1),(95,'Monocular Compound Microscope','SPECTRUM',NULL,'SPEC 002','236-02-2013-03-00-2030','091A',1,NULL,NULL,'NOT FUNCTIONAL','NOT FUNCTIONAL -Defective wire',1),(96,'Monocular Compound Microscope','SPECTRUM',NULL,'SPEC 004','236-02-2013-03-00-2027','092A',1,NULL,NULL,'NOT FUNCTIONAL','NOT FUNCTIONAL -Defective wire',1),(97,'pH meter','HANNA','HI98108',NULL,NULL,NULL,1,NULL,NULL,'NOT FUNCTIONAL','NOT FUNCTIONAL',1),(98,'Programmable Growth Chamber','WISD','WGC-450','4007331418001',NULL,NULL,5,NULL,'Annual','FUNCTIONAL','FUNCTIONAL',1),(99,'Rotary Evaporator with Waterbath','YAMATO','RE301/BM-500',NULL,NULL,NULL,5,NULL,'Annual','FUNCTIONAL','FUNCTIONAL - No Joint Clips',1),(100,'Shotgun Microphone',NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,'FUNCTIONAL','FUNCTIONAL',1),(101,'Sound Level Meter','LUTRON','SL-4010',NULL,'2016-05-0057',NULL,1,NULL,NULL,'FUNCTIONAL','FUNCTIONAL',1),(102,'Stereomicroscope','AMSCOPE','SM-2T',NULL,'236-02-2013-03-00-2045','101A',1,NULL,'Annual','FUNCTIONAL','FUNCTIONAL',1),(103,'Stereomicroscope','AMSCOPE','SM-2T','1144755-10','236-02-2013-03-00-2044','102A',1,NULL,'Annual','FUNCTIONAL','FUNCTIONAL',1),(104,'Stereomicroscope','AMSCOPE','SM-2T',NULL,'236-02-2013-03-00-2046','103A',1,NULL,'Annual','FUNCTIONAL','No Stage clips and eyepiece',1),(105,'Stereomicroscope','AMSCOPE','SM-2T',NULL,'236-02-2013-03-00-2037','104A',1,NULL,'Annual','FUNCTIONAL','FUNCTIONAL',1),(106,'Stereomicroscope','AMSCOPE','SM-2T','1144755-2','16423389009','105A',1,NULL,'Annual','FUNCTIONAL','FUNCTIONAL',1),(107,'Stereomicroscope','AMSCOPE','SM-2T','1144755-3','236-02-2013-03-00-2039','106A',1,NULL,'Annual','FUNCTIONAL','FUNCTIONAL',1),(108,'Stereomicroscope','AMSCOPE','SM-2T','1144755-4','236-02-2013-03-00-2040','107A',5,NULL,'Annual','FUNCTIONAL','FUNCTIONAL',1),(109,'Stereomicroscope','AMSCOPE','SM-2T','1144755-7','236-02-2013-03-00-2041','108A',1,NULL,'Annual','FUNCTIONAL','FUNCTIONAL',1),(110,'Stereomicroscope','AMSCOPE','SM-2T','1144755-4','236-02-2013-03-00-2042','109A',1,NULL,'Annual','FUNCTIONAL','FUNCTIONAL',1),(111,'Stereomicroscope','AMSCOPE','SM-2T','1144755-6','236-02-2013-03-00-2043','110A',1,NULL,'Annual','NOT FUNCTIONAL','NOT FUNCTIONAL',1),(112,'Stereomicroscope','NIKON',NULL,'85784','236-02-2013-03-00-2051','ST NIKON 101',1,NULL,NULL,'NOT FUNCTIONAL','NOT FUNCTIONAL',1),(113,'Stereomicroscope','MOTIC','SMZ-143 SERIES',NULL,'236-02-2013-03-00-2050','SMZ 143',1,NULL,NULL,'NOT FUNCTIONAL','NOT FUNCTIONAL',1),(114,'Stereomicroscope','OPTECH',NULL,'HG-169465',NULL,NULL,1,NULL,NULL,'NOT FUNCTIONAL','NOT FUNCTIONAL',1),(115,'Stereomicroscope','LW SCIENTIFIC',NULL,'LWS 308784','236-02-2013-03-00-2048',NULL,1,NULL,NULL,'NOT FUNCTIONAL','NOT FUNCTIONAL Lacking one eyepiece',1),(116,'Stereomicroscope','LW SCIENTIFIC',NULL,'LWS 308785','236-02-2013-03-00-2047',NULL,1,NULL,NULL,'NOT FUNCTIONAL','NOT FUNCTIONAL',1),(117,'Stereomicroscope','OPTECH',NULL,'HG-169460',NULL,NULL,1,NULL,NULL,'NOT FUNCTIONAL','NOT FUNCTIONAL',1),(118,'Stereomicroscope','AMSCOPE',NULL,NULL,'PAR-05-IGF-201910-0143',NULL,1,NULL,'Annual','FUNCTIONAL','FUNCTIONAL',1),(119,'Trail Camera','SYNDESMOS','DH-2','X0031YX8RP',NULL,NULL,1,NULL,NULL,'FUNCTIONAL','FUNCTIONAL',1),(120,'Trinocular Compound Microscope','AMSCOPE','T680A','6013037775',NULL,NULL,1,NULL,'Annual','FUNCTIONAL','FUNCTIONAL - Lacking power cord - Lacking one eyepiece',1),(121,'Trinocular Compound Microscope','AMSCOPE','T680A','6013037775',NULL,NULL,1,NULL,'Annual','FUNCTIONAL','FUNCTIONAL',1),(122,'Trinocular Compound Microscope','OPTIKA','B-350','360845','164233020025','094A',1,NULL,'Annual','FUNCTIONAL','FUNCTIONAL',1),(123,'Trinocular Compound Microscope','OPTIKA','B-350','371688','164233020026','095A',5,NULL,'Annual','FUNCTIONAL','FUNCTIONAL',1),(124,'UV Spectriphotometer','SHIMADZU','UV-1800','A11635100434','164233090003',NULL,5,'2023-06-01','Annual','FUNCTIONAL','FUNCTIONAL',1);
/*!40000 ALTER TABLE `inventory_equipment` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inventory_glassware`
--

DROP TABLE IF EXISTS `inventory_glassware`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventory_glassware` (
  `glassware_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `glassware` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location_id` bigint unsigned NOT NULL,
  `remarks` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `quantity` int NOT NULL DEFAULT '0',
  `brand` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`glassware_id`),
  KEY `fk_glassware_location` (`location_id`),
  CONSTRAINT `fk_glassware_location` FOREIGN KEY (`location_id`) REFERENCES `locations` (`location_id`)
) ENGINE=InnoDB AUTO_INCREMENT=100 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventory_glassware`
--

LOCK TABLES `inventory_glassware` WRITE;
/*!40000 ALTER TABLE `inventory_glassware` DISABLE KEYS */;
INSERT INTO `inventory_glassware` VALUES (1,'Absorber tube glass',NULL,2,NULL,6,NULL),(2,'Amber bottle','100 mL, Orange cap',2,'Unused',0,NULL),(3,'Amber bottle','250 mL, Orange cap',2,'Unused',2,NULL),(4,'Beaker','50 ml',2,'18 Pyrex; 4 Bomex; 1 Boro3.3; 1 GG-17; 1 Sterglass',25,NULL),(5,'Beaker','100 ml',2,'Pyrex 18; Bomex 12; 7 Uni-rex ; 2 Schott ; GG17- 9 ; 4 Kimax, Veegee 1; Boro 3.3 1',56,NULL),(6,'Beaker','150 ml',2,'26 Pyrex ; 1 GG 17; 1 Boro 3.3 ; 1 Borosilicate',29,NULL),(7,'Beaker','250 ml',2,'14 Pyrex; 5 Unirex; 2 Sterglass; 6 GG-17; 4 Brandless',32,NULL),(8,'Beaker','400 ml',2,'30 Schott; 9 Bomex; 5 Pyrex; 4 Brandless',40,NULL),(9,'Beaker','500 ml',2,'3 Pyrex; 1 Borosil; 1 Bomex; 1 GG-17; 1Sterglass',10,NULL),(10,'Beaker','600 ml',2,'5 Pyrex',0,NULL),(11,'Beaker','1000 ml',2,'13 Pyrex; 1 GG-17; 1 Sterglass; 1 Brandless',22,NULL),(12,'Beaker','4000 ml',2,'3 Pyrex; 6 Kimax',10,NULL),(13,'Beaker','5000 ml',2,'2 Unirex',2,NULL),(14,'Boiling Flask','100 ml , Flat',2,'2 Duran',2,NULL),(15,'Boiling Flask','125 ml , Flat',2,'26 Kimax;  4 Pyrex',30,NULL),(16,'Boiling Flask','250 ml, Flat',2,'2 Bomex; 4 Kimax; 6 Pyrex',12,NULL),(17,'Boiling Flask','300 ml, Round',2,NULL,1,NULL),(18,'Boiling Flask','500 ml, Flat',2,'13 Kimax; 4 Pyrex',17,NULL),(19,'Boiling Flask','500 ml, Round',2,'3 Kimax, 1 Pyrex',3,NULL),(20,'Boiling Flask','1L, Flat',2,'1 Pyrex; 1 Bomex; 8 Kimax',9,NULL),(21,'Boiling Flask','1L, Round',2,'4 Duran; 1 Kimax',5,NULL),(22,'Bunchner Funnel',NULL,2,NULL,12,NULL),(23,'Burette','50 mL',2,'All functioning',22,NULL),(24,'Condenser',NULL,2,NULL,27,NULL),(25,'Cuvette','10 mm, with PTFE Lid, Matched pair',1,'Newly purchased',2,NULL),(26,'Distilling Flask','500 ml',2,NULL,11,NULL),(27,'Distilling Flask','250 ml',2,'8 Pyrex; 16 Kimax',21,NULL),(28,'Erlenmeyer flask','25ml',2,'2 Pyrex; 3 Kimax',5,NULL),(29,'Erlenmeyer flask','50 ml',2,'1 Kimax',1,NULL),(30,'Erlenmeyer flask','125 mL',2,'4 Pyrex; 2 Kimax',6,NULL),(31,'Erlenmeyer flask','150 mL',2,'6 Bomex; 2 GG-17',8,NULL),(32,'Erlenmeyer flask','250 mL',2,'No measurements',45,NULL),(33,'Erlenmeyer flask','250 mL',2,'18 Pyrex; 5 Borosil; 5 Unirex; 4 Cordial;  1 Bomex; 2 GG-17;  Brandless',34,NULL),(34,'Erlenmeyer flask','500 mL',2,'19 Pyrex; 2 Cordial; 3 Bomex; 4 GG-17; 2 Unirex; 1 Sterglass',33,NULL),(35,'Erlenmeyer flask','500 mL',2,'No measurement',1,NULL),(36,'Erlenmeyer flask','1000 mL',2,'4 Pyrex; 2 Isolab; 1 Cordial; 1 Sterglass',7,NULL),(37,'Funnel','50-60mm',2,NULL,12,NULL),(38,'Funnel','70mm',2,NULL,15,NULL),(39,'Funnel','90 mm',2,NULL,8,NULL),(40,'Funnel','100 mm',2,NULL,2,NULL),(41,'Funnel','1000 mm',2,NULL,6,NULL),(42,'Graduated cylinder','10 mL',2,'18 Unirex; 7 Citoglass; 7 Pyrex; 6 Sterglass; 9 Brandless',47,NULL),(43,'Graduated cylinder','25 mL',2,'5 Pyrex; 29 Unirex',34,NULL),(44,'Graduated cylinder','50 mL',2,'2 Pyrex; 2 Sterglass; 1 Citoglass; 1 Borosilicate; 4 Brandless',11,NULL),(45,'Graduated cylinder','100 mL',2,'22 Citoglass; 1 Borosil; 1 DIN; 7 Pyrex;  6 Brandless; 3 Sterglass; 2 Partners',45,NULL),(46,'Graduated cylinder','250 mL',2,'3 Unirex; 1 Borosil',4,NULL),(47,'Graduated cylinder','500 mL',2,'2 Brandless',2,NULL),(48,'Graduated cylinder','1000 mL',2,'2 GG-17; 1 TEKK; 3 Brandless',7,NULL),(49,'Petri dish',NULL,2,'Pair',115,NULL),(50,'Petri dish',NULL,2,'Pair',93,NULL),(51,'Petri dish',NULL,2,NULL,10,NULL),(52,'Pipette','1 mL',2,'7 Pyrex; 2 Borosilicate; 8 Brandless',16,NULL),(53,'Pipette','2 mL',2,'1 Pyrex, 3 Borosilicate; 4 Brandless',8,NULL),(54,'Pipette','5 mL',2,'10 Pyrex; 4 DIN; 25 Brandless',38,NULL),(55,'Pipette','10 mL',2,'47 Pyrex; 6 Brandless',53,NULL),(56,'Pipette','25 mL',2,'6 Pyrex; 4 Borosilicate;24 Bomex; 2 DIN; 23 GG-17',52,NULL),(57,'BOD bottle',NULL,2,'Unused, inside brown box',21,NULL),(58,'Reagent bottle','100 mL, Blue Cap',2,'Unused',2,NULL),(59,'Reagent bottle','100 mL, Orange Cap',2,'Unused',0,NULL),(60,'Reagent bottle','500 mL, Orange Cap',2,'Unused',0,NULL),(61,'Receptacle',NULL,2,NULL,14,NULL),(62,'Retort',NULL,2,'Inside its box',3,NULL),(63,'Separatory Funnel','60 ml',2,NULL,2,NULL),(64,'Separatory Funnel','125 ml',2,'Round Short - 5; Round Long - 3',18,NULL),(65,'Separatory Funnel','250 ml',2,'Elongated Short - 2; Elongated Long - 1; Round Short - 1',4,NULL),(66,'Separatory Funnel','500 ml',2,'Elongated - 9; Round - 6',15,NULL),(67,'Sohxlet',NULL,2,'Inside its box',3,NULL),(68,'Stirring rod','Long',2,'Not Broken',30,NULL),(69,'Stirring rod','Small',2,'Slightly broken but still usable for stirring chemicals (small quanitity)',65,NULL),(70,'Suction flask','500 mL',2,NULL,1,NULL),(71,'Suction flask','1000 mL',2,'3 Kimax, 1 Pyrex',4,NULL),(72,'Test Tube','5 ml',2,NULL,175,NULL),(73,'Test Tube','8 ml',2,NULL,209,NULL),(74,'Test Tube','10 ml',2,NULL,85,NULL),(75,'Test Tube','15 ml',2,NULL,13,NULL),(76,'Test Tube','20 ml',2,NULL,50,NULL),(77,'Test Tube','25 ml',2,NULL,220,NULL),(78,'Test Tube','50 ml',2,NULL,16,NULL),(79,'Test Tube','75 ml',2,NULL,24,NULL),(80,'Test tube w/ screw cap','8 ml',2,NULL,57,NULL),(81,'Test tube w/ screw cap','15 ml',2,NULL,8,NULL),(82,'Test tube w/ screw cap','30 ml',2,NULL,21,NULL),(83,'Test tube w/ screw cap','34 ml',2,NULL,143,NULL),(84,'Test tube w/ screw cap','75 ml',2,NULL,0,NULL),(85,'Thistle tube',NULL,2,NULL,64,NULL),(86,'Volumetric Flask','10 ml',2,NULL,6,NULL),(87,'Volumetric Flask','50 ml',2,NULL,7,NULL),(88,'Volumetric Flask','100 ml',2,'9 Citoglass; 6 Pyrex, 1 MBL, 1 Boro 3.3',16,NULL),(89,'Volumetric Flask','250 ml',2,'3 YZ; 3 01TX; 6 Sterlglass;  23 Bomex;  1 Pyrex; 1 Borosil; 1 MBL',35,NULL),(90,'Volumetric Flask','500 ml',2,'10 YZ; 8 II; 1 MC; 13 Bomex; 1 Kimax',32,NULL),(91,'Volumetric Flask','1000 ml',2,'1 Borosil; 3 Brandless; 5 Kimax; 13 Bomex',20,NULL),(92,'Volumetric Pipette','1ml',2,NULL,2,NULL),(93,'Volumetric Pipette','2ml',2,NULL,6,NULL),(94,'Volumetric Pipette','5 ml',2,NULL,12,NULL),(95,'Volumetric Pipette','10 ml',2,NULL,10,NULL),(96,'Volumetric Pipette','20 ml',2,NULL,6,NULL),(97,'Watch glass','Small',2,'30 mm-80 mm',42,NULL),(98,'Watch glass','Medium',2,'90 mm - 100 mm',81,NULL),(99,'Watch glass','Large',2,'100 mm - 120 mm',15,NULL);
/*!40000 ALTER TABLE `inventory_glassware` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inventory_supplies`
--

DROP TABLE IF EXISTS `inventory_supplies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventory_supplies` (
  `supplies_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `supplies_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `brand` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location_id` bigint unsigned NOT NULL,
  `quantity` int NOT NULL DEFAULT '0',
  `quantity_unit` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`supplies_id`),
  KEY `fk_supplies_brand` (`brand`),
  KEY `fk_supplies_location` (`location_id`),
  CONSTRAINT `fk_supplies_location` FOREIGN KEY (`location_id`) REFERENCES `locations` (`location_id`)
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventory_supplies`
--

LOCK TABLES `inventory_supplies` WRITE;
/*!40000 ALTER TABLE `inventory_supplies` DISABLE KEYS */;
INSERT INTO `inventory_supplies` VALUES (1,'Acid Gas Cartridge',NULL,1,5,'packs'),(2,'Blue Litmus paper',NULL,2,13,'Boxes, 1 tube'),(3,'Capillary tube',NULL,2,3,'tubes'),(4,'Copper Strips 6x1/4 in',NULL,1,2,NULL),(5,'Depression Slides',NULL,1,18,'-D, 31-S'),(6,'Falcon tubes (50mL)',NULL,1,1,'pack'),(7,'Filter Paper (125mm)','39',1,2,'boxes'),(8,'Filter Paper (47mm)','39',1,2,'boxes'),(9,'Filter Paper (70mm)','33',1,25,'pcs'),(10,'Gauze Pad','27',1,1,'box'),(11,'Glass Slides',NULL,1,10,'boxes'),(12,'Microcope Lens Wipes','20',1,8,'boxes'),(13,'Microfuge Tubes (Rnase -free)',NULL,1,1,'Pck'),(14,'Microtome Blade','14',1,1,'box (5 unused blades)'),(15,'pH strips',NULL,2,4,'boxes'),(16,'Pipette tips (10µl)',NULL,1,1,'box & 1 pack'),(17,'Pipette tips (1000µl)',NULL,1,4,'boxes & 3 1/2 packs'),(18,'Pipette tips (200µl)',NULL,1,11,'boxes & 1/2 pack'),(19,'Red Litmus paper',NULL,2,9,'boxes & 4 tubes'),(20,'Seal-R-Film',NULL,1,1,'box (opened)'),(21,'Spill Kit',NULL,1,1,'set'),(22,'Surgical Blade for Scalpel no. 3','27',1,9,'pieces'),(23,'Weighing Dishes',NULL,1,1,'pack'),(24,'Wooden Applicator','23',1,4,'boxes'),(25,'Wooden Tongue Applicator','36',1,1,'box'),(26,'Zinc Metal Strips',NULL,1,2,NULL);
/*!40000 ALTER TABLE `inventory_supplies` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `locations`
--

DROP TABLE IF EXISTS `locations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `locations` (
  `location_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `location_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`location_id`),
  UNIQUE KEY `location_name` (`location_name`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `locations`
--

LOCK TABLES `locations` WRITE;
/*!40000 ALTER TABLE `locations` DISABLE KEYS */;
INSERT INTO `locations` VALUES (1,'Biology Stockroom (E-215)'),(2,'Chem. & Physics Stockroom'),(3,'Chemical Laboratory (E-309)'),(4,'E-213'),(5,'Instrument Laboratory (E-211)');
/*!40000 ALTER TABLE `locations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reservation`
--

DROP TABLE IF EXISTS `reservation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reservation` (
  `reservation_id` int NOT NULL AUTO_INCREMENT,
  `student_id` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `admin_id` int DEFAULT NULL,
  `prof_name` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `prof_email` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `prof_token` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `prof_approval` varchar(20) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `prof_response` varchar(1000) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `prof_approved_at` timestamp NULL DEFAULT NULL,
  `subject` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `date_reserved` date NOT NULL,
  `date_borrowed` date NOT NULL,
  `due_date` date DEFAULT NULL,
  `date_returned` date DEFAULT NULL,
  `time_start` time DEFAULT NULL,
  `time_end` time DEFAULT NULL,
  `course_year_section` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `group_number` int DEFAULT NULL,
  `type` enum('chemicals','materials') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `equipment_log` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `status` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'Pending',
  `conditional_remarks` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `signed_by_admin_id` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`reservation_id`),
  UNIQUE KEY `prof_token` (`prof_token`),
  KEY `fk_reservation_admin` (`admin_id`),
  KEY `fk_reservation_signer` (`signed_by_admin_id`),
  KEY `idx_reservation_student` (`student_id`),
  KEY `idx_reservation_status` (`status`),
  KEY `idx_reservation_date` (`date_borrowed`),
  CONSTRAINT `fk_reservation_admin` FOREIGN KEY (`admin_id`) REFERENCES `admin` (`admin_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_reservation_signer` FOREIGN KEY (`signed_by_admin_id`) REFERENCES `admin` (`admin_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_reservation_student` FOREIGN KEY (`student_id`) REFERENCES `student` (`student_id`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reservation`
--

LOCK TABLES `reservation` WRITE;
/*!40000 ALTER TABLE `reservation` DISABLE KEYS */;
INSERT INTO `reservation` VALUES (1,'2024-00392',4,'12','adlaongaming5th@gmail.com',NULL,NULL,NULL,NULL,'bbbbbbbbbbbbb','2026-05-22','2026-05-23','2026-05-24','2026-05-23','19:07:00','07:07:00','12',12,'materials','Autoclave, Analytical Balance, Oven, Incubator, Refrigerator, Centrifuge, Fume Hood, Laminar Flow, Circulating Water Vacuum Pump, Rotary Evaporator, Electric Waterbath','Returned',NULL,NULL,'2026-05-22 11:08:18'),(2,'2024-00392',4,'12','adlaongaming5th@gmail.com',NULL,NULL,NULL,NULL,'bbbbbbbbbbbbb','2026-05-22','2026-05-23','2026-05-24','2026-05-23','19:10:00','07:10:00','12',12,'materials','Autoclave','Returned',NULL,NULL,'2026-05-22 11:11:16'),(3,'2024-00392',4,'12','adlaongaming5th@gmail.com',NULL,NULL,NULL,NULL,'12','2026-05-22','2026-05-23','2026-05-24','2026-05-23','19:14:00','07:14:00','bbbbbbbbbbbb',12,'materials','Circulating Water Vacuum Pump','Returned',NULL,NULL,'2026-05-22 11:15:05'),(4,'2024-00392',4,'12','adlaongaming5th@gmail.com',NULL,NULL,NULL,NULL,'12','2026-05-22','2026-05-23','2026-05-24',NULL,'19:27:00','07:27:00','12',12,'materials','Autoclave','Invalid',NULL,4,'2026-05-22 11:27:30'),(5,'2024-00392',4,'12','adlaongaming5th@gmail.com',NULL,NULL,NULL,NULL,'12','2026-05-22','2026-05-23',NULL,NULL,'17:52:00','05:52:00','12',12,'materials','Fume Hood','Conditional','123',NULL,'2026-05-22 21:52:35'),(6,'2024-00392',4,'12','adlaongaming5th@gmail.com',NULL,NULL,NULL,NULL,'12','2026-05-22','2026-05-23',NULL,NULL,'18:04:00','06:04:00','12',12,'materials','Autoclave','Conditional','12',NULL,'2026-05-22 22:04:45'),(7,'2024-00392',4,'12','adlaongaming5th@gmail.com',NULL,NULL,NULL,NULL,'12','2026-05-22','2026-05-23',NULL,NULL,'18:14:00','06:14:00','12',12,'materials','Autoclave','Conditional','50$ please',NULL,'2026-05-22 22:15:08'),(8,'2024-00392',4,'12','adlaongaming5th@gmail.com',NULL,NULL,NULL,NULL,'12','2026-05-22','2026-05-23','2026-05-24',NULL,'18:26:00','06:26:00','12',12,'materials','Fume Hood','Invalid',NULL,4,'2026-05-22 22:27:10'),(9,'2024-00392',4,'12','adlaongaming5th@gmail.com',NULL,NULL,NULL,NULL,'12','2026-05-22','2026-05-23','2026-05-24',NULL,'18:28:00','06:28:00','12',12,'materials','Refrigerator','Invalid',NULL,4,'2026-05-22 22:28:40'),(10,'2024-00392',4,'12','adlaongaming5th@gmail.com',NULL,NULL,NULL,NULL,'12','2026-05-22','2026-05-23','2026-05-24',NULL,'18:30:00','06:30:00','12',12,'materials','Autoclave','Invalid',NULL,4,'2026-05-22 22:31:10'),(11,'2024-00392',4,'12','adlaongaming5th@gmail.com',NULL,NULL,NULL,NULL,'12','2026-05-25','2026-05-23',NULL,NULL,'18:32:00','06:32:00','12',12,'materials','Autoclave, Oven, Refrigerator, Fume Hood, Circulating Water Vacuum Pump, Electric Waterbath','Conditional','bawal',NULL,'2026-05-22 22:32:49'),(12,'2024-00392',4,'12','adlaongaming5th@gmail.com',NULL,NULL,NULL,NULL,'12','2026-05-25','2026-05-26',NULL,NULL,'02:03:00','14:03:00','12',12,'materials','Autoclave','Conditional','pag borrow mo nila lance',NULL,'2026-05-26 06:03:30'),(13,'2024-00392',4,'12','adlaongaming5th@gmail.com',NULL,NULL,NULL,NULL,'12','2026-05-25','2026-05-26','2026-05-27',NULL,'02:26:00','14:26:00','12',NULL,'materials','Autoclave, Oven','Invalid',NULL,4,'2026-05-26 06:26:28'),(14,'2024-00392',4,'12','adlaongaming5th@gmail.com',NULL,NULL,NULL,NULL,'12','2026-05-26','2026-05-27',NULL,NULL,'21:07:00','09:07:00','12',12,'materials','Autoclave','Conditional','bawal',NULL,'2026-05-26 13:07:39'),(15,'2024-00392',4,'12','adlaongaming5th@gmail.com',NULL,NULL,NULL,NULL,'12','2026-05-26','2026-05-27','2026-05-28',NULL,'22:25:00','10:25:00','12',12,'materials','Oven','Approved',NULL,4,'2026-05-26 14:25:46'),(16,'2024-00392',4,'12','adlaongaming5th@gmail.com',NULL,NULL,NULL,'2026-05-26 15:07:12','12','2026-05-26','2026-05-27','2026-05-28',NULL,'23:05:00','11:05:00','12',12,'materials','Autoclave','Approved',NULL,4,'2026-05-26 15:05:36');
/*!40000 ALTER TABLE `reservation` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reservation_apparatus`
--

DROP TABLE IF EXISTS `reservation_apparatus`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reservation_apparatus` (
  `id` int NOT NULL AUTO_INCREMENT,
  `reservation_id` int NOT NULL,
  `apparatus_id` bigint unsigned NOT NULL,
  `quantity` int NOT NULL DEFAULT '1',
  `remarks` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_ra_reservation` (`reservation_id`),
  KEY `idx_ra_apparatus` (`apparatus_id`),
  CONSTRAINT `fk_ra_apparatus` FOREIGN KEY (`apparatus_id`) REFERENCES `inventory_apparatus` (`apparatus_id`),
  CONSTRAINT `fk_ra_reservation` FOREIGN KEY (`reservation_id`) REFERENCES `reservation` (`reservation_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reservation_apparatus`
--

LOCK TABLES `reservation_apparatus` WRITE;
/*!40000 ALTER TABLE `reservation_apparatus` DISABLE KEYS */;
INSERT INTO `reservation_apparatus` VALUES (8,1,123,1,NULL),(9,2,1,1,NULL),(10,3,1,1,NULL),(11,4,1,1,NULL),(12,5,123,1,NULL),(13,6,123,1,NULL),(14,8,123,1,NULL),(15,10,123,1,NULL),(17,12,123,1,NULL),(20,16,1,1,NULL);
/*!40000 ALTER TABLE `reservation_apparatus` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reservation_equipment`
--

DROP TABLE IF EXISTS `reservation_equipment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reservation_equipment` (
  `id` int NOT NULL AUTO_INCREMENT,
  `reservation_id` int NOT NULL,
  `equipment_id` bigint unsigned NOT NULL,
  `quantity` int NOT NULL DEFAULT '1',
  `remarks` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_req_reservation` (`reservation_id`),
  KEY `idx_req_equipment` (`equipment_id`),
  CONSTRAINT `fk_req_equipment` FOREIGN KEY (`equipment_id`) REFERENCES `inventory_equipment` (`equipment_id`),
  CONSTRAINT `fk_req_reservation` FOREIGN KEY (`reservation_id`) REFERENCES `reservation` (`reservation_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reservation_equipment`
--

LOCK TABLES `reservation_equipment` WRITE;
/*!40000 ALTER TABLE `reservation_equipment` DISABLE KEYS */;
/*!40000 ALTER TABLE `reservation_equipment` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reservation_glassware`
--

DROP TABLE IF EXISTS `reservation_glassware`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reservation_glassware` (
  `id` int NOT NULL AUTO_INCREMENT,
  `reservation_id` int NOT NULL,
  `glassware_id` bigint unsigned NOT NULL,
  `quantity` int NOT NULL DEFAULT '1',
  `remarks` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_rg_reservation` (`reservation_id`),
  KEY `idx_rg_glassware` (`glassware_id`),
  CONSTRAINT `fk_rg_glassware` FOREIGN KEY (`glassware_id`) REFERENCES `inventory_glassware` (`glassware_id`),
  CONSTRAINT `fk_rg_reservation` FOREIGN KEY (`reservation_id`) REFERENCES `reservation` (`reservation_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reservation_glassware`
--

LOCK TABLES `reservation_glassware` WRITE;
/*!40000 ALTER TABLE `reservation_glassware` DISABLE KEYS */;
/*!40000 ALTER TABLE `reservation_glassware` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reservation_supplies`
--

DROP TABLE IF EXISTS `reservation_supplies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reservation_supplies` (
  `id` int NOT NULL AUTO_INCREMENT,
  `reservation_id` int NOT NULL,
  `supplies_id` bigint unsigned NOT NULL,
  `quantity` int NOT NULL DEFAULT '1',
  `remarks` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_rs_reservation` (`reservation_id`),
  KEY `idx_rs_supplies` (`supplies_id`),
  CONSTRAINT `fk_rs_reservation` FOREIGN KEY (`reservation_id`) REFERENCES `reservation` (`reservation_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rs_supplies` FOREIGN KEY (`supplies_id`) REFERENCES `inventory_supplies` (`supplies_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reservation_supplies`
--

LOCK TABLES `reservation_supplies` WRITE;
/*!40000 ALTER TABLE `reservation_supplies` DISABLE KEYS */;
INSERT INTO `reservation_supplies` VALUES (4,14,7,1,NULL),(5,15,7,1,NULL);
/*!40000 ALTER TABLE `reservation_supplies` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reservationchemicals`
--

DROP TABLE IF EXISTS `reservationchemicals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reservationchemicals` (
  `id` int NOT NULL AUTO_INCREMENT,
  `reservation_id` int NOT NULL,
  `chemical_id` bigint unsigned NOT NULL,
  `quantity` int NOT NULL DEFAULT '1',
  `remarks` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_rc_chemical` (`chemical_id`),
  KEY `idx_rc_reservation` (`reservation_id`),
  CONSTRAINT `fk_rc_chemical` FOREIGN KEY (`chemical_id`) REFERENCES `inventory_chemicals` (`chemical_id`),
  CONSTRAINT `fk_rc_reservation` FOREIGN KEY (`reservation_id`) REFERENCES `reservation` (`reservation_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reservationchemicals`
--

LOCK TABLES `reservationchemicals` WRITE;
/*!40000 ALTER TABLE `reservationchemicals` DISABLE KEYS */;
/*!40000 ALTER TABLE `reservationchemicals` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reservationequipment`
--

DROP TABLE IF EXISTS `reservationequipment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reservationequipment` (
  `id` int NOT NULL AUTO_INCREMENT,
  `reservation_id` int NOT NULL,
  `item_type` enum('equipment','apparatus','glassware','supplies') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `item_id` bigint unsigned NOT NULL,
  `quantity` int NOT NULL DEFAULT '1',
  `remarks` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_re_reservation` (`reservation_id`),
  KEY `idx_re_item_type_id` (`item_type`,`item_id`),
  CONSTRAINT `fk_re_reservation` FOREIGN KEY (`reservation_id`) REFERENCES `reservation` (`reservation_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reservationequipment`
--

LOCK TABLES `reservationequipment` WRITE;
/*!40000 ALTER TABLE `reservationequipment` DISABLE KEYS */;
/*!40000 ALTER TABLE `reservationequipment` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reservationmembers`
--

DROP TABLE IF EXISTS `reservationmembers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reservationmembers` (
  `member_id` int NOT NULL AUTO_INCREMENT,
  `reservation_id` int NOT NULL,
  `name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`member_id`),
  KEY `idx_members_reservation` (`reservation_id`),
  CONSTRAINT `fk_members_reservation` FOREIGN KEY (`reservation_id`) REFERENCES `reservation` (`reservation_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=39 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reservationmembers`
--

LOCK TABLES `reservationmembers` WRITE;
/*!40000 ALTER TABLE `reservationmembers` DISABLE KEYS */;
INSERT INTO `reservationmembers` VALUES (17,1,'12'),(18,2,'12'),(19,3,'12'),(20,4,'12'),(21,5,'12'),(22,6,'12'),(23,7,'12'),(24,8,'12'),(25,9,'12'),(26,10,'12'),(28,12,'12'),(34,13,'12'),(35,11,'12'),(36,14,'12'),(37,15,'12'),(38,16,'12');
/*!40000 ALTER TABLE `reservationmembers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `student`
--

DROP TABLE IF EXISTS `student`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `student` (
  `user_id` int NOT NULL AUTO_INCREMENT,
  `student_id` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `first_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `last_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `email` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `college` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `year_level` smallint NOT NULL,
  `section` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `user_type` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'student',
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `student_id` (`student_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `student`
--

LOCK TABLES `student` WRITE;
/*!40000 ALTER TABLE `student` DISABLE KEYS */;
INSERT INTO `student` VALUES (2,'2022-01549','JAY','LUMANTA','jplumanta01549@usep.edu.ph','CAS',1,NULL,1,'2026-05-15 08:59:52','2026-05-20 05:41:36','student'),(4,'2024-00392','LUKE EMMANUEL','ADLAON','lesadlaon01202400392@usep.edu.ph','CAS',1,NULL,1,'2026-05-19 14:08:40','2026-05-26 15:08:03','student'),(5,'2022-0824','GRYKA GRACE','PACHECO','grykagrace0824@gmail.com','CAS',1,NULL,1,'2026-05-19 21:37:54','2026-05-20 05:41:48','student'),(6,NULL,'Luke','Adlaon','adlaongaming5th@gmail.com',NULL,1,NULL,1,'2026-05-26 13:40:14','2026-05-26 13:40:14','student');
/*!40000 ALTER TABLE `student` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-05-27  7:09:04
