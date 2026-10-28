import React, { useState } from 'react';
import { staffAPI } from '../api';

function ManualQuizCreator({ subjectId, onClose, onSuccess, dark }) {
  const [title, setTitle] = useState('');
  const [numQuestions, setNumQuestions] = useState('');
  const [questions, setQuestions] = useState([]);
  const [showQuestions, setShowQuestions] = useState(false);

  const D = {
    bg:          dark ? '#0f0c29' : '#f0f2ff',
    topbar:      dark ? '#1a1730' : '#ffffff',
    topbarBorder:dark ? 'rgba(255,255,255,0.08)' : '#e0e0e0',
    panel:       dark ? '#1e1b3a' : '#ffffff',
    panelBorder: dark ? 'rgba(255,255,255,0.1)' : '#e0e0e0',
    qCardBg:     dark ? 'rgba(255,255,255,0.06)' : '#f9f9f9',
    qCardBorder: dark ? 'rgba(255,255,255,0.1)' : '#e0e0e0',
    text:        dark ? '#f0f0ff' : '#1a1a2e',
    sub:         dark ? '#c0c0e0' : '#555',
    inputBg:     dark ? 'rgba(255,255,255,0.07)' : 'white',
    inputBorder: dark ? 'rgba(255,255,255,0.14)' : '#e0e0e0',
    inputColor:  dark ? '#f0f0ff' : '#222',
  };

  const generateQuestionForms = () => {
    const num = parseInt(numQuestions);
    if (num > 0 && num <= 50) {
      setQuestions(Array(num).fill(null).map(() => ({ question: '', options: { A: '', B: '', C: '', D: '' }, correct_answer: 'A' })));
      setShowQuestions(true);
    }
  };

  const updateQuestion = (index, field, value) => {
    const updated = [...questions]; updated[index][field] = value; setQuestions(updated);
  };

  const updateOption = (qIndex, optionKey, value) => {
    const updated = [...questions]; updated[qIndex].options[optionKey] = value; setQuestions(updated);
  };

  const removeQuestion = (index) => setQuestions(questions.filter((_, i) => i !== index));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (questions.some(q => !q.question || !q.options.A || !q.options.B || !q.options.C || !q.options.D)) {
      alert('Please fill all questions and options'); return;
    }
    try {
      await staffAPI.createManualQuiz({ subjectId, title, questions });
      alert('Quiz created successfully!');
      onSuccess(); onClose();
    } catch (err) { alert('Failed to create quiz'); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: D.bg, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 32px', background: D.topbar, borderBottom: `1px solid ${D.topbarBorder}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{ fontSize: '24px' }}>✏️</span>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', color: D.text, fontWeight: '700' }}>Create Manual Quiz</h2>
            {showQuestions && <p style={{ margin: 0, fontSize: '13px', color: D.sub }}>{questions.length} questions • {title}</p>}
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'rgba(220,53,69,0.15)', color: '#e74c3c', border: '1px solid rgba(220,53,69,0.3)', borderRadius: '8px', padding: '8px 18px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
          ✕ Close
        </button>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>

        {!showQuestions ? (
          /* ── Step 1: title + count ── */
          <div style={{ maxWidth: '600px', margin: '0 auto', background: D.panel, borderRadius: '16px', padding: '36px', border: `1px solid ${D.panelBorder}` }}>
            <form onSubmit={(e) => { e.preventDefault(); generateQuestionForms(); }}>
              <div className="form-group">
                <label>Quiz Title</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} required placeholder="Enter quiz title" />
              </div>
              <div className="form-group">
                <label>Number of Questions</label>
                <input type="number" value={numQuestions} onChange={e => setNumQuestions(e.target.value)} min="1" max="50" required placeholder="Enter number of questions (1-50)" />
              </div>
              <button type="submit" className="btn-primary">Generate Question Forms</button>
            </form>
          </div>
        ) : (
          /* ── Step 2: question forms ── */
          <div style={{ maxWidth: '860px', margin: '0 auto' }}>
            <form onSubmit={handleSubmit}>
              {questions.map((q, qIndex) => (
                <div key={qIndex} style={{ background: D.qCardBg, padding: '24px', borderRadius: '12px', marginBottom: '20px', border: `1px solid ${D.qCardBorder}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h3 style={{ margin: 0, color: D.text }}>Question {qIndex + 1}</h3>
                    {questions.length > 1 && (
                      <button type="button" onClick={() => removeQuestion(qIndex)} style={{ background: '#dc3545', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}>
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Question Text</label>
                    <textarea
                      value={q.question}
                      onChange={e => updateQuestion(qIndex, 'question', e.target.value)}
                      required rows="3" placeholder="Enter your question"
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `2px solid ${D.inputBorder}`, fontSize: '14px', background: D.inputBg, color: D.inputColor, boxSizing: 'border-box' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                    {['A', 'B', 'C', 'D'].map(opt => (
                      <div key={opt} className="form-group">
                        <label>Option {opt}</label>
                        <input type="text" value={q.options[opt]} onChange={e => updateOption(qIndex, opt, e.target.value)} required placeholder={`Enter option ${opt}`} />
                      </div>
                    ))}
                  </div>

                  <div className="form-group">
                    <label>Correct Answer</label>
                    <select value={q.correct_answer} onChange={e => updateQuestion(qIndex, 'correct_answer', e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `2px solid ${D.inputBorder}`, background: D.inputBg, color: D.inputColor }}>
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                      <option value="D">D</option>
                    </select>
                  </div>
                </div>
              ))}

              <button type="submit" className="btn-primary" style={{ marginBottom: '40px' }}>
                Create Quiz ({questions.length} questions)
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default ManualQuizCreator;
