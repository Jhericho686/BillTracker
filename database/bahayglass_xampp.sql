-- ============================================================================
-- BAHAYGLASS: PURE HOUSEHOLD BUDGET, GROCERIES/NEEDS VS WANTS, KURYENTE,
-- 6-MONTH HISTORY, UTANG TRACKER & AUDIT LOGS DATABASE
-- Compatible with: XAMPP (MySQL 5.7+ / 8.0+ & MariaDB 10.4+)
-- How to use in XAMPP:
--   1. Start Apache & MySQL in XAMPP Control Panel
--   2. Open http://localhost/phpmyadmin
--   3. Click "Import" (or "SQL" tab) and run/upload this file!
-- ============================================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+08:00";

-- 1. Create Database
CREATE DATABASE IF NOT EXISTS `bahayglass_db`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `bahayglass_db`;

-- ============================================================================
-- TABLE 1: household_settings (Budget Caps & Active Cutoff)
-- ============================================================================
DROP TABLE IF EXISTS `household_settings`;
CREATE TABLE `household_settings` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `household_name` VARCHAR(100) NOT NULL DEFAULT 'BahayGlass Household',
  `monthly_allowance_budget` DECIMAL(12,2) NOT NULL DEFAULT 18000.00,
  `groceries_budget` DECIMAL(12,2) NOT NULL DEFAULT 10500.00,
  `kuryente_budget` DECIMAL(12,2) NOT NULL DEFAULT 2200.00,
  `wants_budget` DECIMAL(12,2) NOT NULL DEFAULT 4500.00,
  `active_cutoff` ENUM('1st_kinsenas', '2nd_kinsenas', 'full_month') NOT NULL DEFAULT '1st_kinsenas',
  `privacy_mode` TINYINT(1) NOT NULL DEFAULT 0,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `household_settings` (`id`, `household_name`, `monthly_allowance_budget`, `groceries_budget`, `kuryente_budget`, `wants_budget`, `active_cutoff`, `privacy_mode`) VALUES
(1, 'Dela Cruz Family Household', 18000.00, 10500.00, 2200.00, 4500.00, '1st_kinsenas', 0);

-- ============================================================================
-- TABLE 2: wallets (Cash Envelope, GCash, Maya, Bank)
-- ============================================================================
DROP TABLE IF EXISTS `wallets`;
CREATE TABLE `wallets` (
  `id` VARCHAR(20) NOT NULL,
  `name` VARCHAR(80) NOT NULL,
  `type` ENUM('Cash', 'E-Wallet', 'Bank') NOT NULL,
  `balance` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `account_number` VARCHAR(60) DEFAULT NULL,
  `color` VARCHAR(30) NOT NULL DEFAULT 'emerald',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `wallets` (`id`, `name`, `type`, `balance`, `account_number`, `color`) VALUES
('cash', 'House Cash Envelope', 'Cash', 5420.00, 'Kusina Safe Envelope', 'emerald'),
('gcash', 'GCash Household', 'E-Wallet', 6850.00, '0917-555-0192', 'indigo'),
('maya', 'Maya Bills Wallet', 'E-Wallet', 3290.00, '0918-888-4321', 'teal'),
('bank', 'BDO Family Payroll', 'Bank', 14600.00, 'BDO •••• 8841', 'amber');

-- ============================================================================
-- TABLE 3: incomes (Monthly Allowance, 15th/30th Salary & Side Hustles)
-- ============================================================================
DROP TABLE IF EXISTS `incomes`;
CREATE TABLE `incomes` (
  `id` VARCHAR(40) NOT NULL,
  `title` VARCHAR(140) NOT NULL,
  `type` ENUM('allowance', 'salary', 'side_hustle') NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `income_date` DATE NOT NULL,
  `cutoff` ENUM('1st_kinsenas', '2nd_kinsenas', 'monthly') NOT NULL DEFAULT '1st_kinsenas',
  `wallet_id` VARCHAR(20) NOT NULL,
  `status` ENUM('received', 'pending') NOT NULL DEFAULT 'received',
  `contributor` VARCHAR(80) DEFAULT 'Household Head',
  `notes` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_incomes_type` (`type`),
  KEY `idx_incomes_wallet` (`wallet_id`),
  CONSTRAINT `fk_incomes_wallet` FOREIGN KEY (`wallet_id`) REFERENCES `wallets` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `incomes` (`id`, `title`, `type`, `amount`, `income_date`, `cutoff`, `wallet_id`, `status`, `contributor`, `notes`) VALUES
('INC-2026-1101', '1st Kinsenas Net Salary (Nov 1-15)', 'salary', 15500.00, '2026-11-01', '1st_kinsenas', 'bank', 'received', 'Household Head', 'Main 15th cutoff payroll'),
('INC-2026-1102', 'Monthly Household Budget Allowance', 'allowance', 8000.00, '2026-11-01', 'monthly', 'cash', 'received', 'Spouse / Partner', 'Dedicated for Palengke & daily house cash'),
('INC-2026-1103', 'Home Baked Lasagna & Food Trays Order', 'side_hustle', 3400.00, '2026-11-04', '1st_kinsenas', 'gcash', 'received', 'Kusina Raket', 'Weekend neighborhood orders'),
('INC-2026-1104', 'Freelance Bookkeeping & Tax Filing Gig', 'side_hustle', 2800.00, '2026-11-08', '1st_kinsenas', 'gcash', 'pending', 'Household Head', 'Client payout scheduled this Friday'),
('INC-2026-1105', 'Shopee / TikTok Affiliate Payout', 'side_hustle', 1450.00, '2026-11-05', '1st_kinsenas', 'maya', 'received', 'Household', 'Extra commission');

-- ============================================================================
-- TABLE 4: expenses (Needs, Wants & Utang Payments)
-- ============================================================================
DROP TABLE IF EXISTS `expenses`;
CREATE TABLE `expenses` (
  `id` VARCHAR(40) NOT NULL,
  `title` VARCHAR(160) NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `pillar` ENUM('need', 'want', 'utang_payment') NOT NULL,
  `category` VARCHAR(80) NOT NULL,
  `expense_date` DATE NOT NULL,
  `cutoff` ENUM('1st_kinsenas', '2nd_kinsenas') NOT NULL DEFAULT '1st_kinsenas',
  `wallet_id` VARCHAR(20) NOT NULL,
  `is_from_grocery_checklist` TINYINT(1) NOT NULL DEFAULT 0,
  `notes` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_expenses_pillar` (`pillar`),
  KEY `idx_expenses_date` (`expense_date`),
  KEY `idx_expenses_wallet` (`wallet_id`),
  CONSTRAINT `fk_expenses_wallet` FOREIGN KEY (`wallet_id`) REFERENCES `wallets` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `expenses` (`id`, `title`, `amount`, `pillar`, `category`, `expense_date`, `cutoff`, `wallet_id`, `is_from_grocery_checklist`, `notes`) VALUES
('EXP-2026-1101', 'Weekend Palengke (Baboy, Manok, Bangus, Gulay)', 1850.00, 'need', 'Palengke & Wet Market', '2026-11-02', '1st_kinsenas', 'cash', 1, 'Weekly wet market meat & veggies'),
('EXP-2026-1102', 'Jasmine Bigas (25kg Sack)', 1380.00, 'need', 'Bigas & Staples', '2026-11-02', '1st_kinsenas', 'cash', 1, '1 sack for November'),
('EXP-2026-1103', 'Supermarket Pantry & Laundry Restock', 1420.00, 'need', 'Supermarket & Pantry', '2026-11-03', '1st_kinsenas', 'gcash', 1, 'Canned goods, detergent, bath soap'),
('EXP-2026-1104', 'Converge Fiber Wi-Fi Monthly Bill', 1500.00, 'need', 'Internet & Load', '2026-11-03', '1st_kinsenas', 'maya', 0, 'Paid on time via Maya'),
('EXP-2026-1105', 'Maynilad Water Bill + 4 Drinking Gallons', 540.00, 'need', 'Tubig & Water Refills', '2026-11-04', '1st_kinsenas', 'gcash', 0, 'Tap water + purified refills'),
('EXP-2026-1106', 'Family Weekend Fast Food Delivery', 645.00, 'want', 'Fast Food & Delivery', '2026-11-04', '1st_kinsenas', 'gcash', 0, 'Sunday dinner treat'),
('EXP-2026-1107', 'Iced Coffee & Pastries Merienda', 290.00, 'want', 'Iced Coffee & Milk Tea', '2026-11-05', '1st_kinsenas', 'gcash', 0, 'Afternoon craving'),
('EXP-2026-1108', 'Shopee Non-Stick Pan & Kitchen Organizer', 580.00, 'want', 'Shopee / Lazada / TikTok', '2026-11-05', '1st_kinsenas', 'maya', 0, '11.11 early checkout'),
('EXP-2026-1109', 'Home Credit Inverter Ref (Month 5 of 12)', 1850.00, 'utang_payment', 'Home Credit / Appliance', '2026-11-05', '1st_kinsenas', 'bank', 0, 'Monthly appliance installment');

-- ============================================================================
-- TABLE 5: grocery_items (Interactive Palengke, Supermarket & Needs Checklist)
-- ============================================================================
DROP TABLE IF EXISTS `grocery_items`;
CREATE TABLE `grocery_items` (
  `id` VARCHAR(40) NOT NULL,
  `name` VARCHAR(140) NOT NULL,
  `category` ENUM('Palengke (Meat, Fish, Gulay)', 'Supermarket & Pantry', 'Bigas & Kusina Staples', 'Toiletries & Laundry', 'Medicine & First Aid') NOT NULL,
  `quantity` VARCHAR(50) NOT NULL DEFAULT '1 pc',
  `estimated_price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `actual_price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `last_price_paid` DECIMAL(10,2) DEFAULT NULL,
  `is_checked` TINYINT(1) NOT NULL DEFAULT 0,
  `pillar` ENUM('need', 'want') NOT NULL DEFAULT 'need',
  `stock_status` ENUM('in_stock', 'running_low', 'out_of_stock') NOT NULL DEFAULT 'running_low',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `grocery_items` (`id`, `name`, `category`, `quantity`, `estimated_price`, `actual_price`, `last_price_paid`, `is_checked`, `pillar`, `stock_status`) VALUES
('GROC-01', 'Pork Kasim / Liempo (Pang-Sinigang)', 'Palengke (Meat, Fish, Gulay)', '1 kg', 360.00, 360.00, 350.00, 1, 'need', 'out_of_stock'),
('GROC-02', 'Whole Dressed Chicken (Manok)', 'Palengke (Meat, Fish, Gulay)', '1.5 kg', 285.00, 285.00, 280.00, 1, 'need', 'out_of_stock'),
('GROC-03', 'Fresh Bangus & Galunggong', 'Palengke (Meat, Fish, Gulay)', '1 kg', 220.00, 220.00, 225.00, 1, 'need', 'running_low'),
('GROC-04', 'Fresh Eggs (1 Full Tray - Large)', 'Bigas & Kusina Staples', '30 pcs', 235.00, 235.00, 230.00, 1, 'need', 'running_low'),
('GROC-05', 'Bawang, Sibuyas, Kamatis & Luya Pack', 'Palengke (Meat, Fish, Gulay)', '1 set', 140.00, 140.00, 135.00, 1, 'need', 'running_low'),
('GROC-06', 'Cooking Oil (Coconut / Palm Oil)', 'Bigas & Kusina Staples', '1 Liter', 115.00, 115.00, 110.00, 0, 'need', 'in_stock'),
('GROC-07', 'Toyo, Suka & Patis Refill Pack', 'Bigas & Kusina Staples', '1 trio pack', 95.00, 95.00, 95.00, 0, 'need', 'in_stock'),
('GROC-08', 'Laundry Detergent Powder & FabCon', 'Toiletries & Laundry', '2 kg + 1L', 290.00, 290.00, 285.00, 0, 'need', 'running_low'),
('GROC-09', 'Dishwashing Liquid Antibac Pouch', 'Toiletries & Laundry', '800 ml', 85.00, 85.00, 89.00, 0, 'need', 'in_stock'),
('GROC-10', 'Paracetamol, Vitamin C & First Aid', 'Medicine & First Aid', '20 tabs', 180.00, 180.00, 180.00, 0, 'need', 'in_stock'),
('GROC-11', 'Ice Cream Tub & Potato Chips (Weekend Treat)', 'Supermarket & Pantry', '1 tub + 2 bags', 295.00, 295.00, 280.00, 1, 'want', 'out_of_stock');

-- ============================================================================
-- TABLE 6: kusina_supplies (Bigas, LPG & Water Gallon Run-Out Trackers)
-- ============================================================================
DROP TABLE IF EXISTS `kusina_supplies`;
CREATE TABLE `kusina_supplies` (
  `id` VARCHAR(30) NOT NULL,
  `item` VARCHAR(80) NOT NULL,
  `last_refill_date` DATE NOT NULL,
  `cost` DECIMAL(10,2) NOT NULL,
  `estimated_days_duration` INT NOT NULL DEFAULT 30,
  `remaining_percent` INT NOT NULL DEFAULT 100,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `kusina_supplies` (`id`, `item`, `last_refill_date`, `cost`, `estimated_days_duration`, `remaining_percent`) VALUES
('SUP-BIGAS', 'Bigas (25kg Sack)', '2026-11-02', 1380.00, 30, 82),
('SUP-LPG', 'LPG Tank (11kg)', '2026-09-25', 995.00, 60, 28),
('SUP-WATER', 'Drinking Water Gallons', '2026-11-04', 140.00, 7, 65);

-- ============================================================================
-- TABLE 7: wishlist_items (Budol Guard Cooling-Off List)
-- ============================================================================
DROP TABLE IF EXISTS `wishlist_items`;
CREATE TABLE `wishlist_items` (
  `id` VARCHAR(40) NOT NULL,
  `name` VARCHAR(140) NOT NULL,
  `price` DECIMAL(12,2) NOT NULL,
  `category` VARCHAR(80) NOT NULL,
  `added_date` DATE NOT NULL,
  `cooling_off_days` INT NOT NULL DEFAULT 7,
  `priority` ENUM('Low', 'Medium', 'High') NOT NULL DEFAULT 'Medium',
  `notes` VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `wishlist_items` (`id`, `name`, `price`, `category`, `added_date`, `cooling_off_days`, `priority`, `notes`) VALUES
('WISH-01', 'Digital Air Fryer 4.5L (Kusina Upgrade)', 1650.00, 'Home Upgrades & Treats', '2026-11-01', 7, 'Medium', 'Wait for 11.11 voucher'),
('WISH-02', 'Family Samgyupsal Dinner Out', 1400.00, 'Family Eat-Out', '2026-11-03', 5, 'Low', 'Check if Wants budget has leftover on 15th'),
('WISH-03', 'Extra Stand Fan for Living Room', 1150.00, 'Home Upgrades & Treats', '2026-11-04', 7, 'High', 'Helps reduce aircon hours');

-- ============================================================================
-- TABLE 8: kuryente_bills (6-Month Meralco & Submeter History)
-- ============================================================================
DROP TABLE IF EXISTS `kuryente_bills`;
CREATE TABLE `kuryente_bills` (
  `id` VARCHAR(40) NOT NULL,
  `month_label` VARCHAR(40) NOT NULL,
  `billing_period` VARCHAR(60) NOT NULL,
  `mode` ENUM('direct_meralco', 'submeter') NOT NULL DEFAULT 'direct_meralco',
  `prev_reading` DECIMAL(10,2) NOT NULL,
  `curr_reading` DECIMAL(10,2) NOT NULL,
  `kwh_used` DECIMAL(10,2) NOT NULL,
  `rate_per_kwh` DECIMAL(8,2) NOT NULL,
  `total_amount` DECIMAL(12,2) NOT NULL,
  `due_date` DATE NOT NULL,
  `status` ENUM('paid', 'unpaid', 'partial') NOT NULL DEFAULT 'unpaid',
  `paid_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `notes` VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `kuryente_bills` (`id`, `month_label`, `billing_period`, `mode`, `prev_reading`, `curr_reading`, `kwh_used`, `rate_per_kwh`, `total_amount`, `due_date`, `status`, `paid_amount`, `notes`) VALUES
('KUR-2026-11', 'November 2026', 'Oct 10 – Nov 09, 2026', 'direct_meralco', 4280.00, 4435.00, 155.00, 11.85, 1836.75, '2026-11-22', 'unpaid', 0.00, 'Cooler November evenings'),
('KUR-2026-10', 'October 2026', 'Sep 10 – Oct 09, 2026', 'direct_meralco', 4130.00, 4280.00, 150.00, 11.80, 1770.00, '2026-10-22', 'paid', 1770.00, 'Lowest kWh in 6 months'),
('KUR-2026-09', 'September 2026', 'Aug 10 – Sep 09, 2026', 'direct_meralco', 3966.00, 4130.00, 164.00, 11.75, 1927.00, '2026-09-22', 'paid', 1927.00, 'Rainy season'),
('KUR-2026-08', 'August 2026', 'Jul 10 – Aug 09, 2026', 'direct_meralco', 3804.00, 3966.00, 162.00, 11.70, 1895.40, '2026-08-22', 'paid', 1895.40, 'Cleaned aircon filter'),
('KUR-2026-07', 'July 2026', 'Jun 10 – Jul 09, 2026', 'direct_meralco', 3624.00, 3804.00, 180.00, 11.80, 2124.00, '2026-07-22', 'paid', 2124.00, 'Warm nights'),
('KUR-2026-06', 'June 2026', 'May 10 – Jun 09, 2026', 'direct_meralco', 3419.00, 3624.00, 205.00, 11.95, 2449.75, '2026-06-22', 'paid', 2449.75, 'Peak summer aircon usage');

-- ============================================================================
-- TABLE 9: house_utility_bills (Current Month House Bills Checklist)
-- ============================================================================
DROP TABLE IF EXISTS `house_utility_bills`;
CREATE TABLE `house_utility_bills` (
  `id` VARCHAR(40) NOT NULL,
  `type` ENUM('Kuryente', 'Tubig', 'Internet / Wi-Fi', 'LPG / Gasul', 'Bahay / Rent / HOA') NOT NULL,
  `provider` VARCHAR(80) NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `due_date` DATE NOT NULL,
  `cutoff` ENUM('1st_kinsenas', '2nd_kinsenas') NOT NULL,
  `status` ENUM('paid', 'unpaid') NOT NULL DEFAULT 'unpaid',
  `last_paid_date` DATE DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `house_utility_bills` (`id`, `type`, `provider`, `amount`, `due_date`, `cutoff`, `status`, `last_paid_date`) VALUES
('UTIL-01', 'Kuryente', 'Meralco Residential', 1837.00, '2026-11-22', '2nd_kinsenas', 'unpaid', NULL),
('UTIL-02', 'Tubig', 'Maynilad Water', 420.00, '2026-11-18', '2nd_kinsenas', 'paid', '2026-11-04'),
('UTIL-03', 'Internet / Wi-Fi', 'Converge FiberX 1500', 1500.00, '2026-11-12', '1st_kinsenas', 'paid', '2026-11-03'),
('UTIL-04', 'Bahay / Rent / HOA', 'Pag-IBIG Housing / HOA', 5500.00, '2026-11-15', '1st_kinsenas', 'unpaid', NULL),
('UTIL-05', 'LPG / Gasul', 'Petron Gasul 11kg Reserve', 995.00, '2026-11-25', '2nd_kinsenas', 'unpaid', NULL);

-- ============================================================================
-- TABLE 10: appliance_estimates (Household Appliance kWh Calculator)
-- ============================================================================
DROP TABLE IF EXISTS `appliance_estimates`;
CREATE TABLE `appliance_estimates` (
  `id` VARCHAR(30) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `watts` INT NOT NULL,
  `hours_per_day` DECIMAL(4,1) NOT NULL,
  `days_per_month` INT NOT NULL DEFAULT 30,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `appliance_estimates` (`id`, `name`, `watts`, `hours_per_day`, `days_per_month`) VALUES
('APP-01', '1.0 HP Inverter Split Aircon', 720, 6.0, 25),
('APP-02', 'Two-Door Inverter Refrigerator', 95, 24.0, 30),
('APP-03', 'Stand Fans (2 Units)', 110, 10.0, 30),
('APP-04', 'Rice Cooker & Electric Kettle', 700, 1.0, 30),
('APP-05', 'Automatic Washing Machine', 450, 1.5, 12),
('APP-06', 'Smart TV, Wi-Fi Router & LED Lights', 140, 8.0, 30);

-- ============================================================================
-- TABLE 11: utang_records (Utang ng Bahay & Utang Nila)
-- ============================================================================
DROP TABLE IF EXISTS `utang_payments`;
DROP TABLE IF EXISTS `utang_records`;

CREATE TABLE `utang_records` (
  `id` VARCHAR(40) NOT NULL,
  `direction` ENUM('utang_ko', 'utang_nila') NOT NULL,
  `person_or_lender` VARCHAR(120) NOT NULL,
  `category` VARCHAR(60) NOT NULL,
  `purpose` VARCHAR(160) NOT NULL,
  `purpose_pillar` ENUM('need', 'want') NOT NULL DEFAULT 'need',
  `total_amount` DECIMAL(12,2) NOT NULL,
  `paid_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `monthly_installment` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `total_months` INT NOT NULL DEFAULT 1,
  `paid_months` INT NOT NULL DEFAULT 0,
  `due_date` DATE NOT NULL,
  `cutoff` ENUM('1st_kinsenas', '2nd_kinsenas') NOT NULL DEFAULT '1st_kinsenas',
  `status` ENUM('active', 'paid', 'overdue') NOT NULL DEFAULT 'active',
  `contact_info` VARCHAR(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_utang_direction` (`direction`),
  KEY `idx_utang_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `utang_records` (`id`, `direction`, `person_or_lender`, `category`, `purpose`, `purpose_pillar`, `total_amount`, `paid_amount`, `monthly_installment`, `total_months`, `paid_months`, `due_date`, `cutoff`, `status`, `contact_info`) VALUES
('UTG-KO-01', 'utang_ko', 'Home Credit Philippines', 'Home Credit / Appliance', '2-Door Inverter Refrigerator', 'need', 22200.00, 9250.00, 1850.00, 12, 5, '2026-11-15', '1st_kinsenas', 'active', 'Contract #HC-992104'),
('UTG-KO-02', 'utang_ko', 'SPayLater (Shopee)', 'SPayLater / LazPayLater', 'Vacuum Cleaner & Kitchen Rack (3 Mos)', 'want', 2400.00, 1600.00, 800.00, 3, 2, '2026-11-15', '1st_kinsenas', 'active', 'Shopee App Due 15th'),
('UTG-KO-03', 'utang_ko', 'Aling Nena Sari-Sari Store', 'Sari-Sari Store Lista', 'Emergency Eggs, Bread & Cooking Oil Lista', 'need', 450.00, 150.00, 300.00, 1, 0, '2026-11-15', '1st_kinsenas', 'active', 'Kanto Sari-Sari Store'),
('UTG-NILA-01', 'utang_nila', 'Tita Marites', 'Relatives / Friends', 'Borrowed via GCash for Emergency Medicine', 'need', 3000.00, 1000.00, 1000.00, 3, 1, '2026-11-15', '1st_kinsenas', 'active', '0917-222-9011'),
('UTG-NILA-02', 'utang_nila', 'Kuya Jun (Neighbor)', 'Household Abono', 'Shared Wholesale Sack of Jasmine Rice (Abono)', 'need', 1380.00, 690.00, 690.00, 2, 1, '2026-11-20', '2nd_kinsenas', 'active', '0919-334-1182');

-- ============================================================================
-- TABLE 12: utang_payments (Partial Hulog & Collection History)
-- ============================================================================
CREATE TABLE `utang_payments` (
  `id` VARCHAR(40) NOT NULL,
  `utang_id` VARCHAR(40) NOT NULL,
  `payment_date` DATE NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `wallet_id` VARCHAR(20) NOT NULL,
  `note` VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_upay_utang` (`utang_id`),
  CONSTRAINT `fk_upay_utang` FOREIGN KEY (`utang_id`) REFERENCES `utang_records` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_upay_wallet` FOREIGN KEY (`wallet_id`) REFERENCES `wallets` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `utang_payments` (`id`, `utang_id`, `payment_date`, `amount`, `wallet_id`, `note`) VALUES
('UPAY-01', 'UTG-KO-01', '2026-11-05', 1850.00, 'bank', '5th of 12 monthly hulog'),
('UPAY-02', 'UTG-KO-02', '2026-10-15', 800.00, 'gcash', '2nd installment paid'),
('UPAY-03', 'UTG-NILA-01', '2026-10-30', 1000.00, 'gcash', 'First partial payment from Tita Marites'),
('UPAY-04', 'UTG-NILA-02', '2026-11-02', 690.00, 'cash', 'Half payment for shared Bigas');

-- ============================================================================
-- TABLE 13: monthly_history_snapshots (Last 6 Months History: Jun - Nov 2026)
-- ============================================================================
DROP TABLE IF EXISTS `monthly_history_snapshots`;
CREATE TABLE `monthly_history_snapshots` (
  `month_key` VARCHAR(10) NOT NULL,
  `month_label` VARCHAR(30) NOT NULL,
  `allowance_income` DECIMAL(12,2) NOT NULL,
  `salary_income` DECIMAL(12,2) NOT NULL,
  `side_hustle_income` DECIMAL(12,2) NOT NULL,
  `total_income` DECIMAL(12,2) NOT NULL,
  `groceries_and_food_needs` DECIMAL(12,2) NOT NULL,
  `kuryente_amount` DECIMAL(12,2) NOT NULL,
  `kuryente_kwh` DECIMAL(10,2) NOT NULL,
  `kuryente_rate` DECIMAL(8,2) NOT NULL,
  `tubig_and_wifi_needs` DECIMAL(12,2) NOT NULL,
  `other_house_needs` DECIMAL(12,2) NOT NULL,
  `total_needs` DECIMAL(12,2) NOT NULL,
  `total_wants` DECIMAL(12,2) NOT NULL,
  `utang_paid` DECIMAL(12,2) NOT NULL,
  `net_saved` DECIMAL(12,2) NOT NULL,
  PRIMARY KEY (`month_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `monthly_history_snapshots` (`month_key`, `month_label`, `allowance_income`, `salary_income`, `side_hustle_income`, `total_income`, `groceries_and_food_needs`, `kuryente_amount`, `kuryente_kwh`, `kuryente_rate`, `tubig_and_wifi_needs`, `other_house_needs`, `total_needs`, `total_wants`, `utang_paid`, `net_saved`) VALUES
('2026-06', 'Jun 2026', 8000.00, 30000.00, 3200.00, 41200.00, 10200.00, 2450.00, 205.00, 11.95, 1980.00, 6500.00, 21130.00, 4800.00, 3450.00, 11820.00),
('2026-07', 'Jul 2026', 8000.00, 30000.00, 4100.00, 42100.00, 9850.00, 2124.00, 180.00, 11.80, 1950.00, 6450.00, 20374.00, 4200.00, 3450.00, 14076.00),
('2026-08', 'Aug 2026', 8000.00, 31000.00, 3800.00, 42800.00, 9600.00, 1895.00, 162.00, 11.70, 1920.00, 6400.00, 19815.00, 3900.00, 3250.00, 15835.00),
('2026-09', 'Sep 2026', 8000.00, 31000.00, 5200.00, 44200.00, 9900.00, 1927.00, 164.00, 11.75, 1940.00, 6500.00, 20267.00, 3650.00, 3250.00, 17033.00),
('2026-10', 'Oct 2026', 8000.00, 31000.00, 6800.00, 45800.00, 9750.00, 1770.00, 150.00, 11.80, 1910.00, 6480.00, 19910.00, 3500.00, 2950.00, 19440.00),
('2026-11', 'Nov 2026', 8000.00, 15500.00, 4850.00, 28350.00, 4650.00, 1837.00, 155.00, 11.85, 1920.00, 5500.00, 13907.00, 1515.00, 1850.00, 11078.00);

-- ============================================================================
-- TABLE 14: audit_logs (Tamper-Evident Financial Integrity Ledger)
-- ============================================================================
DROP TABLE IF EXISTS `audit_logs`;
CREATE TABLE `audit_logs` (
  `id` VARCHAR(50) NOT NULL,
  `timestamp` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `action` ENUM('CREATE', 'UPDATE', 'DELETE', 'PAYMENT', 'CHECKOUT', 'WALLET_TRANSFER', 'BILL_PAID', 'SYSTEM_BACKUP') NOT NULL,
  `module` ENUM('WALLET', 'INCOME', 'EXPENSE', 'GROCERY', 'KURYENTE', 'UTANG', 'BUDGET', 'SYSTEM') NOT NULL,
  `summary` VARCHAR(255) NOT NULL,
  `actor` VARCHAR(80) NOT NULL DEFAULT 'Household Admin',
  `amount_delta` DECIMAL(12,2) DEFAULT NULL,
  `previous_value` VARCHAR(140) DEFAULT NULL,
  `new_value` VARCHAR(140) DEFAULT NULL,
  `wallet_affected` VARCHAR(80) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_audit_module` (`module`),
  KEY `idx_audit_action` (`action`),
  KEY `idx_audit_timestamp` (`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `audit_logs` (`id`, `timestamp`, `action`, `module`, `summary`, `actor`, `amount_delta`, `previous_value`, `new_value`, `wallet_affected`) VALUES
('AUD-20261106-005', '2026-11-05 19:30:00', 'PAYMENT', 'UTANG', 'Paid Home Credit Inverter Ref (Month 5 of 12)', 'Utang Ledger', -1850.00, 'Paid: ₱7,400', 'Paid: ₱9,250', 'BDO Family Payroll'),
('AUD-20261106-004', '2026-11-04 14:15:00', 'CREATE', 'INCOME', 'Received Kusina Side Hustle: Home Baked Lasagna Orders', 'Kusina Raket', 3400.00, '₱3,450', '₱6,850', 'GCash Household'),
('AUD-20261106-003', '2026-11-03 10:20:00', 'BILL_PAID', 'KURYENTE', 'Paid Converge FiberX 1500 Monthly Bill', 'Household Treasury', -1500.00, 'Unpaid (₱1,500)', 'Paid via Maya', 'Maya Bills Wallet'),
('AUD-20261106-002', '2026-11-02 08:45:00', 'CHECKOUT', 'GROCERY', 'Checked out Palengke & Bigas 25kg Sack (8 items)', 'Auto-Checkout Engine', -3230.00, '₱8,650', '₱5,420', 'House Cash Envelope'),
('AUD-20261106-001', '2026-11-01 09:00:00', 'CREATE', 'INCOME', 'Logged 1st Kinsenas Net Salary + Monthly House Allowance', 'Household Head', 23500.00, '₱6,650', '₱30,150', 'BDO Family Payroll');

COMMIT;

