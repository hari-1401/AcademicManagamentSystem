import React, { useState, useEffect } from 'react';
import { staffAPI } from '../api';

function AssignQuizSection({ subject, dark }) {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deadlines, setDeadlines] = useState({});
  const [timeLimits, setTimeLimits] = useState({});

  const D = {
    wrap:       dark ? '#1e1b3a' : 'white',
    border:     dark ? 'rgba(255,255,255,0.1)' : '#e0e0e0',
    row:        dark ? 'rgba(255,255,255,0.06)' : '#f9f9f9',
    text:       dark ? '#f0f0ff' : '#222',
    sub:        dark ? '#c0c0e0' : '#666',
    inputBg:    dark ? 'rgba(255,255,255,0.07)' : 'white',
    inputBorder:dark ? 'rgba(255,255,255,0.14)' : '#ddd',
    inputText:  dark ? '#f0f0ff' : '#222',
  };

  useEffect(() => { loadQuizzes(); }, []);

  const loadQuizzes = async () => {
    try {
      const response = await staffAPI.getSubjectQuizzes(subject.subjectId);
      setQuizzes(response.data.quizzes);
    } catch (err) {
      console.error('Failed to load quizzes');
    }
  };

  const handleAssign = async (quizId) => {
    const deadline = deadlines[quizId];
    if (!deadline) return alert('Please set a deadline first');
    setLoading(true);
    try {
      const payload = { quizId, deadline: new Date(deadline).toISOString() };
      if (timeLimits[quizId]) payload.timeLimit = parseInt(timeLimits[quizId]);
      await staffAPI.assignQuiz(payload);
      alert('Quiz assigned! Students notified via email.');
      loadQuizzes();
    } catch (err) {
      alert('Failed to assign quiz: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const unassignedQuizzes = quizzes.filter(q => q.isApproved && !q.isAssigned);
  if (unassignedQuizzes.length === 0) return null;

  return (
    <div style={{ background: D.wrap, borderRadius: '12px', padding: '20px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', border: `1px solid ${D.border}` }}>
      <h3 style={{ marginBottom: '15px', color: D.text }}>{subject.name} ({subject.subjectId})</h3>
      <div style={{ display: 'grid', gap: '15px' }}>
        {unassignedQuizzes.map(quiz => (
          <div key={quiz.id} style={{ padding: '15px', background: D.row, borderRadius: '8px', border: `1px solid ${D.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <div style={{ fontWeight: '500', marginBottom: '4px', color: D.text }}>{quiz.title}</div>
                <div style={{ fontSize: '14px', color: D.sub }}>{quiz.totalMarks} marks • Created: {new Date(quiz.createdAt).toLocaleDateString()}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
              <input
                type="datetime-local"
                value={deadlines[quiz.id] || ''}
                onChange={e => setDeadlines({ ...deadlines, [quiz.id]: e.target.value })}
                style={{ flex: 1, padding: '9px 12px', borderRadius: '6px', border: `1px solid ${D.inputBorder}`, fontSize: '14px', background: D.inputBg, color: D.inputText }}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  type="number"
                  min="1"
                  value={timeLimits[quiz.id] || ''}
                  onChange={e => setTimeLimits({ ...timeLimits, [quiz.id]: e.target.value })}
                  placeholder="⏱ Time limit (mins) — optional"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: `1px solid ${D.inputBorder}`, fontSize: '14px', background: D.inputBg, color: D.inputText, boxSizing: 'border-box' }}
                />
              </div>
              <button
                onClick={() => handleAssign(quiz.id)}
                disabled={loading || !deadlines[quiz.id]}
                style={{ padding: '10px 20px', background: deadlines[quiz.id] ? '#28a745' : '#aaa', color: 'white', border: 'none', borderRadius: '6px', cursor: deadlines[quiz.id] ? 'pointer' : 'not-allowed', fontWeight: '500', whiteSpace: 'nowrap' }}
              >
                📤 Assign
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AssignQuizSection;
