import json
import httpx
from app.config import settings


class AIService:
    URL = "https://openrouter.ai/api/v1/chat/completions"
    MODEL = "meta-llama/llama-3.3-70b-instruct:free"

    def _headers(self):
        return {
            "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "Academic Evaluation System"
        }

    async def _call_ai(self, prompt: str) -> str:
        payload = {
            "model": self.MODEL,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.7,
            "max_tokens": 4096
        }
        async with httpx.AsyncClient(timeout=180.0) as client:
            response = await client.post(self.URL, json=payload, headers=self._headers())
        if response.status_code != 200:
            raise ValueError(f"OpenRouter API Error: {response.text}")
        return response.json()["choices"][0]["message"]["content"].strip()

    def _clean_json(self, text: str) -> str:
        text = text.strip()
        if text.startswith("```json"):
            text = text[7:]
        elif text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        return text.strip()

    async def generate_case_study_topic(self, subject_name: str, existing_topics: list) -> str:
        existing_str = "\n".join(existing_topics) if existing_topics else "None"
        prompt = f"Generate ONE unique case study topic for {subject_name}. Already used: {existing_str}. Return ONLY the topic title."
        return (await self._call_ai(prompt)).strip()

    async def evaluate_case_study(self, topic: str, submission_text: str) -> dict:
        prompt = f"""Evaluate this case study on topic: {topic}

Submission:
{submission_text}

Return ONLY valid JSON:
{{
  "relevance_score": 0,
  "content_depth_score": 0,
  "structure_score": 0,
  "clarity_score": 0,
  "total_marks": 0,
  "feedback": "Feedback here"
}}"""
        text = self._clean_json(await self._call_ai(prompt))
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            raise ValueError("Failed to parse evaluation JSON from OpenRouter")


ai_service = AIService()
