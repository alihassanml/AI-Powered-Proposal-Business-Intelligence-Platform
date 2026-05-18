import { useState, useRef } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { useAuth } from '../context/AuthContext';
import {
  MailCheck, Search, Upload, Download, LoaderCircle,
  CheckCircle, XCircle, AlertCircle, HelpCircle, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE_URL = 'http://localhost:8000';

interface VerifyResult {
  email: string;
  valid_format: boolean;
  disposable: boolean;
  free_provider: boolean;
  role_account: boolean;
  has_mx_record: boolean;
  mx_host: string;
  deliverable: boolean | null;
  smtp_response: string;
  smtp_error: string;
  score: number;
  verdict: 'valid' | 'invalid' | 'risky' | 'unknown';
  verdict_reason: string;
}

type VerdictFilter = 'all' | 'valid' | 'invalid' | 'risky' | 'unknown';

const VERDICT_META = {
  valid:   { label: 'Valid',   icon: CheckCircle,  cls: 'bg-primary/10 text-primary border-primary/20' },
  invalid: { label: 'Invalid', icon: XCircle,      cls: 'bg-secondary/10 text-secondary border-secondary/20' },
  risky:   { label: 'Risky',   icon: AlertCircle,  cls: 'bg-tertiary/20 text-primary border-tertiary/40' },
  unknown: { label: 'Unknown', icon: HelpCircle,   cls: 'bg-secondary/10 text-secondary border-secondary/20' },
};

function VerdictBadge({ verdict }: { verdict: VerifyResult['verdict'] }) {
  const m = VERDICT_META[verdict] || VERDICT_META.unknown;
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wide ${m.cls}`}>
      <Icon size={10} />
      {m.label}
    </span>
  );
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 70 ? 'bg-primary' : score >= 40 ? 'bg-tertiary' : 'bg-error';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-surface-container rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-[10px] font-bold text-on-surface-variant w-6 text-right">{score}</span>
    </div>
  );
}

// ─── CSV column picker modal ───────────────────────────────────────────

function ColumnPickerModal({
  headers,
  onSelect,
  onClose,
}: {
  headers: string[];
  onSelect: (col: string) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState(
    headers.find(h => /email/i.test(h)) || headers[0] || ''
  );
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/30 backdrop-blur-sm p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
        className="bg-white border border-outline-variant rounded-2xl shadow-2xl p-6 w-full max-w-sm"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-bold text-on-surface">Select Email Column</span>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-container-low text-on-surface-variant">
            <X size={16} />
          </button>
        </div>
        <p className="text-xs text-on-surface-variant mb-4">
          Which column in your CSV contains email addresses?
        </p>
        <div className="space-y-1.5 mb-5 max-h-48 overflow-y-auto">
          {headers.map(h => (
            <button key={h} onClick={() => setSelected(h)}
              className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                selected === h
                  ? 'bg-secondary text-white'
                  : 'bg-surface-container-low hover:bg-surface-container text-on-surface'
              }`}
            >
              {h}
            </button>
          ))}
        </div>
        <button
          onClick={() => { if (selected) onSelect(selected); }}
          disabled={!selected}
          className="w-full bg-primary text-white py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          Verify Emails in "{selected}"
        </button>
      </motion.div>
    </motion.div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────

const API_HEADERS = (token: string | null) =>
  token ? { Authorization: `Bearer ${token}` } : {};

function buildSummary(results: VerifyResult[]) {
  const v = results.filter(r => r.verdict === 'valid').length;
  const i = results.filter(r => r.verdict === 'invalid').length;
  const r = results.filter(r => r.verdict === 'risky').length;
  const u = results.filter(r => r.verdict === 'unknown').length;
  return [v && `${v} valid`, i && `${i} invalid`, r && `${r} risky`, u && `${u} unknown`]
    .filter(Boolean).join(' · ');
}

async function saveEmailHistory(
  token: string | null,
  title: string,
  results: VerifyResult[],
) {
  if (!token || !results.length) return;
  try {
    await axios.post(
      `${API_BASE_URL}/history`,
      {
        type: 'email',
        title,
        summary: buildSummary(results),
        data: JSON.stringify({ results, count: results.length }),
      },
      { headers: API_HEADERS(token) },
    );
  } catch { /* non-critical */ }
}

export default function EmailVerifyPage() {
  const { token } = useAuth();
  const [singleEmail, setSingleEmail] = useState('');
  const [loading, setLoading]         = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState('');
  const [results, setResults]         = useState<VerifyResult[]>([]);
  const [filter, setFilter]           = useState<VerdictFilter>('all');
  const [error, setError]             = useState('');

  const [csvHeaders, setCsvHeaders]   = useState<string[]>([]);
  const [csvRows, setCsvRows]         = useState<Record<string, string>[]>([]);
  const [showColPicker, setShowColPicker] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Single verify ──
  const verifySingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleEmail.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${API_BASE_URL}/email/verify`, {
        params: { email: singleEmail.trim() },
      });
      setResults(prev => {
        const updated = prev.filter(r => r.email !== res.data.email);
        return [res.data, ...updated];
      });
      await saveEmailHistory(token, `Verified: ${singleEmail.trim()}`, [res.data]);
      setSingleEmail('');
    } catch {
      setError('Could not verify. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  // ── File upload (CSV / XLSX / XLS) ──

  // Proper RFC-4180 CSV line parser — handles quoted fields with embedded commas/newlines
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
        else { inQuotes = !inQuotes; }
      } else if (ch === ',' && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    result.push(cur.trim());
    return result;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const ext = file.name.split('.').pop()?.toLowerCase();
    const isExcel = ext === 'xlsx' || ext === 'xls';

    const reader = new FileReader();

    reader.onload = (ev) => {
      try {
        let headers: string[] = [];
        let rows: Record<string, string>[] = [];

        if (isExcel) {
          const data = new Uint8Array(ev.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
          if (!jsonRows.length) { setError('Spreadsheet appears to be empty.'); return; }
          headers = Object.keys(jsonRows[0]);
          rows = jsonRows
            .map(r => Object.fromEntries(headers.map(h => [h, String(r[h] ?? '').trim()])))
            .filter(r => Object.values(r).some(v => v));
        } else {
          const text = ev.target?.result as string;
          const lines = text.trim().split(/\r?\n/);
          if (lines.length < 2) { setError('CSV file appears to be empty.'); return; }
          headers = parseCSVLine(lines[0]);
          rows = lines.slice(1)
            .map(line => {
              const vals = parseCSVLine(line);
              const obj: Record<string, string> = {};
              headers.forEach((h, i) => { obj[h] = vals[i] ?? ''; });
              return obj;
            })
            .filter(r => Object.values(r).some(v => v));
        }

        setCsvHeaders(headers);
        setCsvRows(rows);
        setShowColPicker(true);
      } catch {
        setError('Could not read the file. Make sure it is a valid CSV or Excel file.');
      }
    };

    if (isExcel) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  };

  const handleColumnSelected = async (col: string) => {
    setShowColPicker(false);
    const emails = csvRows
      .map(r => (r[col] || '').trim())
      .filter(e => e && e.includes('@'));
    if (!emails.length) { setError('No valid emails found in that column.'); return; }

    setBulkLoading(true);
    setError('');
    const BATCH = 50;
    const all: VerifyResult[] = [];

    for (let i = 0; i < emails.length; i += BATCH) {
      const batch = emails.slice(i, i + BATCH);
      setBulkProgress(`Verifying ${Math.min(i + BATCH, emails.length)} / ${emails.length}…`);
      try {
        const res = await axios.post(`${API_BASE_URL}/email/verify/bulk`, batch);
        all.push(...res.data);
      } catch {
        setError('Bulk verify failed. Check backend.');
        break;
      }
    }

    setResults(prev => {
      const existingEmails = new Set(all.map(r => r.email));
      return [...all, ...prev.filter(r => !existingEmails.has(r.email))];
    });
    if (all.length) {
      await saveEmailHistory(token, `Bulk verify: ${all.length} emails`, all);
    }
    setBulkLoading(false);
    setBulkProgress('');
  };

  // ── Export ──
  const exportCSV = () => {
    const visible = filtered;
    const headers = ['Email', 'Verdict', 'Score', 'Valid Format', 'Has MX', 'Deliverable', 'Disposable', 'Free Provider', 'Role Account', 'MX Host', 'Verdict Reason'];
    const rows = visible.map(r => [
      r.email, r.verdict, r.score,
      r.valid_format, r.has_mx_record,
      r.deliverable === null ? 'unknown' : r.deliverable,
      r.disposable, r.free_provider, r.role_account,
      r.mx_host, r.verdict_reason,
    ]);
    const csv = [headers, ...rows]
      .map(row => row.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `email_verify_${Date.now()}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const filtered = filter === 'all' ? results : results.filter(r => r.verdict === filter);

  const counts = {
    valid:   results.filter(r => r.verdict === 'valid').length,
    invalid: results.filter(r => r.verdict === 'invalid').length,
    risky:   results.filter(r => r.verdict === 'risky').length,
    unknown: results.filter(r => r.verdict === 'unknown').length,
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="px-8 pt-8 pb-16">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-sm">
              <MailCheck size={18} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-on-surface">
              Email <span className="text-secondary">Verifier</span>
            </h1>
          </div>
          <p className="text-sm text-on-surface-variant ml-[52px]">
            Syntax · MX record · SMTP handshake · Disposable detection · Role account check. No API key needed.
          </p>
        </motion.div>

        {/* Single verify */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="card border border-outline-variant rounded-2xl p-5 mb-5 bg-white">
          <form onSubmit={verifySingle} className="flex gap-3">
            <div className="flex-1 relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline" />
              <input
                type="email" value={singleEmail}
                onChange={e => setSingleEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full border border-outline-variant rounded-xl pl-10 pr-4 py-3 text-sm text-on-surface bg-white placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all"
              />
            </div>
            <button type="submit" disabled={loading}
              className="flex items-center gap-2 px-5 py-3 bg-primary hover:opacity-90 text-white rounded-xl text-sm font-semibold transition-opacity shadow-sm disabled:opacity-50 whitespace-nowrap">
              {loading ? <LoaderCircle className="animate-spin" size={16} /> : <MailCheck size={16} />}
              {loading ? 'Checking…' : 'Verify'}
            </button>

            {/* CSV upload */}
            <button type="button" onClick={() => fileInputRef.current?.click()}
              disabled={bulkLoading}
              className="flex items-center gap-2 px-4 py-3 border border-outline-variant bg-white hover:bg-surface-container-low text-on-surface rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 whitespace-nowrap">
              {bulkLoading
                ? <><LoaderCircle className="animate-spin" size={15} /> {bulkProgress}</>
                : <><Upload size={15} /> Upload CSV / Excel</>
              }
            </button>
            <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileChange} />
          </form>
        </motion.div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="mb-4 px-4 py-3 bg-error-container border border-error/20 rounded-xl text-sm text-on-error-container font-medium">
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        {results.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>

            {/* Stats + filter toolbar */}
            <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Filter pills */}
                {(['all', 'valid', 'invalid', 'risky', 'unknown'] as VerdictFilter[]).map(v => (
                  <button key={v} onClick={() => setFilter(v)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                      filter === v
                        ? v === 'all'
                          ? 'bg-on-surface text-white border-on-surface'
                          : `border ${VERDICT_META[v as keyof typeof VERDICT_META]?.cls} opacity-100`
                        : 'bg-white border-outline-variant text-on-surface-variant hover:border-secondary/40'
                    }`}
                  >
                    {v === 'all' ? `All (${results.length})` : `${VERDICT_META[v as keyof typeof VERDICT_META]?.label} (${counts[v as keyof typeof counts]})`}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setResults([])}
                  className="px-3 py-1.5 border border-outline-variant bg-white hover:bg-error/5 hover:border-error/30 hover:text-error text-on-surface-variant rounded-xl text-xs font-semibold transition-colors">
                  Clear all
                </button>
                <button onClick={exportCSV}
                  className="flex items-center gap-2 px-3 py-1.5 border border-outline-variant bg-white hover:bg-surface-container-low text-on-surface rounded-xl text-xs font-semibold transition-colors">
                  <Download size={13} /> Export CSV ({filtered.length})
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="card border border-outline-variant rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-outline-variant bg-surface-container-low">
                      {['#', 'Email', 'Verdict', 'Score', 'Deliverable', 'Disposable', 'Provider', 'Role', 'MX Host'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center py-10 text-sm text-on-surface-variant">
                          No results match this filter.
                        </td>
                      </tr>
                    ) : filtered.map((r, i) => (
                      <motion.tr key={r.email}
                        initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: Math.min(i * 0.02, 0.3) }}
                        className="border-b border-outline-variant/50 hover:bg-surface-container-low transition-colors"
                        title={r.verdict_reason}
                      >
                        <td className="px-4 py-3 text-xs text-outline font-bold">{i + 1}</td>
                        <td className="px-4 py-3 font-mono text-xs text-on-surface max-w-[220px] truncate">{r.email}</td>
                        <td className="px-4 py-3"><VerdictBadge verdict={r.verdict} /></td>
                        <td className="px-4 py-3 min-w-[100px]"><ScoreBar score={r.score} /></td>
                        <td className="px-4 py-3 text-xs">
                          {r.deliverable === true
                            ? <span className="text-primary font-semibold">Yes</span>
                            : r.deliverable === false
                              ? <span className="text-secondary font-semibold">No</span>
                              : <span className="text-secondary font-semibold">Unknown</span>}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {r.disposable
                            ? <span className="text-secondary font-semibold">Yes</span>
                            : <span className="text-primary">No</span>}
                        </td>
                        <td className="px-4 py-3 text-xs text-on-surface-variant">
                          {r.free_provider ? 'Free' : 'Business'}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {r.role_account
                            ? <span className="text-secondary font-semibold">Yes</span>
                            : <span className="text-on-surface-variant">No</span>}
                        </td>
                        <td className="px-4 py-3 text-[11px] text-on-surface-variant font-mono max-w-[160px] truncate">
                          {r.mx_host || '—'}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* Empty state */}
        {results.length === 0 && !loading && !bulkLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-surface-container-low border border-outline-variant flex items-center justify-center mb-4">
              <MailCheck size={22} className="text-outline" />
            </div>
            <p className="text-sm font-semibold text-on-surface mb-1">Ready to verify</p>
            <p className="text-sm text-on-surface-variant max-w-xs">
              Type an email above, or upload a CSV file and select the email column to bulk-verify.
            </p>
          </motion.div>
        )}
      </div>

      {/* Column picker modal */}
      <AnimatePresence>
        {showColPicker && (
          <ColumnPickerModal
            headers={csvHeaders}
            onSelect={handleColumnSelected}
            onClose={() => setShowColPicker(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
