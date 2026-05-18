import asyncio
import concurrent.futures
from datetime import datetime
from playwright.async_api import async_playwright

DEFAULT_NAME     = "Ali Hassan"
DEFAULT_EMAIL    = "alihassanbscs99@gmail.com"
DEFAULT_COMPANY  = "Software Engineer & AI Expert"
DEFAULT_LINKEDIN = "linkedin.com/in/alihassanml"
DEFAULT_WEBSITE  = "alihassanml.vercel.app"
DEFAULT_UPWORK   = "upwork.com/freelancers/~alihassanml"
DEFAULT_PHONE    = "+92 304 863 0925"
DEFAULT_PHONE_WA = "923048630925"

SAMPLE_CONTENT = {
    "title": "Production RAG Knowledge System",
    "opening": "I shipped a production RAG system for a B2B SaaS company ingesting 40,000+ support articles, handling thousands of daily queries at sub-500ms retrieval latency with citation accuracy above 93%. I recognized the document ingestion and retrieval architecture you need because I have solved it before.",
    "problem_analysis": "Your system requires five layers working in concert. Ingestion Layer: connector-based document fetching with fingerprint change detection to avoid redundant re-embedding. Processing Layer: structure-aware chunking preserving heading hierarchy, plus image extraction with captioning for diagram searchability. Storage Layer: Aurora PostgreSQL with pgvector and HNSW indexes plus a canonical document registry for atomic version swaps. Retrieval API: hybrid BM25 and vector search with ACL filtering pushed into the WHERE clause, plus cross-encoder reranking. Orchestrator: grounded answer generation with structured citation blocks and a feedback capture endpoint.",
    "implementation_plan": [
        {"step": "Week 1-2: Ingestion Layer", "detail": "Document connectors, S3 artifact storage, SHA-256 fingerprint change detection, canonical document registry, async SQS pipeline."},
        {"step": "Week 3: Processing and Storage", "detail": "Structure-aware chunking, image extraction and GPT-4o captioning, embedding generation, Aurora PostgreSQL with pgvector and HNSW indexes, atomic publish logic."},
        {"step": "Week 4: Retrieval and Orchestrator APIs", "detail": "Hybrid BM25 and vector search, ACL filtering at query time, cross-encoder reranking, structured citations, feedback API, presigned S3 links."},
        {"step": "Week 5: Evals, Monitoring, and Handoff", "detail": "Automated eval harness tracking MRR@5 and citation accuracy, CloudWatch dashboards, full architecture diagram and runbook for handoff."},
    ],
    "challenges": [
        {"problem": "Stale chunk problem", "solution": "Built atomic publish transactions in PostgreSQL: new chunk versions insert under a staging flag, then a single UPDATE flips the live pointer so readers never see partial ingestion states."},
        {"problem": "Re-chunking on document updates", "solution": "Fingerprint comparison at section level, not full document, so only changed sections trigger re-embedding, reducing GPU cost by 70% on large document sets."},
        {"problem": "ACL safety in retrieval", "solution": "Encoded permission scopes into chunk metadata at ingestion time and pushed ACL checks into the pgvector WHERE clause, eliminating post-filter leakage risk entirely."},
    ],
    "why_fit": "I have debugged production RAG failures at 2AM when chunking edge cases caused citation hallucinations, and I have rebuilt re-indexing pipelines when source document schemas changed without warning.",
    "portfolio": [
        {"name": "RAG-Knowledge-System", "summary": "Production document ingestion and retrieval pipeline with pgvector, BM25 hybrid search, and citation-grounded answers.", "url": "https://github.com/alihassanml/"},
        {"name": "AI-Automation-Agent", "summary": "LangChain-based multi-step agent with tool use, memory, and structured output extraction.", "url": "https://github.com/alihassanml/"},
    ],
    "questions": [
        "What is the expected document update frequency, and do source schemas change over time in ways that would require re-chunking strategy updates?",
    ],
    "closing": "Happy to do a 20-minute technical call where I walk through the architecture of one of my existing RAG systems. No slides, just a whiteboard conversation about real tradeoffs.",
}


# ─────────────────────────── PDF rendering ────────────────────────────

async def render_pdf(content: dict, branding: dict, template: str) -> bytes:
    html = _build_html(content, branding, template)

    def _run_in_thread(html_str: str) -> bytes:
        async def _inner():
            async with async_playwright() as p:
                browser = await p.chromium.launch()
                page = await browser.new_page()
                await page.set_content(html_str)
                await page.wait_for_load_state("networkidle")
                pdf = await page.pdf(format="A4", print_background=True)
                await browser.close()
                return pdf

        loop = asyncio.ProactorEventLoop()
        try:
            return loop.run_until_complete(_inner())
        finally:
            loop.close()

    loop = asyncio.get_event_loop()
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
        return await loop.run_in_executor(executor, _run_in_thread, html)


def _build_html(content: dict, branding: dict, template: str) -> str:
    if template == "2":
        return _template_corporate(content, branding)
    if template == "3":
        return _template_bold_slate(content, branding)
    return _template_dark_executive(content, branding)


# ────────────────────────── TEMPLATE HELPERS ──────────────────────────

def _steps_html_exec(steps):
    return "".join([
        f'<div class="step-item">'
        f'<div class="step-title">{s.get("step","")}</div>'
        f'<div class="step-detail">{s.get("detail","")}</div>'
        f'</div>'
        for s in steps
    ])

def _steps_html_corp(steps):
    return "".join([
        f'<div class="step-item">'
        f'<div class="step-num">{i+1:02d}</div>'
        f'<div class="step-body">'
        f'<div class="step-title">{s.get("step","")}</div>'
        f'<div class="step-detail">{s.get("detail","")}</div>'
        f'</div></div>'
        for i, s in enumerate(steps)
    ])

def _steps_html_slate(steps):
    return "".join([
        f'<div class="step-item">'
        f'<div class="step-arrow">&#8594;</div>'
        f'<div class="step-body">'
        f'<div class="step-title">{s.get("step","")}</div>'
        f'<div class="step-detail">{s.get("detail","")}</div>'
        f'</div></div>'
        for s in steps
    ])

def _challenges_html_exec(challenges):
    return "".join([
        f'<div class="step-item">'
        f'<div class="step-title">{c.get("problem","")}</div>'
        f'<div class="step-detail">{c.get("solution","")}</div>'
        f'</div>'
        for c in challenges
    ])

def _challenges_html_corp(challenges):
    return "".join([
        f'<div class="step-item">'
        f'<div class="step-num">!</div>'
        f'<div class="step-body">'
        f'<div class="step-title">{c.get("problem","")}</div>'
        f'<div class="step-detail">{c.get("solution","")}</div>'
        f'</div></div>'
        for c in challenges
    ])

def _challenges_html_slate(challenges):
    return "".join([
        f'<div class="step-item">'
        f'<div class="step-arrow">&#8226;</div>'
        f'<div class="step-body">'
        f'<div class="step-title">{c.get("problem","")}</div>'
        f'<div class="step-detail">{c.get("solution","")}</div>'
        f'</div></div>'
        for c in challenges
    ])

def _portfolio_link(name: str, url: str, color: str) -> str:
    if url:
        return f'<a href="{url}" target="_blank" style="color:{color};text-decoration:none;font-weight:700;">{name}</a>'
    return name

def _split_title(title: str, accent_color: str) -> str:
    """Split last word onto new line with accent color."""
    parts = title.rsplit(' ', 1)
    if len(parts) == 2:
        return f'{parts[0]}<br><span style="color:{accent_color};">{parts[1]}</span>'
    return title


# ═══════════════════════ TEMPLATE 1 — DARK EXECUTIVE ═══════════════════════

def _template_dark_executive(content: dict, b: dict) -> str:
    steps      = _steps_html_exec(content.get("implementation_plan", []))
    challenges = _challenges_html_exec(content.get("challenges", []))
    questions  = content.get("questions", [])
    if isinstance(questions, str):
        questions = [questions] if questions else []
    q_items    = "".join(f'<div class="q-item"><span class="q-mark">?</span>{q}</div>' for q in questions)
    title      = _split_title(content.get("title", "Professional Proposal"), "#2dd4bf")
    port_items = "".join([
        f'<div class="step-item">'
        f'<div class="step-title">{_portfolio_link(p["name"], p.get("url",""), "#2dd4bf")}</div>'
        f'<div class="step-detail">{p["summary"]}</div>'
        f'</div>'
        for p in content.get("portfolio", [])
    ])

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<style>
*{{margin:0;padding:0;box-sizing:border-box;}}
@media print {{
  @page {{ size: A4; margin: 0; }}
  .gb {{ position: fixed; }}
  .no-print {{ display: none; }}
}}

@media screen {{
  body {{
    background: #050a15;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 40px 0;
    background-image: linear-gradient(to bottom, transparent 296.5mm, #1e293b 296.5mm, #1e293b 297.5mm, transparent 297.5mm);
    background-size: 100% 297mm;
  }}
  .cover, .page {{ box-shadow: 0 0 80px rgba(0,0,0,0.4); margin-bottom: 0; border-bottom: 1px dashed #334155; }}
  .gb {{ position: absolute; }}
}}

body {{
  font-family: 'Plus Jakarta Sans', sans-serif;
  color: #1e293b;
  line-height: 1.6;
  background: #fff;
  margin: 0;
}}

.gb {{
  top: 0; left: 0; width: 8px; height: 100%;
  background: linear-gradient(180deg, #2dd4bf 0%, #818cf8 50%, #2dd4bf 100%);
  z-index: 9999;
}}

/* ── COVER ── */
.cover{{width:210mm;height:297mm;
    background:linear-gradient(150deg,#060d1f 0%,#0a1628 55%,#0c1a2e 100%);
    color:#fff;display:flex;flex-direction:column;
    page-break-after:always;position:relative;overflow:hidden;}}
.hex1{{position:absolute;top:-60px;left:40px;width:200px;height:200px;
    background:linear-gradient(135deg,#2dd4bf18,#818cf818);
    clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);}}
.hex2{{position:absolute;top:100px;left:10px;width:110px;height:110px;
    background:#2dd4bf0a;border:1px solid #2dd4bf22;
    clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);}}
.hex3{{position:absolute;bottom:80px;right:-50px;width:260px;height:260px;
    background:#818cf808;border:1px solid #818cf812;
    clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);}}
.cbody{{flex:1;display:flex;flex-direction:column;justify-content:center;
    align-items:center;text-align:center;padding:80px 72px 40px;position:relative;z-index:10;}}
.cbadge{{display:inline-block;padding:6px 18px;border:1px solid #2dd4bf40;
    background:#2dd4bf10;color:#2dd4bf;font-size:9px;font-weight:700;
    letter-spacing:.2em;text-transform:uppercase;margin-bottom:36px;}}
.ctitle{{font-size:50px;font-weight:800;line-height:1.05;letter-spacing:-1.5px;
    margin-bottom:24px;color:#fff;}}
.cdiv{{width:56px;height:3px;background:linear-gradient(90deg,#2dd4bf,#818cf8);
    margin:0 auto 24px;border-radius:2px;}}
.csub{{color:#94a3b8;font-size:14px;font-weight:300;letter-spacing:.04em;
    max-width:520px;line-height:1.7;}}
.cfoot{{padding:32px 72px;position:relative;z-index:10;}}
.cmeta{{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:28px;}}
.mlabel{{font-size:8px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;
    color:#475569;margin-bottom:6px;}}
.mvalue{{font-size:20px;font-weight:700;color:#f1f5f9;}}
.msub{{font-size:11px;color:#64748b;margin-top:3px;}}
.cline{{border-top:1px solid #1e293b;padding-top:20px;
    display:flex;justify-content:space-between;align-items:center;}}
.cemail{{color:#64748b;font-size:11px;font-weight:500;}}
.cbrand{{color:#2dd4bf;font-size:9px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;}}

/* ── CONTENT ── */
.stitle, .stxt, .ph, .roadmap-step, .q-box, .m-box {{ page-break-inside: avoid; }}
.break-page {{ break-before: page; }}
.page{{width:210mm;min-height:297mm;padding:56px 64px 80px 80px;background:#fff;position:relative;}}
.ph{{padding-bottom:20px;border-bottom:2px solid #e2e8f0;margin-bottom:40px;}}
.ph-title{{font-size:26px;font-weight:800;color:#0f172a;letter-spacing:-.5px;}}
.ph-title span{{color:#2dd4bf;}}
.stitle{{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.14em;
    color:#334155;margin:30px 0 14px;display:flex;align-items:center;gap:12px;}}
.stitle::after{{content:'';flex:1;height:1px;background:#e2e8f0;}}
.txt{{font-size:13px;color:#475569;margin-bottom:16px;line-height:1.75;}}
.txt.bold{{font-weight:600;color:#1e293b;}}
.step-item{{margin-bottom:14px;padding:14px 16px 14px 18px;
    border-left:3px solid #2dd4bf;background:#f8fafc;}}
.step-title{{font-size:13px;font-weight:700;color:#0f172a;margin-bottom:4px;}}
.step-detail{{font-size:12px;color:#64748b;line-height:1.65;}}
.qbox{{background:#f0f9ff;padding:20px 24px;border-left:4px solid #818cf8;
    margin:24px 0;}}
.q-item{{font-size:13px;color:#334155;font-weight:600;margin-bottom:10px;
    display:flex;gap:10px;align-items:flex-start;}}
.q-item:last-child{{margin-bottom:0;}}
.q-mark{{color:#818cf8;font-weight:800;flex-shrink:0;}}
.links{{margin-top:36px;padding-top:18px;border-top:1px solid #f1f5f9;}}
.lrow{{font-size:12px;color:#64748b;margin-bottom:7px;display:flex;align-items:center;gap:8px;}}
.lrow a{{color:#2dd4bf;text-decoration:none;font-weight:600;}}
.cwa{{color:#64748b;font-size:9px;font-weight:500;text-decoration:none;}}
.pfooter{{position:absolute;bottom:36px;left:80px;right:64px;font-size:10px;color:#cbd5e1;
    display:flex;justify-content:space-between;border-top:1px solid #f1f5f9;padding-top:10px;}}
</style>
</head>
<body>
<div class="cover">
  <div class="gb"></div>
  <div class="hex1"></div><div class="hex2"></div><div class="hex3"></div>
  <div class="cbody">
    <div class="cbadge">Project Proposal</div>
    <div class="ctitle">{title}</div>
    <div class="cdiv"></div>
    <div class="csub">A technical and production-ready approach tailored for your specific business requirements.</div>
  </div>
  <div class="cfoot">
    <div class="cmeta">
      <div><div class="mlabel">Expert Consultant</div><div class="mvalue">{b['name']}</div><div class="msub">{b['company']}</div></div>
      <div><div class="mlabel">Date Issued</div><div class="mvalue">{b['date']}</div></div>
    </div>
    <div class="cline">
      <div class="cemail">{b['name']}</div>
      <a href="https://wa.me/{b['phone_wa']}" class="cwa">&#9742; {b['phone']}</a>
    </div>
  </div>
</div>

<div class="page">
  <div class="gb"></div>
  <div class="ph"><div class="ph-title">Technical <span>Solution</span></div></div>
  <div class="txt bold">{content.get('opening','')}</div>
  <div class="stitle">Understanding the Challenge</div>
  <div class="txt">{content.get('problem_analysis','')}</div>
  <div class="stitle">Step-by-Step Implementation</div>
  {steps}
  <div class="stitle break-page">Why I'm a Strong Fit</div>
  <div class="txt">{content.get('why_fit','')}</div>
  <div class="stitle">Real Challenges Solved</div>
  {challenges}
  <div class="stitle">Relevant Portfolio</div>
  {port_items}
  <div class="stitle">Discovery Questions</div>
  <div class="qbox">{q_items}</div>
  <div class="stitle">Next Steps &amp; Availability</div>
  <div class="txt">{content.get('closing','')}</div>
  <div class="links">
    <div class="lrow"><svg width="13" height="13" fill="none" stroke="#2dd4bf" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>GitHub: <a href="{b['github']}">{b['github_d']}</a></div>
    <div class="lrow"><svg width="13" height="13" fill="none" stroke="#2dd4bf" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"/><circle cx="4" cy="4" r="2" stroke-width="2"/></svg>LinkedIn: <a href="https://{b['linkedin']}">{b['linkedin']}</a></div>
    <div class="lrow"><svg width="13" height="13" fill="none" stroke="#2dd4bf" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke-width="2"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/></svg>Website: <a href="https://{b['website']}">{b['website']}</a></div>
    <div class="lrow"><svg width="13" height="13" fill="none" stroke="#2dd4bf" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2" stroke-width="2"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 21h8M12 17v4"/></svg>Upwork: <a href="https://{b['upwork']}">{b['upwork']}</a></div>
  </div>
  <div class="pfooter"><div>{b['name']}</div><div><a href="https://wa.me/{b['phone_wa']}" style="color:inherit;text-decoration:none;font-size:9px;">&#9742; {b['phone']}</a></div></div>
</div>
</body></html>"""


# ═══════════════════════ TEMPLATE 2 — CORPORATE PRO ════════════════════════

def _template_corporate(content: dict, b: dict) -> str:
    steps      = _steps_html_corp(content.get("implementation_plan", []))
    challenges = _challenges_html_corp(content.get("challenges", []))
    questions  = content.get("questions", [])
    if isinstance(questions, str):
        questions = [questions] if questions else []
    q_items    = "".join(f'<div class="q-item"><span class="qb"></span>{q}</div>' for q in questions)
    title      = _split_title(content.get("title", "Professional Proposal"), "#0ea5e9")
    port_items = "".join([
        f'<div class="step-item">'
        f'<div class="step-num">P{i+1}</div>'
        f'<div class="step-body">'
        f'<div class="step-title">{_portfolio_link(p["name"], p.get("url",""), "#0ea5e9")}</div>'
        f'<div class="step-detail">{p["summary"]}</div>'
        f'</div></div>'
        for i, p in enumerate(content.get("portfolio", []))
    ])

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<style>
*{{margin:0;padding:0;box-sizing:border-box;}}
@media print {{
  @page {{ size: A4; margin: 0; }}
  .gb {{ position: fixed; }}
}}

@media screen {{
  body {{
    background: #f1f5f9;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 40px 0;
    background-image: linear-gradient(to bottom, transparent 296.5mm, #cbd5e1 296.5mm, #cbd5e1 297.5mm, transparent 297.5mm);
    background-size: 100% 297mm;
  }}
  .cover, .page {{ box-shadow: 0 0 60px rgba(0,0,0,0.1); margin-bottom: 0; border-bottom: 1px dashed #94a3b8; }}
  .gb {{ position: absolute; }}
}}

body {{
  font-family: 'Inter', sans-serif;
  color: #1e293b;
  line-height: 1.6;
  background: #fff;
  margin: 0;
}}

.gb {{
  top: 0; left: 0; right: 0; height: 5px;
  background: linear-gradient(90deg, #0c4a6e, #0ea5e9, #0c4a6e);
  z-index: 9999;
}}

/* ── COVER ── */
.cover{{width:210mm;height:297mm;background:#fff;
    display:flex;flex-direction:column;page-break-after:always;
    position:relative;overflow:hidden;}}
.cband{{background:linear-gradient(135deg,#0c4a6e 0%,#0369a1 50%,#0ea5e9 100%);
    padding:64px 64px 56px;position:relative;overflow:hidden;}}
.cband::before{{content:'';position:absolute;bottom:-60px;right:-60px;
    width:220px;height:220px;background:rgba(255,255,255,.07);border-radius:50%;}}
.cband::after{{content:'';position:absolute;bottom:-100px;right:40px;
    width:140px;height:140px;background:rgba(255,255,255,.04);border-radius:50%;}}
.cbadge{{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.2em;
    color:#7dd3fc;margin-bottom:20px;}}
.ctitle{{font-size:40px;font-weight:800;color:#fff;line-height:1.08;
    letter-spacing:-1px;margin-bottom:18px;}}
.csub{{font-size:13px;color:#bae6fd;font-weight:400;line-height:1.7;max-width:480px;}}
.cbody{{flex:1;padding:48px 64px;display:flex;flex-direction:column;justify-content:space-between;}}
.ccard{{background:#f8fafc;border:1px solid #e2e8f0;border-left:6px solid #0ea5e9;
    padding:28px 32px;display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:32px;}}
.cl{{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.18em;
    color:#94a3b8;margin-bottom:6px;}}
.cv{{font-size:18px;font-weight:700;color:#0f172a;}}
.cs{{font-size:12px;color:#64748b;margin-top:4px;}}
.cdivline{{border:none;border-top:1px solid #e2e8f0;margin:0 0 20px;}}
.cfooter{{display:flex;justify-content:space-between;align-items:center;}}
.cfooter-left{{font-size:12px;color:#64748b;font-weight:500;}}
.cfooter-right{{font-size:10px;font-weight:700;color:#0ea5e9;letter-spacing:.12em;text-transform:uppercase;}}
.cwa{{color:#64748b;font-size:9px;font-weight:500;text-decoration:none;}}

/* ── CONTENT ── */
.stitle, .txt, .ph, .step-item, .qbox {{ page-break-inside: avoid; }}
.break-page {{ break-before: page; }}
.page{{width:210mm;min-height:297mm;padding:64px 64px 80px;background:#fff;position:relative;}}
.ph{{margin-bottom:36px;}}
.ph-eye{{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.18em;
    color:#0ea5e9;margin-bottom:8px;}}
.ph-title{{font-size:26px;font-weight:800;color:#0f172a;letter-spacing:-.5px;}}
.ph-line{{width:40px;height:3px;background:#0ea5e9;margin-top:12px;border-radius:2px;}}
.stitle{{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.16em;
    color:#0ea5e9;margin:28px 0 14px;display:flex;align-items:center;gap:10px;}}
.stitle::after{{content:'';flex:1;height:1px;background:#e2e8f0;}}
.txt{{font-size:13px;color:#475569;margin-bottom:16px;line-height:1.75;}}
.txt.lead{{font-weight:500;color:#334155;font-size:13.5px;}}
.step-item{{display:flex;gap:14px;margin-bottom:12px;padding:14px;
    background:#f8fafc;border:1px solid #f1f5f9;border-left:3px solid #0ea5e9;}}
.step-num{{font-size:11px;font-weight:800;color:#0ea5e9;background:#e0f2fe;
    width:28px;height:28px;display:flex;align-items:center;
    justify-content:center;flex-shrink:0;margin-top:1px;}}
.step-body .step-title{{font-size:13px;font-weight:700;color:#0f172a;margin-bottom:4px;}}
.step-body .step-detail{{font-size:12px;color:#64748b;line-height:1.6;}}
.qbox{{background:#f0f9ff;padding:18px 22px;
    margin:20px 0;border-left:4px solid #0ea5e9;}}
.q-item{{font-size:13px;font-weight:600;color:#0c4a6e;margin-bottom:10px;
    display:flex;gap:10px;align-items:flex-start;}}
.q-item:last-child{{margin-bottom:0;}}
.qb{{width:7px;height:7px;background:#0ea5e9;border-radius:50%;flex-shrink:0;margin-top:4px;}}
.links{{display:flex;gap:12px;flex-wrap:wrap;margin-top:30px;padding-top:18px;
    border-top:1px solid #f1f5f9;}}
.lchip{{font-size:11px;font-weight:600;color:#0ea5e9;background:#f0f9ff;
    border:1px solid #bae6fd;padding:5px 12px;text-decoration:none;}}
.pfooter{{position:absolute;bottom:36px;left:64px;right:64px;font-size:10px;color:#94a3b8;
    display:flex;justify-content:space-between;border-top:1px solid #f1f5f9;padding-top:10px;}}
</style>
</head>
<body>
<div class="cover">
  <div class="gb"></div>
  <div class="cband">
    <div class="cbadge">Project Proposal · 2026</div>
    <div class="ctitle">{title}</div>
    <div class="csub">A technical and production-ready approach tailored for your specific business requirements.</div>
  </div>
  <div class="cbody">
    <div class="ccard">
      <div><div class="cl">Expert Consultant</div><div class="cv">{b['name']}</div><div class="cs">{b['company']}</div></div>
      <div><div class="cl">Date Issued</div><div class="cv">{b['date']}</div><div class="cs">{b['email']}</div></div>
    </div>
    <div>
      <hr class="cdivline">
      <div class="cfooter">
        <span class="cfooter-left">{b['name']}</span>
        <a href="https://wa.me/{b['phone_wa']}" class="cwa">&#9742; {b['phone']}</a>
      </div>
    </div>
  </div>
</div>

<div class="page">
  <div class="gb"></div>
  <div class="ph"><div class="ph-eye">Technical Overview</div><div class="ph-title">Proposed Solution</div><div class="ph-line"></div></div>
  <div class="txt lead">{content.get('opening','')}</div>
  <div class="stitle">Challenge Analysis</div>
  <div class="txt">{content.get('problem_analysis','')}</div>
  <div class="stitle">Implementation Roadmap</div>
  {steps}
  <div class="stitle break-page">Why I'm a Strong Fit</div>
  <div class="txt">{content.get('why_fit','')}</div>
  <div class="stitle">Real Challenges Solved</div>
  {challenges}
  <div class="stitle">Relevant Portfolio</div>
  {port_items}
  <div class="stitle">Discovery Questions</div>
  <div class="qbox">{q_items}</div>
  <div class="stitle">Next Steps &amp; Availability</div>
  <div class="txt">{content.get('closing','')}</div>
  <div class="links">
    <a class="lchip" href="{b['github']}">{b['github_d']}</a>
    <a class="lchip" href="https://{b['linkedin']}">{b['linkedin']}</a>
    <a class="lchip" href="https://{b['website']}">{b['website']}</a>
    <a class="lchip" href="https://{b['upwork']}">{b['upwork']}</a>
  </div>
  <div class="pfooter"><div>{b['name']}</div><div><a href="https://wa.me/{b['phone_wa']}" style="color:inherit;text-decoration:none;font-size:9px;">&#9742; {b['phone']}</a></div></div>
</div>
</body></html>"""


# ════════════════════════ TEMPLATE 3 — BOLD SLATE ═══════════════════════════

def _template_bold_slate(content: dict, b: dict) -> str:
    steps      = _steps_html_slate(content.get("implementation_plan", []))
    challenges = _challenges_html_slate(content.get("challenges", []))
    questions  = content.get("questions", [])
    if isinstance(questions, str):
        questions = [questions] if questions else []
    q_items    = "".join(f'<li class="q-item">{q}</li>' for q in questions)
    title      = _split_title(content.get("title", "Professional Proposal"), "#f59e0b")
    port_items = "".join([
        f'<div class="step-item">'
        f'<div class="step-arrow">&#8226;</div>'
        f'<div class="step-body">'
        f'<div class="step-title">{_portfolio_link(p["name"], p.get("url",""), "#d97706")}</div>'
        f'<div class="step-detail">{p["summary"]}</div>'
        f'</div></div>'
        for p in content.get("portfolio", [])
    ])

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<style>
*{{margin:0;padding:0;box-sizing:border-box;}}
@media print {{
  @page {{ size: A4; margin: 0; }}
  .gb {{ position: fixed; }}
}}

@media screen {{
  body {{
    background: #050a15;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 40px 0;
    background-image: linear-gradient(to bottom, transparent 296.5mm, #1e293b 296.5mm, #1e293b 297.5mm, transparent 297.5mm);
    background-size: 100% 297mm;
  }}
  .cover, .page {{ box-shadow: 0 0 80px rgba(0,0,0,0.4); margin-bottom: 0; border-bottom: 1px dashed #334155; }}
  .gb {{ position: absolute; }}
}}

body {{
  font-family: 'DM Sans', sans-serif;
  color: #1e293b;
  line-height: 1.6;
  background: #fff;
  margin: 0;
}}

.gb {{
  top: 0; left: 0; width: 6px; height: 100%;
  background: #f59e0b;
  z-index: 9999;
}}

/* ── COVER ── */
.cover{{width:210mm;height:297mm;
    background:linear-gradient(155deg,#0f172a 0%,#1e293b 45%,#0f172a 100%);
    display:flex;flex-direction:column;page-break-after:always;
    position:relative;overflow:hidden;}}
.grid-bg{{position:absolute;inset:0;
    background-image:linear-gradient(rgba(245,158,11,.04) 1px,transparent 1px),
    linear-gradient(90deg,rgba(245,158,11,.04) 1px,transparent 1px);
    background-size:40px 40px;}}
.ring1{{position:absolute;bottom:-100px;right:-100px;width:420px;height:420px;
    border:1px solid rgba(245,158,11,.1);border-radius:50%;}}
.ring2{{position:absolute;bottom:-60px;right:-60px;width:260px;height:260px;
    border:1px solid rgba(245,158,11,.07);border-radius:50%;}}
.cbody{{flex:1;padding:72px 72px 40px 82px;position:relative;z-index:10;
    display:flex;flex-direction:column;justify-content:center;}}
.cyear{{font-size:11px;font-weight:700;color:#f59e0b;letter-spacing:.25em;
    text-transform:uppercase;margin-bottom:32px;}}
.ctitle{{font-size:48px;font-weight:800;color:#f8fafc;line-height:1.08;
    letter-spacing:-1.5px;margin-bottom:28px;}}
.ctitle .acc{{color:#f59e0b;}}
.csub{{font-size:14px;color:#94a3b8;font-weight:400;line-height:1.7;max-width:460px;}}
.cfoot{{padding:36px 72px 48px 82px;position:relative;z-index:10;}}
.cmeta{{display:flex;justify-content:space-between;align-items:flex-end;
    padding-top:24px;border-top:1px solid rgba(248,250,252,.08);}}
.mb .ml{{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.2em;
    color:#475569;margin-bottom:4px;}}
.mb .mv{{font-size:18px;font-weight:700;color:#f8fafc;}}
.mb .ms{{font-size:11px;color:#64748b;margin-top:2px;}}
.cbrand{{font-size:9px;font-weight:700;color:#f59e0b;letter-spacing:.18em;text-transform:uppercase;}}
.cwa{{color:#64748b;font-size:9px;font-weight:500;text-decoration:none;}}

/* ── CONTENT ── */
.stitle, .txt, .ph, .step-item, .qbox, .links {{ page-break-inside: avoid; }}
.break-page {{ break-before: page; }}
.page{{width:210mm;min-height:297mm;padding:60px 68px 80px 82px;background:#fff;position:relative;}}
.ph{{margin-bottom:36px;padding-bottom:22px;border-bottom:2px solid #f59e0b;}}
.ph-title{{font-size:26px;font-weight:800;color:#0f172a;letter-spacing:-.5px;}}
.ph-title .acc{{color:#f59e0b;}}
.stitle{{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.18em;
    color:#d97706;margin:28px 0 12px;display:flex;align-items:center;gap:10px;}}
.stitle::after{{content:'';flex:1;height:1px;background:#f1f5f9;}}
.txt{{font-size:13px;color:#475569;margin-bottom:16px;line-height:1.75;}}
.txt.lead{{font-weight:600;color:#1e293b;}}
.step-item{{display:flex;gap:14px;margin-bottom:12px;padding:14px 16px;
    border:1px solid #fef3c7;border-left:3px solid #f59e0b;background:#fffbeb;}}
.step-arrow{{font-size:14px;font-weight:800;color:#f59e0b;flex-shrink:0;padding-top:2px;}}
.step-body .step-title{{font-size:13px;font-weight:700;color:#0f172a;margin-bottom:4px;}}
.step-body .step-detail{{font-size:12px;color:#64748b;line-height:1.6;}}
.qbox{{background:#fffbeb;padding:18px 22px;
    margin:20px 0;border-left:4px solid #f59e0b;}}
.q-item{{font-size:13px;font-weight:600;color:#78350f;margin-bottom:8px;
    list-style:disc inside;}}
.q-item:last-child{{margin-bottom:0;}}
.links{{margin-top:32px;padding-top:18px;border-top:1px solid #f1f5f9;}}
.lrow{{font-size:12px;color:#64748b;margin-bottom:7px;display:flex;gap:8px;align-items:center;}}
.lrow a{{color:#d97706;text-decoration:none;font-weight:600;}}
.pfooter{{position:absolute;bottom:36px;left:82px;right:68px;font-size:10px;color:#cbd5e1;
    display:flex;justify-content:space-between;border-top:1px solid #f8fafc;padding-top:10px;}}
</style>
</head>
<body>
<div class="cover">
  <div class="gb"></div>
  <div class="grid-bg"></div>
  <div class="ring1"></div><div class="ring2"></div>
  <div class="cbody">
    <div class="cyear">Project Proposal · 2026</div>
    <div class="ctitle">{title}</div>
    <div class="csub">A technical and production-ready approach tailored for your specific business requirements.</div>
  </div>
  <div class="cfoot">
    <div class="cmeta">
      <div class="mb"><div class="ml">Prepared By</div><div class="mv">{b['name']}</div><div class="ms">{b['company']}</div></div>
      <div class="mb" style="text-align:right"><div class="ml">Date Issued</div><div class="mv">{b['date']}</div><div class="ms">{b['email']}</div></div>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:16px;padding-top:14px;border-top:1px solid rgba(248,250,252,.06);">
      <span style="font-size:12px;color:#64748b;font-weight:500;">{b['name']}</span>
      <a href="https://wa.me/{b['phone_wa']}" class="cwa">&#9742; {b['phone']}</a>
    </div>
  </div>
</div>

<div class="page">
  <div class="gb"></div>
  <div class="ph"><div class="ph-title">Technical <span class="acc">Solution</span></div></div>
  <div class="txt lead">{content.get('opening','')}</div>
  <div class="stitle">Understanding the Challenge</div>
  <div class="txt">{content.get('problem_analysis','')}</div>
  <div class="stitle">Step-by-Step Implementation</div>
  {steps}
  <div class="stitle break-page">Why I'm a Strong Fit</div>
  <div class="txt">{content.get('why_fit','')}</div>
  <div class="stitle">Real Challenges Solved</div>
  {challenges}
  <div class="stitle">Relevant Portfolio</div>
  {port_items}
  <div class="stitle">Discovery Questions</div>
  <div class="qbox"><ul style="list-style:none">{q_items}</ul></div>
  <div class="stitle">Next Steps &amp; Availability</div>
  <div class="txt">{content.get('closing','')}</div>
  <div class="links">
    <div class="lrow">&#8594; GitHub: <a href="{b['github']}">{b['github_d']}</a></div>
    <div class="lrow">&#8594; LinkedIn: <a href="https://{b['linkedin']}">{b['linkedin']}</a></div>
    <div class="lrow">&#8594; Website: <a href="https://{b['website']}">{b['website']}</a></div>
    <div class="lrow">&#8594; Upwork: <a href="https://{b['upwork']}">{b['upwork']}</a></div>
  </div>
  <div class="pfooter"><div>{b['name']}</div><div><a href="https://wa.me/{b['phone_wa']}" style="color:inherit;text-decoration:none;font-size:9px;">&#9742; {b['phone']}</a></div></div>
</div>
</body></html>"""
