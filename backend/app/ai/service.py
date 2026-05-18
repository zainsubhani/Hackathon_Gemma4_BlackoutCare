import json
import requests

from app.core.config import settings


def build_triage_prompt(case_data: dict, protocols: list | None = None) -> str:
    protocol_section = ""

    if protocols:
        protocol = protocols[0]
        protocol_section = (
            f"Protocol: {protocol.get('title')}. "
            f"Why: {protocol.get('why_used')}. "
            f"Text: {_shorten(protocol.get('content'), 500)}"
        )

    return (
        "You are offline clinical decision support. Do not diagnose or replace clinicians. "
        "Use local protocol if present. Highlight uncertainty. Return only compact JSON.\n"
        f"{protocol_section}\n"
        "Patient: "
        f"age={case_data.get('age')}; gender={case_data.get('gender')}; "
        f"allergies={case_data.get('allergy_status')}; conditions={case_data.get('known_conditions')}; "
        f"meds={case_data.get('current_medications')}.\n"
        "Triage: "
        f"complaint={case_data.get('chief_complaint')}; symptoms={case_data.get('symptoms')}; "
        f"vitals={case_data.get('vitals')}.\n"
        'JSON schema: {"urgency":"critical|urgent|stable","risk_summary":"<=140 chars",'
        '"recommended_actions":["max 3 short actions"],"warnings":["max 2 short warnings"],'
        '"confidence":"low|medium|high","source":"protocol/fallback",'
        '"protocol_reasoning":["max 2 short reasons"]}'
    )


def call_gemma(prompt: str) -> str:
    timeout_seconds = max(
        settings.OLLAMA_TIMEOUT_SECONDS,
        settings.AI_ANALYSIS_TIMEOUT_SECONDS,
    )
    response = requests.post(
        settings.OLLAMA_URL,
        json={
            "model": settings.OLLAMA_MODEL,
            "prompt": prompt,
            "format": {
                "type": "object",
                "properties": {
                    "urgency": {"type": "string", "enum": ["critical", "urgent", "stable"]},
                    "risk_summary": {"type": "string"},
                    "recommended_actions": {
                        "type": "array",
                        "items": {"type": "string"},
                    },
                    "warnings": {
                        "type": "array",
                        "items": {"type": "string"},
                    },
                    "confidence": {"type": "string", "enum": ["low", "medium", "high"]},
                    "source": {"type": "string"},
                    "protocol_reasoning": {
                        "type": "array",
                        "items": {"type": "string"},
                    },
                },
                "required": [
                    "urgency",
                    "risk_summary",
                    "recommended_actions",
                    "warnings",
                    "confidence",
                    "source",
                    "protocol_reasoning",
                ],
            },
            "options": {
                "num_predict": 180,
                "num_ctx": 1024,
                "temperature": 0,
            },
            "keep_alive": "10m",
            "stream": True,
        },
        stream=True,
        timeout=(5, timeout_seconds),
    )

    response.raise_for_status()
    return _read_ollama_stream(response)


def _read_ollama_stream(response: requests.Response) -> str:
    chunks = []
    for line in response.iter_lines(decode_unicode=True):
        if not line:
            continue
        payload = json.loads(line)
        chunks.append(payload.get("response", ""))
        if payload.get("done"):
            break
    return "".join(chunks)


def _shorten(value: str | None, limit: int) -> str:
    if not value:
        return ""
    value = " ".join(value.split())
    if len(value) <= limit:
        return value
    return value[:limit].rsplit(" ", 1)[0]


def parse_gemma_json(raw_response: str) -> dict:
    try:
        return json.loads(raw_response)
    except json.JSONDecodeError:
        start = raw_response.find("{")
        end = raw_response.rfind("}") + 1

        if start == -1 or end == 0:
            raise ValueError("Gemma did not return valid JSON")

        return json.loads(raw_response[start:end])
