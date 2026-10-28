import React, { useState, useEffect } from 'react';
import { staffAPI } from '../api';
import QuizAnalyticsChart from './QuizAnalyticsChart';

function ManageQuizSection({ subject, dark }) {
  const [quizzes, setQuizzes] = useState([]);
  const [editingQuizId, setEditingQuizId] = useState(null);
  const [editMarks, setEditMarks] = useState('');
  const [analyticsQuiz, setAnalyticsQuiz] = useState(null);

  const D = {
    wrap:       dark ? '#1e1b3a' : 'white',
    border:     dark ? 'rgba(255,255,255,0.1)' : '#e0e0e0',
    row:        dark ? 'rgba(255,255,255,0.06)' : '#f9f9f9',
    rowBorder:  dark ? 'rgba(255,255,255,0.08)' : '#ddd',
    text:       dark ? '#f0f0ff' : '#222',
    sub:        dark ? '#c0c0e0' : '#666',
    inputBg:    dark ? 'rgba(255,255,255,0.07)' : 'white',
    inputBorder:dark ? 'rgba(255,255,255,0.14)' : '#ddd',
    inputText:  dark ? '#f0f0ff' : '#222',
  };

  useEffect(() => {
    loadQuizzes();
  }, []);

  const loadQuizzes = async () => {
    try {
      const response = await staffAPI.getSubjectQuizzes(subject.subjectId);
      setQuizzes(response.data.quizzes);
    } catch (err) {
      console.error('Failed to load quizzes');
    }
  };

  const handleDelete = async (quizId) => {
    if (!window.confirm('Delete this quiz? This will remove all submissions.')) return;
    try {
      await staffAPI.deleteQuiz(quizId);
      alert('Quiz deleted successfully');
      loadQuizzes();
    } catch (err) {
      alert('Failed to delete quiz');
    }
  };

  const handleUpdateMarks = async (quizId) => {
    if (!editMarks) return;
    try {
      await staffAPI.updateQuizMarks({ quizId, totalMarks: parseInt(editMarks) });
      alert('Quiz marks updated successfully');
      setEditingQuizId(null);
      setEditMarks('');
      loadQuizzes();
    } catch (err) {
      alert('Failed to update marks');
    }
  };

if (quizzes.length === 0) return null;

  return (
    <div style={{ background: D.wrap, borderRadius: '12px', padding: '20px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', border: `1px solid ${D.border}` }}>
      {analyticsQuiz && <QuizAnalyticsChart quiz={analyticsQuiz} onClose={() => setAnalyticsQuiz(null)} />}
      <h3 style={{ marginBottom: '15px', color: D.text }}>{subject.name} ({subject.subjectId})</h3>
      <div style={{ display: 'grid', gap: '15px' }}>
        {quizzes.map(quiz => (
          <div key={quiz.id} style={{ padding: '15px', background: D.row, borderRadius: '8px', border: `1px solid ${D.rowBorder}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: editingQuizId === quiz.id ? '15px' : '0' }}>
              <div>
                <div style={{ fontWeight: '500', marginBottom: '5px', color: D.text }}>{quiz.title}</div>
                <div style={{ fontSize: '14px', color: D.sub }}>
                  {quiz.totalMarks} marks • {quiz.isAssigned ? `✅ Assigned (${new Date(quiz.deadline).toLocaleDateString()})` : '⏳ Not Assigned'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                {quiz.isAssigned && (
                  <button
                    onClick={() => setAnalyticsQuiz(quiz)}
                    style={{ padding: '10px 20px', background: '#4361ee', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}
                  >
                    📊 Analytics
                  </button>
                )}
                {!quiz.isAssigned && (
                  <button
                    onClick={() => { setEditingQuizId(quiz.id); setEditMarks(quiz.totalMarks); }}
                    style={{ padding: '10px 20px', background: '#17a2b8', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}
                  >
                    ✏️ Edit Marks
                  </button>
                )}
                <button
                  onClick={() => handleDelete(quiz.id)}
                  style={{ padding: '10px 20px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
            {editingQuizId === quiz.id && (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', paddingTop: '15px', borderTop: `1px solid ${D.rowBorder}` }}>
                <input
                  type="number"
                  value={editMarks}
                  onChange={(e) => setEditMarks(e.target.value)}
                  placeholder="Enter total marks"
                  style={{ flex: 1, padding: '10px', borderRadius: '6px', border: `1px solid ${D.inputBorder}`, fontSize: '14px', background: D.inputBg, color: D.inputText }}
                />
                <button
                  onClick={() => handleUpdateMarks(quiz.id)}
                  style={{ padding: '10px 20px', background: '#28a745', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}
                >
                  Save
                </button>
                <button
                  onClick={() => { setEditingQuizId(null); setEditMarks(''); }}
                  style={{ padding: '10px 20px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default ManageQuizSection;
