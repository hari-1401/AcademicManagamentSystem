import React, { useState } from 'react';
import { staffAPI } from '../api';

function AIQuizGenerator({ subjectId, onClose, onSuccess, dark }) {
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState(null);
  const [quizId, setQuizId] = useState(null);

  const D = {
    bg:           dark ? '#0f0c29' : '#f0f2ff',
    topbar:       dark ? '#1a1730' : '#ffffff',
    topbarBorder: dark ? 'rgba(255,255,255,0.08)' : '#e0e0e0',
    panel:        dark ? '#1e1b3a' : '#ffffff',
    panelBorder:  dark ? 'rgba(255,255,255,0.1)' : '#e0e0e0',
    qCardBg:      dark ? 'rgba(255,255,255,0.06)' : '#f9f9f9',
    qCardBorder:  dark ? 'rgba(255,255,255,0.1)' : '#e0e0e0',
    text:         dark ? '#f0f0ff' : '#1a1a2e',
    sub:          dark ? '#c0c0e0' : '#666',
    muted:        dark ? 'rgba(255,255,255,0.4)' : '#888',
    optionBg:     dark ? 'rgba(255,255,255,0.05)' : 'white',
    optionBorder: dark ? 'rgba(255,255,255,0.12)' : '#dee2e6',
    optionText:   dark ? '#c0c0e0' : '#333',
    correctBg:    dark ? 'rgba(40,167,69,0.2)' : '#d4edda',
    correctBorder:dark ? '#4caf7d' : '#28a745',
    correctText:  dark ? '#4caf7d' : '#155724',
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    try {
      const res = await staffAPI.generateQuiz({ subjectId, title: title.trim(), numQuestions: 10 });
      setQuizId(res.data.quizId);
      setQuestions(res.data.questions);
    } catch (err) {
      alert('Generation failed: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    alert('AI Quiz saved! Go to "Assign Quiz" tab to assign it to students.');
    onSuccess();
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: D.bg, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 32px', background: D.topbar, borderBottom: `1px solid ${D.topbarBorder}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{ fontSize: '24px' }}>🤖</span>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', color: D.text, fontWeight: '700' }}>Generate AI Quiz</h2>
            {questions && <p style={{ margin: 0, fontSize: '13px', color: D.sub }}>10 questions generated • {title}</p>}
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'rgba(220,53,69,0.15)', color: '#e74c3c', border: '1px solid rgba(220,53,69,0.3)', borderRadius: '8px', padding: '8px 18px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
          ✕ Close
        </button>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>

        {!questions ? (
          <div style={{ maxWidth: '600px', margin: '0 auto', background: D.panel, borderRadius: '16px', padding: '36px', border: `1px solid ${D.panelBorder}` }}>
            <form onSubmit={handleGenerate}>
              <div className="form-group">
                <label>Quiz Title / Topic</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Python OOP, Data Structures, World War II"
                  required
                />
                <small style={{ color: D.muted }}>AI will generate 10 MCQs on this topic</small>
              </div>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? '⏳ Generating 10 questions...' : '🤖 Generate Quiz'}
              </button>
            </form>
          </div>
        ) : (
          <div style={{ maxWidth: '860px', margin: '0 auto' }}>
            <p style={{ color: D.sub, marginBottom: '24px', fontSize: '14px' }}>
              ✅ 10 questions generated for <strong style={{ color: D.text }}>"{title}"</strong> — review below then save.
            </p>

            {questions.map((q, i) => (
              <div key={i} style={{ background: D.qCardBg, padding: '20px', borderRadius: '10px', marginBottom: '16px', border: `1px solid ${D.qCardBorder}` }}>
                <p style={{ fontWeight: '600', marginBottom: '12px', color: D.text }}>Q{i + 1}. {q.question}</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {Object.entries(q.options).map(([k, v]) => (
                    <div key={k} style={{
                      padding: '10px 14px', borderRadius: '6px', fontSize: '14px',
                      background: k === q.correct_answer ? D.correctBg : D.optionBg,
                      border: `1.5px solid ${k === q.correct_answer ? D.correctBorder : D.optionBorder}`,
                      color: k === q.correct_answer ? D.correctText : D.optionText,
                      fontWeight: k === q.correct_answer ? '600' : '400'
                    }}>
                      {k}. {v} {k === q.correct_answer && '✓'}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px', marginBottom: '40px' }}>
              <button onClick={() => setQuestions(null)} className="btn-secondary" style={{ flex: 1 }}>↩ Regenerate</button>
              <button onClick={handleSave} className="btn-primary" style={{ flex: 2 }}>💾 Save Quiz</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AIQuizGenerator;
