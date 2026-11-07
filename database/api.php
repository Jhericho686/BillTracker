<?php
/**
 * BAHAYGLASS — XAMPP (PHP + MySQL/MariaDB) Full 2-Way REST Sync API
 * ---------------------------------------------------------------------------
 * Endpoints:
 *   GET  http://localhost/bahayglass/api.php?endpoint=full_state
 *   POST http://localhost/bahayglass/api.php?endpoint=sync_state
 */

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");
header("X-Content-Type-Options: nosniff");
header("X-Frame-Options: DENY");
header("Referrer-Policy: no-referrer");
header("X-XSS-Protection: 1; mode=block");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Enforce maximum 2MB payload limit on POST/PUT requests to prevent DoS
$maxPayloadBytes = 2 * 1024 * 1024;
if (!empty($_SERVER['CONTENT_LENGTH']) && (int)$_SERVER['CONTENT_LENGTH'] > $maxPayloadBytes) {
    http_response_code(413);
    echo json_encode([
        "ok" => false,
        "error" => "Payload Too Large: Request body exceeds 2MB security limit."
    ]);
    exit();
}

$host = '127.0.0.1';
$db   = 'bahayglass_db';
$user = 'root';
$pass = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8mb4", $user, $pass, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "ok" => false,
        "error" => "XAMPP MySQL Connection Failed: " . $e->getMessage()
    ]);
    exit();
}

$endpoint = $_GET['endpoint'] ?? 'full_state';

// ============================================================================
// POST: Sync Full React State -> XAMPP MySQL Tables
// ============================================================================
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $endpoint === 'sync_state') {
    $raw = file_get_contents("php://input", false, null, 0, $maxPayloadBytes + 1);
    if ($raw !== false && strlen($raw) > $maxPayloadBytes) {
        http_response_code(413);
        echo json_encode(["ok" => false, "error" => "Payload exceeds 2MB security limit"]);
        exit();
    }
    $data = json_decode($raw, true);

    if (!$data || !is_array($data)) {
        http_response_code(400);
        echo json_encode(["ok" => false, "error" => "Invalid JSON payload"]);
        exit();
    }

    try {
        $pdo->beginTransaction();

        // 1. Update household_settings
        $stmtSettings = $pdo->prepare("
            UPDATE household_settings
            SET monthly_allowance_budget = ?,
                groceries_budget = ?,
                kuryente_budget = ?,
                wants_budget = ?,
                active_cutoff = ?,
                privacy_mode = ?
            WHERE id = 1
        ");
        $stmtSettings->execute([
            $data['monthlyAllowanceBudget'] ?? 18000,
            $data['groceriesBudget'] ?? 10500,
            $data['kuryenteBudget'] ?? 2200,
            $data['wantsBudget'] ?? 4500,
            $data['activeCutoff'] ?? '1st_kinsenas',
            !empty($data['privacyMode']) ? 1 : 0,
        ]);

        // 2. Sync wallets
        if (!empty($data['wallets']) && is_array($data['wallets'])) {
            $stmtWallet = $pdo->prepare("
                INSERT INTO wallets (id, name, type, balance, account_number, color)
                VALUES (?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    name = VALUES(name),
                    type = VALUES(type),
                    balance = VALUES(balance),
                    account_number = VALUES(account_number),
                    color = VALUES(color)
            ");
            foreach ($data['wallets'] as $w) {
                $stmtWallet->execute([
                    $w['id'],
                    $w['name'],
                    $w['type'],
                    $w['balance'],
                    $w['accountNumber'] ?? null,
                    $w['color'] ?? 'violet',
                ]);
            }
        }

        // 3. Sync incomes
        if (isset($data['incomes']) && is_array($data['incomes'])) {
            $pdo->exec("DELETE FROM incomes");
            $stmtInc = $pdo->prepare("
                INSERT INTO incomes (id, title, type, amount, income_date, cutoff, wallet_id, status, contributor, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            foreach ($data['incomes'] as $inc) {
                $stmtInc->execute([
                    $inc['id'],
                    $inc['title'],
                    $inc['type'],
                    $inc['amount'],
                    $inc['date'],
                    $inc['cutoff'],
                    $inc['walletId'],
                    $inc['status'],
                    $inc['contributor'] ?? 'Household',
                    $inc['notes'] ?? null,
                ]);
            }
        }

        // 4. Sync expenses
        if (isset($data['expenses']) && is_array($data['expenses'])) {
            $pdo->exec("DELETE FROM expenses");
            $stmtExp = $pdo->prepare("
                INSERT INTO expenses (id, title, amount, pillar, category, expense_date, cutoff, wallet_id, is_from_grocery_checklist, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            foreach ($data['expenses'] as $exp) {
                $stmtExp->execute([
                    $exp['id'],
                    $exp['title'],
                    $exp['amount'],
                    $exp['pillar'],
                    $exp['category'],
                    $exp['date'],
                    $exp['cutoff'],
                    $exp['walletId'],
                    !empty($exp['isFromGroceryChecklist']) ? 1 : 0,
                    $exp['notes'] ?? null,
                ]);
            }
        }

        // 5. Sync grocery_items
        if (isset($data['groceries']) && is_array($data['groceries'])) {
            $pdo->exec("DELETE FROM grocery_items");
            $stmtGroc = $pdo->prepare("
                INSERT INTO grocery_items (id, name, category, quantity, estimated_price, actual_price, last_price_paid, is_checked, pillar, stock_status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            foreach ($data['groceries'] as $g) {
                $stmtGroc->execute([
                    $g['id'],
                    $g['name'],
                    $g['category'],
                    $g['quantity'],
                    $g['estimatedPrice'],
                    $g['actualPrice'],
                    $g['lastPricePaid'] ?? null,
                    !empty($g['isChecked']) ? 1 : 0,
                    $g['pillar'],
                    $g['stockStatus'],
                ]);
            }
        }

        // 6. Sync kusina_supplies
        if (isset($data['supplies']) && is_array($data['supplies'])) {
            $pdo->exec("DELETE FROM kusina_supplies");
            $stmtSup = $pdo->prepare("
                INSERT INTO kusina_supplies (id, item, last_refill_date, cost, estimated_days_duration, remaining_percent)
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            foreach ($data['supplies'] as $s) {
                $stmtSup->execute([
                    $s['id'],
                    $s['item'],
                    $s['lastRefillDate'],
                    $s['cost'],
                    $s['estimatedDaysDuration'],
                    $s['remainingPercent'],
                ]);
            }
        }

        // 7. Sync wishlist_items
        if (isset($data['wishlist']) && is_array($data['wishlist'])) {
            $pdo->exec("DELETE FROM wishlist_items");
            $stmtWish = $pdo->prepare("
                INSERT INTO wishlist_items (id, name, price, category, added_date, cooling_off_days, priority, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ");
            foreach ($data['wishlist'] as $w) {
                $stmtWish->execute([
                    $w['id'],
                    $w['name'],
                    $w['price'],
                    $w['category'],
                    $w['addedDate'],
                    $w['coolingOffDays'],
                    $w['priority'],
                    $w['notes'] ?? null,
                ]);
            }
        }

        // 8. Sync kuryente_bills
        if (isset($data['kuryenteBills']) && is_array($data['kuryenteBills'])) {
            $pdo->exec("DELETE FROM kuryente_bills");
            $stmtKur = $pdo->prepare("
                INSERT INTO kuryente_bills (id, month_label, billing_period, mode, prev_reading, curr_reading, kwh_used, rate_per_kwh, total_amount, due_date, status, paid_amount, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            foreach ($data['kuryenteBills'] as $k) {
                $stmtKur->execute([
                    $k['id'],
                    $k['month'],
                    $k['billingPeriod'],
                    $k['mode'],
                    $k['prevReading'],
                    $k['currReading'],
                    $k['kwhUsed'],
                    $k['ratePerKwh'],
                    $k['totalAmount'],
                    $k['dueDate'],
                    $k['status'],
                    $k['paidAmount'],
                    $k['notes'] ?? null,
                ]);
            }
        }

        // 9. Sync house_utility_bills
        if (isset($data['utilityBills']) && is_array($data['utilityBills'])) {
            $pdo->exec("DELETE FROM house_utility_bills");
            $stmtUtil = $pdo->prepare("
                INSERT INTO house_utility_bills (id, type, provider, amount, due_date, cutoff, status, last_paid_date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ");
            foreach ($data['utilityBills'] as $u) {
                $stmtUtil->execute([
                    $u['id'],
                    $u['type'],
                    $u['provider'],
                    $u['amount'],
                    $u['dueDate'],
                    $u['cutoff'],
                    $u['status'],
                    $u['lastPaidDate'] ?? null,
                ]);
            }
        }

        // 10. Sync utang_records & utang_payments
        if (isset($data['utangs']) && is_array($data['utangs'])) {
            $pdo->exec("DELETE FROM utang_payments");
            $pdo->exec("DELETE FROM utang_records");
            $stmtUtg = $pdo->prepare("
                INSERT INTO utang_records (id, direction, person_or_lender, category, purpose, purpose_pillar, total_amount, paid_amount, monthly_installment, total_months, paid_months, due_date, cutoff, status, contact_info)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmtUpay = $pdo->prepare("
                INSERT INTO utang_payments (id, utang_id, payment_date, amount, wallet_id, note)
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            foreach ($data['utangs'] as $u) {
                $stmtUtg->execute([
                    $u['id'],
                    $u['direction'],
                    $u['personOrLender'],
                    $u['category'],
                    $u['purpose'],
                    $u['purposePillar'],
                    $u['totalAmount'],
                    $u['paidAmount'],
                    $u['monthlyInstallment'],
                    $u['totalMonths'],
                    $u['paidMonths'],
                    $u['dueDate'],
                    $u['cutoff'],
                    $u['status'],
                    $u['contactInfo'] ?? null,
                ]);
                if (!empty($u['paymentHistory']) && is_array($u['paymentHistory'])) {
                    foreach ($u['paymentHistory'] as $p) {
                        $stmtUpay->execute([
                            $p['id'],
                            $u['id'],
                            $p['date'],
                            $p['amount'],
                            $p['walletId'],
                            $p['note'] ?? null,
                        ]);
                    }
                }
            }
        }

        // 11. Sync audit_logs (latest 100 entries)
        if (isset($data['auditLogs']) && is_array($data['auditLogs'])) {
            $stmtAud = $pdo->prepare("
                INSERT IGNORE INTO audit_logs (id, timestamp, action, module, summary, actor, amount_delta, previous_value, new_value, wallet_affected)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            foreach (array_slice($data['auditLogs'], 0, 100) as $log) {
                $ts = date('Y-m-d H:i:s', strtotime($log['timestamp'] ?? 'now'));
                $stmtAud->execute([
                    $log['id'],
                    $ts,
                    $log['action'],
                    $log['module'],
                    $log['summary'],
                    $log['actor'] ?? 'Household Admin',
                    $log['amountDelta'] ?? null,
                    $log['previousValue'] ?? null,
                    $log['newValue'] ?? null,
                    $log['walletAffected'] ?? null,
                ]);
            }
        }

        $pdo->commit();
        echo json_encode([
            "ok" => true,
            "syncedAt" => date('Y-m-d H:i:s'),
            "message" => "Synced Household State to XAMPP MySQL (bahayglass_db)"
        ]);
        exit();
    } catch (Exception $ex) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode([
            "ok" => false,
            "error" => "Sync Transaction Error: " . $ex->getMessage()
        ]);
        exit();
    }
}

// ============================================================================
// GET: Read Full State from XAMPP MySQL Tables
// ============================================================================
if ($_SERVER['REQUEST_METHOD'] === 'GET' && $endpoint === 'full_state') {
    $settings   = $pdo->query("SELECT * FROM household_settings LIMIT 1")->fetch();
    $wallets    = $pdo->query("SELECT * FROM wallets")->fetchAll();
    $incomes    = $pdo->query("SELECT * FROM incomes ORDER BY income_date DESC")->fetchAll();
    $expenses   = $pdo->query("SELECT * FROM expenses ORDER BY expense_date DESC")->fetchAll();
    $groceries  = $pdo->query("SELECT * FROM grocery_items")->fetchAll();
    $supplies   = $pdo->query("SELECT * FROM kusina_supplies")->fetchAll();
    $wishlist   = $pdo->query("SELECT * FROM wishlist_items")->fetchAll();
    $kuryente   = $pdo->query("SELECT * FROM kuryente_bills ORDER BY due_date DESC")->fetchAll();
    $utilities  = $pdo->query("SELECT * FROM house_utility_bills ORDER BY due_date ASC")->fetchAll();
    $appliances = $pdo->query("SELECT * FROM appliance_estimates")->fetchAll();
    $utangs     = $pdo->query("SELECT * FROM utang_records ORDER BY due_date ASC")->fetchAll();
    $payments   = $pdo->query("SELECT * FROM utang_payments ORDER BY payment_date DESC")->fetchAll();
    $history    = $pdo->query("SELECT * FROM monthly_history_snapshots ORDER BY month_key ASC")->fetchAll();
    $audits     = $pdo->query("SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 200")->fetchAll();

    echo json_encode([
        "ok" => true,
        "database" => "bahayglass_db (XAMPP MySQL)",
        "tableCounts" => [
            "wallets" => count($wallets),
            "incomes" => count($incomes),
            "expenses" => count($expenses),
            "groceries" => count($groceries),
            "kuryenteBills" => count($kuryente),
            "utangs" => count($utangs),
            "auditLogs" => count($audits),
        ],
        "settings" => $settings,
        "wallets" => $wallets,
        "incomes" => $incomes,
        "expenses" => $expenses,
        "groceries" => $groceries,
        "supplies" => $supplies,
        "wishlist" => $wishlist,
        "kuryenteBills" => $kuryente,
        "utilityBills" => $utilities,
        "appliances" => $appliances,
        "utangs" => $utangs,
        "utangPayments" => $payments,
        "sixMonthHistory" => $history,
        "auditLogs" => $audits,
    ], JSON_PRETTY_PRINT);
    exit();
}

// ============================================================================
// POST: Send Welcome & Thank You Email to User's Gmail on Sign Up
// ============================================================================
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $endpoint === 'send_welcome_email') {
    $raw = file_get_contents("php://input");
    $payload = json_decode($raw, true);
    $toEmail = $payload['email'] ?? '';
    $name = $payload['name'] ?? 'Household Member';
    $subject = $payload['subject'] ?? 'Thank You for Using BillsTracker!';
    $message = $payload['message'] ?? 'Thank you for registering with BillsTracker.';

    $sent = false;
    if (!empty($toEmail) && filter_var($toEmail, FILTER_VALIDATE_EMAIL)) {
        $headers = "From: BillsTracker <no-reply@billstracker.local>\r\n" .
                   "Reply-To: no-reply@billstracker.local\r\n" .
                   "Content-Type: text/plain; charset=UTF-8\r\n";
        $sent = @mail($toEmail, $subject, $message, $headers);
    }

    echo json_encode([
        "ok" => true,
        "email" => $toEmail,
        "mailDispatched" => $sent,
        "message" => "Welcome & Thank You notification queued for $toEmail"
    ]);
    exit();
}

echo json_encode(["ok" => true, "message" => "BillsTracker XAMPP API is running"]);
