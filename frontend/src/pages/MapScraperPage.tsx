import { useRef, useEffect } from 'react';
import {
  MapPin, Search, Download, LoaderCircle, Globe,
  Phone, Star, Copy, CheckCheck, ExternalLink, Mail, Filter, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import {
  useScraperContext, DEFAULT_FILTERS, type Filters,
} from '../context/ScraperContext';

function SocialBadge({ href, label, color }: { href: string; label: string; color: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer"
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${color} hover:opacity-80 transition-opacity`}
      title={href}
    >
      {label}
    </a>
  );
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  if (!text) return null;
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="ml-1 p-0.5 rounded text-outline hover:text-secondary transition-colors"
      title="Copy"
    >
      {copied ? <CheckCheck size={11} className="text-secondary" /> : <Copy size={11} />}
    </button>
  );
}

export default function MapScraperPage() {
  const {
    query, setQuery, maxResults, setMaxResults,
    loading, results, progress, error, searched,
    filters, setFilters, showFilters, setShowFilters,
    filtered, isFiltered, startScrape, exportCSV,
  } = useScraperContext();

  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [progress]);

  const ToggleFilter = ({ label, field }: { label: string; field: keyof Filters }) => (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">{label}</span>
      <div className="flex gap-1">
        {(['all', 'yes', 'no'] as const).map(v => (
          <button key={v} onClick={() => setFilters(f => ({ ...f, [field]: v }))}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
              filters[field] === v
                ? 'bg-secondary text-white'
                : 'bg-surface-container border border-outline-variant text-on-surface-variant hover:border-secondary/40'
            }`}
          >{v === 'all' ? 'All' : v === 'yes' ? 'Yes' : 'No'}</button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="px-8 pt-8 pb-16">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-sm">
              <MapPin size={18} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-on-surface">
              Google Maps <span className="text-secondary">Scraper</span>
            </h1>
          </div>
          <p className="text-sm text-on-surface-variant ml-[52px]">
            Extract business name, phone, website, address, socials and ratings. Export to CSV instantly.
          </p>
        </motion.div>

        {/* Filters — always visible above search */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}
          className="card border border-outline-variant rounded-2xl p-4 mb-4 bg-white">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant flex items-center gap-1.5">
              <Filter size={11} /> Filters
            </span>
            {isFiltered && (
              <button onClick={() => setFilters(DEFAULT_FILTERS)}
                className="flex items-center gap-1 text-[11px] text-error hover:underline font-semibold">
                <X size={11} /> Reset all
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-5">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Rating</span>
              <div className="flex items-center gap-2">
                <input type="number" placeholder="Min" min="0" max="5" step="0.1"
                  value={filters.minRating}
                  onChange={e => setFilters(f => ({ ...f, minRating: e.target.value }))}
                  className="w-16 border border-outline-variant rounded-lg px-2 py-1.5 text-xs text-on-surface bg-white focus:outline-none focus:border-secondary text-center"
                />
                <span className="text-xs text-outline">–</span>
                <input type="number" placeholder="Max" min="0" max="5" step="0.1"
                  value={filters.maxRating}
                  onChange={e => setFilters(f => ({ ...f, maxRating: e.target.value }))}
                  className="w-16 border border-outline-variant rounded-lg px-2 py-1.5 text-xs text-on-surface bg-white focus:outline-none focus:border-secondary text-center"
                />
              </div>
            </div>
            <ToggleFilter label="Has Phone"   field="hasPhone" />
            <ToggleFilter label="Has Email"   field="hasEmail" />
            <ToggleFilter label="Has Website" field="hasWebsite" />
            <ToggleFilter label="Has Social"  field="hasSocial" />
          </div>
        </motion.div>

        {/* Search form */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="card border border-outline-variant rounded-2xl p-5 mb-6">
          <form onSubmit={startScrape} className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline" />
              <input
                type="text" value={query} onChange={e => setQuery(e.target.value)}
                placeholder='e.g. "plumbers in Chicago" or "restaurants near Times Square"'
                required
                className="w-full border border-outline-variant rounded-xl pl-10 pr-4 py-3 text-sm text-on-surface bg-white placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all"
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 border border-outline-variant rounded-xl px-3 py-3 bg-white focus-within:border-secondary transition-colors">
                <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider whitespace-nowrap">Max</span>
                <input
                  type="number" value={maxResults}
                  onChange={e => setMaxResults(Math.max(1, Number(e.target.value) || 1))}
                  min={1}
                  className="w-16 bg-transparent text-on-surface font-semibold text-sm focus:outline-none text-center"
                />
              </div>
              <button type="submit" disabled={loading}
                className="flex items-center gap-2 px-5 py-3 bg-primary hover:opacity-90 text-white rounded-xl text-sm font-semibold transition-opacity shadow-sm active:scale-95 disabled:opacity-50 whitespace-nowrap">
                {loading ? <LoaderCircle className="animate-spin" size={16} /> : <MapPin size={16} />}
                {loading ? 'Scraping…' : 'Scrape'}
              </button>
            </div>
          </form>

          {/* Live progress */}
          <AnimatePresence>
            {loading && progress.length > 0 && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-4 overflow-hidden">
                <div className="bg-surface-container-low border border-outline-variant/60 rounded-xl p-3 max-h-48 overflow-y-auto">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-2">Live Progress</p>
                  {progress.map((msg, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className="flex items-start gap-2 py-0.5">
                      {i === progress.length - 1
                        ? <LoaderCircle size={11} className="text-secondary animate-spin shrink-0 mt-0.5" />
                        : <span className="text-secondary shrink-0 mt-0.5 text-[10px]">✓</span>}
                      <span className="text-xs text-on-surface-variant font-mono">{msg}</span>
                    </motion.div>
                  ))}
                  <div ref={logEndRef} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mb-5 px-4 py-3 bg-error-container border border-error/20 rounded-xl text-sm text-on-error-container font-medium">
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filters + Results — shown as soon as a search has started */}
        <AnimatePresence>
          {(results.length > 0 || loading) && searched && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>

              {/* Toolbar */}
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-on-surface">
                    {loading
                      ? <span className="flex items-center gap-1.5"><LoaderCircle size={13} className="animate-spin text-secondary" /> Scraping…</span>
                      : isFiltered ? `${filtered.length} / ${results.length}` : `${results.length}`}{!loading && ' businesses'}
                  </span>
                  <span className="text-xs text-on-surface-variant">for "{searched}"</span>
                  {results.length > 0 && (
                    <span className="text-[10px] font-bold bg-secondary/10 text-secondary border border-secondary/20 px-2 py-0.5 rounded-full">
                      {results.filter(r => r.phone).length} phone · {results.filter(r => r.email).length} email · {results.filter(r => r.website).length} web · {results.filter(r => r.facebook || r.instagram || r.tiktok || r.twitter || r.youtube).length} social
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {results.length > 0 && (
                    <button onClick={exportCSV}
                      className="flex items-center gap-2 px-3 py-2 border border-outline-variant bg-white hover:bg-surface-container-low text-on-surface rounded-xl text-xs font-semibold transition-colors">
                      <Download size={13} />
                      Export CSV {isFiltered && `(${filtered.length})`}
                    </button>
                  )}
                </div>
              </div>

              {/* Table */}
              {results.length > 0 && (
                <div className="card border border-outline-variant rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-outline-variant bg-surface-container-low">
                          {['#','Business Name','Rating','Category','Address','Phone','Email','Website','Socials'].map(h => (
                            <th key={h} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant whitespace-nowrap">
                              {h === 'Business Name' ? <span className="min-w-[180px] block">{h}</span> : h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="text-center py-10 text-sm text-on-surface-variant">
                              No results match the current filters.
                            </td>
                          </tr>
                        ) : filtered.map((r, i) => (
                          <motion.tr key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i * 0.015, 0.3) }}
                            className="border-b border-outline-variant/50 hover:bg-surface-container-low transition-colors">
                            <td className="px-4 py-3 text-on-surface-variant text-xs font-bold">{i + 1}</td>
                            <td className="px-4 py-3">
                              <a href={r.maps_url} target="_blank" rel="noreferrer"
                                className="font-semibold text-on-surface hover:text-secondary transition-colors flex items-center gap-1 group">
                                {r.name}
                                <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity text-secondary shrink-0" />
                              </a>
                            </td>
                            <td className="px-4 py-3">
                              {r.rating
                                ? <div className="flex items-center gap-1"><Star size={11} className="text-amber-500 fill-amber-500 shrink-0" /><span className="font-bold text-amber-600 text-xs">{r.rating}</span>{r.reviews && <span className="text-on-surface-variant text-[11px]">({r.reviews})</span>}</div>
                                : <span className="text-outline text-xs">—</span>}
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs text-on-surface-variant bg-surface-container border border-outline-variant/60 px-2 py-0.5 rounded font-medium">{r.category || '—'}</span>
                            </td>
                            <td className="px-4 py-3 text-xs text-on-surface-variant max-w-[200px]">
                              <div className="flex items-start gap-1"><span className="line-clamp-2">{r.address || '—'}</span><CopyBtn text={r.address} /></div>
                            </td>
                            <td className="px-4 py-3">
                              {r.phone
                                ? <div className="flex items-center gap-1"><a href={`tel:${r.phone}`} className="text-xs text-secondary font-medium hover:underline flex items-center gap-1"><Phone size={10} className="shrink-0" />{r.phone}</a><CopyBtn text={r.phone} /></div>
                                : <span className="text-outline text-xs">—</span>}
                            </td>
                            <td className="px-4 py-3">
                              {r.email
                                ? <div className="flex items-center gap-1"><a href={`mailto:${r.email}`} className="text-xs text-primary font-medium hover:text-secondary flex items-center gap-1 max-w-[160px] truncate"><Mail size={10} className="shrink-0" /><span className="truncate">{r.email}</span></a><CopyBtn text={r.email} /></div>
                                : <span className="text-outline text-xs">—</span>}
                            </td>
                            <td className="px-4 py-3">
                              {r.website
                                ? <div className="flex items-center gap-1"><a href={r.website} target="_blank" rel="noreferrer" className="text-xs text-primary font-medium hover:text-secondary flex items-center gap-1 max-w-[140px] truncate"><Globe size={10} className="shrink-0" /><span className="truncate">{r.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span></a><CopyBtn text={r.website} /></div>
                                : <span className="text-outline text-xs">—</span>}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1">
                                {r.facebook  && <SocialBadge href={r.facebook}  label="FB" color="bg-blue-100 text-blue-700" />}
                                {r.instagram && <SocialBadge href={r.instagram} label="IG" color="bg-pink-100 text-pink-700" />}
                                {r.tiktok    && <SocialBadge href={r.tiktok}    label="TT" color="bg-slate-100 text-slate-700" />}
                                {r.twitter   && <SocialBadge href={r.twitter}   label="X"  color="bg-sky-100 text-sky-700" />}
                                {r.youtube   && <SocialBadge href={r.youtube}   label="YT" color="bg-red-100 text-red-700" />}
                                {!r.facebook && !r.instagram && !r.tiktok && !r.twitter && !r.youtube && <span className="text-outline text-xs">—</span>}
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {!loading && results.length === 0 && !error && !searched && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-surface-container-low border border-outline-variant flex items-center justify-center mb-4">
              <MapPin size={22} className="text-outline" />
            </div>
            <p className="text-sm font-semibold text-on-surface mb-1">Ready to scrape</p>
            <p className="text-sm text-on-surface-variant max-w-xs">
              Enter a business type and location — e.g. "dentists in London" or "coffee shops in Manhattan"
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
