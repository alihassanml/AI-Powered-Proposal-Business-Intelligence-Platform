import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  MapPin, FileText, Trash2, Clock, Download,
  MailCheck, Globe, ArrowLeft, ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = 'http://localhost:8000';

interface HistoryEntry {
  id: number;
  type: 'maps' | 'proposal' | 'email' | 'domain';
  title: string;
  summary: string;
  data: string;
  created_at: string;
}

function formatDate(iso: string) {
  const d = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function formatRelative(iso: string) {
  const d = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z');
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Activity chart ────────────────────────────────────────────────────

function ActivityChart({ entries }: { entries: HistoryEntry[] }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d;
  });

  const data = days.map(day => {
    const dateStr = day.toISOString().slice(0, 10);
    const maps     = entries.filter(e => e.type === 'maps'     && e.created_at.slice(0, 10) === dateStr).length;
    const proposal = entries.filter(e => e.type === 'proposal' && e.created_at.slice(0, 10) === dateStr).length;
    const email    = entries.filter(e => e.type === 'email'    && e.created_at.slice(0, 10) === dateStr).length;
    const domain   = entries.filter(e => e.type === 'domain'   && e.created_at.slice(0, 10) === dateStr).length;
    return { label: day.toLocaleDateString('en', { weekday: 'short' }), maps, proposal, email, domain };
  });

  const maxVal = Math.max(...data.map(d => d.maps + d.proposal + d.email + d.domain), 1);

  return (
    <div className="flex items-end gap-2 h-14">
      {data.map((d, i) => {
        const total = d.maps + d.proposal + d.email + d.domain;
        const barH  = total > 0 ? Math.max((total / maxVal) * 44, 6) : 2;
        const isToday = i === 6;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
            <div className="w-full flex flex-col justify-end" style={{ height: 44 }}>
              {total > 0 ? (
                <div className="w-full rounded overflow-hidden flex flex-col-reverse" style={{ height: barH }}>
                  {d.maps > 0     && <div className="w-full bg-secondary/70"    style={{ height: `${(d.maps     / total) * 100}%` }} />}
                  {d.proposal > 0 && <div className="w-full bg-primary/60"      style={{ height: `${(d.proposal / total) * 100}%` }} />}
                  {d.email > 0    && <div className="w-full bg-primary/50"      style={{ height: `${(d.email    / total) * 100}%` }} />}
                  {d.domain > 0   && <div className="w-full bg-secondary/50"    style={{ height: `${(d.domain   / total) * 100}%` }} />}
                </div>
              ) : (
                <div className="w-full rounded bg-outline-variant/30" style={{ height: 2 }} />
              )}
            </div>
            <span className={`text-[9px] whitespace-nowrap ${isToday ? 'text-secondary font-bold' : 'text-outline'}`}>
              {isToday ? 'Today' : d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Grid card (compact, clickable) ───────────────────────────────────

const TYPE_META = {
  maps:     { icon: MapPin,    color: 'bg-secondary/10',  iconColor: 'text-secondary',   tag: 'Maps',     tagCls: 'bg-secondary/10 text-secondary border-secondary/20'     },
  proposal: { icon: FileText,  color: 'bg-primary/10',    iconColor: 'text-primary',     tag: 'Proposal', tagCls: 'bg-primary/10 text-primary border-primary/20'           },
  email:    { icon: MailCheck, color: 'bg-primary/10',    iconColor: 'text-primary',     tag: 'Email',    tagCls: 'bg-primary/10 text-primary border-primary/20'         },
  domain:   { icon: Globe,     color: 'bg-secondary/10',  iconColor: 'text-secondary',   tag: 'Domain',   tagCls: 'bg-secondary/10 text-secondary border-secondary/20'     },
} as const;

function GridCard({
  entry,
  onClick,
  onDelete,
}: {
  entry: HistoryEntry;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const m = TYPE_META[entry.type];
  const Icon = m.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      onClick={onClick}
      className="cursor-pointer bg-white border border-outline-variant rounded-2xl p-4 flex flex-col gap-3 hover:border-secondary/40 hover:shadow-md transition-all group"
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className={`w-9 h-9 rounded-xl ${m.color} flex items-center justify-center shrink-0`}>
          <Icon size={15} className={m.iconColor} />
        </div>
        <span className={`text-[10px] font-bold uppercase tracking-widest border px-2 py-0.5 rounded-full ${m.tagCls}`}>
          {m.tag}
        </span>
      </div>

      {/* Title + summary */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-on-surface line-clamp-2 leading-snug mb-1">{entry.title}</p>
        <p className="text-xs text-on-surface-variant line-clamp-2 leading-relaxed">{entry.summary}</p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-outline-variant/40">
        <div className="flex items-center gap-1 text-[10px] text-outline">
          <Clock size={9} />
          <span>{formatRelative(entry.created_at)}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onDelete}
            title="Delete"
            className="p-1.5 rounded-lg hover:bg-error/10 text-on-surface-variant hover:text-error transition-colors opacity-0 group-hover:opacity-100"
          >
            <Trash2 size={12} />
          </button>
          <ChevronRight size={13} className="text-outline group-hover:text-secondary transition-colors" />
        </div>
      </div>
    </motion.div>
  );
}

// ─── Detail view ───────────────────────────────────────────────────────

function MapsDetail({ entry }: { entry: HistoryEntry }) {
  const data = JSON.parse(entry.data || '{}');
  const results: any[] = data.results || [];

  const exportCSV = () => {
    const headers = ['#', 'Name', 'Rating', 'Reviews', 'Category', 'Address', 'Phone', 'Email', 'Website', 'Facebook', 'Instagram', 'TikTok', 'Twitter/X', 'YouTube', 'Maps URL'];
    const rows = results.map((r: any, i: number) => [
      i + 1, r.name, r.rating, r.reviews, r.category,
      r.address, r.phone, r.email, r.website,
      r.facebook, r.instagram, r.tiktok, r.twitter, r.youtube, r.maps_url,
    ]);
    const csv = [headers, ...rows]
      .map(row => row.map((c: any) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `maps_${entry.id}.csv`; a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-on-surface-variant">{results.length} businesses found</p>
        <button onClick={exportCSV}
          className="flex items-center gap-2 px-3 py-1.5 border border-outline-variant bg-white hover:bg-surface-container-low text-on-surface rounded-xl text-xs font-semibold transition-colors">
          <Download size={13} /> Export CSV
        </button>
      </div>
      <div className="border border-outline-variant rounded-2xl overflow-hidden">
        <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-surface-container-low z-10">
              <tr>
                {['#', 'Name', 'Rating', 'Category', 'Address', 'Phone', 'Email', 'Website'].map(h => (
                  <th key={h} className="text-left px-3 py-2.5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant whitespace-nowrap border-b border-outline-variant">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.map((r: any, i: number) => (
                <tr key={i} className="border-b border-outline-variant/40 hover:bg-surface-container-low">
                  <td className="px-3 py-2.5 text-outline font-bold">{i + 1}</td>
                  <td className="px-3 py-2.5 font-medium text-on-surface max-w-[160px] truncate">{r.name || '—'}</td>
                  <td className="px-3 py-2.5 text-amber-600 font-semibold">{r.rating || '—'}</td>
                  <td className="px-3 py-2.5 text-on-surface-variant max-w-[120px] truncate">{r.category || '—'}</td>
                  <td className="px-3 py-2.5 text-on-surface-variant max-w-[180px] truncate">{r.address || '—'}</td>
                  <td className="px-3 py-2.5 text-secondary">{r.phone || '—'}</td>
                  <td className="px-3 py-2.5 text-primary max-w-[160px] truncate">{r.email || '—'}</td>
                  <td className="px-3 py-2.5 max-w-[140px] truncate">
                    {r.website
                      ? <a href={r.website} target="_blank" rel="noreferrer" className="text-primary hover:underline">{r.website.replace(/^https?:\/\//, '')}</a>
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function EmailDetail({ entry }: { entry: HistoryEntry }) {
  const data = JSON.parse(entry.data || '{}');
  const results: any[] = data.results || [];

  const verdictColor: Record<string, string> = {
    valid: 'text-emerald-600', invalid: 'text-red-500', risky: 'text-amber-500', unknown: 'text-sky-500',
  };

  const exportCSV = () => {
    const headers = ['Email', 'Verdict', 'Score', 'Valid Format', 'Has MX', 'Deliverable', 'Disposable', 'Free Provider', 'Role Account', 'MX Host'];
    const rows = results.map((r: any) => [
      r.email, r.verdict, r.score, r.valid_format, r.has_mx_record,
      r.deliverable === null ? 'unknown' : r.deliverable,
      r.disposable, r.free_provider, r.role_account, r.mx_host,
    ]);
    const csv = [headers, ...rows]
      .map(row => row.map((c: any) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `email_verify_${entry.id}.csv`; a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-on-surface-variant">{results.length} emails verified</p>
        <button onClick={exportCSV}
          className="flex items-center gap-2 px-3 py-1.5 border border-outline-variant bg-white hover:bg-surface-container-low text-on-surface rounded-xl text-xs font-semibold transition-colors">
          <Download size={13} /> Export CSV
        </button>
      </div>
      <div className="border border-outline-variant rounded-2xl overflow-hidden">
        <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-surface-container-low z-10">
              <tr>
                {['#', 'Email', 'Verdict', 'Score', 'Deliverable', 'Disposable', 'Free Provider', 'Role', 'MX Host'].map(h => (
                  <th key={h} className="text-left px-3 py-2.5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant whitespace-nowrap border-b border-outline-variant">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.map((r: any, i: number) => (
                <tr key={i} className="border-b border-outline-variant/40 hover:bg-surface-container-low">
                  <td className="px-3 py-2.5 text-outline font-bold">{i + 1}</td>
                  <td className="px-3 py-2.5 font-mono text-on-surface max-w-[200px] truncate">{r.email}</td>
                  <td className={`px-3 py-2.5 font-semibold capitalize ${verdictColor[r.verdict] || ''}`}>{r.verdict}</td>
                  <td className="px-3 py-2.5 text-on-surface-variant">{r.score}</td>
                  <td className="px-3 py-2.5">
                    {r.deliverable === true ? <span className="text-emerald-600 font-semibold">Yes</span>
                      : r.deliverable === false ? <span className="text-red-500 font-semibold">No</span>
                      : <span className="text-amber-500">Unknown</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    {r.disposable ? <span className="text-red-500 font-semibold">Yes</span> : <span className="text-emerald-600">No</span>}
                  </td>
                  <td className="px-3 py-2.5 text-on-surface-variant">{r.free_provider ? 'Free' : 'Business'}</td>
                  <td className="px-3 py-2.5">
                    {r.role_account ? <span className="text-amber-600 font-semibold">Yes</span> : <span className="text-on-surface-variant">No</span>}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-on-surface-variant max-w-[160px] truncate">{r.mx_host || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function DomainDetail({ entry }: { entry: HistoryEntry }) {
  const data = JSON.parse(entry.data || '{}');
  const results: any[] = data.results || [];

  const confColor: Record<string, string> = {
    high: 'text-emerald-600', medium: 'text-amber-500', low: 'text-red-500',
  };

  const exportCSV = () => {
    const headers = ['Company', 'Domain', 'Confidence', 'Reason'];
    const rows = results.map((r: any) => [r.company_name, r.company_domain, r.confidence, r.reason]);
    const csv = [headers, ...rows]
      .map(row => row.map((c: any) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `domains_${entry.id}.csv`; a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-on-surface-variant">{results.length} companies looked up</p>
        <button onClick={exportCSV}
          className="flex items-center gap-2 px-3 py-1.5 border border-outline-variant bg-white hover:bg-surface-container-low text-on-surface rounded-xl text-xs font-semibold transition-colors">
          <Download size={13} /> Export CSV
        </button>
      </div>
      <div className="border border-outline-variant rounded-2xl overflow-hidden">
        <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-surface-container-low z-10">
              <tr>
                {['#', 'Company', 'Domain', 'Confidence', 'Reason'].map(h => (
                  <th key={h} className="text-left px-3 py-2.5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant whitespace-nowrap border-b border-outline-variant">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.map((r: any, i: number) => (
                <tr key={i} className="border-b border-outline-variant/40 hover:bg-surface-container-low">
                  <td className="px-3 py-2.5 text-outline font-bold">{i + 1}</td>
                  <td className="px-3 py-2.5 font-semibold text-on-surface">{r.company_name}</td>
                  <td className="px-3 py-2.5">
                    {r.company_domain
                      ? <a href={`https://${r.company_domain}`} target="_blank" rel="noreferrer"
                          className="text-primary hover:underline font-mono">{r.company_domain}</a>
                      : <span className="text-outline">—</span>}
                  </td>
                  <td className={`px-3 py-2.5 font-semibold capitalize ${confColor[r.confidence] || ''}`}>{r.confidence}</td>
                  <td className="px-3 py-2.5 text-on-surface-variant max-w-[260px] truncate">{r.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ProposalDetail({ entry }: { entry: HistoryEntry }) {
  const data = JSON.parse(entry.data || '{}');
  const templateNames: Record<string, string> = { '1': 'Dark Executive', '2': 'Corporate Pro', '3': 'Bold Slate' };

  return (
    <div className="space-y-4">
      {data.template && (
        <p className="text-xs text-on-surface-variant">
          Template: <span className="font-semibold text-on-surface">{templateNames[data.template] || 'Template ' + data.template}</span>
        </p>
      )}
      {data.requirements && (
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-2">Job Requirements</p>
          <p className="text-sm text-on-surface leading-relaxed whitespace-pre-wrap">{data.requirements}</p>
        </div>
      )}
      {data.content && (
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-2">Generated Content</p>
          <pre className="text-xs text-on-surface leading-relaxed whitespace-pre-wrap font-sans overflow-auto max-h-[50vh]">
            {typeof data.content === 'string' ? data.content : JSON.stringify(data.content, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

// ─── Detail page wrapper ────────────────────────────────────────────────

function DetailPage({ entry, onBack }: { entry: HistoryEntry; onBack: () => void }) {
  const m = TYPE_META[entry.type];
  const Icon = m.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 30 }}
      className="min-h-screen bg-background"
    >
      <div className="px-8 pt-8 pb-16">
        {/* Back + header */}
        <div className="mb-6">
          <button onClick={onBack}
            className="flex items-center gap-2 text-sm text-on-surface-variant hover:text-on-surface transition-colors mb-5 group">
            <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
            Back to History
          </button>

          <div className="flex items-start gap-4">
            <div className={`w-11 h-11 rounded-xl ${m.color} flex items-center justify-center shrink-0`}>
              <Icon size={18} className={m.iconColor} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-on-surface leading-snug">{entry.title}</h1>
              <p className="text-sm text-on-surface-variant mt-0.5">{entry.summary}</p>
              <p className="text-[11px] text-outline mt-1.5 flex items-center gap-1">
                <Clock size={9} /> {formatDate(entry.created_at)}
                <span className="ml-1 text-outline/60">· {formatRelative(entry.created_at)}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        {entry.type === 'maps'     && <MapsDetail     entry={entry} />}
        {entry.type === 'email'    && <EmailDetail    entry={entry} />}
        {entry.type === 'domain'   && <DomainDetail   entry={entry} />}
        {entry.type === 'proposal' && <ProposalDetail entry={entry} />}
      </div>
    </motion.div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────

export default function HistoryPage() {
  const { token } = useAuth();
  const [entries, setEntries]       = useState<HistoryEntry[]>([]);
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState<HistoryEntry | null>(null);

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEntries(res.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchHistory(); }, []);

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    await axios.delete(`${API_BASE_URL}/history/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setEntries(prev => prev.filter(e => e.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  const maps     = entries.filter(e => e.type === 'maps');
  const proposals = entries.filter(e => e.type === 'proposal');
  const emails   = entries.filter(e => e.type === 'email');
  const domains  = entries.filter(e => e.type === 'domain');
  const lastEntry = entries[0];

  const totalLeads = maps.reduce((sum, e) => {
    try { return sum + (JSON.parse(e.data)?.count || 0); } catch { return sum; }
  }, 0);
  const totalEmailsVerified = emails.reduce((sum, e) => {
    try { return sum + (JSON.parse(e.data)?.count || 0); } catch { return sum; }
  }, 0);

  // ── Detail view ──
  if (selected) {
    return (
      <AnimatePresence mode="wait">
        <DetailPage key={selected.id} entry={selected} onBack={() => setSelected(null)} />
      </AnimatePresence>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="px-8 pt-8 pb-16">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-sm">
              <Clock size={18} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-on-surface">
              Activity <span className="text-secondary">History</span>
            </h1>
          </div>
          <p className="text-sm text-on-surface-variant ml-[52px]">
            All your scraper runs and generated proposals, saved automatically.
          </p>
        </motion.div>

        {!loading && (
          <>
            {/* Stats + chart */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
              className="border border-outline-variant rounded-2xl bg-white p-5 mb-6">
              <div className="flex gap-5 flex-wrap mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
                    <MapPin size={15} className="text-secondary" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-on-surface leading-none">{maps.length}</p>
                    <p className="text-[11px] text-on-surface-variant mt-0.5">Map Runs</p>
                  </div>
                </div>
                <div className="w-px bg-outline-variant self-stretch" />
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText size={15} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-on-surface leading-none">{proposals.length}</p>
                    <p className="text-[11px] text-on-surface-variant mt-0.5">Proposals</p>
                  </div>
                </div>
                <div className="w-px bg-outline-variant self-stretch" />
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                    <MailCheck size={15} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-on-surface leading-none">{totalEmailsVerified}</p>
                    <p className="text-[11px] text-on-surface-variant mt-0.5">Emails Verified</p>
                  </div>
                </div>
                <div className="w-px bg-outline-variant self-stretch" />
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                    <span className="text-amber-600 text-base font-black">#</span>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-on-surface leading-none">{totalLeads}</p>
                    <p className="text-[11px] text-on-surface-variant mt-0.5">Total Leads</p>
                  </div>
                </div>
                {lastEntry && (
                  <>
                    <div className="w-px bg-outline-variant self-stretch" />
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-surface-container-low flex items-center justify-center shrink-0">
                        <Clock size={15} className="text-on-surface-variant" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-on-surface leading-none">{formatRelative(lastEntry.created_at)}</p>
                        <p className="text-[11px] text-on-surface-variant mt-0.5">Last Activity</p>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-outline">Last 7 Days</span>
                  <div className="flex items-center gap-3 text-[10px] text-on-surface-variant">
                    <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-secondary/70" /> Maps</span>
                    <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-primary/60" /> Proposals</span>
                    <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-emerald-400/70" /> Email</span>
                    <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-violet-400/70" /> Domain</span>
                  </div>
                </div>
                <ActivityChart entries={entries} />
              </div>
            </motion.div>

            {/* Grid */}
            {entries.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-14 h-14 rounded-2xl bg-surface-container-low border border-outline-variant flex items-center justify-center mb-4">
                  <Clock size={22} className="text-outline" />
                </div>
                <p className="text-sm font-semibold text-on-surface mb-1">No history yet</p>
                <p className="text-sm text-on-surface-variant max-w-xs">
                  Run the scraper or generate a proposal — it will appear here automatically.
                </p>
              </motion.div>
            ) : (
              <>
                <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-3">
                  All Entries ({entries.length})
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <AnimatePresence>
                    {entries.map(entry => (
                      <GridCard
                        key={entry.id}
                        entry={entry}
                        onClick={() => setSelected(entry)}
                        onDelete={e => handleDelete(e, entry.id)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </>
            )}
          </>
        )}

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}
