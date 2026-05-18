import re
import json
import asyncio
from urllib.parse import urlparse
from ddgs import DDGS
from openai import OpenAI

BLOCKED = {
    "linkedin.com","facebook.com","instagram.com","twitter.com","x.com",
    "youtube.com","tiktok.com","pinterest.com","reddit.com","quora.com",
    "crunchbase.com","bloomberg.com","reuters.com","forbes.com","fortune.com",
    "yelp.com","yellowpages.com","bbb.org","glassdoor.com","indeed.com",
    "zoominfo.com","dnb.com","owler.com","manta.com","bizapedia.com",
    "opencorporates.com","companieshouse.gov.uk","inc.com","entrepreneur.com",
    "similarweb.com","semrush.com","builtwith.com","wappalyzer.com",
    "wikipedia.org","wikimedia.org","wikidata.org",
    "techcrunch.com","businesswire.com","prnewswire.com","globenewswire.com",
    "apnews.com","bbc.com","cnn.com","theguardian.com","wsj.com","nytimes.com",
    "amazon.com","google.com","apple.com","microsoft.com","github.com",
    "medium.com","substack.com","wordpress.com","wix.com","squarespace.com",
    "shopify.com","etsy.com","ebay.com","trustpilot.com","g2.com","capterra.com",
    "producthunt.com","angelist.co","f6s.com","startupranking.com",
}


def extract_root_domain(url: str) -> str:
    try:
        parsed = urlparse(url if url.startswith("http") else "https://" + url)
        host = (parsed.netloc or parsed.path).lower().strip()
        host = re.sub(r'^www\.', '', host).split(":")[0]
        return host
    except Exception:
        return ""


def is_blocked(url: str) -> bool:
    domain = extract_root_domain(url)
    if not domain:
        return True
    root = ".".join(domain.split(".")[-2:])
    return root in BLOCKED or domain in BLOCKED


def search_duckduckgo(company_name: str, max_results: int = 10) -> list:
    queries = [
        f'"{company_name}" official website',
        f'{company_name} website',
        f'{company_name} homepage',
        f'{company_name}',
        f'"{company_name}" -site:linkedin.com -site:facebook.com -site:crunchbase.com',
        f'"{company_name}" inurl:about OR inurl:contact',
    ]
    seen, results = set(), []
    with DDGS() as ddgs:
        for query in queries:
            try:
                for h in ddgs.text(query, max_results=max_results):
                    url = h.get("href", "")
                    if url and url not in seen and not is_blocked(url):
                        seen.add(url)
                        results.append({
                            "url":     url,
                            "title":   h.get("title", ""),
                            "snippet": h.get("body", ""),
                        })
                if len(results) >= 8:
                    break
            except Exception:
                continue
    return results[:10]


def ask_openai_domain(company_name: str, candidates: list, api_key: str, model: str = "gpt-4o-mini") -> dict:
    if not candidates:
        return {"domain": "", "confidence": "low", "reason": "No candidates found from search"}

    candidate_text = "\n".join([
        f"{i+1}. URL: {c['url']}\n   Title: {c['title']}\n   Snippet: {c['snippet'][:150]}"
        for i, c in enumerate(candidates)
    ])

    prompt = f"""You are a company domain finder. Identify the OFFICIAL website domain of this company.

Company name: "{company_name}"

Search results:
{candidate_text}

Rules:
- Pick the result most likely to be the company's OWN official website
- AVOID: LinkedIn, Facebook, directories (Crunchbase, Yelp), news articles, Wikipedia
- PREFER: A domain that matches or closely relates to "{company_name}"
- If none are clearly the official site, return empty domain

Respond ONLY with JSON (no markdown):
{{"domain": "example.com", "confidence": "high", "reason": "short reason"}}

confidence = high | medium | low"""

    try:
        client = OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model=model,
            max_tokens=150,
            temperature=0,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": "You are a company domain finder. Always respond with valid JSON only."},
                {"role": "user",   "content": prompt},
            ],
        )
        return json.loads(response.choices[0].message.content.strip())
    except Exception as e:
        fallback = extract_root_domain(candidates[0]["url"]) if candidates else ""
        return {
            "domain":     fallback,
            "confidence": "low",
            "reason":     f"AI unavailable — used first search result ({e})",
        }


async def find_domain_for(company_name: str, api_key: str, model: str = "gpt-4o-mini") -> dict:
    name = company_name.strip()
    loop = asyncio.get_event_loop()
    candidates = await loop.run_in_executor(None, search_duckduckgo, name, 10)
    result     = await loop.run_in_executor(None, ask_openai_domain, name, candidates, api_key, model)
    domain     = extract_root_domain(result.get("domain", ""))
    return {
        "company_name":   name,
        "company_domain": domain,
        "confidence":     result.get("confidence", "low"),
        "reason":         result.get("reason", ""),
        "candidates":     candidates,
    }
