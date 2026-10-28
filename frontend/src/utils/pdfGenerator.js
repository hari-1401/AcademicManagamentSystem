export const generateMarksPDF = (data, type) => {
  const { subject, staff, quizzes, students, caseStudies } = data;
  
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px; }
        .header h1 { margin: 0; font-size: 24px; }
        .header p { margin: 5px 0; color: #666; }
        .info { margin: 20px 0; }
        .info-row { margin: 8px 0; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #000; padding: 10px; text-align: left; font-size: 12px; }
        th { background: #f0f0f0; font-weight: bold; }
        .signature { margin-top: 60px; display: flex; justify-content: space-around; }
        .signature-box { text-align: center; }
        .signature-line { border-top: 1px solid #000; width: 200px; margin: 40px auto 5px; }
        .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Academic Evaluation Report</h1>
        <p>Marks Sheet</p>
      </div>
      
      <div class="info">
        <div class="info-row"><strong>Subject:</strong> ${subject.name} (${subject.subjectId})</div>
        <div class="info-row"><strong>Class:</strong> ${subject.className} | <strong>Semester:</strong> ${subject.semester}</div>
        <div class="info-row"><strong>Staff:</strong> ${staff.name} | <strong>Staff ID:</strong> ${staff.id}</div>
        <div class="info-row"><strong>Date:</strong> ${new Date().toLocaleDateString()}</div>
      </div>
  `;

  if (type === 'complete') {
    html += `<h3>Complete Marks Report</h3><table><thead><tr><th>S.No</th><th>Reg No</th><th>Student Name</th>`;
    quizzes?.forEach(quiz => { html += `<th>${quiz.title}<br/>(${quiz.totalMarks})</th>`; });
    html += `<th>Case Study<br/>(100)</th></tr></thead><tbody>`;
    students.forEach((student, idx) => {
      html += `<tr><td>${idx + 1}</td><td>${student.regNo}</td><td>${student.name}</td>`;
      quizzes?.forEach(quiz => {
        const sub = student.quizProgress.find(q => q.quizId === quiz.id);
        html += `<td>${sub?.marks !== undefined ? sub.marks : '-'}</td>`;
      });
      const cs = student.caseProgress[0];
      html += `<td>${cs?.marks !== undefined ? cs.marks : '-'}</td></tr>`;
    });
    html += `</tbody></table>`;
  }

  html += `
      <div class="signature">
        <div class="signature-box">
          <div class="signature-line"></div>
          <p><strong>${staff.name}</strong></p>
          <p>Staff Signature</p>
        </div>
        <div class="signature-box">
          <div class="signature-line"></div>
          <p><strong>HOD Signature</strong></p>
        </div>
      </div>
      <div class="footer">
        <p>Generated on ${new Date().toLocaleString()}</p>
        <p>This is a computer-generated document. Signature required for official use.</p>
      </div>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  
  // Trigger print dialog after content loads
  setTimeout(() => {
    printWindow.print();
  }, 500);
};
