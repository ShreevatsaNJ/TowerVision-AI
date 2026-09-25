import os
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from app.config import settings

def generate_pdf_report(
    inspection_id: str,
    filename: str,
    quality_data: dict,
    detection_data: dict = None
) -> str:
    """
    Generates a structured PDF Inspection Report.
    Returns: file path of generated PDF.
    """
    output_filename = f"Inspection_Report_{inspection_id}.pdf"
    pdf_path = os.path.join(settings.REPORTS_DIR, output_filename)
    
    doc = SimpleDocTemplate(pdf_path, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'TitleStyle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        textColor=colors.HexColor("#0f172a"),
        spaceAfter=12
    )
    
    body_style = ParagraphStyle(
        'BodyStyle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#334155")
    )
    
    story = []
    
    # 1. Header
    story.append(Paragraph("🗼 TowerVision AI — Inspection Report", title_style))
    story.append(Paragraph(f"<b>Generated At:</b> {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')} | <b>Inspection ID:</b> {inspection_id}", body_style))
    story.append(Paragraph(f"<b>Source File:</b> {filename}", body_style))
    story.append(Spacer(1, 15))
    
    # 2. Stage 1: Quality Assessment Summary
    story.append(Paragraph("<b>1. Image Quality Assessment (Stage 1)</b>", styles['Heading2']))
    is_usable = quality_data.get('is_usable', False)
    status_text = "PASSED (Suitable for AI Detection)" if is_usable else "REJECTED (Bad Quality)"
    status_color = colors.HexColor("#10b981") if is_usable else colors.HexColor("#ef4444")
    
    metrics = quality_data.get('metrics', {})
    q_table_data = [
        ["Quality Parameter", "Measured Value", "Required Threshold", "Result"],
        ["Laplacian Blur Score", f"{metrics.get('blur_score', 0):.1f}", f"> {settings.MIN_LAPLACIAN_BLUR_SCORE}", "PASS" if metrics.get('is_sharp') else "FAIL"],
        ["Luminance / Brightness", f"{metrics.get('brightness_mean', 0):.1f}", f"{settings.MIN_BRIGHTNESS} - {settings.MAX_BRIGHTNESS}", "PASS" if metrics.get('is_well_lit') else "FAIL"],
        ["RMS Contrast", f"{metrics.get('contrast_score', 0):.1f}", f"> {settings.MIN_CONTRAST_RMS}", "PASS" if metrics.get('is_good_contrast') else "FAIL"],
        ["Overall Health Score", f"{metrics.get('composite_health_score', 0)} / 100", "Composite Index", status_text]
    ]
    
    t1 = Table(q_table_data, colWidths=[150, 100, 120, 170])
    t1.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1e293b")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
    ]))
    story.append(t1)
    story.append(Spacer(1, 15))
    
    # 3. Stage 2: YOLO Detection Summary (if applicable)
    if is_usable and detection_data:
        story.append(Paragraph("<b>2. YOLO Structural & Component Detection (Stage 2)</b>", styles['Heading2']))
        detections = detection_data.get('detections', [])
        
        d_table_data = [["ID", "Detected Component", "Confidence", "Severity", "Coordinates (x1, y1, x2, y2)"]]
        if not detections:
            d_table_data.append(["-", "No tower detected. The image may be blurry, too distant, or contain no supported tower.", "-", "-", "-"])
        for d in detections:
            bbox = d.get('bbox', {})
            coords = f"({bbox.get('x_min',0)}, {bbox.get('y_min',0)}, {bbox.get('x_max',0)}, {bbox.get('y_max',0)})"
            d_table_data.append([
                str(d.get('id', '')),
                d.get('class_name', ''),
                f"{int(d.get('confidence', 0) * 100)}%",
                d.get('severity', 'INFO'),
                coords
            ])
            
        t2 = Table(d_table_data, colWidths=[30, 140, 70, 70, 230])
        t2.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#0f172a")),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
        ]))
        story.append(t2)
    elif not is_usable:
        reasons = quality_data.get('rejection_reasons', [])
        recs = quality_data.get('recommendations', [])
        story.append(Paragraph("<b>Rejection Reasons:</b>", styles['Heading3']))
        for r in reasons:
            story.append(Paragraph(f"• {r}", body_style))
        story.append(Spacer(1, 5))
        story.append(Paragraph("<b>Actionable Recommendations:</b>", styles['Heading3']))
        for rec in recs:
            story.append(Paragraph(f"• {rec}", body_style))
            
    doc.build(story)
    return pdf_path
