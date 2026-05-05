import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      {/* Navbar */}
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xl font-bold">BlackoutCare</p>
            <p className="text-xs text-slate-500">
              Offline AI Downtime OS for Hospitals
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100"
            >
              Staff Login
            </Link>
            <Link
              href="/dashboard"
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Open Dashboard
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-6 py-20 lg:grid-cols-2">
        <div>
          <div className="inline-flex rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700">
            Hospital Downtime Mode
          </div>

          <h1 className="mt-6 text-5xl font-bold tracking-tight md:text-6xl">
            Clinical workflows that continue when systems fail.
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
            BlackoutCare helps clinicians triage patients, follow local
            protocols, generate structured notes, and export recovery reports
            during cyberattacks, ransomware incidents, and hospital IT outages.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/login"
              className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              Start Downtime Session
            </Link>
            <a
              href="#workflow"
              className="rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold hover:bg-slate-100"
            >
              See Workflow
            </a>
          </div>

          <div className="mt-8 grid max-w-lg grid-cols-3 gap-4">
            <Stat label="Offline-first" value="PWA" />
            <Stat label="AI Engine" value="Gemma" />
            <Stat label="Audit Trail" value="Event Log" />
          </div>
        </div>

        {/* Graphic */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="rounded-2xl bg-slate-900 p-5 text-white">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="font-semibold">Emergency Department</p>
                <p className="text-sm text-slate-300">System Status</p>
              </div>
              <span className="rounded-full bg-red-500/20 px-3 py-1 text-sm font-medium text-red-200">
                EHR Offline
              </span>
            </div>

            <div className="grid gap-3">
              <PatientCard
                name="Patient A"
                issue="Chest pain + shortness of breath"
                status="CRITICAL"
                color="red"
              />
              <PatientCard
                name="Patient B"
                issue="Fracture, stable vitals"
                status="URGENT"
                color="amber"
              />
              <PatientCard
                name="Patient C"
                issue="Fever, stable"
                status="STABLE"
                color="green"
              />
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-700">
              Gemma Recommendation
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Follow Chest Pain + Respiratory Distress protocols. Perform ECG,
              monitor SpO₂, check allergy status, and escalate cardiac pathway.
            </p>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <h2 className="text-3xl font-bold">The problem</h2>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
            When ransomware or IT outages take hospital systems down, clinicians
            lose access to EHRs, clinical tools, and digital workflows. Care
            must continue, but teams are forced back to fragmented paper notes,
            manual triage, and memory.
          </p>

          <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
            <ProblemCard
              title="No EHR Access"
              text="Patient history, allergies, and clinical context may be unavailable or fragmented."
            />
            <ProblemCard
              title="Workflow Breakdown"
              text="Triage, notes, handover, and recovery become manual and error-prone."
            />
            <ProblemCard
              title="High Cognitive Load"
              text="Clinicians must make critical decisions under pressure with limited support."
            />
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section id="workflow" className="mx-auto max-w-7xl px-6 py-20">
        <h2 className="text-3xl font-bold">How BlackoutCare works</h2>
        <p className="mt-4 max-w-3xl text-slate-600">
          A local-first workflow that keeps essential clinical operations
          running during downtime.
        </p>

        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-5">
          <Step number="1" title="Patient arrives" text="Doctor or nurse creates a case." />
          <Step number="2" title="Triage" text="Symptoms and vitals are entered." />
          <Step number="3" title="Protocol match" text="Local protocols are retrieved." />
          <Step number="4" title="Gemma analysis" text="AI generates structured guidance." />
          <Step number="5" title="Recovery export" text="PDF/JSON report is generated." />
        </div>
      </section>

      {/* Features */}
      <section className="bg-slate-900 text-white">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <h2 className="text-3xl font-bold">Built for downtime resilience</h2>

          <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
            <FeatureCard
              title="Offline-first"
              text="Designed to continue operating when internet or hospital systems are unavailable."
            />
            <FeatureCard
              title="Protocol-grounded AI"
              text="Gemma reasoning is grounded in local emergency protocols, not generic chatbot output."
            />
            <FeatureCard
              title="Audit-ready"
              text="Every action is logged with actor, timestamp, case details, and exportable reports."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <h2 className="text-3xl font-bold">Ready for downtime mode?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-slate-600">
            Simulate a hospital outage, create triage cases, analyze them with
            local Gemma intelligence, and export a complete downtime report.
          </p>

          <div className="mt-8">
            <Link
              href="/login"
              className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
            >
              Login as Clinical Staff
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 font-bold text-slate-900">{value}</p>
    </div>
  );
}

function PatientCard({
  name,
  issue,
  status,
  color,
}: {
  name: string;
  issue: string;
  status: string;
  color: "red" | "amber" | "green";
}) {
  const colors = {
    red: "bg-red-500/20 text-red-200",
    amber: "bg-amber-500/20 text-amber-200",
    green: "bg-green-500/20 text-green-200",
  };

  return (
    <div className="rounded-xl bg-white/10 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold">{name}</p>
          <p className="text-sm text-slate-300">{issue}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${colors[color]}`}>
          {status}
        </span>
      </div>
    </div>
  );
}

function ProblemCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
      <h3 className="font-bold">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-600">{text}</p>
    </div>
  );
}

function Step({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 font-bold text-white">
        {number}
      </div>
      <h3 className="mt-4 font-bold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
    </div>
  );
}

function FeatureCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h3 className="font-bold">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-300">{text}</p>
    </div>
  );
}