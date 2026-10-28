import axios from 'axios';

const API_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (email, otp, newPassword) => api.post('/auth/reset-password', { email, otp, newPassword }),
};

export const studentAPI = {
  getQuizzes: () => api.get('/student/quizzes'),
  getQuiz: (quizId) => api.get(`/student/quiz/${quizId}`),
  submitQuiz: (data) => api.post('/student/submit-quiz', data),
  getMySubjects: () => api.get('/student/my-subjects'),
  getCaseStudies: () => api.get('/student/case-studies'),
  uploadCaseStudy: (caseStudyId, formData) => 
    api.post(`/student/upload-case-study/${caseStudyId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  requestLate: (data) => api.post('/student/request-late', data),
};

export const staffAPI = {
  uploadSyllabus: (formData) => 
    api.post('/staff/upload-syllabus', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  createSubject: (data) => api.post('/staff/create-subject', data),
  getMySubjects: () => api.get('/staff/my-subjects'),
  getAvailableClasses: () => api.get('/staff/available-classes'),
  addClassToSubject: (data) => api.post('/staff/add-class-to-subject', data),
  getSubjectDetails: (subjectId) => api.get(`/staff/subject-details/${subjectId}`),
  getSubjectQuizzes: (subjectId) => api.get(`/staff/subject-quizzes/${subjectId}`),
  getSubjectCaseStudies: (subjectId) => api.get(`/staff/subject-case-studies/${subjectId}`),
  deleteQuiz: (quizId) => api.delete(`/staff/delete-quiz/${quizId}`),
  deleteCaseStudy: (caseStudyId) => api.delete(`/staff/delete-case-study/${caseStudyId}`),
  deleteCaseStudyBatch: (subjectId, batchName) => api.delete(`/staff/delete-case-study-batch/${subjectId}/${encodeURIComponent(batchName)}`),
  updateQuizMarks: (data) => api.put('/staff/update-quiz-marks', data),
  deleteSubject: (subjectId) => api.delete(`/staff/delete-subject/${subjectId}`),
  removeStudentFromSubject: (subjectId, studentId) => api.delete(`/staff/remove-student/${subjectId}/${studentId}`),
  getStudentsInSubject: (subjectId) => api.get(`/staff/students/${subjectId}`),
  addStudentToSubject: (data) => api.post('/staff/add-student-to-subject', data),
  generateQuiz: (data) => api.post('/staff/generate-quiz', data),
  createManualQuiz: (data) => api.post('/staff/create-manual-quiz', data),
  approveQuiz: (quizId) => api.post('/staff/approve-quiz', { quizId }),
  assignQuiz: (data) => api.post('/staff/assign-quiz', data),
  getSubjects: () => api.get('/staff/subjects'),
  viewSubmissions: (quizId) => api.get(`/staff/view-submissions/${quizId}`),
  viewCaseSubmissions: (caseStudyId) => api.get(`/staff/view-case-submissions/${caseStudyId}`),
  generateCaseStudy: (data) => api.post('/staff/generate-case-study', data),
  generateCaseStudyFromModules: (data) => api.post('/staff/generate-case-study-from-modules', data),
  previewCaseStudyAssignment: (data) => api.post('/staff/preview-case-study-assignment', data),
  confirmCaseStudyAssignment: (data) => api.post('/staff/confirm-case-study-assignment', data),
  downloadCaseStudyAssignments: (subjectId) => api.get(`/staff/download-case-study-assignments/${subjectId}`),
  updateCaseStudyDeadline: (data) => api.put('/staff/update-case-study-deadline', data),
  createCaseStudyManual: (data) => api.post('/staff/create-case-study-manual', data),
  assignCaseStudy: (data) => api.post('/staff/assign-case-study', data),
  getLateRequests: () => api.get('/staff/late-requests'),
  approveLate: (data) => api.put('/staff/approve-late', data),
  updateMarks: (data) => api.put('/staff/manual-mark-update', data),
  allowRetake: (submissionId) => api.post(`/staff/allow-retake/${submissionId}`),
  getQuizDetails: (quizId) => api.get(`/staff/quiz-details/${quizId}`),
  editQuiz: (data) => api.put('/staff/edit-quiz', data),
  getQuizAnalytics: (quizId) => api.get(`/staff/quiz-analytics/${quizId}`),
  getCaseSubmission: (caseStudyId) => api.get(`/staff/case-submission/${caseStudyId}`),
  getCaseSubmissionFile: (caseStudyId) => `${API_URL}/staff/case-submission-file/${caseStudyId}`,
  runAICorrection: (caseStudyId) => api.post(`/staff/run-ai-correction/${caseStudyId}`),
  runPlagiarism: (caseStudyId) => api.post(`/staff/run-plagiarism/${caseStudyId}`),
};

export const adminAPI = {
  getStudents: () => api.get('/admin/students'),
  resetStaffPassword: (data) => api.put('/admin/reset-staff-password', data),
  getStaff: () => api.get('/admin/staff'),
  addStaff: (data) => api.post('/admin/add-staff', data),
  addStudent: (data) => api.post('/admin/add-student', data),
  changeDeadline: (data) => api.put('/admin/change-deadline', data),
  createClass: (data) => api.post('/admin/create-class', data),
  getClasses: () => api.get('/admin/classes'),
  addStudentsToClass: (data) => api.post('/admin/add-students-to-class', data),
  deleteClass: (className) => api.delete(`/admin/delete-class/${encodeURIComponent(className)}`),
  createDepartment: (data) => api.post('/admin/create-department', data),
  getDepartments: () => api.get('/admin/departments'),
  deleteDepartment: (departmentCode) => api.delete(`/admin/delete-department/${encodeURIComponent(departmentCode)}`),
};

export default api;
