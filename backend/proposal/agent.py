import json
import requests
from openai import OpenAI


def get_relevant_repos(requirements: str, api_key: str = "", model: str = "gpt-4o-mini") -> list:
    try:
        url = "https://api.github.com/users/alihassanml/repos?per_page=100&sort=updated"
        all_repos = requests.get(url, timeout=10).json()

        repo_data = [
            {
                "name":        r.get("name"),
                "description": r.get("description") or "No description",
                "topics":      r.get("topics", []),
                "language":    r.get("language") or "Unknown",
            }
            for r in all_repos
            if not r.get("fork")
        ]

        if not repo_data or not api_key:
            return []

        client = OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model=model,
            temperature=0,
            max_tokens=400,
            response_format={"type": "json_object"},
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a technical portfolio expert. "
                        "Select the 2 most relevant GitHub repositories from the list based on the job requirements. "
                        "Respond ONLY with JSON: "
                        '{"repos": [{"name": "repo-name", "summary": "why it is relevant"}, ...]}'
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"JOB REQUIREMENTS:\n{requirements}\n\n"
                        f"MY REPOSITORIES:\n{json.dumps(repo_data[:50], indent=2)}\n\n"
                        "Select the 2 best matches."
                    ),
                },
            ],
        )

        data = json.loads(response.choices[0].message.content)
        return data.get("repos", [])

    except Exception:
        return []
