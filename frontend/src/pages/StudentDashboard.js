import React, { useState, useEffect } from 'react';
import { studentAPI } from '../api';
import QuizFullscreen from '../components/QuizFullscreen';

function StudentDashboard({ userName, onLogout, dark, onToggleDark }) {
  const T = {
    text:    dark ? '#f0f0ff' : '#1a1a2e',
    sub:     dark ? '#c0c0e0' : '#555',
    muted:   dark ? 'rgba(255,255,255,0.45)' : '#888',
    cardFootBg: dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.95)',
    border:  dark ? 'rgba(255,255,255,0.12)' : '#e0e4ff',
    inputBg: dark ? 'rgba(255,255,255,0.07)' : '#fff',
  };
  const [activeTab, setActiveTab] = useState('subjects');
  const [subjects, setSubjects] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [caseStudies, setCaseStudies] = useState([]);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadingCaseId, setUploadingCaseId] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeTab === 'subjects') {
      loadSubjects();
    } else if (activeTab === 'quizzes') {
      loadQuizzes();
    } else if (activeTab === 'caseStudies') {
      loadCaseStudies();
    }
  }, [activeTab]);

  const loadSubjects = async () => {
    try {
      const response = await studentAPI.getMySubjects();
      setSubjects(response.data.subjects || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadQuizzes = async () => {
    try {
      const response = await studentAPI.getQuizzes();
      setQuizzes(response.data.quizzes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadCaseStudies = async () => {
    try {
      const response = await studentAPI.getCaseStudies();
      setCaseStudies(response.data.caseStudies);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && (file.name.endsWith('.docx') || file.name.endsWith('.doc'))) {
      setSelectedFile(file);
    } else {
      alert('Only Word documents (.docx, .doc) are allowed');
      e.target.value = '';
    }
  };

  const handleUploadCaseStudy = async (caseStudyId) => {
    if (!selectedFile) {
      alert('Please select a Word document');
      return;
    }

    setUploadingCaseId(caseStudyId);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await studentAPI.uploadCaseStudy(caseStudyId, formData);
      alert(`Case study submitted! Marks: ${response.data.marks}`);
      setSelectedFile(null);
      loadCaseStudies();
    } catch (err) {
      alert(err.response?.data?.detail || 'Upload failed');
    } finally {
      setUploadingCaseId(null);
    }
  };

  const openQuiz = (quizId) => {
    // Confirm before entering fullscreen
    if (window.confirm('Quiz will open in fullscreen mode. Tab switching will be tracked. Continue?')) {
      setSelectedQuiz({ id: quizId });
    }
  };

  const handleQuizComplete = (result) => {
    setSelectedQuiz(null);
    loadQuizzes();
  };

  return (
    <div className="dashboard">
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>Student Portal</h2>
          <div className="user-info">{userName}</div>
        </div>
        <ul className="nav-menu">
          <li className={`nav-item ${activeTab === 'subjects' ? 'active' : ''}`} onClick={() => setActiveTab('subjects')}>📚 My Subjects</li>
          <li className={`nav-item ${activeTab === 'quizzes' ? 'active' : ''}`} onClick={() => setActiveTab('quizzes')}>📝 My Quizzes</li>
          <li className={`nav-item ${activeTab === 'caseStudies' ? 'active' : ''}`} onClick={() => setActiveTab('caseStudies')}>📄 Case Studies</li>
          <li className="nav-item">📊 Results</li>
        </ul>
        <button className="theme-toggle" onClick={onToggleDark}>
          {dark ? '☀️ Day Mode' : '🌙 Night Mode'}
        </button>
        <button className="logout-btn" onClick={onLogout}>
          🚪 Logout
        </button>
      </div>

      <div className="main-content">
        {activeTab === 'subjects' && (
          <>
            <div className="page-header">
              <h1>My Subjects</h1>
              <p>View all your enrolled subjects</p>
            </div>
            {loading ? (
              <div className="card">Loading...</div>
            ) : subjects.length === 0 ? (
              <div className="card">No subjects enrolled yet.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', padding: '20px 0' }}>
                {subjects.map((subject) => (
                  <div 
                    key={subject.id} 
                    style={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      borderRadius: '12px',
                      padding: '0',
                      color: 'white',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                      transition: 'transform 0.2s',
                      overflow: 'hidden'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    <div style={{ padding: '80px 20px 20px 20px' }}>
                      <h3 style={{ margin: '0 0 10px 0', fontSize: '24px', fontWeight: '500' }}>{subject.name}</h3>
                      <p style={{ margin: '5px 0', opacity: '0.9', fontSize: '14px' }}>{subject.subjectId}</p>
                      <p style={{ margin: '5px 0', opacity: '0.9', fontSize: '14px' }}>{subject.className} • {subject.semester}</p>
                    </div>
                    <div style={{ background: T.cardFootBg, color: T.text, padding: '15px 20px' }}>
                      <p style={{ margin: '5px 0', fontSize: '14px', color: T.text }}><strong>👨🏫 Instructor:</strong> {subject.staffName}</p>
                      <p style={{ margin: '5px 0', fontSize: '12px', color: T.muted }}>Enrolled: {new Date(subject.enrolledAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'quizzes' && (
          <>
            <div className="page-header">
              <h1>My Quizzes</h1>
              <p>View and attempt your assigned quizzes</p>
            </div>

            {loading ? (
              <div className="card">Loading...</div>
            ) : (
              <div className="cards-grid">
                {quizzes.map((quiz) => (
                  <div key={quiz.id} className="card">
                    <div className="card-header">
                      <h3 className="card-title">{quiz.title}</h3>
                      <span className={`card-badge ${quiz.isSubmitted ? 'badge-completed' : quiz.deadlinePassed ? 'badge-overdue' : 'badge-pending'}`}>
                        {quiz.isSubmitted ? 'Completed' : quiz.deadlinePassed ? 'Overdue' : 'Pending'}
                      </span>
                    </div>
                    <div className="card-content">
                      <p>📊 Total Marks: {quiz.totalMarks}</p>
                      <p>📅 Deadline: {new Date(quiz.deadline).toLocaleString()}</p>
                      {quiz.isSubmitted && <p>✅ Score: {quiz.marks}/{quiz.totalMarks}</p>}
                    </div>
                    <div className="card-footer">
                      {!quiz.isSubmitted && quiz.canSubmit && (
                        <button className="btn btn-view" onClick={() => openQuiz(quiz.id)}>
                          Start Quiz
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedQuiz && (
              <QuizFullscreen 
                quizId={selectedQuiz.id}
                token={localStorage.getItem('token')}
                onComplete={handleQuizComplete}
              />
            )}
          </>
        )}

        {activeTab === 'caseStudies' && (
          <>
            <div className="page-header">
              <h1>Case Studies</h1>
              <p>View and submit your assigned case studies</p>
            </div>

            {loading ? (
              <div className="card">Loading...</div>
            ) : (
              <div className="cards-grid">
                {caseStudies.map((cs) => (
                  <div key={cs.id} className="card">
                    <div className="card-header">
                      <h3 className="card-title">{cs.topic}</h3>
                      <span className={`card-badge ${cs.isSubmitted ? 'badge-completed' : cs.deadlinePassed ? 'badge-overdue' : 'badge-pending'}`}>
                        {cs.isSubmitted ? 'Completed' : cs.deadlinePassed ? 'Overdue' : 'Pending'}
                      </span>
                    </div>
                    <div className="card-content">
                      <p>📅 Deadline: {new Date(cs.deadline).toLocaleString()}</p>
                      {cs.isSubmitted && <p>✅ Score: {cs.marks}/100</p>}
                    </div>
                    <div className="card-footer">
                      {!cs.isSubmitted && cs.canSubmit && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                          <input 
                            type="file" 
                            accept=".doc,.docx"
                            onChange={handleFileSelect}
                            style={{ padding: '8px', border: `1px solid ${T.border}`, borderRadius: '4px', background: T.inputBg, color: T.text }}
                          />
                          <button 
                            className="btn btn-view" 
                            onClick={() => handleUploadCaseStudy(cs.id)}
                            disabled={!selectedFile || uploadingCaseId === cs.id}
                            style={{ width: '100%' }}
                          >
                            {uploadingCaseId === cs.id ? 'Uploading...' : 'Upload Case Study'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default StudentDashboard;
