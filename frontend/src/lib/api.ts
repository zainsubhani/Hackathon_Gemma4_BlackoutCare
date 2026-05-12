export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export type BackendStatus = {
  api: string;
  database: string;
  ollama: string;
  ollama_model?: string;
  mode: string;
};

export type Patient = {
  id: number;
  incident_id: number | null;
  patient_code: string;
  full_name: string | null;
  age: number | null;
  gender: "male" | "female" | "other" | "unknown";
  allergy_status: "unknown" | "none" | "known";
  known_conditions: string | null;
  current_medications: string | null;
  sync_status: string;
  sync_error: string | null;
  created_at: string;
};

export type TriageCase = {
  id: number;
  incident_id: number | null;
  patient_id: number;
  created_by: number;
  chief_complaint: string;
  symptoms: string | null;
  vitals: string | null;
  urgency_level: "critical" | "urgent" | "stable" | "unassigned";
  status: "active" | "monitoring" | "escalated" | "closed";
  sync_status: string;
  sync_error: string | null;
  created_at: string;
  updated_at: string;
};

export type Protocol = {
  id: number;
  title: string;
  category: string;
  trigger_keywords: string;
  content: string;
  version: string;
  created_at: string;
};

export type ProtocolSearchResult = {
  id: number;
  title: string;
  category: string;
  matched_keywords: string[];
  confidence_score: number;
  semantic_score: number;
  search_strategy: "keyword" | "semantic" | "keyword+semantic";
  confidence_label: string;
};

export type AuditEvent = {
  id: number;
  case_id: number | null;
  actor_id: number | null;
  event_type: string;
  event_data: string | null;
  previous_hash: string | null;
  event_hash: string | null;
  created_at: string;
};

export type User = {
  id: number;
  full_name: string;
  role: "doctor" | "nurse" | "admin" | "coordinator";
  department: string | null;
  staff_code: string;
  is_active: boolean;
  must_change_password: boolean;
  created_at: string;
};

export type DowntimeReport = {
  export_type: string;
  generated_at: string;
  hospital_name: string;
  summary: {
    total_patients: number;
    total_triage_cases: number;
    total_ai_recommendations: number;
    total_events: number;
    critical_triage_cases: number;
  };
  patients: Patient[];
  triage_cases: TriageCase[];
  event_timeline: unknown[];
};

export type AIAnalysisResult = {
  recommendation_id: number;
  case_id: number;
  ai_output: {
    urgency?: string;
    risk_summary?: string;
    recommended_actions?: string[];
    warnings?: string[];
    confidence?: string;
    source?: string;
    protocol_reasoning?: string[];
  };
};

export type Incident = {
  id: number;
  name: string;
  hospital_unit: string | null;
  status: "active" | "resolved";
  commander_id: number | null;
  summary: string | null;
  started_at: string;
  ended_at: string | null;
  created_at: string;
};

export type CaseNote = {
  id: number;
  case_id: number;
  author_id: number;
  note_type: "clinical" | "vitals" | "handoff" | "escalation";
  content: string;
  sync_status: string;
  sync_error: string | null;
  created_at: string;
};

export type RecoveryItem = {
  item_type: "patient" | "triage_case" | "case_note" | "ai_recommendation";
  item_id: number;
  label: string;
  description: string;
  sync_status: "pending" | "reviewed" | "synced" | "failed" | "manual_entry_required";
  sync_error: string | null;
  readiness: "ready" | "needs_review";
};

export type RecoveryPreview = {
  incident: {
    id: number;
    name: string;
    status: string;
    hospital_unit: string | null;
  };
  summary: {
    total_items: number;
    pending: number;
    reviewed: number;
    synced: number;
    failed: number;
    manual_entry_required: number;
  };
  items: RecoveryItem[];
};

export type SafetyCase = {
  id: number;
  patient_id: number;
  patient_label: string;
  patient_name: string | null;
  chief_complaint: string;
  urgency_level: string;
  status: string;
  created_at: string;
  last_note_at?: string | null;
};

export type SafetyBoard = {
  summary: {
    open_cases: number;
    critical_cases: number;
    unknown_allergies: number;
    stale_note_cases: number;
    pending_ai_reviews: number;
    recovery_pending: number;
  };
  critical_cases: SafetyCase[];
  unknown_allergies: SafetyCase[];
  stale_note_cases: SafetyCase[];
  unassigned_cases: SafetyCase[];
  pending_ai_reviews: Array<{
    id: number;
    case_id: number;
    risk_summary: string;
    confidence: string;
    created_at: string;
  }>;
};

export type OperationAlert = {
  type: string;
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  href: string;
  created_at: string;
};

export type VitalsEntry = {
  id: number;
  case_id: number;
  recorded_by: number;
  temperature_c: string | null;
  heart_rate: string | null;
  blood_pressure: string | null;
  respiratory_rate: string | null;
  oxygen_saturation: string | null;
  pain_score: string | null;
  trend: "improving" | "unchanged" | "worsening" | "unknown";
  notes: string | null;
  created_at: string;
};

export type ProtocolChecklistItem = {
  id: number;
  case_id: number;
  protocol_id: number | null;
  label: string;
  status: "pending" | "done" | "skipped";
  clinician_note: string | null;
  created_by: number;
  updated_by: number | null;
  created_at: string;
  updated_at: string;
};

export type ReadinessReport = {
  mode: string;
  open_cases: number;
  pending_ai_reviews: number;
  checks: Array<{
    key: string;
    label: string;
    status: "ok" | "warning" | "unavailable";
    detail: string;
  }>;
};

export type HandoffReport = {
  generated_at: string;
  summary: {
    active_cases: number;
    critical: number;
    escalated: number;
    open_protocol_actions: number;
  };
  cases: Array<SafetyCase & {
    last_note: string | null;
    last_note_at: string | null;
    last_vitals: { summary: string; trend: string; created_at: string } | null;
    open_protocol_actions: number;
    handoff_priority: number;
  }>;
};

export type TimelineEvent = {
  id: number;
  event_type: string;
  case_id: number | null;
  actor_id: number | null;
  description: string;
  created_at: string;
};

export type RecoveryConflictReport = {
  incident_id: number | null;
  total: number;
  items: Array<{
    type: string;
    severity: "critical" | "warning" | "info";
    label: string;
    description: string;
    href: string;
  }>;
};

export type AIOversightReport = {
  summary: Record<string, number>;
  confidence: Record<string, number>;
  recent: Array<{
    id: number;
    case_id: number;
    urgency: string;
    confidence: string;
    review_status: string;
    risk_summary: string;
    created_at: string;
  }>;
};

export type SearchItem = {
  id: number;
  label: string;
  description: string | null;
  href: string;
};

export type GlobalSearchResults = {
  patients: SearchItem[];
  triage_cases: SearchItem[];
  protocols: SearchItem[];
  incidents: SearchItem[];
};

export function getToken() {
  return null;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);

  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    let message = "Request failed";
    try {
      const body = await response.json();
      message = formatApiError(body.detail) || message;
    } catch {
      message = response.statusText || message;
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

function formatApiError(detail: unknown): string {
  if (!detail) return "";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map(formatApiError).filter(Boolean).join("; ");
  if (typeof detail === "object") {
    const data = detail as Record<string, unknown>;
    const parts = [
      typeof data.message === "string" ? data.message : "",
      typeof data.reason === "string" ? data.reason : "",
    ].filter(Boolean);

    if (Array.isArray(data.safe_fallback)) {
      parts.push(`Fallback: ${data.safe_fallback.join(" ")}`);
    }

    return parts.join(" ");
  }
  return String(detail);
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function titleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
