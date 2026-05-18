import React, { createContext, useContext, useRef, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const API_BASE_URL = 'http://localhost:8000';

export interface Business {
  name: string; rating: string; reviews: string; category: string;
  address: string; phone: string; website: string; email: string;
  facebook: string; instagram: string; tiktok: string; twitter: string;
  youtube: string; maps_url: string;
}

export interface Filters {
  minRating: string; maxRating: string;
  hasPhone: 'all' | 'yes' | 'no';
  hasEmail: 'all' | 'yes' | 'no';
  hasWebsite: 'all' | 'yes' | 'no';
  hasSocial: 'all' | 'yes' | 'no';
}

export const DEFAULT_FILTERS: Filters = {
  minRating: '', maxRating: '',
  hasPhone: 'all', hasEmail: 'all', hasWebsite: 'all', hasSocial: 'all',
};

export function applyFilters(data: Business[], f: Filters): Business[] {
  return data.filter(r => {
    const rating = parseFloat(r.rating) || 0;
    if (f.minRating !== '' && rating < parseFloat(f.minRating)) return false;
    if (f.maxRating !== '' && rating > parseFloat(f.maxRating)) return false;
    if (f.hasPhone   === 'yes' && !r.phone)   return false;
    if (f.hasPhone   === 'no'  &&  r.phone)   return false;
    if (f.hasEmail   === 'yes' && !r.email)   return false;
    if (f.hasEmail   === 'no'  &&  r.email)   return false;
    if (f.hasWebsite === 'yes' && !r.website) return false;
    if (f.hasWebsite === 'no'  &&  r.website) return false;
    const hasSocial = !!(r.facebook || r.instagram || r.tiktok || r.twitter || r.youtube);
    if (f.hasSocial  === 'yes' && !hasSocial) return false;
    if (f.hasSocial  === 'no'  &&  hasSocial) return false;
    return true;
  });
}

interface ScraperCtx {
  query: string;
  setQuery: (q: string) => void;
  maxResults: number;
  setMaxResults: (n: number) => void;
  loading: boolean;
  results: Business[];
  progress: string[];
  error: string;
  searched: string;
  filters: Filters;
  setFilters: (f: Filters | ((prev: Filters) => Filters)) => void;
  showFilters: boolean;
  setShowFilters: React.Dispatch<React.SetStateAction<boolean>>;
  filtered: Business[];
  isFiltered: boolean;
  startScrape: (e: React.FormEvent) => void;
  exportCSV: () => void;
}

const ScraperContext = createContext<ScraperCtx | null>(null);

export function ScraperProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const tokenRef = useRef(token);
  useEffect(() => { tokenRef.current = token; }, [token]);

  const [query, setQuery]           = useState('');
  const [maxResults, setMaxResults] = useState(10);
  const [loading, setLoading]       = useState(false);
  const [results, setResults]       = useState<Business[]>([]);
  const [progress, setProgress]     = useState<string[]>([]);
  const [error, setError]           = useState('');
  const [searched, setSearched]     = useState('');
  const [filters, setFiltersState]  = useState<Filters>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);

  const esRef        = useRef<EventSource | null>(null);
  const startTimeRef = useRef<number>(0);
  const saveTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load saved filters from DB on login
  useEffect(() => {
    if (!token) return;
    axios.get(`${API_BASE_URL}/preferences`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(res => {
      if (res.data?.filters) setFiltersState(res.data.filters);
    }).catch(() => {});
  }, [token]);

  const setFilters = useCallback((f: Filters | ((prev: Filters) => Filters)) => {
    setFiltersState(prev => {
      const next = typeof f === 'function' ? f(prev) : f;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        if (!tokenRef.current) return;
        axios.post(`${API_BASE_URL}/preferences`, { filters: next }, {
          headers: { Authorization: `Bearer ${tokenRef.current}` },
        }).catch(() => {});
      }, 700);
      return next;
    });
  }, []);

  const filtered   = applyFilters(results, filters);
  const isFiltered = JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS);

  const startScrape = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    esRef.current?.close();
    setLoading(true);
    setError('');
    setResults([]);
    setProgress([]);
    setSearched(query.trim());
    startTimeRef.current = Date.now();

    const finalQuery = query.trim();
    const url = `${API_BASE_URL}/scrape-maps/stream?query=${encodeURIComponent(finalQuery)}&max_results=${maxResults}`;
    const es = new EventSource(url);
    esRef.current = es;

    es.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'progress') {
        setProgress(prev => [...prev, data.message]);
      } else if (data.type === 'done') {
        const finalResults: Business[] = data.results || [];
        const durationSec = Math.round((Date.now() - startTimeRef.current) / 1000);
        setResults(finalResults);
        if (!finalResults.length) setError('No results found. Try a different search query.');
        setLoading(false);
        es.close();
        // Save history — runs even if user is on another tab
        const t = tokenRef.current;
        if (t) {
          axios.post(`${API_BASE_URL}/history`, {
            type: 'maps',
            title: finalQuery,
            summary: `${finalResults.length} results · ${durationSec}s`,
            data: JSON.stringify({ query: finalQuery, results: finalResults, count: finalResults.length, duration_seconds: durationSec }),
          }, { headers: { Authorization: `Bearer ${t}` } }).catch(() => {});
        }
      } else if (data.type === 'error' || data.type === 'timeout') {
        setError(data.message || 'Scraping timed out. Please try again.');
        setLoading(false);
        es.close();
      }
    };

    es.onerror = () => {
      setError('Connection error — is the backend running?');
      setLoading(false);
      es.close();
    };
  }, [query, maxResults]);

  const exportCSV = useCallback(() => {
    const headers = ['#', 'Name', 'Rating', 'Reviews', 'Category', 'Address', 'Phone', 'Email', 'Website', 'Facebook', 'Instagram', 'TikTok', 'Twitter/X', 'YouTube', 'Google Maps URL'];
    const rows = filtered.map((r, i) => [
      i + 1, r.name, r.rating, r.reviews, r.category,
      r.address, r.phone, r.email, r.website,
      r.facebook, r.instagram, r.tiktok, r.twitter, r.youtube, r.maps_url,
    ]);
    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `google_maps_${searched.replace(/\s+/g, '_')}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filtered, searched]);

  return (
    <ScraperContext.Provider value={{
      query, setQuery, maxResults, setMaxResults,
      loading, results, progress, error, searched,
      filters, setFilters, showFilters, setShowFilters,
      filtered, isFiltered, startScrape, exportCSV,
    }}>
      {children}
    </ScraperContext.Provider>
  );
}

export function useScraperContext() {
  const ctx = useContext(ScraperContext);
  if (!ctx) throw new Error('useScraperContext must be used within ScraperProvider');
  return ctx;
}
