import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { staffAPI } from '../api';

// ── helpers ───────────────────────────────────────────────────────────────────
const getDiff = (pct) => {
  if (pct > 70) return { label: 'Easy',     color: '#16a34a', bg: '#dcfce7' };
  if (pct >= 30) return { label: 'Moderate', color: '#d97706', bg: '#fef3c7' };
  return              { label: 'Difficult', color: '#dc2626', bg: '#fee2e2' };
};

const median = (arr) => {
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : +((s[m - 1] + s[m]) / 2).toFixed(1);
};

const buildHistogram = (scores, total) => {
  const step = Math.ceil(total / 5) || 1;
  return Array.from({ length: 5 }, (_, i) => ({
    range: `${i * step}–${Math.min((i + 1) * step - 1, total)}`,
    Students: scores.filter((s) => s >= i * step && s < (i + 1) * step).length,
  }));
};

const buildPie = (scores, total) => {
  const high = Math.round(total * 0.7);
  const mid  = Math.round(total * 0.4);
  const c    = [0, 0, 0];
  scores.forEach((s) => { if (s >= high) c[0]++; else if (s >= mid) c[1]++; else c[2]++; });
  return [
    { name: `High  ≥${high}`,             value: c[0], color: '#16a34a' },
    { name: `Medium  ${mid}–${high - 1}`, value: c[1], color: '#d97706' },
    { name: `Low  <${mid}`,               value: c[2], color: '#dc2626' },
  ].filter((d) => d.value > 0);
};

// ── tooltips ──────────────────────────────────────────────────────────────────
const BarTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#1e293b', borderRadius: 10, padding: '10px 14px',
      fontSize: 12, color: '#f8fafc', boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
    }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color: '#94a3b8' }}>
          Correct: <span style={{ color: '#fff', fontWeight: 700 }}>{p.value}%</span>
        </div>
      ))}
      <div style={{ color: '#64748b', fontSize: 10, marginTop: 5 }}>Click to view question</div>
    </div>
  );
};

const HistTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#1e293b', borderRadius: 10, padding: '10px 14px',
      fontSize: 12, color: '#f8fafc', boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
    }}>
      <div style={{ color: '#94a3b8', marginBottom: 3 }}>Score {label}</div>
      <div style={{ fontWeight: 700 }}>{payload[0].value} students</div>
    </div>
  );
};

const PieTip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div style={{
      background: '#1e293b', borderRadius: 10, padding: '10px 14px',
      fontSize: 12, color: '#f8fafc', boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
    }}>
      <div style={{ color: d.payload.color, fontWeight: 700 }}>{d.name}</div>
      <div style={{ color: '#94a3b8' }}>{d.value} students</div>
    </div>
  );
};

// ── question detail modal ─────────────────────────────────────────────────────
const QuestionModal = ({ question, total, onClose }) => {
  if (!question) return null;
  const d = getDiff(question.difficultyIndex);
  const opts = question.options || {};
  const correctAns = question.correctAnswer?.toUpperCase();

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 3000,
        background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 20, padding: '32px',
          maxWidth: 580, width: '100%', maxHeight: '85vh', overflowY: 'auto',
          boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
        }}
      >
        {/* header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{
                fontSize: 12, fontWeight: 700, color: '#6366f1',
                background: '#eef2ff', padding: '3px 10px', borderRadius: 20,
              }}>Q{question.questionIndex + 1}</span>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                background: d.bg, color: d.color,
              }}>{d.label}</span>
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', lineHeight: 1.6 }}>
              {question.question}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              marginLeft: 16, background: '#f1f5f9', border: 'none',
              borderRadius: 8, width: 32, height: 32, cursor: 'pointer',
              fontSize: 14, color: '#64748b', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >✕</button>
        </div>

        {/* options */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.8 }}>
            Answer Options
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Object.entries(opts).map(([key, val]) => {
              const isCorrect = key.toUpperCase() === correctAns;
              const chosen = question.optionCounts?.[key] || 0;
              const pct = total > 0 ? Math.round((chosen / total) * 100) : 0;
              return (
                <div key={key} style={{
                  padding: '12px 14px', borderRadius: 12,
                  background: isCorrect ? '#f0fdf4' : '#f8fafc',
                  border: `1.5px solid ${isCorrect ? '#86efac' : '#e2e8f0'}`,
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    background: isCorrect ? '#16a34a' : '#e2e8f0',
                    color: isCorrect ? '#fff' : '#64748b',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700,
                  }}>{key}</div>
                  <div style={{ flex: 1, fontSize: 13, color: '#334155' }}>{val}</div>
                  {isCorrect && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '3px 8px',
                      borderRadius: 20, background: '#16a34a', color: '#fff',
                    }}>✓ Correct</span>
                  )}
                  <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {chosen} ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* stats */}
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            { label: 'Correct',  value: question.correctCount, color: '#16a34a', bg: '#f0fdf4' },
            { label: 'Wrong',    value: question.wrongCount,   color: '#dc2626', bg: '#fef2f2' },
            { label: 'DI Score', value: `${question.difficultyIndex}%`, color: '#6366f1', bg: '#eef2ff' },
          ].map((s) => (
            <div key={s.label} style={{
              flex: 1, textAlign: 'center', padding: '14px 8px',
              borderRadius: 12, background: s.bg,
            }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 10, color: s.color, fontWeight: 600, marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── stat card ─────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, note, color, bg, icon }) => (
  <div style={{
    flex: 1, minWidth: 140,
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 16, padding: '22px 20px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    position: 'relative', overflow: 'hidden',
  }}>
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, height: 4,
      background: color, borderRadius: '16px 16px 0 0',
    }} />
    <div style={{
      width: 40, height: 40, borderRadius: 12,
      background: bg, display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontSize: 18, marginBottom: 14,
    }}>{icon}</div>
    <div style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{value}</div>
    {note && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 5 }}>{note}</div>}
    <div style={{ fontSize: 12, color: '#64748b', marginTop: 8, fontWeight: 500 }}>{label}</div>
  </div>
);

// ── section wrapper ───────────────────────────────────────────────────────────
const Section = ({ title, subtitle, children }) => (
  <div style={{
    background: '#fff', borderRadius: 18,
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    padding: '28px 28px 24px',
  }}>
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{title}</div>
      {subtitle && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>{subtitle}</div>}
    </div>
    {children}
  </div>
);

const TICK       = { fontSize: 11, fill: '#94a3b8' };
const GRID       = { strokeDasharray: '4 4', stroke: '#f1f5f9' };
const BAR_COLORS = ['#6366f1', '#8b5cf6', '#38bdf8', '#ec4899', '#f59e0b'];

// ── main ──────────────────────────────────────────────────────────────────────
export default function QuizAnalyticsChart({ quiz, onClose }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [showAll, setShowAll]     = useState(false);
  const [selectedQ, setSelectedQ] = useState(null);

  useEffect(() => {
    staffAPI.getQuizAnalytics(quiz.id)
      .then((r) => setAnalytics(r.data))
      .catch(() => setAnalytics(null))
      .finally(() => setLoading(false));
  }, [quiz.id]);

  const scores   = useMemo(() => analytics?.studentScores?.map((s) => s.score) ?? [], [analytics]);
  const histData = useMemo(() => buildHistogram(scores, analytics?.totalMarks ?? 100), [scores, analytics]);
  const pieData  = useMemo(() => buildPie(scores, analytics?.totalMarks ?? 100), [scores, analytics]);

  const displayedQ = analytics
    ? (showAll ? analytics.questionAnalytics : analytics.questionAnalytics.slice(0, 15))
    : [];

  const barData = displayedQ.map((q) => ({
    name:   `Q${q.questionIndex + 1}`,
    Correct: q.correctPercent,
    di:     q.difficultyIndex,
    qIndex: q.questionIndex,
  }));

  const stats = useMemo(() => {
    if (!scores.length || !analytics) return null;
    return {
      avg:  analytics.averageScore,
      high: Math.max(...scores),
      low:  Math.min(...scores),
      med:  median(scores),
      pct:  Math.round((analytics.averageScore / analytics.totalMarks) * 100),
    };
  }, [scores, analytics]);

  const diffCounts = useMemo(() => {
    if (!analytics) return {};
    return analytics.questionAnalytics.reduce((acc, q) => {
      const key = getDiff(q.difficultyIndex).label.toLowerCase();
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }, [analytics]);

  const openQuestion = (qIndex) => {
    const q = analytics?.questionAnalytics?.find((x) => x.questionIndex === qIndex);
    if (q) setSelectedQ(q);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: '#f8fafc', overflowY: 'auto',
      fontFamily: "'Inter','Segoe UI',sans-serif",
    }}>

      {/* ── sticky top bar ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: '#fff', borderBottom: '1px solid #e2e8f0',
        padding: '0 40px', height: 62,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            padding: '6px 16px', borderRadius: 10,
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            fontSize: 13, fontWeight: 700, color: '#fff',
          }}>Analytics</div>
          <div style={{ width: 1, height: 22, background: '#e2e8f0' }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{quiz.title}</div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>Quiz Performance Report</div>
          </div>
        </div>
        <button onClick={onClose} style={{
          background: '#f1f5f9', border: '1px solid #e2e8f0',
          borderRadius: 8, width: 34, height: 34, cursor: 'pointer',
          fontSize: 14, color: '#64748b',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>✕</button>
      </div>

      {/* ── page content ── */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '36px 40px 60px' }}>

        {loading && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#94a3b8', fontSize: 14 }}>
            Loading analytics…
          </div>
        )}
        {!loading && !analytics && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#dc2626', fontSize: 14 }}>
            Failed to load analytics.
          </div>
        )}
        {!loading && analytics && analytics.totalSubmissions === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#94a3b8', fontSize: 14 }}>
            No submissions yet for this quiz.
          </div>
        )}

        {!loading && analytics && analytics.totalSubmissions > 0 && stats && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

            {/* ── stat tiles ── */}
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <StatCard icon="👥" label="Total Submissions" value={analytics.totalSubmissions}                                        color="#6366f1" bg="#eef2ff" />
              <StatCard icon="📊" label="Average Score"     value={stats.avg}  note={`${stats.pct}% of ${analytics.totalMarks}`}      color="#38bdf8" bg="#f0f9ff" />
              <StatCard icon="🏆" label="Highest Score"     value={stats.high} note={`out of ${analytics.totalMarks}`}                 color="#16a34a" bg="#f0fdf4" />
              <StatCard icon="📉" label="Lowest Score"      value={stats.low}  note={`out of ${analytics.totalMarks}`}                 color="#dc2626" bg="#fef2f2" />
              <StatCard icon="⚖️" label="Median Score"      value={stats.med}  note={`out of ${analytics.totalMarks}`}                 color="#d97706" bg="#fffbeb" />
            </div>

            {/* ── correct response rate ── */}
            <Section
              title="Correct Response Rate"
              subtitle="Percentage of students who answered each question correctly — click any bar to view the question"
            >
              <div style={{ display: 'flex', gap: 20, marginBottom: 18 }}>
                {[['#16a34a','Easy  >70%'],['#d97706','Moderate  30–70%'],['#dc2626','Difficult  <30%']].map(([c, l]) => (
                  <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b' }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: c, display: 'inline-block' }} />{l}
                  </span>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={barData}
                  margin={{ top: 4, right: 8, left: -10, bottom: 4 }}
                  onClick={(e) => e?.activePayload?.[0] && openQuestion(e.activePayload[0].payload.qIndex)}
                >
                  <CartesianGrid {...GRID} />
                  <XAxis dataKey="name" tick={TICK} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={TICK} axisLine={false} tickLine={false} />
                  <Tooltip content={<BarTip />} cursor={{ fill: 'rgba(99,102,241,0.05)' }} />
                  <Bar dataKey="Correct" name="Correct" radius={[5, 5, 0, 0]} maxBarSize={40} cursor="pointer">
                    {barData.map((e) => <Cell key={e.name} fill={getDiff(e.di).color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {analytics.questionAnalytics.length > 15 && (
                <button onClick={() => setShowAll((v) => !v)} style={{
                  marginTop: 16, padding: '8px 20px',
                  background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                  color: '#fff', border: 'none', borderRadius: 8,
                  cursor: 'pointer', fontSize: 12, fontWeight: 600,
                }}>
                  {showAll ? 'Show First 15' : `Show All ${analytics.questionAnalytics.length} Questions`}
                </button>
              )}
            </Section>

            {/* ── difficulty index + question list ── */}
            <Section
              title="Difficulty Index"
              subtitle="DI = correct responses ÷ total students — click any row to view the question"
            >
              {/* summary chips */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                {[
                  { key: 'easy',      label: 'Easy',      color: '#16a34a', bg: '#f0fdf4' },
                  { key: 'moderate',  label: 'Moderate',  color: '#d97706', bg: '#fffbeb' },
                  { key: 'difficult', label: 'Difficult', color: '#dc2626', bg: '#fef2f2' },
                ].map((d) => (
                  <div key={d.key} style={{
                    flex: 1, textAlign: 'center', padding: '16px 10px',
                    borderRadius: 14, background: d.bg,
                    border: `1px solid ${d.color}30`,
                  }}>
                    <div style={{ fontSize: 28, fontWeight: 800, color: d.color }}>{diffCounts[d.key] || 0}</div>
                    <div style={{ fontSize: 11, color: d.color, fontWeight: 600, marginTop: 4 }}>{d.label}</div>
                  </div>
                ))}
              </div>

              {/* question rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {displayedQ.map((q) => {
                  const d = getDiff(q.difficultyIndex);
                  return (
                    <div
                      key={q.questionIndex}
                      onClick={() => openQuestion(q.questionIndex)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '12px 16px', borderRadius: 12,
                        background: '#f8fafc', border: '1px solid #e2e8f0',
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#f0f4ff';
                        e.currentTarget.style.borderColor = '#a5b4fc';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#f8fafc';
                        e.currentTarget.style.borderColor = '#e2e8f0';
                      }}
                    >
                      <span style={{
                        fontSize: 12, fontWeight: 700, color: '#6366f1',
                        background: '#eef2ff', padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap',
                      }}>Q{q.questionIndex + 1}</span>
                      <span style={{ fontSize: 13, color: '#334155', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {q.question}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: d.color, minWidth: 40, textAlign: 'right' }}>
                        {q.difficultyIndex}%
                      </span>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                        background: d.bg, color: d.color, whiteSpace: 'nowrap',
                      }}>{d.label}</span>
                    </div>
                  );
                })}
              </div>
            </Section>

            {/* ── score distribution + performance pie ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

              <Section title="Score Distribution" subtitle="Number of students in each score range">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={histData} margin={{ top: 4, right: 8, left: -10, bottom: 4 }}>
                    <CartesianGrid {...GRID} />
                    <XAxis dataKey="range" tick={TICK} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={TICK} axisLine={false} tickLine={false} />
                    <Tooltip content={<HistTip />} cursor={{ fill: 'rgba(99,102,241,0.05)' }} />
                    <Bar dataKey="Students" name="Students" radius={[5, 5, 0, 0]} maxBarSize={52}>
                      {histData.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Section>

              <Section title="Performance Categories" subtitle="Student distribution across performance tiers">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%" cy="45%"
                      innerRadius={68} outerRadius={100}
                      paddingAngle={4}
                      dataKey="value"
                      label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                      labelLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                    >
                      {pieData.map((e) => <Cell key={e.name} fill={e.color} />)}
                    </Pie>
                    <Tooltip content={<PieTip />} />
                    <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 12, color: '#64748b' }} />
                  </PieChart>
                </ResponsiveContainer>
              </Section>
            </div>

          </div>
        )}
      </div>

      {/* ── question detail modal ── */}
      {selectedQ && (
        <QuestionModal
          question={selectedQ}
          total={analytics?.totalSubmissions ?? 0}
          onClose={() => setSelectedQ(null)}
        />
      )}
    </div>
  );
}
