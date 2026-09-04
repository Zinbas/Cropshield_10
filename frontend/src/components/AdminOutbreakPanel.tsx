import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { getRiskColor, formatTimeAgo } from "@/lib/riskUtils";
import {
  AlertTriangle,
  MapPin,
  ShieldCheck,
  Users,
  Activity,
  CheckCircle2,
  Bell,
  BarChart3,
  ChevronDown,
  ChevronRight,
  Database,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function AdminOutbreakPanel() {
  const outbreaks = trpc.admin.regionalOutbreaks.useQuery();
  const riskOverview = trpc.admin.riskOverview.useQuery();
  const utils = trpc.useUtils();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showResolved, setShowResolved] = useState(false);

  const escalateMutation = trpc.admin.escalateOutbreak.useMutation({
    onSuccess: () => { utils.admin.regionalOutbreaks.invalidate(); toast.success("Officer notified"); },
    onError: () => toast.error("Failed to escalate"),
  });

  const resolveMutation = trpc.admin.resolveOutbreak.useMutation({
    onSuccess: () => { utils.admin.regionalOutbreaks.invalidate(); toast.success("Outbreak resolved"); },
    onError: () => toast.error("Failed to resolve"),
  });

  const seedMutation = trpc.admin.seedTestData.useMutation({
    onSuccess: (data) => {
      utils.admin.regionalOutbreaks.invalidate();
      utils.admin.riskOverview.invalidate();
      utils.admin.overview.invalidate();
      toast.success(data.message);
    },
    onError: (err) => toast.error(err.message || "Seeding failed"),
  });

  const stats = riskOverview.data;
  const allOutbreaks = outbreaks.data ?? [];
  const activeOutbreaks = allOutbreaks.filter(o => !o.resolvedAt);
  const resolvedOutbreaks = allOutbreaks.filter(o => o.resolvedAt);

  // Group active outbreaks by state
  const byState = useMemo(() => {
    const map = new Map<string, typeof activeOutbreaks>();
    for (const ob of activeOutbreaks) {
      const arr = map.get(ob.state) ?? [];
      arr.push(ob);
      map.set(ob.state, arr);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [activeOutbreaks]);

  const levelColor = (level: string) => level === "outbreak" ? "#dc2626" : level === "warning" ? "#ea580c" : "#d97706";

  return (
    <div className="admin-outbreak-panel">
      {/* Horizontal-scroll stat chips */}
      <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px', WebkitOverflowScrolling: 'touch' }}>
        {[
          { icon: <Activity size={16} />, value: stats?.totalPredictions ?? 0, label: "Predictions (30d)", bg: "#dcfce7", fg: "#16a34a" },
          { icon: <AlertTriangle size={16} />, value: activeOutbreaks.length, label: "Active Outbreaks", bg: "#fef3c7", fg: "#d97706" },
          { icon: <BarChart3 size={16} />, value: stats?.avgRating ? stats.avgRating.toFixed(1) : "—", label: "Avg Rating", bg: "#dbeafe", fg: "#2563eb" },
          { icon: <ShieldCheck size={16} />, value: stats?.activePredictions ?? 0, label: "Active Alerts", bg: "#f3e8ff", fg: "#7c3aed" },
        ].map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--card)', minWidth: '140px', flexShrink: 0 }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: s.bg, color: s.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 700, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 500 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Active Outbreaks by State */}
      <section className="surface-card" style={{ marginTop: '12px' }}>
        <div className="section-heading">
          <div>
            <p className="eyebrow">REGIONAL MONITORING</p>
            <h2 style={{ fontSize: '15px' }}>Active outbreaks ({activeOutbreaks.length})</h2>
          </div>
          <AlertTriangle size={17} style={{ color: '#f59e0b' }} />
        </div>

        {activeOutbreaks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px' }}>
            <ShieldCheck size={32} style={{ color: 'var(--primary)', margin: '0 auto 8px' }} />
            <p style={{ fontSize: '13px', fontWeight: 600 }}>No active outbreaks</p>
            <p style={{ fontSize: '11px', color: 'var(--muted)' }}>All regions are clear.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
            {byState.map(([state, stateOutbreaks]) => (
              <div key={state}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '4px 0', marginTop: '4px' }}>
                  <MapPin size={11} style={{ verticalAlign: '-1px', marginRight: '3px' }} />{state} ({stateOutbreaks.length})
                </div>
                {stateOutbreaks.map(ob => {
                  const isExpanded = expandedId === ob.id;
                  const cropTypes = ob.affectedCropTypes ? JSON.parse(ob.affectedCropTypes) : [];
                  return (
                    <div key={ob.id} style={{ border: '1px solid var(--border)', borderRadius: '8px', marginBottom: '6px', overflow: 'hidden' }}>
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : ob.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '12px' }}
                      >
                        <div style={{ width: '5px', height: '28px', borderRadius: '3px', background: levelColor(ob.outbreakLevel), flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: '13px' }}>{ob.threatType}</div>
                          <div style={{ color: 'var(--muted)', fontSize: '11px', display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '2px' }}>
                            <span>{ob.district}</span>
                            <span><Users size={10} /> {ob.reportCount} reports</span>
                            <span style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '9px', padding: '1px 5px', borderRadius: '3px', background: ob.outbreakLevel === 'outbreak' ? '#fef2f2' : ob.outbreakLevel === 'warning' ? '#fff7ed' : '#fffbeb', color: levelColor(ob.outbreakLevel) }}>
                              {ob.outbreakLevel}
                            </span>
                          </div>
                        </div>
                        <span style={{ color: getRiskColor(ob.averageRiskScore), fontWeight: 700, fontSize: '14px' }}>{ob.averageRiskScore}%</span>
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>

                      {isExpanded && (
                        <div style={{ padding: '8px 12px 12px', borderTop: '1px solid var(--border)', fontSize: '12px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '8px' }}>
                            <div><strong>Started</strong><br /><span style={{ color: 'var(--muted)' }}>{new Date(ob.startedAt).toLocaleDateString()}</span></div>
                            <div><strong>Updated</strong><br /><span style={{ color: 'var(--muted)' }}>{formatTimeAgo(ob.updatedAt)}</span></div>
                            <div><strong>Officer</strong><br /><span>{ob.officerNotified ? "✅ Notified" : "❌ Not yet"}</span></div>
                            {cropTypes.length > 0 && <div><strong>Crops</strong><br /><span style={{ color: 'var(--muted)' }}>{cropTypes.join(", ")}</span></div>}
                          </div>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {!ob.officerNotified && (
                              <Button size="sm" variant="outline" onClick={() => escalateMutation.mutate({ id: ob.id })} disabled={escalateMutation.isPending}>
                                <Bell size={12} /> Notify
                              </Button>
                            )}
                            <Button size="sm" variant="outline" onClick={() => resolveMutation.mutate({ id: ob.id })} disabled={resolveMutation.isPending}>
                              <CheckCircle2 size={12} /> Resolve
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Resolved Outbreaks (collapsible) */}
      {resolvedOutbreaks.length > 0 && (
        <section className="surface-card" style={{ marginTop: '12px' }}>
          <button
            type="button"
            onClick={() => setShowResolved(!showResolved)}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '0' }}
          >
            <div>
              <p className="eyebrow">HISTORY</p>
              <h2 style={{ fontSize: '14px' }}>Resolved outbreaks ({resolvedOutbreaks.length})</h2>
            </div>
            {showResolved ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
          {showResolved && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
              {resolvedOutbreaks.slice(0, 10).map(ob => (
                <div key={ob.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)', opacity: 0.7, fontSize: '12px' }}>
                  <div style={{ width: '5px', height: '20px', borderRadius: '3px', background: '#9ca3af', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{ob.threatType}</div>
                    <div style={{ color: 'var(--muted)', fontSize: '11px' }}>{ob.district}, {ob.state} · Resolved {ob.resolvedAt ? new Date(ob.resolvedAt).toLocaleDateString() : ""}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Seed Test Data */}
      <section className="surface-card" style={{ marginTop: '12px' }}>
        <div className="section-heading">
          <div>
            <p className="eyebrow">TESTING</p>
            <h2 style={{ fontSize: '14px' }}>Populate test data</h2>
          </div>
          <Database size={17} style={{ color: 'var(--muted)' }} />
        </div>
        <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '4px 0 12px' }}>
          Seed ~50 farmers, ~200 scans, predictions, outbreaks, experts, and stores across 8 Indian states to verify the risk predictor.
        </p>
        <Button
          onClick={() => seedMutation.mutate()}
          disabled={seedMutation.isPending}
          variant="outline"
          style={{ width: '100%' }}
        >
          {seedMutation.isPending ? (
            <><RefreshCw size={14} className="spin" /> Seeding data…</>
          ) : (
            <><Database size={14} /> Seed test data</>
          )}
        </Button>
        {seedMutation.data && (
          <p style={{ fontSize: '11px', color: 'var(--primary)', marginTop: '8px', fontWeight: 500 }}>
            ✅ {seedMutation.data.message}
          </p>
        )}
      </section>
    </div>
  );
}
