import json
import requests

from app.core.config import settings


def build_triage_prompt(case_data: dict, protocol: dict | None = None) -> str:
    protocol_section = ""

    if protocol:
        protocol_section = f"""
Follow this emergency protocol strictly:

Protocol: {protocol.get("title")}
Protocol match confidence: {protocol.get("confidence_label")}
Matched keywords: {", ".join(protocol.get("matched_keywords", []))}
Why this protocol was selected:
{protocol.get("why_used")}

{protocol.get("content")}
"""

    return f"""
You are an offline clinical downtime decision-support assistant.

IMPORTANT SAFETY RULES:
- You do NOT diagnose.
- You do NOT replace doctors.
- You follow provided protocols strictly if available.
- If patient data is missing, highlight uncertainty.
- Return ONLY valid JSON. No markdown.

{protocol_section}

Patient:
- Age: {case_data.get("age")}
- Gender: {case_data.get("gender")}
- Allergy status: {case_data.get("allergy_status")}
- Known conditions: {case_data.get("known_conditions")}
- Current medications: {case_data.get("current_medications")}

Triage:
- Chief complaint: {case_data.get("chief_complaint")}
- Symptoms: {case_data.get("symptoms")}
- Vitals: {case_data.get("vitals")}

Return JSON:

{{
  "urgency": "critical | urgent | stable",
  "risk_summary": "short summary",
  "recommended_actions": ["action 1", "action 2"],
  "warnings": ["warning 1"],
  "confidence": "low | medium | high",
  "source": "protocol name or fallback"
  "protocol_reasoning": ["why protocol was used"]

}}
"""

def call_gemma(prompt: str) -> str:
    response = requests.post(
        settings.OLLAMA_URL,
        json={
            "model": settings.OLLAMA_MODEL,
            "prompt": prompt,
            "stream": False,
        },
        timeout=120,
    )

    response.raise_for_status()
    return response.json()["response"]


def parse_gemma_json(raw_response: str) -> dict:
    try:
        return json.loads(raw_response)
    except json.JSONDecodeError:
        # fallback if model adds extra text
        start = raw_response.find("{")
        end = raw_response.rfind("}") + 1

        if start == -1 or end == 0:
            raise ValueError("Gemma did not return valid JSON")

        return json.loads(raw_response[start:end])