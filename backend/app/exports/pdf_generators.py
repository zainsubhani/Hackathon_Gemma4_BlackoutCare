from io import BytesIO
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


def generate_downtime_pdf(report: dict) -> BytesIO:
    buffer = BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "CustomTitle",
        parent=styles["Title"],
        fontSize=20,
        spaceAfter=14,
    )

    section_style = ParagraphStyle(
        "SectionHeading",
        parent=styles["Heading2"],
        fontSize=14,
        spaceBefore=12,
        spaceAfter=8,
    )

    body_style = styles["BodyText"]
    story = []

    # Header
    story.append(Paragraph("CareContinuum Downtime Report", title_style))
    story.append(Paragraph("Offline clinical workflow continuity report", body_style))
    story.append(Spacer(1, 12))

    # Summary
    summary = report.get("summary", {})

    story.append(Paragraph("Summary", section_style))

    summary_table = Table(
        [
            ["Metric", "Value"],
            ["Total Patients", summary.get("total_patients", 0)],
            ["Total Triage Cases", summary.get("total_triage_cases", 0)],
            ["Total AI Recommendations", summary.get("total_ai_recommendations", 0)],
            ["Total Events", summary.get("total_events", 0)],
        ],
        colWidths=[3 * inch, 2 * inch],
    )

    summary_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("PADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )

    story.append(summary_table)
    story.append(Spacer(1, 14))

    # Triage Cases
    story.append(Paragraph("Clinical Cases", section_style))

    for case in report.get("triage_cases", []):
        urgency = str(case.get("urgency_level", "unknown")).upper()

        story.append(
            Paragraph(
                f"Case #{case.get('id')} — Urgency: {urgency}",
                styles["Heading3"],
            )
        )

        case_table = Table(
            [
                ["Patient ID", case.get("patient_id")],
                ["Chief Complaint", case.get("chief_complaint")],
                ["Symptoms", case.get("symptoms")],
                ["Vitals", case.get("vitals")],
                ["Status", case.get("status")],
                ["Created By", case.get("created_by")],
                ["Created At", str(case.get("created_at"))],
                ["Updated At", str(case.get("updated_at"))],
            ],
            colWidths=[1.6 * inch, 4.8 * inch],
        )

        case_table.setStyle(
            TableStyle(
                [
                    ("GRID", (0, 0), (-1, -1), 0.4, colors.grey),
                    ("BACKGROUND", (0, 0), (0, -1), colors.whitesmoke),
                    ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                    ("PADDING", (0, 0), (-1, -1), 5),
                ]
            )
        )

        story.append(case_table)
        story.append(Spacer(1, 10))

    # AI Recommendations
    story.append(Paragraph("AI Recommendations", section_style))

    for rec in report.get("ai_recommendations", []):
        story.append(
            Paragraph(
                f"Recommendation #{rec.get('id')} — Case #{rec.get('case_id')}",
                styles["Heading3"],
            )
        )

        story.append(Paragraph(f"<b>Urgency:</b> {rec.get('urgency')}", body_style))
        story.append(Paragraph(f"<b>Risk:</b> {rec.get('risk_summary')}", body_style))
        story.append(Paragraph(f"<b>Confidence:</b> {rec.get('confidence')}", body_style))
        story.append(Paragraph(f"<b>Source:</b> {rec.get('source')}", body_style))
        story.append(Spacer(1, 6))

        story.append(Paragraph("<b>Recommended Actions:</b>", body_style))

        for index, action in enumerate(rec.get("recommended_actions", []), start=1):
            story.append(Paragraph(f"{index}. {action}", body_style))

        warnings = rec.get("warnings", [])
        if warnings:
            story.append(Spacer(1, 6))
            story.append(Paragraph("<b>Warnings:</b>", body_style))
            for warning in warnings:
                story.append(Paragraph(f"- {warning}", body_style))

        story.append(Spacer(1, 12))

    # Event Timeline
    story.append(Paragraph("Event Timeline", section_style))

    for event in report.get("event_timeline", []):
        actor = event.get("actor") or {}

        actor_text = (
            f"{actor.get('full_name')} | "
            f"{actor.get('role')} | "
            f"{actor.get('department')} | "
            f"{actor.get('staff_code')}"
        )

        story.append(
            Paragraph(
                f"<b>{event.get('created_at')}</b> — {event.get('event_type')}",
                body_style,
            )
        )

        story.append(Paragraph(f"Actor: {actor_text}", body_style))
        story.append(Paragraph(f"Details: {event.get('event_data')}", body_style))
        story.append(Spacer(1, 8))

    # Disclaimer
    story.append(Spacer(1, 16))
    story.append(Paragraph("Disclaimer", section_style))
    story.append(
        Paragraph(
            "This report is generated for clinical workflow continuity during downtime. "
            "It is decision-support only and does not replace clinical judgment, hospital policy, "
            "or licensed medical professionals.",
            body_style,
        )
    )

    doc.build(story)
    buffer.seek(0)
    return buffer 