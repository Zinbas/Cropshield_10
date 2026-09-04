import { useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import {
  getRiskColor,
  getRiskLabel,
  describeArc,
  parseThreatDetails,
  formatTimeAgo,
} from "@/lib/riskUtils";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  ShieldCheck,
  Activity,
  Lightbulb,
  Check,
  X,
  Star,
  MapPin,
  CloudSun,
  Eye,
  Camera,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// ─── Compact Risk Gauge ──────────────────────────────────────────────
function RiskGauge({ score, size = 140 }: { score: number; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 14;
  const startAngle = -225;
  const endAngle = 45;
  const totalAngle = endAngle - startAngle;
  const scoreAngle = startAngle + (totalAngle * Math.min(score, 100)) / 100;
  const bgPath = describeArc(cx, cy, radius, startAngle, endAngle);
  const scorePath = score > 0 ? describeArc(cx, cy, radius, startAngle, scoreAngle) : "";
  const color = getRiskColor(score);

  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg viewBox={`0 0 ${size} ${size}`} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'visible', zIndex: 1, transform: 'rotate(0deg)' }}>
        <path d={bgPath} fill="none" stroke="var(--neutral-200, #e5e5e5)" strokeWidth="10" strokeLinecap="round" />
        {scorePath && (
          <path
            d={scorePath}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 6px ${color}40)` }}
          />
        )}
      </svg>
      <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', marginTop: '-4px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '2px', lineHeight: '1', marginBottom: '4px' }}>
          <span style={{ color, fontSize: '32px', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{score}</span>
          <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--muted)' }}>%</span>
        </div>
        <span style={{ fontSize: '9px', color: 'var(--ink)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: '1.2', maxWidth: '70px', wordWrap: 'break-word' }}>
          {getRiskLabel(score)}
        </span>
      </div>
    </div>
  );
}

// ─── Compact Threat Card ─────────────────────────────────────────────
function ThreatCard({
  threat,
  onDismiss,
  onFeedback,
  onScan,
}: {
  threat: {
    id?: number;
    threatType: string;
    riskScore: number;
    riskLevel: string;
    threatDetails?: string | null;
    growthStage?: string | null;
    createdAt?: string | Date;
  };
  onDismiss?: (id: number) => void;
  onFeedback?: (id: number) => void;
  onScan?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const details = parseThreatDetails(threat.threatDetails);
  const color = getRiskColor(threat.riskScore);

  return (
    <article className={`threat-card ${expanded ? "threat-card-expanded" : ""}`}>
      <button type="button" className="threat-card-header" onClick={() => setExpanded(!expanded)}>
        <div className="threat-card-icon" style={{ background: `${color}18`, color }}>
          <AlertTriangle size={18} />
        </div>
        <div className="threat-card-title">
          <h3>{threat.threatType}</h3>
          <div className="threat-card-meta">
            <span className={`risk-chip risk-chip-${threat.riskLevel === "critical" ? "critical" : threat.riskLevel === "high" ? "high" : threat.riskLevel === "medium" ? "medium" : "healthy"}`}>
              {threat.riskScore}%
            </span>
            {threat.createdAt && <span className="threat-time">{formatTimeAgo(threat.createdAt)}</span>}
          </div>
        </div>
        <div className="threat-card-chevron">
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </div>
      </button>

      {expanded && (
        <div className="threat-card-body">
          {details.explanation && (
            <div className="threat-section">
              <div className="threat-section-icon"><Eye size={13} /></div>
              <div>
                <strong>Why this is flagged</strong>
                <p>{details.explanation}</p>
              </div>
            </div>
          )}

          {details.outlook && (
            <div className="threat-section">
              <div className="threat-section-icon"><CloudSun size={13} /></div>
              <div>
                <strong>7–15 day outlook</strong>
                <p>{details.outlook}</p>
              </div>
            </div>
          )}

          {details.factors.length > 0 && (
            <div className="threat-factors">
              <strong>Contributing factors</strong>
              <div className="threat-factor-bars">
                {details.factors.map((factor, idx) => (
                  <div key={idx} className="threat-factor-item">
                    <div className="threat-factor-label">
                      <span>{factor.factor}</span>
                      <span className="threat-factor-pct">{factor.contribution}%</span>
                    </div>
                    <div className="threat-factor-bar">
                      <div className="threat-factor-bar-fill" style={{ width: `${factor.contribution}%`, background: getRiskColor(factor.contribution) }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {details.preventiveActions.length > 0 && (
            <div className="threat-actions">
              <strong><Lightbulb size={13} /> Preventive actions</strong>
              <ul>
                {details.preventiveActions.map((action, idx) => (
                  <li key={idx}><Check size={11} /> <span>{action}</span></li>
                ))}
              </ul>
            </div>
          )}

          <div className="threat-card-footer">
            {onScan && <Button size="sm" onClick={onScan}><Camera size={13} /> Scan crop</Button>}
            {threat.id && onFeedback && <Button size="sm" variant="outline" onClick={() => onFeedback(threat.id!)}><Star size={13} /> Rate</Button>}
            {threat.id && onDismiss && <Button size="sm" variant="ghost" onClick={() => onDismiss(threat.id!)}><X size={13} /> Dismiss</Button>}
          </div>
        </div>
      )}
    </article>
  );
}

// ─── Feedback Dialog ─────────────────────────────────────────────────
function FeedbackDialog({ predictionId, onClose }: { predictionId: number; onClose: () => void }) {
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState("");
  const [actionTaken, setActionTaken] = useState("");
  const feedbackMutation = trpc.risk.feedback.useMutation();

  const submit = async () => {
    if (rating === 0) { toast.error("Please select a rating"); return; }
    try {
      await feedbackMutation.mutateAsync({ predictionId, rating, notes: notes || undefined, actionTaken: actionTaken || undefined });
      toast.success("Thank you for your feedback!");
      onClose();
    } catch { toast.error("Failed to submit feedback"); }
  };

  return (
    <div className="risk-feedback-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="risk-feedback-dialog">
        <div className="risk-feedback-header">
          <h3><Star size={18} /> Rate prediction accuracy</h3>
          <button type="button" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="risk-feedback-body">
          <p>How accurate was this risk prediction?</p>
          <div className="risk-feedback-stars">
            {[1, 2, 3, 4, 5].map((s) => (
              <button key={s} type="button" className={`risk-star ${rating >= s ? "risk-star-filled" : ""}`} onClick={() => setRating(s)}>
                <Star size={24} fill={rating >= s ? "#f59e0b" : "none"} />
              </button>
            ))}
          </div>
          <div className="risk-feedback-quick">
            {["Accurate", "Somewhat accurate", "Inaccurate"].map((label) => (
              <button key={label} type="button" className={`quick-feedback-btn ${actionTaken === label ? "quick-feedback-active" : ""}`} onClick={() => setActionTaken(label)}>
                {label}
              </button>
            ))}
          </div>
          <textarea placeholder="Optional feedback notes..." value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} rows={2} className="risk-feedback-notes" />
          <div className="risk-feedback-actions">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={submit} disabled={feedbackMutation.isPending}>
              {feedbackMutation.isPending ? "Submitting..." : "Submit"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── National Trends Section ─────────────────────────────────────────
function NationalTrends() {
  const allOutbreaks = trpc.risk.allOutbreaks.useQuery();
  const data = allOutbreaks.data ?? [];
  const active = data.filter(o => !o.resolvedAt);

  // Group by state
  const byState = useMemo(() => {
    const map = new Map<string, typeof active>();
    for (const ob of active) {
      const arr = map.get(ob.state) ?? [];
      arr.push(ob);
      map.set(ob.state, arr);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [active]);

  if (allOutbreaks.isLoading) {
    return (
      <section className="surface-card" style={{ textAlign: 'center', padding: '24px' }}>
        <RefreshCw size={18} className="spin" style={{ margin: '0 auto 8px' }} />
        <p style={{ fontSize: '13px', color: 'var(--muted)' }}>Loading national trends…</p>
      </section>
    );
  }

  if (active.length === 0) {
    return (
      <section className="surface-card" style={{ textAlign: 'center', padding: '24px' }}>
        <Globe size={28} style={{ color: 'var(--primary)', margin: '0 auto 8px' }} />
        <p style={{ fontWeight: 600, fontSize: '14px' }}>No active outbreaks nationally</p>
        <p style={{ fontSize: '12px', color: 'var(--muted)' }}>The CropShield network is clear across all regions.</p>
      </section>
    );
  }

  const levelColor = (level: string) => level === "outbreak" ? "#dc2626" : level === "warning" ? "#ea580c" : "#d97706";

  return (
    <section className="surface-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">NATIONAL & GLOBAL TRENDS</p>
          <h2>Outbreaks across regions ({active.length})</h2>
        </div>
        <Globe size={18} style={{ color: 'var(--primary)' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
        {byState.map(([state, outbreaks]) => (
          <details key={state} className="national-trend-state">
            <summary style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--primary-mist)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
              <span><MapPin size={13} style={{ verticalAlign: '-2px', marginRight: '4px' }} />{state}</span>
              <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 500 }}>{outbreaks.length} outbreak{outbreaks.length !== 1 ? "s" : ""}</span>
            </summary>
            <div style={{ padding: '8px 0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {outbreaks.map(ob => (
                <div key={ob.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '12px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: levelColor(ob.outbreakLevel), flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '12px' }}>{ob.threatType}</div>
                    <div style={{ color: 'var(--muted)', fontSize: '11px' }}>{ob.district} · {ob.reportCount} reports</div>
                  </div>
                  <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', padding: '2px 6px', borderRadius: '4px', background: ob.outbreakLevel === 'outbreak' ? '#fef2f2' : ob.outbreakLevel === 'warning' ? '#fff7ed' : '#fffbeb', color: levelColor(ob.outbreakLevel) }}>
                    {ob.outbreakLevel}
                  </span>
                </div>
              ))}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

// ─── Main Panel ──────────────────────────────────────────────────────
export function RiskPredictionPanel({ onNavigateToScan }: { onNavigateToScan?: () => void }) {
  const [feedbackTarget, setFeedbackTarget] = useState<number | null>(null);
  const utils = trpc.useUtils();

  const predictMutation = trpc.risk.predict.useMutation({
    onSuccess: () => {
      utils.risk.active.invalidate();
      utils.risk.allOutbreaks.invalidate();
      utils.risk.outbreaks.invalidate();
    },
    onError: (err) => toast.error(err.message || "Prediction failed"),
  });

  const activePredictions = trpc.risk.active.useQuery();
  const outbreaks = trpc.risk.outbreaks.useQuery();

  const dismissMutation = trpc.risk.dismiss.useMutation({
    onSuccess: () => {
      utils.risk.active.invalidate();
      utils.risk.allOutbreaks.invalidate();
      utils.risk.outbreaks.invalidate();
      toast.success("Alert dismissed");
    },
  });

  // ── Auto-predict on mount if no active predictions or they're stale ──
  useEffect(() => {
    if (activePredictions.isLoading || predictMutation.isPending) return;
    const predictions = activePredictions.data ?? [];
    if (predictions.length === 0) {
      predictMutation.mutate({});
      return;
    }
    // Check staleness: if newest prediction is older than 6 hours, re-predict
    const newest = predictions.reduce((a, b) => new Date(a.createdAt) > new Date(b.createdAt) ? a : b);
    const ageMs = Date.now() - new Date(newest.createdAt).getTime();
    if (ageMs > 6 * 60 * 60 * 1000) {
      predictMutation.mutate({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePredictions.data, activePredictions.isLoading]);

  const overallScore = useMemo(() => {
    if (predictMutation.data) return predictMutation.data.overallScore;
    if (activePredictions.data && activePredictions.data.length > 0) {
      return Math.round(activePredictions.data.reduce((sum, p) => sum + p.riskScore, 0) / activePredictions.data.length);
    }
    return 0;
  }, [predictMutation.data, activePredictions.data]);

  const threats = useMemo(() => {
    if (predictMutation.data) {
      return predictMutation.data.threats.map((t) => ({
        ...t,
        id: undefined as number | undefined,
        threatDetails: JSON.stringify({ explanation: t.explanation, outlook: t.outlook, preventiveActions: t.preventiveActions, factors: t.factors }),
        createdAt: predictMutation.data!.calculatedAt,
      }));
    }
    if (activePredictions.data && activePredictions.data.length > 0) {
      return activePredictions.data.map((p) => ({
        id: p.id,
        threatType: p.threatType,
        riskScore: p.riskScore,
        riskLevel: p.riskLevel,
        threatDetails: p.threatDetails,
        growthStage: p.growthStage,
        createdAt: p.createdAt,
      }));
    }
    return [];
  }, [predictMutation.data, activePredictions.data]);

  const activeOutbreaks = outbreaks.data ?? [];
  const isAnalyzing = predictMutation.isPending;

  return (
    <div className="risk-prediction-panel">
      {/* Outbreak Banner */}
      {activeOutbreaks.length > 0 && (
        <div className="outbreak-banner">
          <div className="outbreak-banner-icon"><AlertTriangle size={18} /></div>
          <div className="outbreak-banner-content">
            <strong>⚠️ Regional Alert</strong>
            <p>{activeOutbreaks.length} outbreak{activeOutbreaks.length > 1 ? "s" : ""} in your area · {activeOutbreaks[0]?.threatType}</p>
          </div>
        </div>
      )}

      {/* Your Farm Risk — Compact Card */}
      <section className="surface-card risk-main-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <div>
            <p className="eyebrow">YOUR FARM RISK</p>
            <h2 style={{ fontSize: '16px', margin: '4px 0 0' }}>Personalized prediction</h2>
          </div>
          <button
            type="button"
            onClick={() => predictMutation.mutate({})}
            disabled={isAnalyzing}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', padding: '6px' }}
            title="Refresh prediction"
          >
            <RefreshCw size={18} className={isAnalyzing ? "spin" : ""} />
          </button>
        </div>

        {isAnalyzing && threats.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <RefreshCw size={24} className="spin" style={{ color: 'var(--primary)', margin: '0 auto 8px' }} />
            <p style={{ fontSize: '13px', color: 'var(--muted)' }}>Analyzing weather, crops, and regional data…</p>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '12px' }}>
            <RiskGauge score={overallScore} size={110} />
            <div style={{ flex: 1, minWidth: 0, paddingRight: '4px' }}>
              <p style={{ fontSize: '13px', color: 'var(--ink-secondary)', margin: '0 0 6px', fontWeight: 500, lineHeight: 1.3 }}>
                {threats.length > 0
                  ? <strong style={{ color: 'var(--ink)' }}>{threats.length} threat{threats.length !== 1 ? "s" : ""} identified</strong>
                  : "No active threats detected"
                }
              </p>
              {threats.length > 0 && threats[0]?.createdAt && (
                <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '0 0 8px' }}>Updated {formatTimeAgo(threats[0].createdAt)}</p>
              )}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '4px', fontSize: '11px', color: 'var(--primary)', background: 'var(--primary-mist)', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>
                <ShieldCheck size={14} /> Auto-predicted from profile
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Threats List */}
      {threats.length > 0 && (
        <section className="surface-card risk-threats-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">ACTIVE THREATS · {threats.length}</p>
              <h2 style={{ fontSize: '15px' }}>Predicted risks & actions</h2>
            </div>
            <AlertTriangle size={17} style={{ color: '#f59e0b' }} />
          </div>
          <div className="threat-card-list">
            {threats.map((threat, idx) => (
              <ThreatCard
                key={threat.id ?? idx}
                threat={threat}
                onDismiss={threat.id ? (id) => dismissMutation.mutate({ id }) : undefined}
                onFeedback={threat.id ? (id) => setFeedbackTarget(id) : undefined}
                onScan={onNavigateToScan}
              />
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {threats.length === 0 && !isAnalyzing && (
        <section className="surface-card" style={{ textAlign: 'center', padding: '24px' }}>
          <ShieldCheck size={32} style={{ color: 'var(--primary)', margin: '0 auto 8px' }} />
          <h3 style={{ fontSize: '15px', margin: '0 0 4px' }}>All clear</h3>
          <p style={{ fontSize: '12px', color: 'var(--muted)', margin: 0 }}>No active threats detected for your farm right now.</p>
        </section>
      )}

      {/* National & Global Trends */}
      <NationalTrends />

      {/* Feedback Dialog */}
      {feedbackTarget !== null && (
        <FeedbackDialog predictionId={feedbackTarget} onClose={() => setFeedbackTarget(null)} />
      )}
    </div>
  );
}
