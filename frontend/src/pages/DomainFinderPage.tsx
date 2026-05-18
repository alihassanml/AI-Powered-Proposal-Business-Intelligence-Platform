import { useState, useRef } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import {
  Globe, Search, Upload, Download, LoaderCircle,
  CheckCircle, AlertCircle, XCircle, X, ExternalLink,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = 'http://localhost:8000';

interface DomainResult {
  company_name: string;
  company_domain: string;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
  candidates?: { url: string; title: string; snippet: string }[];
}

const CONF_META = {
  high:   { label: 'High',   icon: CheckCircle,  cls: 'bg-primary/10 text-primary border-primary/20' },
  medium: { label: 'Medium', icon: AlertCircle,  cls: 'bg-secondary/10 text-secondary border-secondary/20'       },
  low:    { label: 'Low',    icon: XCircle,      cls: 'bg-secondary/10 text-secondary border-secondary/20'             },
};

function ConfBadge({ confidence }: { confidence: DomainResult['confidence'] }) {
  const m = CONF_META[confidence] || CONF_META.low;
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wide ${m.cls}`}>
      <Icon size={10} /> {m.label}
    </span>
  );
}

// ── CSV column picker modal ─────────────────────────────────────────────

function ColumnPickerModal({
  headers, onSelect, onClose,
}: { headers: string[]; onSelect: (col: string) => void; onClose: () => void }) {
  const [selected, setSelected] = useState(
    headers.find(h => /company|name|business|org/i.test(h)) || headers[0] || ''
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
          <span className="text-sm font-bold text-on-surface">Select Company Name Column</span>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-container-low text-on-surface-variant">
            <X size={16} />
          </button>
        </div>
        <p className="text-xs text-on-surface-variant mb-4">Which column contains the company names?</p>
        <div className="space-y-1.5 mb-5 max-h-48 overflow-y-auto">
          {headers.map(h => (
            <button key={h} onClick={() => setSelected(h)}
              className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                selected === h ? 'bg-secondary text-white' : 'bg-surface-container-low hover:bg-surface-container text-on-surface'
              }`}
            >{h}</button>
          ))}
        </div>
        <button
          onClick={() => { if (selected) onSelect(selected); }}
          disabled={!selected}
          className="w-full bg-primary text-white py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          Find Domains in "{selected}"
        </button>
      </motion.div>
    </motion.div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────

const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { if (inQ && line[i + 1] === '"') { cur += '"'; i++; } else { inQ = !inQ; } }
    else if (ch === ',' && !inQ) { result.push(cur.trim()); cur = ''; }
    else { cur += ch; }
  }
  result.push(cur.trim());
  return result;
};

async function saveHistory(token: string | null, results: DomainResult[]) {
  if (!token || !results.length) return;
  const found = results.filter(r => r.company_domain).length;
  try {
    await axios.post(`${API_BASE_URL}/history`, {
      type: 'domain',
      title: results.length === 1
        ? `Domain: ${results[0].company_name}`
        : `Bulk domain lookup: ${results.length} companies`,
      summary: `${found} / ${results.length} domains found`,
      data: JSON.stringify({ results, count: results.length }),
    }, { headers: { Authorization: `Bearer ${token}` } });
  } catch { /* non-critical */ }
}

// ── Main page ──────────────────────────────────────────────────────────

export default function DomainFinderPage() {
  const { token } = useAuth();
  const [company, setCompany]       = useState('');
  const [loading, setLoading]       = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState('');
  const [results, setResults]       = useState<DomainResult[]>([]);
  const [error, setError]           = useState('');
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows]       = useState<Record<string, string>[]>([]);
  const [showColPicker, setShowColPicker] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

  // ── Single lookup ──
  const handleSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(`${API_BASE_URL}/find-domain`,
        { company_name: company.trim() },
        { headers: authHeader },
      );
      const data: DomainResult = res.data;
      setResults(prev => {
        const filtered = prev.filter(r => r.company_name !== data.company_name);
        return [data, ...filtered];
      });
      await saveHistory(token, [data]);
      setCompany('');
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Request failed. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  // ── File upload ──
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
          const wb = XLSX.read(data, { type: 'array' });
          const sheet = wb.Sheets[wb.SheetNames[0]];
          const jsonRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
          if (!jsonRows.length) { setError('Spreadsheet is empty.'); return; }
          headers = Object.keys(jsonRows[0]);
          rows = jsonRows.map(r => Object.fromEntries(headers.map(h => [h, String(r[h] ?? '').trim()]))).filter(r => Object.values(r).some(v => v));
        } else {
          const text = ev.target?.result as string;
          const lines = text.trim().split(/\r?\n/);
          if (lines.length < 2) { setError('CSV is empty.'); return; }
          headers = parseCSVLine(lines[0]);
          rows = lines.slice(1).map(line => {
            const vals = parseCSVLine(line);
            const obj: Record<string, string> = {};
            headers.forEach((h, i) => { obj[h] = vals[i] ?? ''; });
            return obj;
          }).filter(r => Object.values(r).some(v => v));
        }
        setCsvHeaders(headers);
        setCsvRows(rows);
        setShowColPicker(true);
      } catch { setError('Could not read file.'); }
    };
    isExcel ? reader.readAsArrayBuffer(file) : reader.readAsText(file);
  };

  const handleColumnSelected = async (col: string) => {
    setShowColPicker(false);
    const companies = csvRows.map(r => (r[col] || '').trim()).filter(v => v);
    if (!companies.length) { setError('No company names found in that column.'); return; }

    setBulkLoading(true);
    setError('');
    const BATCH = 5;
    const all: DomainResult[] = [];

    for (let i = 0; i < companies.length; i += BATCH) {
      const batch = companies.slice(i, i + BATCH);
      setBulkProgress(`Looking up ${Math.min(i + BATCH, companies.length)} / ${companies.length}…`);
      try {
        const res = await axios.post(`${API_BASE_URL}/find-domain/bulk`,
          { companies: batch },
          { headers: authHeader },
        );
        all.push(...res.data);
      } catch (err: any) {
        setError(err?.response?.data?.detail || 'Bulk lookup failed.');
        break;
      }
    }

    if (all.length) {
      setResults(prev => {
        const existingNames = new Set(all.map(r => r.company_name));
        return [...all, ...prev.filter(r => !existingNames.has(r.company_name))];
      });
      await saveHistory(token, all);
    }
    setBulkLoading(false);
    setBulkProgress('');
  };

  // ── Export ──
  const exportCSV = () => {
    const headers = ['Company', 'Domain', 'Confidence', 'Reason'];
    const rows = results.map(r => [r.company_name, r.company_domain, r.confidence, r.reason]);
    const csv = [headers, ...rows]
      .map(row => row.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `domains_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const found = results.filter(r => r.company_domain).length;

  return (
    <div className="min-h-screen bg-background">
      <div className="px-8 pt-8 pb-16">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-sm">
              <Globe size={18} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-on-surface">
              Domain <span className="text-secondary">Finder</span>
            </h1>
          </div>
          <p className="text-sm text-on-surface-variant ml-[52px]">
            Find official company websites using DuckDuckGo search + AI analysis. No extra API keys needed.
          </p>
        </motion.div>

        {/* Input card */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="card border border-outline-variant rounded-2xl p-5 mb-5 bg-white">
          <form onSubmit={handleSingle} className="flex gap-3">
            <div className="flex-1 relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline" />
              <input
                type="text" value={company}
                onChange={e => setCompany(e.target.value)}
                placeholder='e.g. "Stripe" or "Notion Labs"'
                className="w-full border border-outline-variant rounded-xl pl-10 pr-4 py-3 text-sm text-on-surface bg-white placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all"
              />
            </div>
            <button type="submit" disabled={loading}
              className="flex items-center gap-2 px-5 py-3 bg-primary hover:opacity-90 text-white rounded-xl text-sm font-semibold transition-opacity shadow-sm disabled:opacity-50 whitespace-nowrap">
              {loading ? <LoaderCircle className="animate-spin" size={16} /> : <Globe size={16} />}
              {loading ? 'Finding…' : 'Find Domain'}
            </button>
            <button type="button" onClick={() => fileInputRef.current?.click()}
              disabled={bulkLoading}
              className="flex items-center gap-2 px-4 py-3 border border-outline-variant bg-white hover:bg-surface-container-low text-on-surface rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 whitespace-nowrap">
              {bulkLoading
                ? <><LoaderCircle className="animate-spin" size={15} /> {bulkProgress}</>
                : <><Upload size={15} /> Upload CSV / Excel</>}
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

            {/* Toolbar */}
            <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
              <span className="text-sm font-bold text-on-surface">
                {found} / {results.length} domains found
              </span>
              <div className="flex items-center gap-2">
                <button onClick={() => setResults([])}
                  className="px-3 py-1.5 border border-outline-variant bg-white hover:bg-error/5 hover:border-error/30 hover:text-error text-on-surface-variant rounded-xl text-xs font-semibold transition-colors">
                  Clear all
                </button>
                <button onClick={exportCSV}
                  className="flex items-center gap-2 px-3 py-1.5 border border-outline-variant bg-white hover:bg-surface-container-low text-on-surface rounded-xl text-xs font-semibold transition-colors">
                  <Download size={13} /> Export CSV ({results.length})
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="card border border-outline-variant rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-outline-variant bg-surface-container-low">
                      {['#', 'Company', 'Domain', 'Confidence', 'Reason'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r, i) => (
                      <>
                        <motion.tr
                          key={r.company_name}
                          initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: Math.min(i * 0.02, 0.3) }}
                          onClick={() => setExpandedRow(expandedRow === i ? null : i)}
                          className="border-b border-outline-variant/50 hover:bg-surface-container-low transition-colors cursor-pointer"
                        >
                          <td className="px-4 py-3 text-xs text-outline font-bold">{i + 1}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-on-surface">{r.company_name}</td>
                          <td className="px-4 py-3">
                            {r.company_domain
                              ? (
                                <a href={`https://${r.company_domain}`} target="_blank" rel="noreferrer"
                                  onClick={e => e.stopPropagation()}
                                  className="flex items-center gap-1.5 text-primary hover:text-secondary font-mono text-xs font-semibold group transition-colors">
                                  {r.company_domain}
                                  <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                </a>
                              )
                              : <span className="text-outline text-xs">Not found</span>}
                          </td>
                          <td className="px-4 py-3"><ConfBadge confidence={r.confidence} /></td>
                          <td className="px-4 py-3 text-xs text-on-surface-variant max-w-[280px] truncate">{r.reason}</td>
                        </motion.tr>
                        {/* Expanded candidates */}
                        {expandedRow === i && r.candidates && r.candidates.length > 0 && (
                          <tr key={`${r.company_name}-candidates`} className="bg-surface-container-low/50">
                            <td colSpan={5} className="px-6 py-3">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-2">Search Candidates</p>
                              <div className="space-y-1.5">
                                {r.candidates.map((c, ci) => (
                                  <div key={ci} className="flex items-start gap-2">
                                    <span className="text-[10px] text-outline font-bold mt-0.5 w-4 shrink-0">{ci + 1}</span>
                                    <div className="min-w-0">
                                      <a href={c.url} target="_blank" rel="noreferrer"
                                        className="text-xs text-primary hover:underline font-medium truncate block max-w-lg">
                                        {c.title || c.url}
                                      </a>
                                      <p className="text-[11px] text-on-surface-variant truncate max-w-lg">{c.snippet?.slice(0, 120)}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
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
              <Globe size={22} className="text-outline" />
            </div>
            <p className="text-sm font-semibold text-on-surface mb-1">Ready to find domains</p>
            <p className="text-sm text-on-surface-variant max-w-xs">
              Enter a company name, or upload a CSV / Excel file with a company name column.
            </p>
          </motion.div>
        )}
      </div>

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
