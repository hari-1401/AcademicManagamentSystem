import React, { useState, useEffect } from 'react';
import { staffAPI } from '../api';
import { generateMarksPDF } from '../utils/pdfGenerator';
import AddClassToSubject from './AddClassToSubject';

function SubjectDetailsView({ subjectDetails, showAddStudentForm, setShowAddStudentForm, newStudent, setNewStudent, handleAddStudentSubmit, handleUpdateMarks, selectedSubject, viewSubjectDetails, dark }) {
  const [quizzes, setQuizzes] = useState([]);
  const [caseStudyBatches, setCaseStudyBatches] = useState([]);
  const [showAssignQuiz, setShowAssignQuiz] = useState(false);
  const [selectedQuizId, setSelectedQuizId] = useState('');
  const [deadline, setDeadline] = useState('');
  const [timeLimit, setTimeLimit] = useState('');
  const [showAssignCaseStudy, setShowAssignCaseStudy] = useState(false);
  const [selectedBatchName, setSelectedBatchName] = useState('');
  const [caseStudyDeadline, setCaseStudyDeadline] = useState('');
  const [caseStudyType, setCaseStudyType] = useState('typed');
  const [minPages, setMinPages] = useState(5);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddClass, setShowAddClass] = useState(false);
  const [caseModal, setCaseModal] = useState(null);
  const [previewModal, setPreviewModal] = useState(null); // { studentName, topic, text, blobUrl, isPdf }

  const D = {
    wrap:        dark ? '#1e1b3a' : 'white',
    border:      dark ? 'rgba(255,255,255,0.1)' : '#e0e0e0',
    text:        dark ? '#f0f0ff' : '#222',
    sub:         dark ? '#c0c0e0' : '#666',
    muted:       dark ? 'rgba(255,255,255,0.35)' : '#999',
    label:       dark ? '#d0d0f0' : '#444',
    // panels
    panelBg:     dark ? 'rgba(255,255,255,0.05)' : '#f8f9fa',
    panelBorder: dark ? 'rgba(255,255,255,0.08)' : '#ddd',
    warnBg:      dark ? 'rgba(255,193,7,0.1)' : '#fff3cd',
    warnText:    dark ? '#ffd54f' : '#856404',
    // inputs
    inputBg:     dark ? 'rgba(255,255,255,0.07)' : 'white',
    inputBorder: dark ? 'rgba(255,255,255,0.14)' : '#ddd',
    inputText:   dark ? '#f0f0ff' : '#222',
    // student card body
    cardBg:      dark ? '#1a1730' : 'white',
    cardBorder:  dark ? 'rgba(255,255,255,0.1)' : '#e0e0e0',
    // progress rows inside student card
    rowBg:       dark ? 'rgba(255,255,255,0.06)' : '#f8f9fa',
    rowBorder:   dark ? 'rgba(255,255,255,0.08)' : '#e9ecef',
    rowText:     dark ? '#f0f0ff' : '#333',
    // quiz list row inside assign panel
    quizRowBg:   dark ? 'rgba(255,255,255,0.05)' : 'white',
  };

  useEffect(() => { loadQuizzes(); loadCaseStudyBatches(); }, []);

  const loadQuizzes = async () => {
    try {
      const r = await staffAPI.getSubjectQuizzes(subjectDetails.subject.subjectId);
      setQuizzes(r.data.quizzes);
    } catch (err) { console.error('Failed to load quizzes'); }
  };

  const loadCaseStudyBatches = async () => {
    try {
      const r = await staffAPI.getSubjectCaseStudies(subjectDetails.subject.subjectId);
      setCaseStudyBatches(r.data.batches);
    } catch (err) { console.error('Failed to load case studies'); }
  };

  const handleAllowRetake = async (submissionId, studentName, quizTitle) => {
    if (!window.confirm(`Allow ${studentName} to retake "${quizTitle}"? This will delete their current submission.`)) return;
    try {
      await staffAPI.allowRetake(submissionId);
      alert('Retake allowed! Student has been notified via email.');
      viewSubjectDetails(selectedSubject);
    } catch (err) { alert('Failed to allow retake: ' + (err.response?.data?.detail || err.message)); }
  };

  const handleAssignQuiz = async (e) => {
    e.preventDefault();
    try {
      const assignData = { quizId: selectedQuizId, deadline: new Date(deadline) };
      if (timeLimit) assignData.timeLimit = parseInt(timeLimit);
      await staffAPI.assignQuiz(assignData);
      alert('Quiz assigned! Students notified via email.');
      setShowAssignQuiz(false); setSelectedQuizId(''); setDeadline(''); setTimeLimit('');
      viewSubjectDetails(selectedSubject);
    } catch (err) { alert('Failed to assign quiz'); }
  };

  const handleDeleteQuiz = async (quizId) => {
    if (!window.confirm('Delete this quiz? This will remove all submissions.')) return;
    try { await staffAPI.deleteQuiz(quizId); alert('Quiz deleted successfully'); loadQuizzes(); }
    catch (err) { alert('Failed to delete quiz'); }
  };

  const handleDeleteCaseStudyBatch = async (batchName) => {
    if (!window.confirm(`Delete batch "${batchName}"?`)) return;
    try { await staffAPI.deleteCaseStudyBatch(subjectDetails.subject.subjectId, batchName); alert('Batch deleted'); loadCaseStudyBatches(); }
    catch (err) { alert('Failed to delete batch'); }
  };

  const handleDownloadPDF = async () => {
    const staffName = localStorage.getItem('userName') || 'Staff Name';
    const staffEmail = localStorage.getItem('userEmail') || '';
    generateMarksPDF({ subject: subjectDetails.subject, staff: { name: staffName, id: staffEmail }, quizzes: quizzes.filter(q => q.isAssigned), students: subjectDetails.students, caseStudies: [] }, 'complete');
  };

  const handleDeleteStudent = async (studentId) => {
    if (!window.confirm('Remove this student from the subject?')) return;
    try { await staffAPI.removeStudentFromSubject(subjectDetails.subject.subjectId, studentId); alert('Student removed'); viewSubjectDetails(selectedSubject); }
    catch (err) { alert('Failed to remove student'); }
  };

  const handleAssignCaseStudy = async (e) => {
    e.preventDefault();
    if (!selectedBatchName) { alert('Please select a batch'); return; }
    try {
      await staffAPI.assignCaseStudy({ subjectId: subjectDetails.subject.subjectId, batchName: selectedBatchName, deadline: new Date(caseStudyDeadline), caseStudyType, minPages: parseInt(minPages) });
      alert('Case studies assigned! Students notified via email.');
      setShowAssignCaseStudy(false); setCaseStudyDeadline(''); setSelectedBatchName('');
      viewSubjectDetails(selectedSubject);
    } catch (err) { alert('Failed to assign case studies: ' + (err.response?.data?.detail || err.message)); }
  };

  const filteredStudents = subjectDetails.students.filter(s => {
    const q = searchQuery.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.regNo.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
  });

  const inp = { width: '100%', padding: '10px', borderRadius: '6px', border: `1px solid ${D.inputBorder}`, background: D.inputBg, color: D.inputText, fontSize: '14px', boxSizing: 'border-box' };

  const openPreview = async (cs) => {
    setPreviewModal({ loading: true, studentName: '', topic: cs.topic, text: '', blobUrl: null, isPdf: false });
    try {
      const token = localStorage.getItem('token');
      const detailRes = await staffAPI.getCaseSubmission(cs.caseStudyId);
      const { extractedText, studentName } = detailRes.data;
      const fileRes = await fetch(`http://localhost:8000/staff/case-submission-file/${cs.caseStudyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!fileRes.ok) throw new Error('File not found');
      const contentType = fileRes.headers.get('content-type') || '';
      const isPdf = contentType.includes('pdf');
      let blobUrl = null;
      if (isPdf) {
        const blob = await fileRes.blob();
        blobUrl = URL.createObjectURL(blob);
      }
      setPreviewModal({ loading: false, studentName, topic: cs.topic, text: extractedText, blobUrl, isPdf });
    } catch (err) {
      alert('Failed to load preview: ' + err.message);
      setPreviewModal(null);
    }
  };

  const closePreview = () => {
    if (previewModal?.blobUrl) URL.revokeObjectURL(previewModal.blobUrl);
    setPreviewModal(null);
  };

  const openCaseModal = async (type, caseStudyId) => {
    setCaseModal({ type, loading: true, data: null });
    try {
      let res;
      if (type === 'ai') res = await staffAPI.runAICorrection(caseStudyId);
      else res = await staffAPI.runPlagiarism(caseStudyId);
      setCaseModal({ type, loading: false, data: res.data });
    } catch (err) {
      alert('Failed: ' + (err.response?.data?.detail || err.message));
      setCaseModal(null);
    }
  };

  return (
    <div style={{ background: D.wrap, borderRadius: '8px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.15)', border: `1px solid ${D.border}` }}>

      {/* Document Preview Modal */}
      {previewModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          onClick={closePreview}>
          <div style={{ background: 'white', borderRadius: '12px', width: '100%', maxWidth: '860px', height: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}>

            {/* Modal Header */}
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div>
                <div style={{ fontWeight: '700', fontSize: '16px', color: '#2c3e50' }}>📄 {previewModal.topic}</div>
                {previewModal.studentName && <div style={{ fontSize: '13px', color: '#666', marginTop: '2px' }}>Submitted by: {previewModal.studentName}</div>}
              </div>
              <button onClick={closePreview} style={{ background: '#f0f0f0', border: 'none', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontSize: '16px', color: '#333' }}>✕ Close</button>
            </div>

            {/* Modal Body */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
              {previewModal.loading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#666', fontSize: '16px' }}>⏳ Loading preview...</div>
              ) : previewModal.isPdf && previewModal.blobUrl ? (
                <iframe src={previewModal.blobUrl} title="Case Study PDF" style={{ width: '100%', height: '100%', border: 'none' }} />
              ) : (
                <div style={{ height: '100%', overflowY: 'auto', padding: '30px 40px' }}>
                  {previewModal.text ? (
                    <div style={{ fontFamily: 'Georgia, serif', fontSize: '15px', lineHeight: '1.9', color: '#2c3e50', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {previewModal.text}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', color: '#999', marginTop: '60px' }}>No text content available for preview.</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Case Study Modal */}
      {caseModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          onClick={() => setCaseModal(null)}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '30px', maxWidth: '600px', width: '100%', maxHeight: '80vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: '#2c3e50' }}>
                {caseModal.type === 'submission' ? '📄 Submission Details' : caseModal.type === 'ai' ? '🤖 AI Correction' : '🔍 Plagiarism Report'}
              </h3>
              <button onClick={() => setCaseModal(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#666' }}>✕</button>
            </div>

            {caseModal.loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>⏳ Processing...</div>
            ) : caseModal.type === 'submission' && caseModal.data ? (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                  {[['Student', caseModal.data.studentName], ['Marks', `${Math.round(caseModal.data.marks ?? 0)}/100`],
                    ['Plagiarism', `${caseModal.data.plagiarismScore?.toFixed(1) ?? 0}%`], ['Late', caseModal.data.isLate ? 'Yes' : 'No'],
                    ['Submitted', new Date(caseModal.data.submittedAt).toLocaleString()]].map(([k, v]) => (
                    <div key={k} style={{ background: '#f8f9fa', padding: '10px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '11px', color: '#999', marginBottom: '4px', textTransform: 'uppercase' }}>{k}</div>
                      <div style={{ fontWeight: '600', color: '#333' }}>{v}</div>
                    </div>
                  ))}
                </div>
                {caseModal.data.evaluation && (
                  <div style={{ background: '#f0f4ff', padding: '15px', borderRadius: '8px' }}>
                    <h4 style={{ margin: '0 0 10px', color: '#333' }}>AI Evaluation</h4>
                    {[['Relevance', caseModal.data.evaluation.relevance_score], ['Content Depth', caseModal.data.evaluation.content_depth_score],
                      ['Structure', caseModal.data.evaluation.structure_score], ['Clarity', caseModal.data.evaluation.clarity_score]].map(([k, v]) => (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                        <span style={{ color: '#555' }}>{k}</span><span style={{ fontWeight: '600' }}>{v}</span>
                      </div>
                    ))}
                    <div style={{ marginTop: '12px', padding: '10px', background: 'white', borderRadius: '6px', fontSize: '13px', color: '#444', lineHeight: '1.5' }}>
                      <strong>Feedback:</strong> {caseModal.data.evaluation.feedback}
                    </div>
                  </div>
                )}
              </div>
            ) : caseModal.type === 'ai' && caseModal.data ? (
              <div>
                <div style={{ background: '#e8f5e9', padding: '12px', borderRadius: '8px', marginBottom: '16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', fontWeight: '700', color: '#2e7d32' }}>{Math.round(caseModal.data.marks ?? 0)}/100</div>
                  <div style={{ fontSize: '13px', color: '#555' }}>Updated Marks</div>
                </div>
                {caseModal.data.evaluation && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[['Relevance', caseModal.data.evaluation.relevance_score], ['Content Depth', caseModal.data.evaluation.content_depth_score],
                      ['Structure', caseModal.data.evaluation.structure_score], ['Clarity', caseModal.data.evaluation.clarity_score]].map(([k, v]) => (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f8f9fa', borderRadius: '6px', fontSize: '13px' }}>
                        <span style={{ color: '#555' }}>{k}</span><span style={{ fontWeight: '600' }}>{v}</span>
                      </div>
                    ))}
                    <div style={{ padding: '12px', background: '#f0f4ff', borderRadius: '8px', fontSize: '13px', color: '#444', lineHeight: '1.6', marginTop: '4px' }}>
                      <strong>Feedback:</strong> {caseModal.data.evaluation.feedback}
                    </div>
                  </div>
                )}
              </div>
            ) : caseModal.type === 'plagiarism' && caseModal.data ? (
              <div>
                <div style={{ textAlign: 'center', padding: '20px', background: caseModal.data.similarityScore > 30 ? '#fff3f3' : '#f0fff4', borderRadius: '12px', marginBottom: '20px' }}>
                  <div style={{ fontSize: '48px', fontWeight: '700', color: caseModal.data.similarityScore > 30 ? '#dc3545' : '#28a745' }}>
                    {caseModal.data.similarityScore?.toFixed(1)}%
                  </div>
                  <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>Similarity Score</div>
                  <div style={{ marginTop: '8px', padding: '6px 16px', display: 'inline-block', borderRadius: '20px', fontSize: '13px', fontWeight: '600',
                    background: caseModal.data.similarityScore > 30 ? '#dc3545' : '#28a745', color: 'white' }}>
                    {caseModal.data.similarityScore > 30 ? '⚠️ High Plagiarism' : '✅ Acceptable'}
                  </div>
                </div>
                {caseModal.data.comparedWith?.length > 0 && (
                  <div>
                    <h4 style={{ color: '#333', marginBottom: '10px' }}>Compared Against {caseModal.data.comparedWith.length} submission(s)</h4>
                    {caseModal.data.comparedWith.map((c, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f8f9fa', borderRadius: '6px', marginBottom: '6px', fontSize: '13px' }}>
                        <span style={{ color: '#555' }}>Submission {i + 1}</span>
                        <span style={{ fontWeight: '600', color: c.score > 30 ? '#dc3545' : '#28a745' }}>{c.score?.toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: '0 0 4px', color: D.text }}>{subjectDetails.subject.name}</h2>
          <p style={{ color: D.sub, margin: 0 }}>{subjectDetails.subject.className} • {subjectDetails.subject.semester}</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {quizzes.length > 0 && (<>
            <button onClick={handleDownloadPDF} style={{ padding: '10px 20px', background: '#28a745', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>📊 Download Marks PDF</button>
            <button onClick={() => setShowAssignQuiz(!showAssignQuiz)} style={{ padding: '10px 20px', background: showAssignQuiz ? '#dc3545' : '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>{showAssignQuiz ? '✖ Cancel' : '📤 Assign Quiz'}</button>
            <button onClick={() => setShowAssignCaseStudy(!showAssignCaseStudy)} style={{ padding: '10px 20px', background: showAssignCaseStudy ? '#dc3545' : '#FF9800', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>{showAssignCaseStudy ? '✖ Cancel' : '📚 Assign Case Study'}</button>
          </>)}
          <button onClick={() => setShowAddClass(!showAddClass)} style={{ padding: '10px 20px', background: showAddClass ? '#dc3545' : '#17a2b8', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>{showAddClass ? '✖ Cancel' : '🏫 Add Class'}</button>
          <button onClick={() => setShowAddStudentForm(!showAddStudentForm)} style={{ padding: '10px 20px', background: showAddStudentForm ? '#dc3545' : '#28a745', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>{showAddStudentForm ? '✖ Cancel' : '➕ Add Student'}</button>
        </div>
      </div>

      {showAddClass && <AddClassToSubject subjectId={subjectDetails.subject.subjectId} onSuccess={() => { setShowAddClass(false); viewSubjectDetails(selectedSubject); }} />}

      {/* Assign Case Study Panel */}
      {showAssignCaseStudy && (
        <div style={{ background: D.warnBg, padding: '20px', borderRadius: '8px', marginBottom: '20px', border: `1px solid ${D.panelBorder}` }}>
          <h3 style={{ marginTop: 0, color: D.text }}>Assign Case Studies to All Students</h3>
          <p style={{ color: D.warnText, marginBottom: '15px' }}>Select a batch and set deadline to assign case studies.</p>
          <form onSubmit={handleAssignCaseStudy}>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: D.label }}>Select Batch</label>
              <select value={selectedBatchName} onChange={e => setSelectedBatchName(e.target.value)} required style={inp}>
                <option value="">-- Select Batch --</option>
                {caseStudyBatches.map(b => <option key={b.batchName} value={b.batchName}>{b.batchName} ({b.totalStudents} students)</option>)}
              </select>
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: D.label }}>Deadline</label>
              <input type="datetime-local" value={caseStudyDeadline} onChange={e => setCaseStudyDeadline(e.target.value)} required style={inp} />
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: D.label }}>Case Study Type</label>
              <select value={caseStudyType} onChange={e => setCaseStudyType(e.target.value)} style={inp}>
                <option value="typed">Typed (Word Document)</option>
                <option value="written">Written (Scanned PDF)</option>
              </select>
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: D.label }}>Minimum Pages</label>
              <input type="number" value={minPages} onChange={e => setMinPages(e.target.value)} min="1" required style={inp} />
            </div>
            <button type="submit" style={{ padding: '10px 20px', background: '#FF9800', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>Assign & Notify Students</button>
          </form>
        </div>
      )}

      {/* Assign Quiz Panel */}
      {showAssignQuiz && (
        <div style={{ background: D.panelBg, padding: '20px', borderRadius: '8px', marginBottom: '20px', border: `1px solid ${D.panelBorder}` }}>
          <h3 style={{ marginTop: 0, color: D.text }}>Assign Quiz to All Students</h3>
          <form onSubmit={handleAssignQuiz}>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: D.label }}>Select Quiz</label>
              <select value={selectedQuizId} onChange={e => setSelectedQuizId(e.target.value)} required style={inp}>
                <option value="">-- Select Quiz --</option>
                {quizzes.map(q => <option key={q.id} value={q.id}>{q.title} ({q.totalMarks} marks)</option>)}
              </select>
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: D.label }}>Deadline</label>
              <input type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)} required style={inp} />
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: D.label }}>Time Limit (Optional)</label>
              <input type="number" value={timeLimit} onChange={e => setTimeLimit(e.target.value)} placeholder="Minutes (leave empty for no timer)" min="1" style={inp} />
              <small style={{ color: D.muted, fontSize: '12px' }}>Leave empty for no time limit. Quiz will auto-submit when time expires.</small>
            </div>
            <button type="submit" style={{ padding: '10px 20px', background: '#007bff', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>Assign & Notify Students</button>
          </form>
          <div style={{ marginTop: '20px', borderTop: `1px solid ${D.panelBorder}`, paddingTop: '15px' }}>
            <h4 style={{ color: D.text }}>All Quizzes</h4>
            {quizzes.map(q => (
              <div key={q.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: D.quizRowBg, borderRadius: '6px', marginBottom: '8px', border: `1px solid ${D.panelBorder}` }}>
                <span style={{ color: D.text }}>{q.title} ({q.totalMarks} marks)</span>
                <button onClick={() => handleDeleteQuiz(q.id)} style={{ padding: '6px 12px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>🗑️ Delete</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Student Panel */}
      {showAddStudentForm && (
        <div style={{ background: D.panelBg, padding: '20px', borderRadius: '8px', marginBottom: '20px', border: `1px solid ${D.panelBorder}` }}>
          <h3 style={{ marginTop: 0, color: D.text }}>Add New Student</h3>
          <form onSubmit={handleAddStudentSubmit}>
            {[['Registration Number', 'text', 'regNo'], ['Email', 'email', 'email'], ['Name', 'text', 'name']].map(([lbl, type, key]) => (
              <div key={key} style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: D.label }}>{lbl}</label>
                <input type={type} value={newStudent[key]} onChange={e => setNewStudent({ ...newStudent, [key]: e.target.value })} required style={inp} />
              </div>
            ))}
            <button type="submit" style={{ padding: '10px 20px', background: '#007bff', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>Add Student</button>
          </form>
        </div>
      )}

      {/* Students List */}
      <div style={{ marginTop: '30px' }}>
        {/* Search */}
        <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '500px' }}>
            <span style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', fontSize: '18px' }}>🔍</span>
            <input
              type="text"
              placeholder="Search by name or registration number..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ ...inp, padding: '12px 15px 12px 45px', border: `2px solid ${D.inputBorder}`, borderRadius: '10px', fontSize: '15px', outline: 'none' }}
              onFocus={e => e.target.style.borderColor = '#667eea'}
              onBlur={e => e.target.style.borderColor = D.inputBorder}
            />
          </div>
          <div style={{ color: D.sub, fontSize: '14px', fontWeight: '500' }}>{filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''} found</div>
        </div>

        {filteredStudents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: D.panelBg, borderRadius: '12px', border: `1px solid ${D.panelBorder}` }}>
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>👥</div>
            <p style={{ color: D.muted, fontSize: '16px', margin: 0 }}>
              {searchQuery ? 'No students found matching your search.' : 'No students enrolled yet. Add students using the button above.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '20px' }}>
            {filteredStudents.map(student => (
              <div key={student.studentId}
                style={{ background: D.cardBg, border: `1px solid ${D.cardBorder}`, borderRadius: '12px', overflow: 'hidden', transition: 'all 0.3s', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.25)'; e.currentTarget.style.transform = 'translateY(-4px)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                {/* Student Header — always gradient, always white text */}
                <div style={{ background: 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)', padding: '20px', color: 'white', position: 'relative' }}>
                  <button onClick={() => handleDeleteStudent(student.studentId)}
                    style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', fontSize: '12px', fontWeight: '500' }}
                    title="Remove student">🗑️ Remove</button>
                  <div style={{ fontSize: '40px', marginBottom: '10px' }}>👤</div>
                  <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: '600' }}>{student.name}</h3>
                  <div style={{ fontSize: '13px', opacity: 0.9 }}>{student.regNo}</div>
                  <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>{student.email}</div>
                </div>

                {/* Progress Body */}
                <div style={{ padding: '20px', background: D.cardBg }}>

                  {/* Quizzes */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <span style={{ fontSize: '16px' }}>📝</span>
                      <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: D.text }}>Quizzes</h4>
                    </div>
                    {student.quizProgress.filter(q => q.isAssigned).length === 0 ? (
                      <div style={{ padding: '12px', background: D.rowBg, borderRadius: '8px', fontSize: '13px', color: D.muted, textAlign: 'center' }}>No quizzes assigned</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {student.quizProgress.filter(q => q.isAssigned).map(quiz => (
                          <div key={quiz.quizId} style={{ padding: '12px', background: D.rowBg, borderRadius: '8px', border: `1px solid ${D.rowBorder}` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <div style={{ fontWeight: '600', fontSize: '13px', color: D.rowText, flex: 1 }}>{quiz.title}</div>
                              {quiz.isSubmitted && (
                                <div style={{ display: 'flex', gap: '6px' }}>
                                  <button onClick={() => handleUpdateMarks(quiz.submissionId, 'quiz', quiz.marks)} style={{ padding: '4px 10px', fontSize: '11px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '500' }}>✏️ Edit</button>
                                  <button onClick={() => handleAllowRetake(quiz.submissionId, student.name, quiz.title)} style={{ padding: '4px 10px', fontSize: '11px', background: '#ff9800', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '500' }} title="Allow retake">🔄</button>
                                </div>
                              )}
                            </div>
                            {!quiz.isSubmitted
                              ? <span style={{ fontSize: '12px', color: '#ff9800', background: dark ? 'rgba(255,193,7,0.15)' : '#fff3cd', padding: '4px 10px', borderRadius: '12px', fontWeight: '500' }}>⏳ Pending</span>
                              : <span style={{ fontSize: '13px', color: quiz.isLate ? '#dc3545' : '#28a745', background: quiz.isLate ? (dark ? 'rgba(220,53,69,0.2)' : '#f8d7da') : (dark ? 'rgba(40,167,69,0.2)' : '#d4edda'), padding: '4px 12px', borderRadius: '12px', fontWeight: '600' }}>
                                  {quiz.isLate ? '🔴' : '🟢'} {quiz.marks}/{quiz.totalMarks}
                                </span>
                            }
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Case Studies */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <span style={{ fontSize: '16px' }}>📚</span>
                      <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: D.text }}>Case Studies</h4>
                    </div>
                    {student.caseProgress.filter(c => c.isAssigned).length === 0 ? (
                      <div style={{ padding: '12px', background: D.rowBg, borderRadius: '8px', fontSize: '13px', color: D.muted, textAlign: 'center' }}>No case studies assigned</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {student.caseProgress.filter(c => c.isAssigned).map(cs => (
                          <div key={cs.caseStudyId} style={{ padding: '12px', background: D.rowBg, borderRadius: '8px', border: `1px solid ${D.rowBorder}` }}>
                            <div style={{ fontWeight: '600', fontSize: '12px', color: D.rowText, marginBottom: '8px' }}>{cs.topic}</div>
                            {!cs.isSubmitted ? (
                              <span style={{ fontSize: '12px', color: '#ff9800', background: dark ? 'rgba(255,193,7,0.15)' : '#fff3cd', padding: '4px 10px', borderRadius: '12px', fontWeight: '500' }}>⏳ Pending</span>
                            ) : (
                              <>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                                  <span style={{ fontSize: '13px', color: cs.isLate ? '#dc3545' : '#28a745', background: cs.isLate ? (dark ? 'rgba(220,53,69,0.2)' : '#f8d7da') : (dark ? 'rgba(40,167,69,0.2)' : '#d4edda'), padding: '4px 12px', borderRadius: '12px', fontWeight: '600' }}>
                                    {cs.isLate ? '🔴' : '🟢'} {cs.marks !== null ? Math.round(cs.marks) : '?'}/100
                                  </span>
                                </div>
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                  <button onClick={() => handleUpdateMarks(cs.submissionId, 'case_study', cs.marks)}
                                    style={{ padding: '4px 8px', fontSize: '11px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>✏️ Edit</button>
                                  <button onClick={() => openPreview(cs)}
                                    style={{ padding: '4px 8px', fontSize: '11px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>📄 View</button>
                                  <button onClick={() => openCaseModal('ai', cs.caseStudyId)}
                                    style={{ padding: '4px 8px', fontSize: '11px', background: '#764ba2', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>🤖 AI Correction</button>
                                  <button onClick={() => openCaseModal('plagiarism', cs.caseStudyId)}
                                    style={{ padding: '4px 8px', fontSize: '11px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>🔍 Plagiarism</button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default SubjectDetailsView;
