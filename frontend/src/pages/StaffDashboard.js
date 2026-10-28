import React, { useState } from 'react';
import { staffAPI } from '../api';
import ManualQuizCreator from '../components/ManualQuizCreator';
import AssignQuizSection from '../components/AssignQuizSection';
import SubjectDetailsView from '../components/SubjectDetailsView';
import ManageQuizSection from '../components/ManageQuizSection';
import ManageCaseStudySection from '../components/ManageCaseStudySection';
import ModuleCaseStudyAssigner from '../components/ModuleCaseStudyAssigner';
import AIQuizGenerator from '../components/AIQuizGenerator';

function StaffDashboard({ userName, onLogout, dark, onToggleDark }) {
  const [activeTab, setActiveTab] = useState('subjects');
  const [file, setFile] = useState(null);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [subjectDetails, setSubjectDetails] = useState(null);
  const [showAddStudentForm, setShowAddStudentForm] = useState(false);
  const [newStudent, setNewStudent] = useState({ email: '', name: '', regNo: '' });
  const [showManualQuiz, setShowManualQuiz] = useState(false);
  const [showAIQuiz, setShowAIQuiz] = useState(false);
  const [numQuestionsInput, setNumQuestionsInput] = useState('');
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [availableClasses, setAvailableClasses] = useState([]);

  const userEmail = localStorage.getItem('userEmail') || 'staff@example.com';
  const userRole = localStorage.getItem('role') || 'staff';

  React.useEffect(() => {
    if (activeTab === 'subjects') {
      fetchSubjects();
    }
    if (activeTab === 'syllabus') {
      fetchSubjects();
      staffAPI.getAvailableClasses().then(res => setAvailableClasses(res.data.classes || [])).catch(() => {});
    }
  }, [activeTab]);

  const fetchSubjects = async () => {
    try {
      const response = await staffAPI.getMySubjects();
      setSubjects(response.data.subjects || []);
    } catch (err) {
      console.error('Failed to fetch subjects');
    }
  };

  const viewSubjectDetails = async (subjectId) => {
    try {
      const response = await staffAPI.getSubjectDetails(subjectId);
      setSubjectDetails(response.data);
      setSelectedSubject(subjectId);
    } catch (err) {
      alert('Failed to load subject details');
    }
  };

  const handleAddStudentSubmit = async (e) => {
    e.preventDefault();
    try {
      await staffAPI.addStudentToSubject({
        subjectId: subjectDetails.subject.subjectId,
        ...newStudent
      });
      alert('Student added successfully');
      setShowAddStudentForm(false);
      setNewStudent({ email: '', name: '', regNo: '' });
      viewSubjectDetails(selectedSubject);
    } catch (err) {
      alert('Failed to add student: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleUpdateMarks = async (submissionId, submissionType, currentMarks) => {
    const newMarks = prompt(`Enter new marks (current: ${currentMarks}):`, currentMarks);
    if (newMarks === null) return;
    
    try {
      await staffAPI.updateMarks({
        submissionId,
        submissionType,
        newMarks: parseFloat(newMarks)
      });
      alert('Marks updated successfully');
      viewSubjectDetails(selectedSubject);
    } catch (err) {
      alert('Failed to update marks');
    }
  };

  const handleDeleteSubject = async (subjectId) => {
    if (!window.confirm('Are you sure you want to delete this subject? This will delete all related quizzes and case studies.')) {
      return;
    }
    try {
      await staffAPI.deleteSubject(subjectId);
      alert('Subject deleted successfully');
      fetchSubjects();
    } catch (err) {
      alert('Failed to delete subject');
    }
  };

  const handleSyllabusUpload = async (e) => {
    e.preventDefault();
    
    if (!file) {
      alert('Please select a PDF file');
      return;
    }
    
    if (!formData.subjectId || !formData.subjectName || !formData.className || !formData.semester || !formData.totalStudents) {
      alert('Please fill all fields');
      return;
    }
    
    setLoading(true);
    const data = new FormData();
    data.append('file', file);
    data.append('subjectId', formData.subjectId);
    data.append('subjectName', formData.subjectName);
    data.append('className', formData.className);
    data.append('semester', formData.semester);
    data.append('totalStudents', formData.totalStudents);

    try {
      await staffAPI.uploadSyllabus(data);
      alert('Syllabus uploaded successfully');
      setFile(null);
      setFormData({});
      fetchSubjects();
    } catch (err) {
      console.error(err);
      alert('Upload failed: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const D = {
    cardBg:      dark ? '#1e1b3a' : 'white',
    cardBorder:  dark ? 'rgba(255,255,255,0.1)' : '#e0e0e0',
    inputBg:     dark ? 'rgba(255,255,255,0.07)' : 'white',
    inputBorder: dark ? 'rgba(255,255,255,0.14)' : '#ccc',
    text:        dark ? '#f0f0ff' : '#2c3e50',
    sub:         dark ? '#c0c0e0' : '#333',
    muted:       dark ? 'rgba(255,255,255,0.4)' : '#999',
    hoverBg:     dark ? 'rgba(255,255,255,0.08)' : '#f0f0f0',
    subjectFoot: dark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.95)',
    selectBorder:dark ? 'rgba(255,255,255,0.14)' : '#e0e0e0',
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: dark ? 'linear-gradient(135deg,#0f0c29 0%,#302b63 50%,#24243e 100%)' : 'linear-gradient(135deg,#f0f2ff 0%,#faf5ff 50%,#f0f4ff 100%)' }}>
      {/* Sidebar */}
      <div style={{
        width: '260px',
        background: dark ? '#1a1730' : '#2c3e50',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '2px 0 10px rgba(0,0,0,0.1)'
      }}>
        {/* Logo/Header */}
        <div style={{ padding: '30px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{ fontSize: '28px' }}>🎓</div>
            <h2 style={{ margin: 0, color: 'white', fontSize: '20px', fontWeight: '600' }}>Staff Portal</h2>
          </div>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: '13px', paddingLeft: '40px' }}>{userName}</p>
        </div>

        {/* Navigation Menu */}
        <div style={{ flex: 1, padding: '20px 0', overflowY: 'auto' }}>
          {[
            { id: 'subjects', icon: '📚', label: 'My Subjects' },
            { id: 'syllabus', icon: '📄', label: 'Upload Syllabus' },
            { id: 'quiz', icon: '📝', label: 'Create Quiz' },
            { id: 'manage-quiz', icon: '🗑️', label: 'Manage Quizzes' },
            { id: 'assign', icon: '📤', label: 'Assign Quiz' },
            { id: 'case', icon: '📚', label: 'Create Case Studies' },
            { id: 'manage-case', icon: '🗑️', label: 'Manage Case Studies' },
            { id: 'submissions', icon: '📊', label: 'Submissions' }
          ].map(tab => (
            <div
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '14px 20px',
                margin: '4px 10px',
                borderRadius: '8px',
                background: activeTab === tab.id ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: activeTab === tab.id ? 'white' : 'rgba(255,255,255,0.7)',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: activeTab === tab.id ? '600' : '500',
                transition: 'all 0.3s',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                borderLeft: activeTab === tab.id ? '3px solid #3498db' : '3px solid transparent'
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  e.currentTarget.style.color = 'white';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
                }
              }}
            >
              <span style={{ fontSize: '18px' }}>{tab.icon}</span>
              <span>{tab.label}</span>
            </div>
          ))}
        </div>

        {/* Theme + Logout */}
        <div style={{ padding: '16px 20px 20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <button
            onClick={onToggleDark}
            style={{
              width: '100%',
              padding: '11px',
              marginBottom: '10px',
              background: 'rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.85)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.25s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.14)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
          >
            {dark ? '☀️ Day Mode' : '🌙 Night Mode'}
          </button>
          <button
            onClick={onLogout}
            style={{
              width: '100%',
              padding: '12px',
              background: 'rgba(231, 76, 60, 0.2)',
              color: '#e74c3c',
              border: '1px solid rgba(231, 76, 60, 0.3)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(231, 76, 60, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(231, 76, 60, 0.2)';
            }}
          >
            <span>🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Top Bar */}
        <div style={{
          background: dark ? '#1a1730' : 'white',
          padding: '20px 40px',
          borderBottom: dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e0e0e0',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h1 style={{ margin: 0, fontSize: '24px', color: dark ? '#f0f0ff' : '#2c3e50', fontWeight: '600' }}>
            {[
              { id: 'subjects', label: 'My Subjects' },
              { id: 'syllabus', label: 'Upload Syllabus' },
              { id: 'quiz', label: 'Create Quiz' },
              { id: 'manage-quiz', label: 'Manage Quizzes' },
              { id: 'assign', label: 'Assign Quiz' },
              { id: 'case', label: 'Create Case Studies' },
              { id: 'manage-case', label: 'Manage Case Studies' },
              { id: 'submissions', label: 'Submissions' }
            ].find(t => t.id === activeTab)?.label || 'Dashboard'}
          </h1>
          <div style={{ position: 'relative' }}>
            <div 
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '8px 12px', borderRadius: '8px', transition: 'background 0.3s' }}
              onMouseEnter={(e) => e.currentTarget.style.background = D.hoverBg}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ fontSize: '20px' }}>👤</span>
              <span style={{ fontSize: '15px', color: D.text, fontWeight: '500' }}>{userName}</span>
              <span style={{ fontSize: '12px', color: D.muted }}>▼</span>
            </div>

            {/* Profile Dropdown */}
            {showProfileDropdown && (
              <>
                <div 
                  style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }}
                  onClick={() => setShowProfileDropdown(false)}
                />
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '10px',
                  background: D.cardBg,
                  borderRadius: '12px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                  minWidth: '320px',
                  zIndex: 1000,
                  overflow: 'hidden',
                  border: `1px solid ${D.cardBorder}`
                }}>
                  {/* Profile Header */}
                  <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '25px 20px', color: 'white', textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', marginBottom: '10px' }}>👨‍🏫</div>
                    <h3 style={{ margin: '0 0 5px 0', fontSize: '18px', fontWeight: '600' }}>{userName}</h3>
                    <div style={{ fontSize: '13px', opacity: 0.9, textTransform: 'capitalize' }}>{userRole}</div>
                  </div>

                  {/* Profile Details */}
                  <div style={{ padding: '20px' }}>
                    <div style={{ marginBottom: '15px' }}>
                      <div style={{ fontSize: '11px', color: D.muted, textTransform: 'uppercase', fontWeight: '600', marginBottom: '5px' }}>Full Name</div>
                      <div style={{ fontSize: '14px', color: D.sub, fontWeight: '500' }}>{userName}</div>
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                      <div style={{ fontSize: '11px', color: D.muted, textTransform: 'uppercase', fontWeight: '600', marginBottom: '5px' }}>Email Address</div>
                      <div style={{ fontSize: '14px', color: D.sub, fontWeight: '500', wordBreak: 'break-all' }}>{userEmail}</div>
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                      <div style={{ fontSize: '11px', color: D.muted, textTransform: 'uppercase', fontWeight: '600', marginBottom: '5px' }}>Department</div>
                      <div style={{ fontSize: '14px', color: D.sub, fontWeight: '500' }}>Academic Staff</div>
                    </div>

                    <div style={{ marginBottom: '0' }}>
                      <div style={{ fontSize: '11px', color: D.muted, textTransform: 'uppercase', fontWeight: '600', marginBottom: '5px' }}>Role</div>
                      <div style={{ display: 'inline-block', padding: '4px 12px', background: '#667eea', color: 'white', borderRadius: '12px', fontSize: '12px', fontWeight: '600', textTransform: 'capitalize' }}>{userRole}</div>
                    </div>
                  </div>

                  {/* Logout Button */}
                  <div style={{ borderTop: `1px solid ${D.cardBorder}`, padding: '15px 20px', background: D.cardBg }}>
                    <button
                      onClick={() => {
                        setShowProfileDropdown(false);
                        onLogout();
                      }}
                      style={{
                        width: '100%',
                        padding: '12px',
                        background: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        transition: 'background 0.3s'
                      }}
                      onMouseEnter={(e) => e.target.style.background = '#c82333'}
                      onMouseLeave={(e) => e.target.style.background = '#dc3545'}
                    >
                      <span>🚺</span>
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div style={{ padding: '30px 40px', background: dark ? 'transparent' : 'transparent' }}>
        {activeTab === 'subjects' && (
          <>
            {selectedSubject && (
              <button onClick={() => { setSelectedSubject(null); setSubjectDetails(null); }} style={{ marginBottom: '20px', padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                ← Back to Subjects
              </button>
            )}
            
            {!selectedSubject ? (
              subjects.length === 0 ? (
                <div className="card">
                  <p>No subjects created yet. Upload a syllabus to create a subject.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px', padding: '20px 0' }}>
                  {subjects.map((subject) => (
                    <div 
                      key={subject.id} 
                      onClick={() => viewSubjectDetails(subject.id)}
                      style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        borderRadius: '12px',
                        padding: '0',
                        color: 'white',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                        cursor: 'pointer',
                        transition: 'transform 0.2s',
                        overflow: 'hidden',
                        minHeight: '220px'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                      <div style={{ padding: '60px 20px 20px 20px', position: 'relative', minHeight: '140px' }}>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteSubject(subject.id); }}
                          style={{ 
                            position: 'absolute',
                            top: '10px',
                            right: '10px',
                            background: 'rgba(255,255,255,0.2)', 
                            color: 'white', 
                            border: 'none', 
                            padding: '8px 12px', 
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px'
                          }}
                        >
                          🗑️
                        </button>
                        <h3 style={{ margin: '0 0 10px 0', fontSize: '22px', fontWeight: '500', wordBreak: 'break-word' }}>{subject.name || 'Unnamed Subject'}</h3>
                        <p style={{ margin: '5px 0', opacity: '0.9', fontSize: '13px' }}>{subject.subjectId || 'N/A'}</p>
                        <p style={{ margin: '5px 0', opacity: '0.9', fontSize: '13px' }}>{subject.className || 'N/A'} • {subject.semester || 'N/A'}</p>
                      </div>
                      <div style={{ background: D.subjectFoot, color: D.sub, padding: '15px 20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <span style={{ fontSize: '14px', fontWeight: '500' }}>👥 Students</span>
                          <span style={{ fontSize: '16px', fontWeight: 'bold' }}>{subject.addedStudents || 0} / {subject.totalStudents || 0}</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(subject.enrollmentLink);
                            alert('Enrollment link copied!');
                          }}
                          style={{
                            width: '100%',
                            padding: '10px',
                            background: '#667eea',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '500'
                          }}
                        >
                          📋 Copy Enrollment Link
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : subjectDetails ? (
              <SubjectDetailsView 
                subjectDetails={subjectDetails}
                showAddStudentForm={showAddStudentForm}
                setShowAddStudentForm={setShowAddStudentForm}
                newStudent={newStudent}
                setNewStudent={setNewStudent}
                handleAddStudentSubmit={handleAddStudentSubmit}
                handleUpdateMarks={handleUpdateMarks}
                selectedSubject={selectedSubject}
                viewSubjectDetails={viewSubjectDetails}
                dark={dark}
              />
            ) : (
              <div className="card">Loading...</div>
            )}
          </>
        )}

        {activeTab === 'syllabus' && (
          <>
            <div className="card">
              <form onSubmit={handleSyllabusUpload}>
                <div className="form-group">
                  <label>Subject ID</label>
                  <input
                    type="text"
                    value={formData.subjectId || ''}
                    onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Subject Name</label>
                  <input
                    type="text"
                    value={formData.subjectName || ''}
                    onChange={(e) => setFormData({ ...formData, subjectName: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Class Name</label>
                  <select
                    value={formData.className || ''}
                    onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                    required
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: `1px solid ${D.inputBorder}`, fontSize: '14px', background: D.inputBg, color: D.text }}
                  >
                    <option value="">-- Select Class --</option>
                    {availableClasses.map(cls => (
                      <option key={cls.className} value={cls.className}>
                        {cls.className} ({cls.department} • {cls.semester} • {cls.totalStudents} students)
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Semester</label>
                  <input
                    type="text"
                    value={formData.semester || ''}
                    onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                    placeholder="e.g., 5th Semester, Fall 2024"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Total Students</label>
                  <input
                    type="number"
                    value={formData.totalStudents || ''}
                    onChange={(e) => setFormData({ ...formData, totalStudents: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Syllabus PDF</label>
                  <div className="upload-area">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setFile(e.target.files[0])}
                      id="file-upload"
                    />
                    <label htmlFor="file-upload">
                      {file ? file.name : '📎 Click to upload PDF'}
                    </label>
                  </div>
                </div>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Uploading...' : 'Upload Syllabus'}
                </button>
              </form>
            </div>
          </>
        )}

        {activeTab === 'quiz' && (
          <>
            <div className="card">
              <div className="form-group">
                <label>Select Subject</label>
                <select
                  value={formData.selectedSubjectId || ''}
                  onChange={(e) => {
                    const subject = subjects.find(s => s.id === e.target.value);
                    setFormData({ ...formData, selectedSubjectId: e.target.value, subjectId: subject?.subjectId });
                  }}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: `2px solid ${D.selectBorder}`, fontSize: '16px', background: D.inputBg, color: D.text }}
                  required
                >
                  <option value="">-- Select Subject --</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.subjectId})</option>
                  ))}
                </select>
              </div>

              {formData.selectedSubjectId && (
                <>
                  <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
                    <button
                      type="button"
                      onClick={() => setShowManualQuiz(true)}
                      style={{ flex: 1, padding: '15px', background: '#28a745', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', fontWeight: '500' }}
                    >
                      ✏️ Create Manual Quiz
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAIQuiz(true)}
                      style={{ flex: 1, padding: '15px', background: '#667eea', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', fontWeight: '500' }}
                    >
                      🤖 Generate with AI
                    </button>
                  </div>
                </>
              )}
            </div>
            {showManualQuiz && formData.subjectId && (
              <ManualQuizCreator
                subjectId={formData.subjectId}
                dark={dark}
                onClose={() => setShowManualQuiz(false)}
                onSuccess={() => { alert('Quiz created!'); setShowManualQuiz(false); }}
              />
            )}
            {showAIQuiz && formData.subjectId && (
              <AIQuizGenerator
                subjectId={formData.subjectId}
                dark={dark}
                onClose={() => setShowAIQuiz(false)}
                onSuccess={() => setShowAIQuiz(false)}
              />
            )}
          </>
        )}

{activeTab === 'submissions' && (
          <>
            <div className="card">
              <p>Enter Quiz ID to view submissions</p>
            </div>
          </>
        )}

        {activeTab === 'assign' && (
          <>
            {subjects.map(subject => (
              <AssignQuizSection key={subject.id} subject={subject} dark={dark} />
            ))}
          </>
        )}

        {activeTab === 'manage-quiz' && (
          <>
            {subjects.map(subject => (
              <ManageQuizSection key={subject.id} subject={subject} dark={dark} />
            ))}
          </>
        )}

        {activeTab === 'case' && (
          <>
            <div className="card">
              <div className="form-group">
                <label>Select Subject</label>
                <select
                  value={formData.caseStudySubjectId || ''}
                  onChange={(e) => setFormData({ ...formData, caseStudySubjectId: e.target.value })}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: `2px solid ${D.selectBorder}`, fontSize: '16px', background: D.inputBg, color: D.text }}
                >
                  <option value="">-- Select Subject --</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.subjectId}>{s.name} ({s.subjectId})</option>
                  ))}
                </select>
              </div>
            </div>
            {formData.caseStudySubjectId && (
              <ModuleCaseStudyAssigner 
                subjectId={formData.caseStudySubjectId}
                onSuccess={(result) => {
                  alert(`Successfully assigned ${result.totalStudents} case studies!`);
                }}
              />
            )}
          </>
        )}

        {activeTab === 'manage-case' && (
          <>
            {subjects.length === 0 ? (
              <div className="card">No subjects found. Create a subject first.</div>
            ) : (
              subjects.map(subject => (
                <ManageCaseStudySection key={subject.id} subject={subject} dark={dark} />
              ))
            )}
          </>
        )}
        </div>
      </div>
    </div>
  );
}

export default StaffDashboard;
