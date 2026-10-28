import json
import httpx
from app.config import settings

FREE_MODELS = [
    "meta-llama/llama-3.3-70b-instruct:free",
    "mistralai/mistral-small-3.1-24b-instruct:free",
    "google/gemma-3-27b-it:free",
    "qwen/qwen3-4b:free",
    "google/gemma-3-12b-it:free",
]

def _clean(text: str) -> str:
    text = text.strip()
    if text.startswith("```json"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    return text.strip()

def _normalize(questions: list) -> list:
    normalized = []
    for q in questions:
        opts = q.get("options", [])
        if isinstance(opts, list) and len(opts) == 4:
            keys = ["A", "B", "C", "D"]
            options_dict = {keys[i]: opts[i] for i in range(4)}
            answer_text = q.get("answer", "")
            correct_key = keys[opts.index(answer_text)] if answer_text in opts else "A"
            normalized.append({
                "question": q["question"],
                "options": options_dict,
                "correct_answer": correct_key
            })
        else:
            normalized.append(q)
    return normalized

async def generate_quiz(topic: str, num_questions: int = 10) -> list:
    num_questions = 10

    prompt = (
        f"Generate exactly {num_questions} multiple-choice questions on the topic: {topic}.\n\n"
        "Return ONLY a valid JSON array with NO markdown and NO extra text.\n\n"
        "Each item must follow this exact format:\n"
        "{\n"
        "  \"question\": \"string\",\n"
        "  \"options\": [\"option1\", \"option2\", \"option3\", \"option4\"],\n"
        "  \"answer\": \"exact text of correct option\"\n"
        "}\n\n"
        "Rules:\n"
        "- Exactly 4 options per question\n"
        "- answer must be the exact text of one of the options\n"
        "- No explanations, no numbering, no text outside the JSON array"
    )

    headers = {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Academic Evaluation System"
    }

    last_error = None
    async with httpx.AsyncClient(timeout=60.0) as client:
        for model in FREE_MODELS:
            payload = {
                "model": model,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.3,
                "max_tokens": 1200
            }
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                json=payload, headers=headers
            )
            if response.status_code == 200:
                text = _clean(response.json()["choices"][0]["message"]["content"])
                try:
                    questions = json.loads(text)[:num_questions]
                    return _normalize(questions)
                except json.JSONDecodeError:
                    last_error = f"Failed to parse JSON from {model}"
                    continue
            # 429 or 404 — try next model
            last_error = f"{model}: {response.text}"
            continue

    raise ValueError(f"All models failed. Last error: {last_error}")
