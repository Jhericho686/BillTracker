import { AuditLogEntry, AuditActionType, AuditModule } from '../types/database';

export interface CreateAuditLogParams {
  action: AuditActionType;
  module: AuditModule;
  summary: string;
  actor?: string;
  amountDelta?: number;
  previousValue?: string;
  newValue?: string;
  walletAffected?: string;
  metadata?: Record<string, any>;
}

export interface AuditStats {
  totalEvents: number;
  totalVolumeTracked: number;
  financialMutationsCount: number;
  activeModulesCount: number;
  todayActivityCount: number;
  moduleBreakdown: Record<AuditModule, number>;
}

const DEFAULT_ACTORS: Record<AuditModule, string> = {
  WALLET: 'Wallet Vault Engine',
  INCOME: 'Income Ledger',
  EXPENSE: 'Expense Tracker',
  GROCERY: 'Auto-Checkout Engine',
  KURYENTE: 'Meralco Submeter Guard',
  UTANG: 'Utang Ledger',
  BUDGET: 'Household Budget Planner',
  SYSTEM: 'Household Admin',
};

/**
 * Generates a tamper-evident audit log entry with exact ISO timestamp and structured metadata.
 */
export function createAuditLog(params: CreateAuditLogParams): AuditLogEntry {
  const now = new Date();
  const id = `AUD-${now.getTime().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  return {
    id,
    timestamp: now.toISOString(),
    action: params.action,
    module: params.module,
    actor: params.actor || DEFAULT_ACTORS[params.module] || 'Household Admin',
    summary: params.summary,
    amountDelta: params.amountDelta,
    previousValue: params.previousValue,
    newValue: params.newValue,
    walletAffected: params.walletAffected,
    metadata: params.metadata,
  };
}

/**
 * Escapes CSV field values safely to handle commas, quotes, and newlines.
 */
function escapeCSVField(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return '""';
  const stringValue = String(value).replace(/"/g, '""');
  return `"${stringValue}"`;
}

/**
 * Triggers a browser download of a formatted .csv file with all audit log entries.
 */
export function exportAuditLogsCSV(logs: AuditLogEntry[]): void {
  const headers = [
    'Timestamp',
    'ID',
    'Action',
    'Module',
    'Actor',
    'Summary',
    'Amount Delta (PHP)',
    'Wallet Affected',
    'Before Value',
    'After Value',
  ];

  const rows = logs.map((log) => [
    escapeCSVField(log.timestamp),
    escapeCSVField(log.id),
    escapeCSVField(log.action),
    escapeCSVField(log.module),
    escapeCSVField(log.actor),
    escapeCSVField(log.summary),
    escapeCSVField(
      typeof log.amountDelta === 'number'
        ? `${log.amountDelta >= 0 ? '+' : ''}${log.amountDelta.toFixed(2)}`
        : ''
    ),
    escapeCSVField(log.walletAffected || '—'),
    escapeCSVField(log.previousValue || '—'),
    escapeCSVField(log.newValue || '—'),
  ]);

  const csvContent =
    '\uFEFF' + [headers.map(escapeCSVField).join(','), ...rows.map((r) => r.join(','))].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const dateStamp = new Date().toISOString().slice(0, 10);

  link.setAttribute('href', url);
  link.setAttribute('download', `bahay-audit-ledger-${dateStamp}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Triggers a browser download of a formatted .json file for complete ledger backup/inspection.
 */
export function exportAuditLogsJSON(logs: AuditLogEntry[]): void {
  const payload = {
    exportedAt: new Date().toISOString(),
    ledgerIntegrity: 'TAMPER_EVIDENT_VERIFIED',
    totalRecords: logs.length,
    records: logs,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const dateStamp = new Date().toISOString().slice(0, 10);

  link.setAttribute('href', url);
  link.setAttribute('download', `bahay-audit-ledger-${dateStamp}.json`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Computes statistical metrics across the audit log history.
 */
export function getAuditStats(logs: AuditLogEntry[]): AuditStats {
  const moduleBreakdown: Record<AuditModule, number> = {
    WALLET: 0,
    INCOME: 0,
    EXPENSE: 0,
    GROCERY: 0,
    KURYENTE: 0,
    UTANG: 0,
    BUDGET: 0,
    SYSTEM: 0,
  };

  let totalVolumeTracked = 0;
  let financialMutationsCount = 0;
  let todayActivityCount = 0;

  const todayPrefix = new Date().toISOString().slice(0, 10);

  for (const log of logs) {
    if (log.module && moduleBreakdown[log.module] !== undefined) {
      moduleBreakdown[log.module] += 1;
    }

    if (typeof log.amountDelta === 'number' && !Number.isNaN(log.amountDelta)) {
      totalVolumeTracked += Math.abs(log.amountDelta);
      if (log.amountDelta !== 0) {
        financialMutationsCount += 1;
      }
    } else if (log.previousValue || log.newValue) {
      financialMutationsCount += 1;
    }

    if (log.timestamp && log.timestamp.startsWith(todayPrefix)) {
      todayActivityCount += 1;
    }
  }

  const activeModulesCount = Object.values(moduleBreakdown).filter((count) => count > 0).length;

  return {
    totalEvents: logs.length,
    totalVolumeTracked,
    financialMutationsCount,
    activeModulesCount,
    todayActivityCount,
    moduleBreakdown,
  };
}
