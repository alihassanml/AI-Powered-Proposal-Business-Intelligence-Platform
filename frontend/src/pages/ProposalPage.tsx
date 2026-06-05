import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  FileText, Download, Eye, CircleCheck, LoaderCircle,
  Layout, ArrowLeft, X, RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = 'http://localhost:8000';

interface Template { id: string; name: string; desc: string; accent: string; }

const TEMPLATES: Template[] = [
  { id: '1', name: 'Dark Executive', desc: 'Navy + Teal / Purple',  accent: 'from-teal-400 to-indigo-500' },
  { id: '2', name: 'Corporate Pro',  desc: 'White + Ocean Blue',    accent: 'from-sky-600 to-blue-700'   },
  { id: '3', name: 'Bold Slate',     desc: 'Dark Slate + Amber',    accent: 'from-amber-500 to-orange-600' },
];

const inputCls = "w-full border border-outline-variant rounded-xl p-3 text-sm text-on-surface bg-white focus:ring-2 focus:ring-secondary/20 focus:border-secondary focus:outline-none transition-all placeholder:text-outline";

export default function ProposalPage() {
  const { token } = useAuth();
  const [requirements, setRequirements]         = useState('');
  const [githubUrl]                             = useState('https://github.com/alihassanml/');
  const [selectedTemplate, setSelectedTemplate] = useState('1');
  const [loading, setLoading]                   = useState(false);
  const [showPreview, setShowPreview]           = useState(false);
  const [previewTemplate, setPreviewTemplate]   = useState('1');
  const [timelineValue, setTimelineValue]       = useState('4');
  const [timelineUnit, setTimelineUnit]         = useState('weeks');

  const [editorMode, setEditorMode]         = useState(false);
  const [proposalContent, setProposalContent] = useState<any>(null);
  const [branding, setBranding]             = useState<any>(null);
  const [previewHtml, setPreviewHtml]       = useState('');
  const [isRendering, setIsRendering]       = useState(false);
  const [error, setError]                   = useState('');

  const saveHistory = async (content: any, template: string) => {
    try {
      const templateNames: Record<string, string> = { '1': 'Dark Executive', '2': 'Corporate Pro', '3': 'Bold Slate' };
      await axios.post(`${API_BASE_URL}/history`, {
        type: 'proposal',
        title: content.title || 'Untitled Proposal',
        summary: `${templateNames[template] || 'Template ' + template} · ${timelineValue} ${timelineUnit}`,
        data: JSON.stringify({ requirements, template, timeline: `${timelineValue} ${timelineUnit}`, content }),
      }, { headers: { Authorization: `Bearer ${token}` } });
    } catch { /* non-critical */ }
  };

  const handleGenerate = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('requirements', requirements);
      fd.append('github_url', githubUrl);
      fd.append('template', selectedTemplate);
      fd.append('timeline', `${timelineValue} ${timelineUnit}`);
      const res = await axios.post(`${API_BASE_URL}/generate`, fd, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProposalContent(res.data.content);
      setBranding(res.data.branding);
      setEditorMode(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      saveHistory(res.data.content, selectedTemplate);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to generate proposal. Check your API connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!editorMode || !proposalContent) return;
    const t = setTimeout(async () => {
      setIsRendering(true);
      try {
        const res = await axios.post(`${API_BASE_URL}/render-preview`, {
          content: proposalContent, branding, template: selectedTemplate,
        });
        setPreviewHtml(res.data);
      } catch { /* ignore */ } finally { setIsRendering(false); }
    }, 500);
    return () => clearTimeout(t);
  }, [proposalContent, branding, selectedTemplate, editorMode]);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/download-pdf`, {
        content: proposalContent, branding, template: selectedTemplate,
      }, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const rawTitle = proposalContent?.title || 'proposal';
      const safeTitle = rawTitle.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_') || 'proposal';
      const a = document.createElement('a');
      a.href = url; a.setAttribute('download', `${safeTitle}.pdf`);
      document.body.appendChild(a); a.click();
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  // ─────────────────────── Editor mode ───────────────────────
  if (editorMode && proposalContent) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Top bar */}
        <header className="h-14 border-b border-outline-variant bg-surface-container-lowest flex items-center justify-between px-5 sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setEditorMode(false)}
              className="p-1.5 hover:bg-surface-container-low rounded-lg transition-colors text-on-surface-variant hover:text-on-surface"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="h-5 w-px bg-outline-variant" />
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-secondary" />
              <span className="text-sm font-semibold text-on-surface">Proposal Editor</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setEditorMode(false)}
              className="flex items-center gap-2 px-4 py-2 border border-outline-variant hover:bg-surface-container-low text-on-surface rounded-xl text-sm font-semibold transition-colors"
            >
              <RotateCcw size={16} />
              Regenerate
            </button>
            <button
              onClick={handleDownload}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:opacity-90 text-white rounded-xl text-sm font-semibold transition-opacity shadow-sm disabled:opacity-50"
            >
              {loading ? <LoaderCircle className="animate-spin" size={16} /> : <Download size={16} />}
              Export PDF
            </button>
          </div>
        </header>

        <main className="flex-1 flex overflow-hidden">
          {/* Left panel */}
          <div className="w-[440px] border-r border-outline-variant bg-surface-container-low overflow-y-auto p-6">
            <div className="space-y-8">

              {/* Template */}
              <section>
                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3 block">Style</label>
                <div className="grid grid-cols-3 gap-2">
                  {TEMPLATES.map(t => (
                    <button key={t.id} onClick={() => setSelectedTemplate(t.id)}
                      className={`p-2 rounded-xl border transition-all text-center ${selectedTemplate === t.id ? 'border-secondary bg-secondary/5' : 'border-outline-variant bg-white hover:border-secondary/40'}`}>
                      <div className={`w-full h-1 rounded-full bg-gradient-to-r ${t.accent} mb-1.5`} />
                      <div className="text-[10px] font-semibold text-on-surface truncate">{t.name}</div>
                    </button>
                  ))}
                </div>
              </section>

              {/* General */}
              <section className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block">General</label>
                <input className={inputCls} placeholder="Proposal Title"
                  value={proposalContent.title} onChange={e => setProposalContent({...proposalContent, title: e.target.value})} />
                <textarea className={`${inputCls} min-h-[110px] resize-none`} placeholder="Opening Statement"
                  value={proposalContent.opening} onChange={e => setProposalContent({...proposalContent, opening: e.target.value})} />
              </section>

              {/* Problem */}
              <section>
                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3 block">The Challenge</label>
                <textarea className={`${inputCls} min-h-[140px] resize-none`}
                  value={proposalContent.problem_analysis} onChange={e => setProposalContent({...proposalContent, problem_analysis: e.target.value})} />
              </section>

              {/* Plan */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block">Implementation Plan</label>
                  <button
                    onClick={() => setProposalContent({...proposalContent, implementation_plan: [...proposalContent.implementation_plan, { step: 'New Step', detail: 'Description…' }]})}
                    className="text-[10px] text-secondary font-bold flex items-center gap-1 hover:underline"
                  >+ Add Step</button>
                </div>
                <div className="space-y-2">
                  {proposalContent.implementation_plan.map((step: any, idx: number) => (
                    <div key={idx} className="bg-white border border-outline-variant rounded-xl p-3 relative group">
                      <button
                        onClick={() => setProposalContent({...proposalContent, implementation_plan: proposalContent.implementation_plan.filter((_: any, i: number) => i !== idx)})}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-error/10 text-error rounded-full border border-error/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                      >×</button>
                      <input className="w-full bg-transparent border-none p-0 text-xs font-semibold text-secondary mb-1.5 focus:ring-0 focus:outline-none" value={step.step}
                        onChange={e => { const s = [...proposalContent.implementation_plan]; s[idx].step = e.target.value; setProposalContent({...proposalContent, implementation_plan: s}); }} />
                      <textarea className="w-full bg-transparent border-none p-0 text-xs text-on-surface-variant min-h-[50px] focus:ring-0 focus:outline-none leading-relaxed resize-none" value={step.detail}
                        onChange={e => { const s = [...proposalContent.implementation_plan]; s[idx].detail = e.target.value; setProposalContent({...proposalContent, implementation_plan: s}); }} />
                    </div>
                  ))}
                </div>
              </section>

              {/* Challenges */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block">Real Challenges Solved</label>
                  <button
                    onClick={() => setProposalContent({...proposalContent, challenges: [...(proposalContent.challenges||[]), { problem: 'Problem', solution: 'Solution…' }]})}
                    className="text-[10px] text-secondary font-bold flex items-center gap-1 hover:underline"
                  >+ Add</button>
                </div>
                <div className="space-y-2">
                  {(proposalContent.challenges||[]).map((c: any, idx: number) => (
                    <div key={idx} className="bg-white border border-outline-variant rounded-xl p-3 relative group">
                      <button
                        onClick={() => setProposalContent({...proposalContent, challenges: (proposalContent.challenges||[]).filter((_: any, i: number) => i !== idx)})}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-error/10 text-error rounded-full border border-error/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                      >×</button>
                      <input className="w-full bg-transparent border-none p-0 text-xs font-semibold text-primary mb-1.5 focus:ring-0 focus:outline-none" value={c.problem}
                        onChange={e => { const n = [...(proposalContent.challenges||[])]; n[idx].problem = e.target.value; setProposalContent({...proposalContent, challenges: n}); }} />
                      <textarea className="w-full bg-transparent border-none p-0 text-xs text-on-surface-variant min-h-[50px] focus:ring-0 focus:outline-none leading-relaxed resize-none" value={c.solution}
                        onChange={e => { const n = [...(proposalContent.challenges||[])]; n[idx].solution = e.target.value; setProposalContent({...proposalContent, challenges: n}); }} />
                    </div>
                  ))}
                </div>
              </section>

              {/* Portfolio */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block">Relevant Portfolio</label>
                  <button
                    onClick={() => setProposalContent({...proposalContent, portfolio: [...(proposalContent.portfolio||[]), { name: 'Project', summary: 'Summary…', url: '' }]})}
                    className="text-[10px] text-secondary font-bold flex items-center gap-1 hover:underline"
                  >+ Add</button>
                </div>
                <div className="space-y-2">
                  {(proposalContent.portfolio||[]).map((p: any, idx: number) => (
                    <div key={idx} className="bg-white border border-outline-variant rounded-xl p-3 relative group">
                      <button
                        onClick={() => setProposalContent({...proposalContent, portfolio: proposalContent.portfolio.filter((_: any, i: number) => i !== idx)})}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-error/10 text-error rounded-full border border-error/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                      >×</button>
                      <input className="w-full bg-transparent border-none p-0 text-xs font-semibold text-primary mb-1 focus:ring-0 focus:outline-none" value={p.name}
                        onChange={e => { const n = [...proposalContent.portfolio]; n[idx].name = e.target.value; setProposalContent({...proposalContent, portfolio: n}); }} />
                      <input className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-2 py-1 text-[10px] text-secondary mb-1.5 focus:ring-0 focus:outline-none placeholder:text-outline"
                        placeholder="GitHub repo URL (optional)" value={p.url||''}
                        onChange={e => { const n = [...proposalContent.portfolio]; n[idx].url = e.target.value; setProposalContent({...proposalContent, portfolio: n}); }} />
                      <textarea className="w-full bg-transparent border-none p-0 text-[11px] text-on-surface-variant focus:ring-0 focus:outline-none resize-none" rows={2} value={p.summary}
                        onChange={e => { const n = [...proposalContent.portfolio]; n[idx].summary = e.target.value; setProposalContent({...proposalContent, portfolio: n}); }} />
                    </div>
                  ))}
                </div>
              </section>

              {/* Why / Closing */}
              <section className="space-y-5">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3 block">Why You?</label>
                  <textarea className={`${inputCls} min-h-[90px] resize-none`}
                    value={proposalContent.why_fit} onChange={e => setProposalContent({...proposalContent, why_fit: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3 block">Closing Statement</label>
                  <textarea className={`${inputCls} min-h-[75px] resize-none`}
                    value={proposalContent.closing} onChange={e => setProposalContent({...proposalContent, closing: e.target.value})} />
                </div>
              </section>

            </div>
          </div>

          {/* Right: live preview */}
          <div className="flex-1 bg-surface-container relative overflow-hidden">
            <div className="absolute inset-0">
              {isRendering && (
                <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] z-10 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2">
                    <LoaderCircle className="text-secondary animate-spin" size={26} />
                    <span className="text-xs font-semibold text-on-surface-variant">Updating preview…</span>
                  </div>
                </div>
              )}
              <iframe srcDoc={previewHtml} className="w-full h-full border-none" title="Live Preview" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ─────────────────────── Main form ─────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <div className="px-8 pt-8 pb-16 max-w-3xl">

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <h1 className="text-3xl font-bold text-on-surface mb-1">
            Upwork Proposal <span className="text-secondary">Generator</span>
          </h1>
          <p className="text-sm text-on-surface-variant">
            Generate high-conversion, AI-personalised proposals in seconds.
          </p>
        </motion.div>

        <form onSubmit={handleGenerate} className="space-y-6">

          {/* Template picker */}
          <div className="card border border-outline-variant rounded-2xl p-5">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant flex items-center gap-2 mb-4">
              <Layout size={13} className="text-secondary" /> Choose Style
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {TEMPLATES.map(t => (
                <div
                  key={t.id}
                  onClick={() => setSelectedTemplate(t.id)}
                  className={`group cursor-pointer relative p-4 rounded-xl border-2 transition-all ${
                    selectedTemplate === t.id
                      ? 'border-secondary bg-secondary/5'
                      : 'border-outline-variant hover:border-secondary/40 bg-white'
                  }`}
                >
                  <div className={`absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    selectedTemplate === t.id ? 'border-secondary bg-secondary' : 'border-outline-variant'
                  }`}>
                    {selectedTemplate === t.id && <CircleCheck size={12} className="text-white" />}
                  </div>
                  <div className="text-xs font-bold text-on-surface mb-0.5">{t.name}</div>
                  <div className="text-[10px] text-on-surface-variant mb-3">{t.desc}</div>
                  <div className="aspect-[4/3] rounded-lg border border-outline-variant bg-surface-container-low p-2 relative overflow-hidden group-hover:border-secondary/30 transition-colors">
                    <div className={`absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r ${t.accent}`} />
                    <div className="space-y-1.5 pt-1">
                      <div className="w-10 h-1 bg-outline-variant rounded" />
                      <div className="w-full h-0.5 bg-outline-variant/50 rounded" />
                      <div className="w-3/4 h-0.5 bg-outline-variant/50 rounded" />
                    </div>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setPreviewTemplate(t.id); setShowPreview(true); }}
                      className="absolute inset-0 bg-white/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm"
                    >
                      <div className="px-3 py-1.5 bg-white border border-outline-variant rounded-lg flex items-center gap-1.5 text-[10px] font-semibold text-on-surface shadow-sm">
                        <Eye size={11} className="text-secondary" /> Preview
                      </div>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline */}
          <div className="card border border-outline-variant rounded-2xl p-5">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-4 block">
              Project Timeline
            </label>
            <div className="flex gap-3 items-center">
              <input
                type="number" min="1" max="52"
                value={timelineValue} onChange={e => setTimelineValue(e.target.value)}
                className="w-24 border border-outline-variant rounded-xl px-3 py-2.5 text-on-surface text-base font-bold focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all text-center bg-white"
              />
              <select
                value={timelineUnit} onChange={e => setTimelineUnit(e.target.value)}
                className="flex-1 border border-outline-variant rounded-xl px-3 py-2.5 text-on-surface font-medium text-sm focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all cursor-pointer bg-white"
              >
                <option value="days">Days</option>
                <option value="weeks">Weeks</option>
                <option value="months">Months</option>
              </select>
            </div>
            <p className="mt-2.5 text-xs text-on-surface-variant">Delivery milestones will be structured around this timeline.</p>
          </div>

          {/* Job context */}
          <div className="card border border-outline-variant rounded-2xl p-5">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant flex items-center gap-2 mb-4">
              <FileText size={13} className="text-secondary" /> Job Context
            </label>
            <textarea
              value={requirements}
              onChange={e => setRequirements(e.target.value)}
              required
              placeholder="Paste the Upwork job description or specific client requirements here…"
              className="w-full border border-outline-variant rounded-xl p-4 text-sm text-on-surface h-52 focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all resize-none placeholder:text-outline bg-white"
            />
          </div>

          {error && (
            <div className="px-4 py-3 bg-error-container border border-error/20 rounded-xl text-sm text-on-error-container font-medium">
              {error}
            </div>
          )}

          <div className="flex justify-center pt-2">
            <button
              type="submit"
              disabled={loading}
              className="px-10 py-3.5 bg-primary hover:opacity-90 text-white rounded-xl font-bold text-base tracking-wide transition-opacity shadow-sm active:scale-95 disabled:opacity-50 flex items-center gap-3"
            >
              {loading && <LoaderCircle className="animate-spin" size={20} />}
              {loading ? 'Generating…' : 'Generate Proposal'}
            </button>
          </div>
        </form>
      </div>

      {/* Template preview modal */}
      <AnimatePresence>
        {showPreview && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-on-surface/40 backdrop-blur-sm"
            onClick={() => setShowPreview(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 16 }}
              className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 border-b border-outline-variant flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="text-secondary" size={16} />
                  <span className="text-sm font-semibold text-on-surface">
                    {TEMPLATES.find(t => t.id === previewTemplate)?.name} Preview
                  </span>
                  <span className="text-[10px] uppercase tracking-widest bg-surface-container-high px-2 py-0.5 rounded text-on-surface-variant">Sample</span>
                </div>
                <button onClick={() => setShowPreview(false)} className="p-1.5 hover:bg-surface-container-low rounded-lg text-on-surface-variant transition-colors">
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <iframe src={`${API_BASE_URL}/preview/${previewTemplate}`} className="w-full h-full border-none" title="Template Preview" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
