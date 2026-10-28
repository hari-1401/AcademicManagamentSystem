import React, { useState, useEffect } from 'react';
import { staffAPI } from '../api';

function QuizAssigner({ onClose }) {
  const [quizzes, setQuizzes] = useState([]);
  const [selectedQuiz, setSelectedQuiz] = useState('');
  const [deadline, setDeadline] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadQuizzes();
  }, []);

  const loadQuizzes = async () => {
    try {
      const response = await staffAPI.getMySubjects();
      // Get all quizzes from all subjects
      const allQuizzes = [];
      for (const subject of response.data.subjects) {
        const quizzesResponse = await staffAPI.getSubjectQuizzes(subject.subjectId);
        allQuizzes.push(...quizzesResponse.data.quizzes);
      }
      setQuizzes(allQuizzes.filter(q => !q.isAssigned));
    } catch (err) {
      console.error('Failed to load quizzes');
    }
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await staffAPI.assignQuiz({ quizId: selectedQuiz, deadline: new Date(deadline) });
      alert('Quiz assigned successfully! Students have been notified via email.');
      onClose();
    } catch (err) {
      alert('Failed to assign quiz');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2>Assign Quiz</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleAssign}>
          <div className="form-group">
            <label>Select Quiz</label>
            <select
              value={selectedQuiz}
              onChange={(e) => setSelectedQuiz(e.target.value)}
              required
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '2px solid #e0e0e0' }}
            >
              <option value="">-- Select Quiz --</option>
              {quizzes.map(q => (
                <option key={q.id} value={q.id}>{q.title} ({q.totalMarks} marks)</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Deadline</label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Assigning...' : 'Assign Quiz & Notify Students'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default QuizAssigner;
