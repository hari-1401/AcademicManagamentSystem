import React, { useState, useEffect } from 'react';
import { staffAPI } from '../api';

const ModuleCaseStudyAssigner = ({ subjectId, onSuccess }) => {
  const [batchName, setBatchName] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [modules, setModules] = useState([{ moduleName: 'Module 1', topics: '' }]);
  const [assignmentMode, setAssignmentMode] = useState('random');
  const [singleTopic, setSingleTopic] = useState('');
  const [students, setStudents] = useState([]);
  const [manualAssignments, setManualAssignments] = useState({});
  const [allTopics, setAllTopics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [previewAssignments, setPreviewAssignments] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editTopic, setEditTopic] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfBlob, setPdfBlob] = useState(null);

  useEffect(() => {
    fetchStudents();
  }, [subjectId]);

  useEffect(() => {
    const topics = [];
    modules.forEach(module => {
      if (module.topics.trim()) {
        const topicList = module.topics.split('-').map(t => t.trim()).filter(t => t);
        topicList.forEach(topic => {
          topics.push({ module: module.moduleName, topic });
        });
      }
    });
    setAllTopics(topics);
  }, [modules]);

  const fetchStudents = async () => {
    try {
      const response = await staffAPI.getStudentsInSubject(subjectId);
      setStudents(response.data.students);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const addModule = () => {
    setModules([...modules, { moduleName: `Module ${modules.length + 1}`, topics: '' }]);
  };

  const removeModule = (index) => {
    setModules(modules.filter((_, i) => i !== index));
  };

  const updateModule = (index, field, value) => {
    const updated = [...modules];
    updated[index][field] = value;
    setModules(updated);
  };

  const handleManualAssignment = (studentId, topic) => {
    setManualAssignments({ ...manualAssignments, [studentId]: topic });
  };

  const handlePreview = async () => {
    setLoading(true);
    try {
      const modulesData = modules.map(m => ({
        moduleName: m.moduleName,
        topics: m.topics.split('-').map(t => t.trim()).filter(t => t)
      }));

      const payload = {
        subjectId,
        modules: modulesData,
        assignmentMode,
        singleTopic: assignmentMode === 'same_for_all' ? singleTopic : null,
        manualAssignments: assignmentMode === 'manual' ? manualAssignments : null
      };

      const response = await staffAPI.previewCaseStudyAssignment(payload);
      setPreviewAssignments(response.data.assignments);
      setPreviewMode(true);
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to generate preview');
    } finally {
      setLoading(false);
    }
  };

  const handleEditTopic = (index) => {
    setEditingIndex(index);
    setEditTopic(previewAssignments[index].topic);
  };

  const handleSaveEdit = (index) => {
    const updated = [...previewAssignments];
    updated[index].topic = editTopic;
    setPreviewAssignments(updated);
    setEditingIndex(null);
    setEditTopic('');
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const response = await staffAPI.confirmCaseStudyAssignment({
        subjectId,
        batchName: batchName.trim(),
        assignments: previewAssignments
      });
      setConfirmed(true);
      if (onSuccess) onSuccess(response.data);
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to confirm assignments');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await staffAPI.downloadCaseStudyAssignments(subjectId);
      const data = response.data;
      
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      
      // Header Box
      doc.setFillColor(41, 128, 185);
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont(undefined, 'bold');
      doc.text('CASE STUDY ASSIGNMENTS', pageWidth / 2, 25, { align: 'center' });
      
      // Subject Info Box
      doc.setFillColor(236, 240, 241);
      doc.rect(margin, 45, pageWidth - 2 * margin, 35, 'F');
      doc.setDrawColor(189, 195, 199);
      doc.rect(margin, 45, pageWidth - 2 * margin, 35, 'S');
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text('Subject:', margin + 5, 55);
      doc.setFont(undefined, 'normal');
      doc.text(`${data.subjectName} (${data.subjectId})`, margin + 25, 55);
      
      doc.setFont(undefined, 'bold');
      doc.text('Class:', margin + 5, 63);
      doc.setFont(undefined, 'normal');
      doc.text(data.className, margin + 20, 63);
      
      doc.setFont(undefined, 'bold');
      doc.text('Semester:', margin + 70, 63);
      doc.setFont(undefined, 'normal');
      doc.text(data.semester, margin + 95, 63);
      
      doc.setFont(undefined, 'bold');
      doc.text('Total Students:', margin + 5, 71);
      doc.setFont(undefined, 'normal');
      doc.text(String(data.totalStudents), margin + 35, 71);
      
      // Table Header
      let y = 90;
      const colWidths = [15, 30, 50, 35, 60];
      const colX = [margin, margin + 15, margin + 45, margin + 95, margin + 130];
      
      doc.setFillColor(52, 73, 94);
      doc.rect(margin, y, pageWidth - 2 * margin, 10, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text('No.', colX[0] + 2, y + 7);
      doc.text('Reg No', colX[1] + 2, y + 7);
      doc.text('Student Name', colX[2] + 2, y + 7);
      doc.text('Module', colX[3] + 2, y + 7);
      doc.text('Topic', colX[4] + 2, y + 7);
      
      y += 10;
      
      // Table Rows
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      
      data.assignments.forEach((assignment, index) => {
        if (y > pageHeight - 30) {
          doc.addPage();
          y = 20;
        }
        
        // Alternating row colors
        if (index % 2 === 0) {
          doc.setFillColor(245, 245, 245);
          doc.rect(margin, y, pageWidth - 2 * margin, 8, 'F');
        }
        
        // Row borders
        doc.setDrawColor(220, 220, 220);
        doc.rect(margin, y, pageWidth - 2 * margin, 8, 'S');
        
        doc.text(String(index + 1), colX[0] + 2, y + 6);
        doc.text(assignment.regNo.substring(0, 12), colX[1] + 2, y + 6);
        doc.text(assignment.studentName.substring(0, 22), colX[2] + 2, y + 6);
        doc.text(assignment.module.substring(0, 15), colX[3] + 2, y + 6);
        
        const topicText = assignment.topic.substring(0, 35);
        doc.text(topicText, colX[4] + 2, y + 6);
        
        y += 8;
      });
      
      // Footer
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(
          `Page ${i} of ${totalPages} | Generated on ${new Date().toLocaleDateString()}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }
      
      // Create blob for preview
      const blob = doc.output('blob');
      setPdfBlob(blob);
      setShowPdfPreview(true);
    } catch (error) {
      alert('Failed to generate PDF');
    }
  };

  const handleConfirmDownload = () => {
    if (pdfBlob) {
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `case_study_assignments_${new Date().getTime()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setShowPdfPreview(false);
    }
  };

  if (previewMode) {
    return (
      <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        <h2>📋 Preview: {batchName}</h2>
        <p style={{ color: '#666' }}>Review and edit assignments before confirming</p>

        <div style={{ marginTop: '20px', maxHeight: '500px', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#2196F3', color: 'white' }}>
                <th style={{ padding: '10px', textAlign: 'left' }}>Student</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Reg No</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Module</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Topic</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {previewAssignments.map((assignment, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '10px' }}>{assignment.studentName}</td>
                  <td style={{ padding: '10px' }}>{assignment.regNo}</td>
                  <td style={{ padding: '10px' }}>{assignment.module}</td>
                  <td style={{ padding: '10px' }}>
                    {editingIndex === idx ? (
                      <input
                        type="text"
                        value={editTopic}
                        onChange={(e) => setEditTopic(e.target.value)}
                        style={{ width: '100%', padding: '5px' }}
                      />
                    ) : (
                      assignment.topic
                    )}
                  </td>
                  <td style={{ padding: '10px' }}>
                    {editingIndex === idx ? (
                      <button onClick={() => handleSaveEdit(idx)} style={{ padding: '5px 10px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                        Save
                      </button>
                    ) : (
                      <button onClick={() => handleEditTopic(idx)} style={{ padding: '5px 10px', background: '#FF9800', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setPreviewMode(false)}
            style={{ flex: 1, padding: '15px', background: '#757575', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px' }}
          >
            ← Back to Edit
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            style={{ flex: 1, padding: '15px', background: loading ? '#ccc' : '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '16px' }}
          >
            {loading ? 'Confirming...' : '✅ Confirm & Assign'}
          </button>
        </div>
      </div>
    );
  }

  if (confirmed) {
    return (
      <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ padding: '20px', background: '#e8f5e9', borderRadius: '8px', textAlign: 'center' }}>
          <h2>✅ Case Studies Assigned Successfully!</h2>
          <p>Total Students: {previewAssignments.length}</p>
          <button
            onClick={handleDownloadPDF}
            style={{ marginTop: '20px', padding: '15px 30px', background: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px' }}
          >
            📄 Download PDF
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* PDF Preview Modal */}
      {showPdfPreview && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '8px', padding: '20px', maxWidth: '90%', maxHeight: '90%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0 }}>PDF Preview</h3>
              <button onClick={() => setShowPdfPreview(false)} style={{ padding: '8px 15px', background: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>✕ Close</button>
            </div>
            <iframe
              src={pdfBlob ? URL.createObjectURL(pdfBlob) : ''}
              style={{ width: '800px', height: '600px', border: '1px solid #ddd', borderRadius: '4px' }}
              title="PDF Preview"
            />
            <div style={{ marginTop: '15px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowPdfPreview(false)} style={{ padding: '10px 20px', background: '#757575', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleConfirmDownload} style={{ padding: '10px 20px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>📥 Download PDF</button>
            </div>
          </div>
        </div>
      )}

      {!showForm ? (
        <div style={{ padding: '40px', textAlign: 'center', background: '#f5f5f5', borderRadius: '8px' }}>
          <h2>📚 Create New Case Study Batch</h2>
          <p style={{ color: '#666', marginBottom: '30px' }}>Enter a title for this case study assignment (e.g., CIA 1, Assignment 1)</p>
          <input
            type="text"
            placeholder="Enter batch name (e.g., CIA 1)"
            value={batchName}
            onChange={(e) => setBatchName(e.target.value)}
            style={{ width: '100%', maxWidth: '500px', padding: '15px', fontSize: '18px', borderRadius: '8px', border: '2px solid #2196F3', marginBottom: '20px' }}
          />
          <div>
            <button
              onClick={() => {
                if (!batchName.trim()) {
                  alert('Please enter a batch name');
                  return;
                }
                setShowForm(true);
              }}
              style={{ padding: '15px 40px', background: '#2196F3', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Continue →
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', padding: '15px', background: '#e3f2fd', borderRadius: '8px' }}>
            <div>
              <h2 style={{ margin: 0 }}>📚 {batchName}</h2>
              <p style={{ margin: '5px 0 0 0', color: '#666' }}>Configure case study assignments</p>
            </div>
            <button
              onClick={() => setShowForm(false)}
              style={{ padding: '8px 16px', background: '#757575', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              ← Change Title
            </button>
          </div>

      <div style={{ marginBottom: '20px', padding: '15px', background: '#f5f5f5', borderRadius: '8px' }}>
        <h3>Assignment Mode</h3>
        <div style={{ display: 'flex', gap: '15px' }}>
          <label style={{ cursor: 'pointer' }}>
            <input type="radio" value="random" checked={assignmentMode === 'random'} onChange={(e) => setAssignmentMode(e.target.value)} />
            <span style={{ marginLeft: '5px' }}>🎲 Random Assignment</span>
          </label>
          <label style={{ cursor: 'pointer' }}>
            <input type="radio" value="same_for_all" checked={assignmentMode === 'same_for_all'} onChange={(e) => setAssignmentMode(e.target.value)} />
            <span style={{ marginLeft: '5px' }}>👥 Same Topic for All</span>
          </label>
          <label style={{ cursor: 'pointer' }}>
            <input type="radio" value="manual" checked={assignmentMode === 'manual'} onChange={(e) => setAssignmentMode(e.target.value)} />
            <span style={{ marginLeft: '5px' }}>✍️ Manual Assignment</span>
          </label>
        </div>
      </div>

      {assignmentMode === 'same_for_all' && (
        <div style={{ marginBottom: '20px', padding: '15px', background: '#e3f2fd', borderRadius: '8px' }}>
          <h3>Single Topic for All Students</h3>
          <input type="text" placeholder="Enter topic for all students" value={singleTopic} onChange={(e) => setSingleTopic(e.target.value)} style={{ width: '100%', padding: '10px', fontSize: '16px', borderRadius: '4px', border: '1px solid #ccc' }} />
        </div>
      )}

      {assignmentMode !== 'same_for_all' && (
        <div style={{ marginBottom: '20px' }}>
          <h3>Topics by Module (Separate topics with hyphen -)</h3>
          <p style={{ color: '#666', fontSize: '14px' }}>Example: Topic 1 - Topic 2 - Topic 3</p>

          {modules.map((module, index) => (
            <div key={index} style={{ marginBottom: '15px', padding: '15px', background: '#fff', border: '1px solid #ddd', borderRadius: '8px' }}>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <input type="text" placeholder="Module Name" value={module.moduleName} onChange={(e) => updateModule(index, 'moduleName', e.target.value)} style={{ flex: '0 0 200px', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                <button onClick={() => removeModule(index)} disabled={modules.length === 1} style={{ padding: '8px 15px', background: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Remove</button>
              </div>
              <textarea placeholder="Enter topics separated by hyphen (-)" value={module.topics} onChange={(e) => updateModule(index, 'topics', e.target.value)} rows={3} style={{ width: '100%', padding: '10px', fontSize: '14px', borderRadius: '4px', border: '1px solid #ccc' }} />
              <div style={{ marginTop: '5px', fontSize: '12px', color: '#666' }}>{module.topics.split('-').filter(t => t.trim()).length} topics</div>
            </div>
          ))}

          <button onClick={addModule} style={{ padding: '10px 20px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>+ Add Module</button>

          <div style={{ marginTop: '15px', padding: '10px', background: '#fff3cd', borderRadius: '4px' }}>
            <strong>Total Topics: {allTopics.length}</strong> | <strong>Total Students: {students.length}</strong>
            {students.length > allTopics.length && <span style={{ color: '#ff9800', marginLeft: '10px' }}>⚠️ Topics will be repeated for {students.length - allTopics.length} students</span>}
          </div>
        </div>
      )}

      {assignmentMode === 'manual' && allTopics.length > 0 && (
        <div style={{ marginBottom: '20px', padding: '15px', background: '#f9f9f9', borderRadius: '8px' }}>
          <h3>Manual Topic Assignment</h3>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {students.map(student => (
              <div key={student.studentId} style={{ marginBottom: '10px', padding: '10px', background: 'white', borderRadius: '4px', border: '1px solid #ddd' }}>
                <div style={{ marginBottom: '5px', fontWeight: 'bold' }}>{student.name} ({student.regNo})</div>
                <select value={manualAssignments[student.studentId] || ''} onChange={(e) => handleManualAssignment(student.studentId, e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}>
                  <option value="">Select a topic...</option>
                  {allTopics.map((topic, idx) => (
                    <option key={idx} value={topic.topic}>[{topic.module}] {topic.topic}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      <button onClick={handlePreview} disabled={loading || (assignmentMode === 'same_for_all' && !singleTopic)} style={{ padding: '15px 30px', background: loading ? '#ccc' : '#2196F3', color: 'white', border: 'none', borderRadius: '4px', fontSize: '16px', cursor: loading ? 'not-allowed' : 'pointer', width: '100%' }}>
        {loading ? 'Generating Preview...' : '👁️ Preview Assignments'}
      </button>
        </div>
      )}
    </div>
  );
};

export default ModuleCaseStudyAssigner;
