import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

# ─── Colors ──────────────────────────────────────────────────────────────────
PRIMARY = colors.HexColor("#2D5A27")       # Deep Olive Green
PRIMARY_LIGHT = colors.HexColor("#467840") # Medium Forest Green
ACCENT = colors.HexColor("#BC6C25")        # Warm Amber / Earth
TEXT_DARK = colors.HexColor("#212529")     # Dark Slate Charcoal
TEXT_MUTED = colors.HexColor("#495057")    # Muted Grey
BG_LIGHT = colors.HexColor("#F4F6F0")      # Soft Sage / Off-White
BG_HIGHLIGHT = colors.HexColor("#EBF3EA")  # Light Olive Tint
BORDER_COLOR = colors.HexColor("#CFD8DC")  # Border light
CODE_BG = colors.HexColor("#263238")       # Terminal dark
CODE_TEXT = colors.HexColor("#ECEFF1")     # Terminal text

# ─── Numbered Canvas for Header and Footer ───────────────────────────────────
class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_decorations(self, page_count):
        if self._pageNumber == 1:
            # Cover page: omit running headers/footers
            return

        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(TEXT_MUTED)

        # Running Header
        self.drawString(54, 750, "CropShield 6 — System Architecture & Repository Technical Manual")
        self.setStrokeColor(BORDER_COLOR)
        self.setLineWidth(0.5)
        self.line(54, 742, 558, 742)

        # Running Footer
        self.line(54, 45, 558, 45)
        self.drawString(54, 32, "Confidential — For Internal Engineering & Review Use")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(558, 32, page_str)
        self.restoreState()

# ─── Styles ──────────────────────────────────────────────────────────────────
def setup_styles():
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'CoverTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=28,
        leading=34,
        textColor=PRIMARY,
        spaceAfter=10
    )

    subtitle_style = ParagraphStyle(
        'CoverSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=13,
        leading=18,
        textColor=TEXT_MUTED,
        spaceAfter=25
    )

    h1_style = ParagraphStyle(
        'SectionH1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=PRIMARY,
        spaceBefore=16,
        spaceAfter=8,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'SectionH2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=PRIMARY_LIGHT,
        spaceBefore=12,
        spaceAfter=6,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=TEXT_DARK,
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        'BulletDark',
        parent=body_style,
        leftIndent=14,
        firstLineIndent=-10,
        spaceAfter=3
    )

    table_cell = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11.5,
        textColor=TEXT_DARK
    )

    table_header = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11.5,
        textColor=colors.white
    )

    code_block = ParagraphStyle(
        'CodeSnippet',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8,
        leading=11,
        textColor=CODE_TEXT
    )

    callout_text = ParagraphStyle(
        'CalloutText',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=9,
        leading=13,
        textColor=PRIMARY
    )

    return {
        'title': title_style,
        'subtitle': subtitle_style,
        'h1': h1_style,
        'h2': h2_style,
        'body': body_style,
        'bullet': bullet_style,
        'table_cell': table_cell,
        'table_header': table_header,
        'code': code_block,
        'callout': callout_text
    }

def create_callout(text, styles):
    p = Paragraph(f"<b>Key Insight:</b> {text}", styles['callout'])
    t = Table([[p]], colWidths=[504])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), BG_HIGHLIGHT),
        ('BOX', (0,0), (-1,-1), 1, PRIMARY_LIGHT),
        ('PADDING', (0,0), (-1,-1), 8),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    return t

def create_code_box(code_str, styles):
    formatted = code_str.replace("<", "&lt;").replace(">", "&gt;").replace("\n", "<br/>")
    p = Paragraph(f"<font color='#80cbc4'>{formatted}</font>", styles['code'])
    t = Table([[p]], colWidths=[504])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), CODE_BG),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#37474F")),
        ('PADDING', (0,0), (-1,-1), 8),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    return t

def build_pdf(filename="CropShield_Project_Documentation.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = setup_styles()
    story = []

    # ═════════════════════════════════════════════════════════════════════════
    # COVER / TITLE BANNER
    # ═════════════════════════════════════════════════════════════════════════
    story.append(Spacer(1, 20))
    story.append(Paragraph("CROPSHIELD 6", ParagraphStyle('SubHeader', fontName='Helvetica-Bold', fontSize=12, textColor=ACCENT, spaceAfter=4)))
    story.append(Paragraph("System Architecture, Codebase Structure & Technical Manual", styles['title']))
    story.append(Paragraph("A Comprehensive Engineering Guide to the Full-Stack Agritech Platform for Crop Disease Diagnostics, Epidemiological Risk Forecasting, and Agricultural Ecosystem Integration.", styles['subtitle']))
    story.append(HRFlowable(width="100%", thickness=2, color=PRIMARY, spaceBefore=0, spaceAfter=15))

    # Meta Table
    meta_data = [
        [Paragraph("<b>Repository:</b> Zinbas/Cropshield_9", styles['table_cell']), Paragraph("<b>Environment:</b> Node 22+ / React 19 / tRPC 11", styles['table_cell'])],
        [Paragraph("<b>Target Domain:</b> Agritech / Computer Vision / Microclimate", styles['table_cell']), Paragraph("<b>Database:</b> Drizzle ORM (PostgreSQL / TiDB / MySQL)", styles['table_cell'])],
        [Paragraph("<b>AI Vision Gateway:</b> Google Gemini Multimodal", styles['table_cell']), Paragraph("<b>Weather API:</b> Open-Meteo REST Service", styles['table_cell'])],
        [Paragraph("<b>Production Deployment:</b> Vercel Serverless Platform", styles['table_cell']), Paragraph("<b>Document Date:</b> September 2026", styles['table_cell'])],
    ]
    meta_table = Table(meta_data, colWidths=[252, 252])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), BG_LIGHT),
        ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 15))

    # ═════════════════════════════════════════════════════════════════════════
    # SECTION 1: EXECUTIVE SUMMARY & PLATFORM MISSION
    # ═════════════════════════════════════════════════════════════════════════
    story.append(Paragraph("1. Executive Summary & Core Capabilities", styles['h1']))
    story.append(Paragraph(
        "CropShield is an enterprise-ready, full-stack agritech platform specifically engineered to bridge the gap between "
        "smallholder farmers, agricultural extension workers, certified agronomists, and local input retailers. The application "
        "operates as a hybrid offline-first digital assistant that combines computer vision plant pathology with real-time "
        "microclimate epidemiological forecasting.",
        styles['body']
    ))
    story.append(Paragraph("Key Core Capabilities:", styles['h2']))
    story.append(Paragraph("• <b>Multimodal Crop Health Scanning:</b> Farmers capture or upload field photographs of crops. The system integrates optional agronomic context (soil type, soil pH, moisture, acreage, and field observations) with local weather metrics and routes them to Google Gemini for structured, conservative diagnostic assessments.", styles['bullet']))
    story.append(Paragraph("• <b>Microclimate Epidemiology Engine:</b> A rule-based and predictive risk engine calculates disease and pest vulnerabilities based on real-time temperature, humidity, precipitation, crop growth stage, and regional disease patterns over 7 to 15-day horizons.", styles['bullet']))
    story.append(Paragraph("• <b>Interactive Regional Risk Heatmap:</b> Administrators and field officers monitor high-risk outbreaks through aggregated regional clusters without compromising individual farmer geolocation privacy.", styles['bullet']))
    story.append(Paragraph("• <b>Follow-Up Cases & Actionable Treatment Tracking:</b> Scan findings automatically generate persistent case records with step-by-step treatment checklists that farmers can check off over time.", styles['bullet']))
    story.append(Paragraph("• <b>Verified Agricultural Ecosystem Directory:</b> Direct geocoded access to certified extension experts and licensed agrochemical/seed supply stores with one-tap dialing and messaging.", styles['bullet']))
    story.append(Spacer(1, 8))
    story.append(create_callout(
        "CropShield strictly treats AI diagnostic outputs as clinical guidance rather than authoritative guarantees. "
        "The system enforces conservative confidence bounds and urges expert verification for high and critical threats.",
        styles
    ))

    story.append(Spacer(1, 14))

    # ═════════════════════════════════════════════════════════════════════════
    # SECTION 2: SYSTEM ARCHITECTURE & TECH STACK
    # ═════════════════════════════════════════════════════════════════════════
    story.append(Paragraph("2. System Architecture & Technology Stack", styles['h1']))
    story.append(Paragraph(
        "The application is structured as a unified monorepo with strict layer boundaries, end-to-end type safety, "
        "and isolated development and production execution pipelines.",
        styles['body']
    ))

    arch_data = [
        [Paragraph("Layer", styles['table_header']), Paragraph("Technologies Employed", styles['table_header']), Paragraph("Architectural Role & Scope", styles['table_header'])],
        [
            Paragraph("<b>Frontend Client</b>", styles['table_cell']),
            Paragraph("React 19, TypeScript, Vite 5, Tailwind CSS v4, Wouter", styles['table_cell']),
            Paragraph("Single-page app with olive-green design system, responsive mobile navigation bar, skeleton loaders, and multilingual i18n support (English, Hindi, Marathi, Assamese, Bengali).", styles['table_cell'])
        ],
        [
            Paragraph("<b>UI & UX Forms</b>", styles['table_cell']),
            Paragraph("Radix UI, Framer Motion, React Hook Form, Zod", styles['table_cell']),
            Paragraph("Accessible unstyled primitives (Radix), fluid animations (Framer), and strictly-typed robust form validation matching backend Zod schemas.", styles['table_cell'])
        ],
        [
            Paragraph("<b>Data Visualization & Maps</b>", styles['table_cell']),
            Paragraph("Recharts, Google Maps API", styles['table_cell']),
            Paragraph("Charts for analytics distribution and interactive risk heatmaps / GPS-assisted geolocation for precise user/profile mapping.", styles['table_cell'])
        ],
        [
            Paragraph("<b>Backend API</b>", styles['table_cell']),
            Paragraph("Node.js, Express 4, tRPC 11, Zod v4, SuperJSON, Jose JWT", styles['table_cell']),
            Paragraph("End-to-end type-safe RPC API, JWT cookie sessions, local & OAuth auth providers, role-based authorization guards.", styles['table_cell'])
        ],
        [
            Paragraph("<b>Database / ORM</b>", styles['table_cell']),
            Paragraph("Drizzle ORM, PostgreSQL / MySQL", styles['table_cell']),
            Paragraph("Type-safe database abstraction covering 11 tables, enum definitions, relational queries, and migration versioning.", styles['table_cell'])
        ],
        [
            Paragraph("<b>AI Vision Layer</b>", styles['table_cell']),
            Paragraph("Google Gemini Multimodal (gemini-3.6-flash / configurable)", styles['table_cell']),
            Paragraph("Structured JSON schema extraction for symptoms, crop classification, pathogen determination, and tailored treatment plans.", styles['table_cell'])
        ],
        [
            Paragraph("<b>Meteorological API</b>", styles['table_cell']),
            Paragraph("Open-Meteo Weather REST API", styles['table_cell']),
            Paragraph("Real-time temperature, humidity, rainfall, wind velocity, and 7-day daily forecasts with resilient fallback states.", styles['table_cell'])
        ],
        [
            Paragraph("<b>Media Storage</b>", styles['table_cell']),
            Paragraph("@aws-sdk/client-s3, Local Disk Fallback", styles['table_cell']),
            Paragraph("Decoupled binary storage keeps database records lean; images stored locally or via S3 presigned URLs (Forge credentials).", styles['table_cell'])
        ],
        [
            Paragraph("<b>Testing Strategy</b>", styles['table_cell']),
            Paragraph("Vitest, Playwright E2E", styles['table_cell']),
            Paragraph("Automated unit suites for auth/risk/persistence contracts and browser-driven end-to-end flows for admin workflows.", styles['table_cell'])
        ],
    ]
    arch_table = Table(arch_data, colWidths=[90, 190, 224])
    arch_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT]),
        ('PADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(arch_table)

    story.append(PageBreak())

    # ═════════════════════════════════════════════════════════════════════════
    # SECTION 3: REPOSITORY DIRECTORY & FILE STRUCTURE
    # ═════════════════════════════════════════════════════════════════════════
    story.append(Paragraph("3. Complete Repository Directory & File Map", styles['h1']))
    story.append(Paragraph(
        "CropShield organizes all frontend, backend, database, shared modules, and operational guides into an intuitive, "
        "maintainable monorepo structure:",
        styles['body']
    ))

    repo_tree = """CropShield_9/
├── backend/
│   ├── _core/                  # Framework infrastructure & runtime engine
│   │   ├── app.ts              # Express base app, middlewares, tRPC mounting
│   │   ├── context.ts          # Request context, user authentication extraction
│   │   ├── cookies.ts          # Cross-environment secure cookie helpers
│   │   ├── env.ts              # Environment variable parsing and validation
│   │   ├── index.ts            # Local development server entrypoint & port resolver
│   │   ├── llm.ts              # Multi-provider LLM adapter (Gemini / Forge)
│   │   ├── notification.ts     # Internal notification dispatchers
│   │   ├── oauth.ts            # Third-party OAuth integration endpoints
│   │   ├── static.ts           # Production static file serving
│   │   ├── storageProxy.ts     # Media stream proxy for protected assets
│   │   ├── trpc.ts             # tRPC procedure builders (public, protected, admin)
│   │   └── vite.ts             # Vite development server HMR middleware
│   ├── db.ts                   # Drizzle client, relational query methods, DB helpers
│   ├── localAuth.ts            # Email/password authentication, JWT, session cookies
│   ├── riskEngine.ts           # Epidemiological calculation rules & threat modeling
│   ├── routers.ts              # Comprehensive tRPC procedure definitions
│   ├── seedTestData.ts         # High-density realistic seed data generator
│   ├── storage.ts              # S3 presigned URL client & local disk fallback
│   └── *.test.ts               # Vitest unit & contract suites (auth, risk, persistence)
├── frontend/
│   ├── public/                 # Static assets, SVG icons, local upload targets
│   └── src/
│       ├── _core/              # Core client hooks (auth, network states)
│       ├── components/         # Reusable feature & layout UI components
│       │   ├── ui/             # Radix UI primitives with Tailwind v4 styling
│       │   ├── AIChatBox.tsx   # Interactive AI agronomy assistant dialog
│       │   ├── AdminOutbreakPanel.tsx # Outbreak management & officer escalation
│       │   ├── AnalyticsCharts.tsx    # Risk distribution & trend visualizations
│       │   ├── DashboardLayout.tsx    # Responsive shell with olive-theme nav
│       │   ├── InteractiveRiskMap.tsx # Geospatial outbreak & threat visualizer
│       │   ├── Map.tsx                # Google Maps integration with tile fallback
│       │   ├── RiskPredictionPanel.tsx# 7-15 day disease/pest forecast cards
│       │   └── SkeletonLoader.tsx     # Tactile placeholder loaders
│       ├── contexts/           # ThemeContext (dark/light), AuthProvider
│       ├── hooks/              # Custom reactive hooks (useMobile, useDebounce)
│       ├── lib/                # Utility helpers (i18n, regionalRisk, trpc client)
│       ├── pages/              # Primary route views (Home.tsx, NotFound.tsx)
│       ├── App.tsx             # Wouter router declaration & providers
│       ├── index.css           # Global Tailwind tokens, olive-theme styles
│       └── main.tsx            # React 19 root bootstrap
├── database/
│   ├── schema.ts               # Drizzle table definitions, pgEnums, schema types
│   └── *.sql                   # Incremental SQL migration scripts
├── common/                     # Shared TypeScript constants, error codes, and contracts
├── docs/                       # Operational runbooks, handover guides, test specs
├── drizzle.config.ts           # Drizzle Kit migration generator configuration
├── package.json                # Project dependencies, workspace scripts, engine locks
├── tsconfig.json               # Strict TypeScript compiler options & path aliases
└── vite.config.ts              # Vite bundler plugins, dev proxy, JSX transforms"""

    story.append(create_code_box(repo_tree, styles))
    story.append(Spacer(1, 14))

    # ═════════════════════════════════════════════════════════════════════════
    # SECTION 4: DATABASE MODELS & SCHEMA SPECIFICATION
    # ═════════════════════════════════════════════════════════════════════════
    story.append(Paragraph("4. Database Architecture & Schema Models", styles['h1']))
    story.append(Paragraph(
        "CropShield defines 11 distinct relational entities using Drizzle ORM. The schema supports strict relational integrity, "
        "role enforcement, and spatial coordinate tracking across districts and states.",
        styles['body']
    ))

    db_tables_data = [
        [Paragraph("Table Name", styles['table_header']), Paragraph("Primary Columns & Types", styles['table_header']), Paragraph("Business Purpose & Relationships", styles['table_header'])],
        [
            Paragraph("<b>users</b>", styles['table_cell']),
            Paragraph("id (PK), openId (UK), name, email, loginMethod, passwordHash, role, accountStatus, timestamps", styles['table_cell']),
            Paragraph("Core authentication record. Roles: 'user' (farmer) or 'admin'. Supports disabling accounts.", styles['table_cell'])
        ],
        [
            Paragraph("<b>profiles</b>", styles['table_cell']),
            Paragraph("userId (FK), displayName, phone, state, district, pinCode, village, town, primaryCrop, experienceYears, lat/long, networkMode", styles['table_cell']),
            Paragraph("Farmer agronomic identity, contact info, geolocation coordinates for microclimate weather retrieval. Supports distinct village & town persistence.", styles['table_cell'])
        ],
        [
            Paragraph("<b>crops</b>", styles['table_cell']),
            Paragraph("id (PK), ownerId (FK), name, cropType, region, acreage, status ('healthy' | 'monitoring' | 'at_risk')", styles['table_cell']),
            Paragraph("Farmer field plots. Connects scans and risk predictions to specific crops and acreages.", styles['table_cell'])
        ],
        [
            Paragraph("<b>scans</b>", styles['table_cell']),
            Paragraph("id (PK), ownerId, cropId, imageKey, imageUrl, riskLevel, confidence, disease, symptoms, assessment, recommendations, recommendationProgress, soilType, soilPh, soilMoisture, cropCount, landArea, fieldNotes", styles['table_cell']),
            Paragraph("Primary diagnostic record. Stores original photo reference, AI clinical output, optional field context (soil, area), and per-scan user progress checklist.", styles['table_cell'])
        ],
        [
            Paragraph("<b>cases</b>", styles['table_cell']),
            Paragraph("id (PK), ownerId, scanId (UK FK), reference, status ('open' | 'reviewing' | 'resolved'), notes", styles['table_cell']),
            Paragraph("Follow-up case tracking. Links a critical or high-risk scan to ongoing agronomic remediation.", styles['table_cell'])
        ],
        [
            Paragraph("<b>experts</b>", styles['table_cell']),
            Paragraph("name, qualification, specialization, organization, experienceYears, state, district, lat/long, status ('pending' | 'verified' | 'rejected')", styles['table_cell']),
            Paragraph("Verified extension officer directory. Geocoded to match nearby farmers for field visits or phone triage.", styles['table_cell'])
        ],
        [
            Paragraph("<b>drugStores</b>", styles['table_cell']),
            Paragraph("name, ownerContact, phone, email, address, state, district, pinCode, lat/long, categories, licenseInfo, status", styles['table_cell']),
            Paragraph("Licensed agricultural input retailers offering fertilizers, biological agents, and approved pesticides.", styles['table_cell'])
        ],
        [
            Paragraph("<b>weatherCache</b>", styles['table_cell']),
            Paragraph("state, district, latitude, longitude, payload (JSON), fetchedAt, expiresAt", styles['table_cell']),
            Paragraph("Caches Open-Meteo responses to minimize third-party API latency and handle poor network environments.", styles['table_cell'])
        ],
        [
            Paragraph("<b>riskPredictions</b>", styles['table_cell']),
            Paragraph("ownerId, cropId, riskScore (0-100), riskLevel, threatType, threatDetails (JSON), weatherSnapshot, growthStage, validUntil, dismissed", styles['table_cell']),
            Paragraph("Forecasted disease and pest vulnerabilities generated by the risk engine. Valid for 10-day outlooks.", styles['table_cell'])
        ],
        [
            Paragraph("<b>riskAlertHistory</b>", styles['table_cell']),
            Paragraph("predictionId (FK), ownerId, alertType ('push' | 'in_app' | 'sms'), readAt, actionTaken, feedbackRating (1-5), feedbackNotes", styles['table_cell']),
            Paragraph("Tracks farmer alert interaction, actions taken, and ground-truth user feedback on forecast accuracy.", styles['table_cell'])
        ],
        [
            Paragraph("<b>regionalOutbreaks</b>", styles['table_cell']),
            Paragraph("state, district, threatType, reportCount, averageRiskScore, outbreakLevel ('watch' | 'warning' | 'outbreak'), officerNotified", styles['table_cell']),
            Paragraph("District-level aggregate outbreak tracker. Triggers automated escalations to agricultural departments.", styles['table_cell'])
        ],
    ]
    db_table = Table(db_tables_data, colWidths=[90, 200, 214])
    db_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT]),
        ('PADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(db_table)

    story.append(PageBreak())

    # ═════════════════════════════════════════════════════════════════════════
    # SECTION 5: CORE WORKFLOWS & ENGINE MECHANICS
    # ═════════════════════════════════════════════════════════════════════════
    story.append(Paragraph("5. Deep Dive: Core Platform Engines & Workflows", styles['h1']))

    story.append(Paragraph("5.1 Multimodal Crop Scan & Diagnostic Pipeline", styles['h2']))
    story.append(Paragraph(
        "The scanning pipeline in <code>backend/routers.ts</code> (<code>farmer.analyzeScan</code>) guarantees that every scan "
        "is transactionally recorded and resilient against external AI latency:",
        styles['body']
    ))
    story.append(Paragraph("1. <b>Payload Validation & Sanitization:</b> Incoming images are checked for MIME type (JPEG/PNG/WebP), decoded from base64, and verified to be under the 12 MB limit.", styles['bullet']))
    story.append(Paragraph("2. <b>Pre-Analysis Persistence:</b> Before invoking the vision model, image bytes are written to storage (S3 or <code>frontend/public/uploads</code>), and an initial scan record is created with status <code>'analyzing'</code>. This prevents data loss if the model connection drops.", styles['bullet']))
    story.append(Paragraph("3. <b>Agronomic Context Injection:</b> The system bundles farmer-provided field metrics (soil pH, moisture, crop count, land area) and live Open-Meteo weather into the prompt.", styles['bullet']))
    story.append(Paragraph("4. <b>Structured Schema Extraction:</b> The Gemini model is prompted with a strict JSON schema requiring: <code>cropType</code>, <code>riskLevel</code> (low, medium, high, critical), <code>confidence</code> (0-100), <code>symptoms[]</code>, <code>assessment</code>, <code>disease</code>, and actionable <code>recommendations[]</code>.", styles['bullet']))
    story.append(Paragraph("5. <b>Progress Checklist Initialization:</b> Recommendations are transformed into an interactive checklist (<code>[{step, completed: false}]</code>) stored in <code>recommendationProgress</code>.", styles['bullet']))
    story.append(Paragraph("6. <b>High-Risk Event Dispatch:</b> If risk is high or critical, owner notifications are triggered, and the case becomes eligible for admin escalation.", styles['bullet']))

    story.append(Spacer(1, 10))
    story.append(Paragraph("5.2 Microclimate Epidemiological Risk Engine", styles['h2']))
    story.append(Paragraph(
        "Implemented in <code>backend/riskEngine.ts</code>, this engine combines weather physics, crop taxonomy, and phenology:",
        styles['body']
    ))

    risk_rules = [
        [Paragraph("Vulnerability Factor", styles['table_header']), Paragraph("Meteorological / Agronomic Threshold", styles['table_header']), Paragraph("Pathological Impact", styles['table_header'])],
        [
            Paragraph("<b>Extreme Humidity</b>", styles['table_cell']),
            Paragraph("Relative humidity >= 85% with temp 20°C - 30°C", styles['table_cell']),
            Paragraph("Fungal spore germination (Powdery Mildew, Rust, Leaf Spot). Contributes +45 to fungal risk score.", styles['table_cell'])
        ],
        [
            Paragraph("<b>Rainfall & Wet Canopy</b>", styles['table_cell']),
            Paragraph("Precipitation >= 5mm with high moisture", styles['table_cell']),
            Paragraph("Bacterial blight, splash dispersal, damping-off. Contributes +35 to bacterial score.", styles['table_cell'])
        ],
        [
            Paragraph("<b>Heat & Stagnant Air</b>", styles['table_cell']),
            Paragraph("Temp >= 32°C, humidity < 50%, wind < 10 km/h", styles['table_cell']),
            Paragraph("Accelerated insect reproduction (Aphids, Thrips, Whiteflies). Contributes +40 to insect score.", styles['table_cell'])
        ],
        [
            Paragraph("<b>Crop Growth Stage</b>", styles['table_cell']),
            Paragraph("Multipliers: Seedling (1.3x), Flowering (1.4x), Harvest (0.8x)", styles['table_cell']),
            Paragraph("Adjusts baseline scores; flowering crops exhibit maximum sensitivity to insect and fungal invasion.", styles['table_cell'])
        ],
    ]
    risk_table = Table(risk_rules, colWidths=[120, 190, 194])
    risk_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT]),
        ('PADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(risk_table)

    story.append(Spacer(1, 10))
    story.append(Paragraph("5.3 Regional Outbreak Intelligence & Administrator Heatmap", styles['h2']))
    story.append(Paragraph(
        "The administrative dashboard provides macro-level surveillance across districts. When multiple high-risk scans "
        "or threat predictions emerge in a district, <code>regionalOutbreaks</code> transitions from <code>'watch'</code> to "
        "<code>'warning'</code> or <code>'outbreak'</code>. Administrators can trigger the <code>admin.escalateOutbreak</code> "
        "mutation, which dispatches emergency advisories to regional agricultural officers.",
        styles['body']
    ))

    story.append(PageBreak())

    # ═════════════════════════════════════════════════════════════════════════
    # SECTION 6: tRPC API & ROUTER SPECIFICATION
    # ═════════════════════════════════════════════════════════════════════════
    story.append(Paragraph("6. End-to-End Type-Safe API Specification (tRPC)", styles['h1']))
    story.append(Paragraph(
        "CropShield eliminates runtime API serialization mismatches by utilizing tRPC 11. Procedures are strictly "
        "partitioned across 6 distinct router namespaces:",
        styles['body']
    ))

    api_data = [
        [Paragraph("Namespace", styles['table_header']), Paragraph("Procedure Name", styles['table_header']), Paragraph("Access", styles['table_header']), Paragraph("Description", styles['table_header'])],
        [Paragraph("<b>auth</b>", styles['table_cell']), Paragraph("me", styles['table_cell']), Paragraph("Public", styles['table_cell']), Paragraph("Returns active session user from HTTP-only JWT cookie.", styles['table_cell'])],
        [Paragraph("<b>auth</b>", styles['table_cell']), Paragraph("signup / signin", styles['table_cell']), Paragraph("Public", styles['table_cell']), Paragraph("Registers/authenticates user, creates profile, sets session token.", styles['table_cell'])],
        [Paragraph("<b>auth</b>", styles['table_cell']), Paragraph("logout", styles['table_cell']), Paragraph("Public", styles['table_cell']), Paragraph("Clears local and OAuth authentication cookies.", styles['table_cell'])],
        [Paragraph("<b>farmer</b>", styles['table_cell']), Paragraph("snapshot", styles['table_cell']), Paragraph("Protected", styles['table_cell']), Paragraph("Returns aggregated farmer state: profile, crops, scans, active cases.", styles['table_cell'])],
        [Paragraph("<b>farmer</b>", styles['table_cell']), Paragraph("analyzeScan", styles['table_cell']), Paragraph("Protected", styles['table_cell']), Paragraph("Uploads crop photo, runs Gemini AI diagnosis, creates scan record.", styles['table_cell'])],
        [Paragraph("<b>farmer</b>", styles['table_cell']), Paragraph("updateRecommendationProgress", styles['table_cell']), Paragraph("Protected", styles['table_cell']), Paragraph("Updates completed checklist items for ongoing treatment.", styles['table_cell'])],
        [Paragraph("<b>farmer</b>", styles['table_cell']), Paragraph("reportThreat", styles['table_cell']), Paragraph("Protected", styles['table_cell']), Paragraph("Submits community threat report to regional outbreak tracker.", styles['table_cell'])],
        [Paragraph("<b>farmer</b>", styles['table_cell']), Paragraph("verifiedExperts / approvedDrugStores", styles['table_cell']), Paragraph("Protected", styles['table_cell']), Paragraph("Returns nearby verified experts and licensed farm supply stores.", styles['table_cell'])],
        [Paragraph("<b>weather</b>", styles['table_cell']), Paragraph("current", styles['table_cell']), Paragraph("Public", styles['table_cell']), Paragraph("Fetches live Open-Meteo metrics with 8-second circuit breaker.", styles['table_cell'])],
        [Paragraph("<b>risk</b>", styles['table_cell']), Paragraph("predict", styles['table_cell']), Paragraph("Protected", styles['table_cell']), Paragraph("Runs riskEngine algorithm and persists 10-day threat predictions.", styles['table_cell'])],
        [Paragraph("<b>risk</b>", styles['table_cell']), Paragraph("active / history", styles['table_cell']), Paragraph("Protected", styles['table_cell']), Paragraph("Queries non-dismissed alerts and historical prediction archive.", styles['table_cell'])],
        [Paragraph("<b>risk</b>", styles['table_cell']), Paragraph("feedback", styles['table_cell']), Paragraph("Protected", styles['table_cell']), Paragraph("Records farmer ground-truth rating (1-5) and actions taken.", styles['table_cell'])],
        [Paragraph("<b>admin</b>", styles['table_cell']), Paragraph("overview / directory", styles['table_cell']), Paragraph("Admin Only", styles['table_cell']), Paragraph("Returns platform stats, approved scans, and farmer directories.", styles['table_cell'])],
        [Paragraph("<b>admin</b>", styles['table_cell']), Paragraph("approveScan / setFarmerStatus", styles['table_cell']), Paragraph("Admin Only", styles['table_cell']), Paragraph("Moderates crop scans and manages farmer account active states.", styles['table_cell'])],
        [Paragraph("<b>admin</b>", styles['table_cell']), Paragraph("escalateOutbreak / resolveOutbreak", styles['table_cell']), Paragraph("Admin Only", styles['table_cell']), Paragraph("Notifies agriculture officers or marks regional outbreak resolved.", styles['table_cell'])],
        [Paragraph("<b>admin</b>", styles['table_cell']), Paragraph("seedTestData", styles['table_cell']), Paragraph("Admin Only", styles['table_cell']), Paragraph("Seeds realistic showcase farmers, scans, experts, and stores.", styles['table_cell'])],
    ]
    api_table = Table(api_data, colWidths=[65, 150, 65, 224])
    api_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT]),
        ('PADDING', (0,0), (-1,-1), 3.5),
    ]))
    story.append(api_table)

    story.append(Spacer(1, 14))

    # ═════════════════════════════════════════════════════════════════════════
    # SECTION 7: SETUP, CONFIGURATION & OPERATIONS
    # ═════════════════════════════════════════════════════════════════════════
    story.append(Paragraph("7. Local Development, Operations & Deployment", styles['h1']))
    story.append(Paragraph(
        "CropShield is designed for rapid onboarding and frictionless deployment across bare-metal, containers, or Vercel.",
        styles['body']
    ))

    story.append(Paragraph("Step 1: Install Dependencies & Prepare Environment", styles['h2']))
    story.append(Paragraph("Prerequisites: <b>Node.js 22+</b> and <b>pnpm 10+</b>.", styles['body']))
    setup_commands = """# Install dependencies
pnpm install

# Configure Environment Variables (or export in shell)
# DATABASE_URL="mysql://user:pass@host:port/cropshield"
# GEMINI_API_KEY="your-gemini-api-key"
# JWT_SECRET="your-secure-jwt-secret"
# PORT=3000

# Push Database Migrations
pnpm db:push

# Launch Unified Development Server (Backend + Vite HMR)
pnpm dev"""
    story.append(create_code_box(setup_commands, styles))

    story.append(Spacer(1, 10))
    story.append(Paragraph("Step 2: Quality Assurance & Validation Commands", styles['h2']))
    story.append(Paragraph("Before committing or promoting builds, execute the continuous integration pipeline:", styles['body']))
    qa_commands = """# 1. Type-check TypeScript codebase without emit
pnpm check

# 2. Execute Vitest test suite (Auth, Risk Engine, Persistence Contracts)
pnpm test

# 3. Compile production bundles (Vite client + bundled Express server)
pnpm build

# 4. Run Playwright End-to-End test suite (Chromium headless)
pnpm test:e2e"""
    story.append(create_code_box(qa_commands, styles))

    story.append(Spacer(1, 15))
    story.append(Paragraph("Step 3: Production Deployment Workflow (Vercel)", styles['h2']))
    story.append(Paragraph(
        "The repository includes a dedicated <code>api/index.js</code> serverless adapter and a custom <code>vercel.json</code> "
        "build configuration. Pushes to the <code>main</code> branch automatically trigger Vercel preview builds, which can be "
        "promoted directly to the production alias (<code>cropshield-6.vercel.app</code>).",
        styles['body']
    ))

    # Build Document
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated {filename}")

if __name__ == "__main__":
    build_pdf()
