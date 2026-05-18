import os
import json
import asyncio
from dotenv import load_dotenv
load_dotenv()
import threading
import concurrent.futures
from datetime import datetime

from fastapi import FastAPI, Request, Form, HTTPException, Response, Depends, Header, Query
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import openai
from fastapi.middleware.cors import CORSMiddleware

from maps.scraper import scrape_google_maps
from emailverify.verifier import verify_email_sync, _executor as _email_executor
from domainfinder.finder import find_domain_for
from proposal.agent import get_relevant_repos
from proposal.prompts import SYSTEM_PROMPT, USER_PROMPT_TEMPLATE
from proposal.templates import (
    SAMPLE_CONTENT,
    DEFAULT_NAME, DEFAULT_EMAIL, DEFAULT_COMPANY,
    DEFAULT_LINKEDIN, DEFAULT_WEBSITE, DEFAULT_UPWORK,
    DEFAULT_PHONE, DEFAULT_PHONE_WA,
    render_pdf, _build_html,
)
from auth import (
    init_db, create_user, verify_user, create_session,
    delete_session, get_user_by_token, update_api_key as db_update_api_key,
    save_history, get_history, delete_history,
    get_preferences, save_preferences,
)

app = FastAPI(title="Halify.ai")
init_db()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
static_path = os.path.join(BASE_DIR, "templates", "static")

if not os.path.exists(static_path):
    os.makedirs(static_path)
app.mount("/static", StaticFiles(directory=static_path), name="static")
templates = Jinja2Templates(directory=os.path.join(BASE_DIR, "templates"))


# ─────────────────────────── Auth models ──────────────────────────────

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class UpdateApiKeyRequest(BaseModel):
    api_key: str


def _current_user(authorization: str = Header(default=None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    user = get_user_by_token(authorization.split(" ", 1)[1])
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return user


@app.post("/register")
async def register(req: RegisterRequest):
    if not req.name.strip() or not req.email.strip() or not req.password:
        raise HTTPException(status_code=400, detail="All fields are required")
    user = create_user(req.name.strip(), req.email.strip(), req.password)
    if not user:
        raise HTTPException(status_code=400, detail="Email already registered")
    token = create_session(user["id"])
    return {"token": token, "user": user}


@app.post("/login")
async def login(req: LoginRequest):
    user = verify_user(req.email, req.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_session(user["id"])
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "openai_api_key": user["openai_api_key"],
        },
    }


@app.post("/logout")
async def logout(authorization: str = Header(default=None)):
    if authorization and authorization.startswith("Bearer "):
        delete_session(authorization.split(" ", 1)[1])


@app.get("/me")
async def me(current_user: dict = Depends(_current_user)):
    return {
        "id": current_user["id"],
        "name": current_user["name"],
        "email": current_user["email"],
        "openai_api_key": current_user["openai_api_key"],
    }


@app.post("/update-api-key")
async def update_api_key_endpoint(req: UpdateApiKeyRequest, current_user: dict = Depends(_current_user)):
    db_update_api_key(current_user["id"], req.api_key)
    return {"ok": True}


# ─────────────────────────────────────────────────────────────────────

@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/preview/{template}", response_class=HTMLResponse)
async def preview_template(template: str):
    if template not in ("1", "2", "3"):
        template = "1"
    branding = {
        "name":     DEFAULT_NAME,
        "email":    DEFAULT_EMAIL,
        "company":  DEFAULT_COMPANY,
        "date":     datetime.now().strftime("%B %d, %Y"),
        "github":   "https://github.com/alihassanml/",
        "github_d": "github.com/alihassanml",
        "linkedin": DEFAULT_LINKEDIN,
        "website":  DEFAULT_WEBSITE,
        "upwork":   DEFAULT_UPWORK,
        "phone":    DEFAULT_PHONE,
        "phone_wa": DEFAULT_PHONE_WA,
    }
    html = _build_html(SAMPLE_CONTENT, branding, template)
    return HTMLResponse(content=html)


@app.post("/generate")
async def generate_proposal(
    requirements: str = Form(...),
    github_url:   str = Form(...),
    template:     str = Form(default="1"),
    timeline:     str = Form(default="4 weeks"),
    authorization: str = Header(default=None),
):
    api_key = ""
    selected_model = "gpt-4o-mini"
    if authorization and authorization.startswith("Bearer "):
        user = get_user_by_token(authorization.split(" ", 1)[1])
        if user:
            api_key = user.get("openai_api_key", "")
            prefs = get_preferences(user["id"])
            selected_model = prefs.get("model", "gpt-4o-mini")
    if not api_key:
        raise HTTPException(
            status_code=400,
            detail="OpenAI API key not set. Open your profile in the sidebar and add your key.",
        )
    ai_client = openai.OpenAI(api_key=api_key)

    try:
        try:
            relevant_repos = get_relevant_repos(requirements, api_key, selected_model)
        except Exception:
            relevant_repos = None

        user_prompt = USER_PROMPT_TEMPLATE.format(
            requirements=requirements,
            github_url=f"MY TOP REPOS: {relevant_repos}" if relevant_repos else github_url,
            timeline=timeline,
        )

        completion = ai_client.chat.completions.create(
            model=selected_model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user",   "content": user_prompt},
            ],
            temperature=0.7,
            max_tokens=4000,
            response_format={"type": "json_object"},
        )
        content = json.loads(completion.choices[0].message.content)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")

    github_display = github_url.replace("https://", "").replace("http://", "").rstrip("/")
    branding = {
        "name":     DEFAULT_NAME,
        "email":    DEFAULT_EMAIL,
        "company":  DEFAULT_COMPANY,
        "date":     datetime.now().strftime("%B %d, %Y"),
        "github":   github_url,
        "github_d": github_display,
        "linkedin": DEFAULT_LINKEDIN,
        "website":  DEFAULT_WEBSITE,
        "upwork":   DEFAULT_UPWORK,
        "phone":    DEFAULT_PHONE,
        "phone_wa": DEFAULT_PHONE_WA,
    }

    return {
        "content": content,
        "branding": branding,
        "template": template
    }


@app.post("/render-preview")
async def render_preview(request: Request):
    data = await request.json()
    html = _build_html(data.get("content"), data.get("branding"), data.get("template", "1"))
    return HTMLResponse(content=html)


@app.post("/download-pdf")
async def download_pdf(request: Request):
    data = await request.json()
    pdf_bytes = await render_pdf(data.get("content"), data.get("branding"), data.get("template", "1"))
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=proposal.pdf"},
    )


# ─────────────────────────── History ──────────────────────────────

class SaveHistoryRequest(BaseModel):
    type: str
    title: str
    summary: str = ""
    data: str


@app.get("/history")
async def list_history(current_user: dict = Depends(_current_user)):
    return get_history(current_user["id"])


@app.post("/history")
async def create_history(req: SaveHistoryRequest, current_user: dict = Depends(_current_user)):
    entry = save_history(current_user["id"], req.type, req.title, req.summary, req.data)
    return entry


@app.delete("/history/{entry_id}")
async def remove_history(entry_id: int, current_user: dict = Depends(_current_user)):
    ok = delete_history(entry_id, current_user["id"])
    if not ok:
        raise HTTPException(status_code=404, detail="History entry not found")
    return {"ok": True}


# ─────────────────────────── Preferences ──────────────────────────────

@app.get("/preferences")
async def get_user_prefs(current_user: dict = Depends(_current_user)):
    return get_preferences(current_user["id"])


@app.post("/preferences")
async def save_user_prefs(request: Request, current_user: dict = Depends(_current_user)):
    data = await request.json()
    save_preferences(current_user["id"], data)
    return {"ok": True}


# ─────────────────────────── Maps scraper ─────────────────────────────

def _normalize_business(r: dict) -> dict:
    return {
        "name":      r.get("title", ""),
        "rating":    r.get("rating", ""),
        "reviews":   r.get("reviewCount", ""),
        "category":  r.get("industry", ""),
        "address":   r.get("address", ""),
        "phone":     r.get("phone", ""),
        "website":   r.get("website", ""),
        "email":     r.get("email", ""),
        "facebook":  r.get("facebook", ""),
        "instagram": r.get("instagram", ""),
        "tiktok":    r.get("tiktok", ""),
        "twitter":   r.get("twitter", ""),
        "youtube":   r.get("youtube", ""),
        "maps_url":  r.get("href", ""),
    }


@app.get("/scrape-maps/stream")
async def scrape_maps_stream(
    query: str = Query(...),
    max_results: int = Query(20, ge=1),
):
    if not query.strip():
        raise HTTPException(status_code=400, detail="query is required")

    aq: asyncio.Queue = asyncio.Queue()
    loop = asyncio.get_event_loop()

    def _run():
        def cb(msg: str):
            loop.call_soon_threadsafe(aq.put_nowait, {"type": "progress", "message": msg})
        try:
            results = scrape_google_maps(query.strip(), max_results, progress_cb=cb)
            loop.call_soon_threadsafe(
                aq.put_nowait,
                {"type": "done", "results": [_normalize_business(r) for r in results]},
            )
        except Exception as e:
            loop.call_soon_threadsafe(aq.put_nowait, {"type": "error", "message": str(e)})
        finally:
            loop.call_soon_threadsafe(aq.put_nowait, None)

    threading.Thread(target=_run, daemon=True).start()

    async def event_stream():
        while True:
            try:
                item = await asyncio.wait_for(aq.get(), timeout=180)
            except asyncio.TimeoutError:
                yield 'data: {"type":"timeout"}\n\n'
                break
            if item is None:
                break
            yield f"data: {json.dumps(item)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.post("/scrape-maps")
async def scrape_maps(request: Request):
    data = await request.json()
    query = (data.get("query") or "").strip()
    max_results = max(1, int(data.get("max_results", 20)))

    if not query:
        raise HTTPException(status_code=400, detail="query is required")

    loop = asyncio.get_event_loop()
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
        results = await loop.run_in_executor(
            executor, scrape_google_maps, query, max_results
        )

    normalised = [_normalize_business(r) for r in results]
    return {"results": normalised, "count": len(normalised)}


# ─────────────────────────── Email Verify ────────────────────────────

@app.get("/email/verify")
async def email_verify_single(email: str = Query(...)):
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(_email_executor, verify_email_sync, email)
    return result


@app.post("/email/verify/bulk")
async def email_verify_bulk(emails: list[str]):
    emails = [e.strip() for e in emails[:200] if e.strip()]
    loop = asyncio.get_event_loop()
    tasks = [loop.run_in_executor(_email_executor, verify_email_sync, e) for e in emails]
    results = await asyncio.gather(*tasks)
    return list(results)


# ─────────────────────────── Domain Finder ────────────────────────────

class DomainRequest(BaseModel):
    company_name: str

class DomainBulkRequest(BaseModel):
    companies: list[str]


def _require_api_key(authorization: str = Header(default=None)) -> str:
    if authorization and authorization.startswith("Bearer "):
        user = get_user_by_token(authorization.split(" ", 1)[1])
        if user and user.get("openai_api_key"):
            return user["openai_api_key"]
    raise HTTPException(
        status_code=400,
        detail="OpenAI API key not set. Open your profile in the sidebar and add your key.",
    )


@app.post("/find-domain")
async def find_domain_single(
    req: DomainRequest,
    api_key: str = Depends(_require_api_key),
    current_user: dict = Depends(_current_user),
):
    if not req.company_name.strip():
        raise HTTPException(status_code=400, detail="company_name cannot be empty")
    prefs = get_preferences(current_user["id"])
    model = prefs.get("model", "gpt-4o-mini")
    result = await find_domain_for(req.company_name, api_key, model)
    return result


@app.post("/find-domain/bulk")
async def find_domain_bulk(
    req: DomainBulkRequest,
    api_key: str = Depends(_require_api_key),
    current_user: dict = Depends(_current_user),
):
    companies = [c.strip() for c in req.companies[:30] if c.strip()]
    if not companies:
        raise HTTPException(status_code=400, detail="No company names provided")
    prefs = get_preferences(current_user["id"])
    model = prefs.get("model", "gpt-4o-mini")
    import asyncio as _asyncio
    results = await _asyncio.gather(*[find_domain_for(c, api_key, model) for c in companies])
    return list(results)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
