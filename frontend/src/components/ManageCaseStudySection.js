import React, { useState, useEffect } from 'react';
import { staffAPI } from '../api';

function ManageCaseStudySection({ subject, dark }) {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedBatch, setExpandedBatch] = useState(null);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfBlob, setPdfBlob] = useState(null);
  const [previewBatchName, setPreviewBatchName] = useState('');

  const D = {
    wrap:        dark ? '#1e1b3a' : 'white',
    border:      dark ? 'rgba(255,255,255,0.1)' : '#e0e0e0',
    divider:     dark ? 'rgba(255,255,255,0.08)' : '#f0f0f0',
    text:        dark ? '#f0f0ff' : '#333',
    sub:         dark ? '#c0c0e0' : '#666',
    muted:       dark ? 'rgba(255,255,255,0.35)' : '#999',
    rowExpand:   dark ? 'rgba(255,255,255,0.04)' : '#fafafa',
    tableHead:   dark ? 'rgba(255,255,255,0.08)' : '#f0f0f0',
    tableRow:    dark ? 'rgba(255,255,255,0.03)' : 'transparent',
    tableBorder: dark ? 'rgba(255,255,255,0.07)' : '#e0e0e0',
    batchBorder: dark ? 'rgba(255,255,255,0.1)' : '#e0e0e0',
    badgeBg:     dark ? 'rgba(156,39,176,0.25)' : '#f3e5f5',
    badgeColor:  dark ? '#e040fb' : '#9C27B0',
  };

  useEffect(() => { loadBatches(); }, [subject.subjectId]);

  const loadBatches = async () => {
    try {
      const response = await staffAPI.getSubjectCaseStudies(subject.subjectId);
      setBatches(response.data.batches || []);
    } catch (err) {
      console.error('Failed to load case studies');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBatch = async (batchName) => {
    if (!window.confirm(`Delete batch "${batchName}"? This will remove ALL case studies and submissions for all students in this batch.`)) return;
    try {
      await staffAPI.deleteCaseStudyBatch(subject.subjectId, batchName);
      alert('Batch deleted successfully');
      loadBatches();
    } catch (err) {
      alert('Failed to delete batch: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleDownloadPDF = async (batchName) => {
    try {
      const response = await staffAPI.downloadCaseStudyAssignments(subject.subjectId);
      const data = response.data;
      const batch = batches.find(b => b.batchName === batchName);
      if (!batch) return;
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      doc.setFillColor(156, 39, 176);
      doc.rect(0, 0, 210, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.text(`${batchName} - Case Studies`, 105, 15, { align: 'center' });
      doc.setFontSize(12);
      doc.text(data.subjectName, 105, 25, { align: 'center' });
      doc.text(`${data.className} • ${data.semester}`, 105, 32, { align: 'center' });
      doc.setFillColor(240, 240, 240);
      doc.rect(15, 45, 180, 20, 'F');
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.text(`Subject ID: ${data.subjectId}`, 20, 53);
      doc.text(`Total Students: ${batch.totalStudents}`, 20, 60);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 140, 53);
      let y = 75;
      doc.setFillColor(100, 100, 100);
      doc.rect(15, y, 180, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text('Reg No', 20, y + 7);
      doc.text('Student Name', 50, y + 7);
      doc.text('Topic', 110, y + 7);
      y += 10;
      doc.setTextColor(0, 0, 0);
      batch.assignments.forEach((assignment, index) => {
        if (y > 270) { doc.addPage(); y = 20; }
        if (index % 2 === 0) { doc.setFillColor(250, 250, 250); doc.rect(15, y, 180, 10, 'F'); }
        doc.setDrawColor(200, 200, 200);
        doc.rect(15, y, 180, 10, 'S');
        doc.text(assignment.studentRegNo, 20, y + 7);
        doc.text(assignment.studentName.substring(0, 25), 50, y + 7);
        doc.text(assignment.topic.substring(0, 35), 110, y + 7);
        y += 10;
      });
      const blob = doc.output('blob');
      setPdfBlob(blob);
      setPreviewBatchName(batchName);
      setShowPdfPreview(true);
    } catch (err) {
      alert('Failed to generate PDF: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleConfirmDownload = () => {
    if (pdfBlob && previewBatchName) {
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${previewBatchName}_${subject.name}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setShowPdfPreview(false);
      setPdfBlob(null);
      setPreviewBatchName('');
    }
  };

  if (loading) return (
    <div style={{ background: D.wrap, borderRadius: '12px', padding: '20px', marginBottom: '20px', border: `1px solid ${D.border}` }}>
      <h3 style={{ color: D.text }}>{subject.name}</h3>
      <p style={{ color: D.sub }}>Loading...</p>
    </div>
  );

  return (
    <div style={{ background: D.wrap, borderRadius: '12px', padding: '25px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', border: `1px solid ${D.border}` }}>
      {/* PDF Preview Modal */}
      {showPdfPreview && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.95)', zIndex: 9999, display: 'flex', flexDirection: 'column', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0, fontSize: '24px', color: 'white' }}>📄 PDF Preview - {previewBatchName}</h3>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleConfirmDownload} style={{ padding: '12px 24px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '16px', fontWeight: '500' }}>📥 Download PDF</button>
              <button onClick={() => { setShowPdfPreview(false); setPdfBlob(null); setPreviewBatchName(''); }} style={{ padding: '12px 24px', background: '#f44336', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '16px', fontWeight: '500' }}>✕ Close</button>
            </div>
          </div>
          <iframe src={pdfBlob ? URL.createObjectURL(pdfBlob) : ''} style={{ width: '100%', height: 'calc(100vh - 100px)', border: 'none', borderRadius: '8px' }} title="PDF Preview" />
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '15px', borderBottom: `2px solid ${D.divider}` }}>
        <div>
          <h3 style={{ margin: '0 0 5px 0', fontSize: '20px', color: D.text }}>{subject.name}</h3>
          <p style={{ margin: 0, color: D.sub, fontSize: '14px' }}>{subject.subjectId} • {subject.className}</p>
        </div>
        <div style={{ background: D.badgeBg, padding: '8px 16px', borderRadius: '20px', fontSize: '14px', fontWeight: '500', color: D.badgeColor }}>
          {batches.length} {batches.length === 1 ? 'Batch' : 'Batches'}
        </div>
      </div>

      {batches.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: D.muted }}>
          <div style={{ fontSize: '48px', marginBottom: '10px' }}>📚</div>
          <p>No case study batches created yet</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {batches.map((batch) => (
            <div key={batch.batchName} style={{ border: `1px solid ${D.batchBorder}`, borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{ background: 'linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%)', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: '0 0 5px 0', color: 'white', fontSize: '18px' }}>{batch.batchName}</h4>
                  <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.9)' }}>
                    {batch.totalStudents} students
                    {batch.isAssigned && <span style={{ marginLeft: '10px' }}>✓ Assigned</span>}
                    {batch.deadline && <span style={{ marginLeft: '10px' }}>📅 {new Date(batch.deadline).toLocaleDateString()}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => setExpandedBatch(expandedBatch === batch.batchName ? null : batch.batchName)} style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>
                    {expandedBatch === batch.batchName ? '▲ Hide' : '▼ View'}
                  </button>
                  <button onClick={() => handleDownloadPDF(batch.batchName)} style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>📥 PDF</button>
                  <button onClick={() => handleDeleteBatch(batch.batchName)} style={{ padding: '8px 16px', background: '#f44336', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>🗑️ Delete</button>
                </div>
              </div>

              {expandedBatch === batch.batchName && (
                <div style={{ padding: '20px', background: D.rowExpand }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: D.tableHead }}>
                        <th style={{ padding: '10px', textAlign: 'left', borderBottom: `2px solid ${D.tableBorder}`, color: D.text }}>Reg No</th>
                        <th style={{ padding: '10px', textAlign: 'left', borderBottom: `2px solid ${D.tableBorder}`, color: D.text }}>Student Name</th>
                        <th style={{ padding: '10px', textAlign: 'left', borderBottom: `2px solid ${D.tableBorder}`, color: D.text }}>Module</th>
                        <th style={{ padding: '10px', textAlign: 'left', borderBottom: `2px solid ${D.tableBorder}`, color: D.text }}>Topic</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batch.assignments.map((assignment, idx) => (
                        <tr key={idx} style={{ background: idx % 2 === 0 ? D.tableRow : D.rowExpand, borderBottom: `1px solid ${D.tableBorder}` }}>
                          <td style={{ padding: '10px', fontSize: '14px', color: D.sub }}>{assignment.studentRegNo}</td>
                          <td style={{ padding: '10px', fontSize: '14px', color: D.text }}>{assignment.studentName}</td>
                          <td style={{ padding: '10px', fontSize: '14px', color: D.sub }}>{assignment.module}</td>
                          <td style={{ padding: '10px', fontSize: '14px', color: D.text }}>{assignment.topic}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ManageCaseStudySection;
