import React, { useState } from 'react';
import { adminAPI } from '../api';

function AdminDashboard({ userName, onLogout, dark, onToggleDark }) {
  const [activeTab, setActiveTab] = useState('departments');
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [bulkStudents, setBulkStudents] = useState('');

  const [staffList, setStaffList] = useState([]);
  const [studentList, setStudentList] = useState([]);
  const [showPasswords, setShowPasswords] = useState({});

  React.useEffect(() => {
    if (activeTab === 'classes') {
      fetchClasses();
      fetchDepartments();
    } else if (activeTab === 'departments') {
      fetchDepartments();
    } else if (activeTab === 'staff') {
      fetchDepartments();
      fetchStaff();
    } else if (activeTab === 'staff-list') {
      fetchStaff();
    } else if (activeTab === 'student-list') {
      fetchStudents();
    }
  }, [activeTab]);

  const fetchStudents = async () => {
    try {
      const response = await adminAPI.getStudents();
      setStudentList(response.data.students || []);
    } catch (err) {
      console.error('Failed to fetch students');
    }
  };

  const fetchStaff = async () => {
    try {
      const response = await adminAPI.getStaff();
      setStaffList(response.data.staff || []);
    } catch (err) {
      console.error('Failed to fetch staff');
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await adminAPI.getClasses();
      setClasses(response.data.classes || []);
    } catch (err) {
      console.error('Failed to fetch classes');
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await adminAPI.getDepartments();
      setDepartments(response.data.departments || []);
    } catch (err) {
      console.error('Failed to fetch departments');
    }
  };

  const handleCreateDepartment = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await adminAPI.createDepartment(formData);
      alert('Department created successfully');
      setFormData({});
      fetchDepartments();
    } catch (err) {
      alert('Failed to create department: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDepartment = async (departmentCode) => {
    if (!window.confirm(`Delete department ${departmentCode}?`)) return;
    try {
      await adminAPI.deleteDepartment(departmentCode);
      alert('Department deleted successfully');
      fetchDepartments();
    } catch (err) {
      alert('Failed to delete department: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleCreateClass = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await adminAPI.createClass(formData);
      alert('Class created successfully');
      setFormData({});
      fetchClasses();
    } catch (err) {
      alert('Failed to create class: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleAddBulkStudents = async (e) => {
    e.preventDefault();
    if (!selectedClass) {
      alert('Please select a class');
      return;
    }
    
    setLoading(true);
    try {
      const lines = bulkStudents.trim().split('\n');
      const students = lines.map(line => {
        const [email, name, regNo, password] = line.split(',').map(s => s.trim());
        return { email, name, regNo, password: password || 'student123' };
      }).filter(s => s.email && s.name && s.regNo);

      if (students.length === 0) {
        alert('No valid students found. Format: email,name,regNo,password (one per line)');
        return;
      }

      const response = await adminAPI.addStudentsToClass({
        className: selectedClass,
        students
      });
      
      let msg = response.data.message;
      if (response.data.errors && response.data.errors.length > 0) {
        msg += `\n\nFailed (${response.data.errors.length}):\n` + response.data.errors.join('\n');
      }
      alert(msg);
      setBulkStudents('');
      setSelectedClass(null);
      fetchClasses();
    } catch (err) {
      alert('Failed to add students: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClass = async (className) => {
    if (!window.confirm(`Delete class ${className}?`)) return;
    try {
      await adminAPI.deleteClass(className);
      alert('Class deleted successfully');
      fetchClasses();
    } catch (err) {
      alert('Failed to delete class');
    }
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await adminAPI.addStaff(formData);
      alert('Staff added successfully');
      setFormData({});
    } catch (err) {
      alert('Failed to add staff: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await adminAPI.addStudent(formData);
      alert('Student added successfully');
      setFormData({});
    } catch (err) {
      alert('Failed to add student');
    } finally {
      setLoading(false);
    }
  };

  const [resetPasswords, setResetPasswords] = useState({});

  const handleResetPassword = async (staffId) => {
    const newPassword = resetPasswords[staffId];
    if (!newPassword || newPassword.length < 6) return alert('Enter at least 6 characters');
    try {
      await adminAPI.resetStaffPassword({ staffId, newPassword });
      alert('Password reset successfully');
      setResetPasswords({ ...resetPasswords, [staffId]: '' });
    } catch (err) {
      alert('Failed: ' + (err.response?.data?.detail || err.message));
    }
  };

  const T = {
    text:    dark ? '#f0f0ff' : '#1a1a2e',
    sub:     dark ? '#c0c0e0' : '#555',
    muted:   dark ? 'rgba(255,255,255,0.45)' : '#888',
    cardBg:  dark ? 'rgba(255,255,255,0.06)' : '#f7f8ff',
    border:  dark ? 'rgba(255,255,255,0.12)' : '#e0e4ff',
    inputBg: dark ? 'rgba(255,255,255,0.07)' : '#fff',
    rowHover:dark ? 'rgba(102,126,234,0.1)' : '#f0f3ff',
    headBg:  dark ? 'rgba(255,255,255,0.05)' : '#f8f9fa',
  };
  const th = { padding: '12px 16px', textAlign: 'left', fontWeight: '600', fontSize: '14px', color: T.text };
  const td = { padding: '12px 16px', fontSize: '14px', color: T.sub };

  return (
    <div className="dashboard">
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>Admin Portal</h2>
          <div className="user-info">{userName}</div>
        </div>
        <ul className="nav-menu">
          <li className={`nav-item ${activeTab === 'departments' ? 'active' : ''}`} onClick={() => setActiveTab('departments')}>
            🏢 Manage Departments
          </li>
          <li className={`nav-item ${activeTab === 'classes' ? 'active' : ''}`} onClick={() => setActiveTab('classes')}>
            🏫 Manage Classes
          </li>
          <li className={`nav-item ${activeTab === 'staff' ? 'active' : ''}`} onClick={() => setActiveTab('staff')}>
            👥 Add Staff
          </li>
          <li className={`nav-item ${activeTab === 'staff-list' ? 'active' : ''}`} onClick={() => setActiveTab('staff-list')}>
            📋 Staff List
          </li>
          <li className={`nav-item ${activeTab === 'student-list' ? 'active' : ''}`} onClick={() => setActiveTab('student-list')}>
            🎓 Student List
          </li>
          <li className={`nav-item ${activeTab === 'student' ? 'active' : ''}`} onClick={() => setActiveTab('student')}>
            🎓 Add Student
          </li>
        </ul>
        <button className="theme-toggle" onClick={onToggleDark}>
          {dark ? '☀️ Day Mode' : '🌙 Night Mode'}
        </button>
        <button className="logout-btn" onClick={onLogout}>
          🚪 Logout
        </button>
      </div>

      <div className="main-content">
        {activeTab === 'departments' && (
          <>
            <div className="page-header">
              <h1>Manage Departments</h1>
              <p>Create and manage academic departments</p>
            </div>
            
            <div className="card">
              <h3>Create New Department</h3>
              <form onSubmit={handleCreateDepartment}>
                <div className="form-group">
                  <label>Department Name</label>
                  <input
                    type="text"
                    placeholder="e.g., Computer Science, Electronics"
                    value={formData.departmentName || ''}
                    onChange={(e) => setFormData({ ...formData, departmentName: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Department Code</label>
                  <input
                    type="text"
                    placeholder="e.g., CSE, ECE, MECH"
                    value={formData.departmentCode || ''}
                    onChange={(e) => setFormData({ ...formData, departmentCode: e.target.value.toUpperCase() })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Description (Optional)</label>
                  <textarea
                    rows="3"
                    placeholder="Brief description of the department"
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '4px', border: `1px solid ${T.border}`, background: T.inputBg, color: T.text }}
                  />
                </div>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Department'}
                </button>
              </form>
            </div>

            <div className="card" style={{ marginTop: '20px' }}>
              <h3>All Departments</h3>
              {departments.length === 0 ? (
                <p>No departments created yet.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
                  {departments.map(dept => (
                    <div key={dept.departmentCode} style={{ border: `1px solid ${T.border}`, borderRadius: '8px', padding: '15px', background: T.cardBg }}>
                      <h4 style={{ margin: '0 0 10px 0', color: T.text }}>{dept.departmentName}</h4>
                      <p style={{ margin: '5px 0', fontSize: '14px', color: T.sub, fontWeight: 'bold' }}>{dept.departmentCode}</p>
                      {dept.description && (
                        <p style={{ margin: '10px 0', fontSize: '13px', color: T.muted }}>{dept.description}</p>
                      )}
                      <p style={{ margin: '10px 0', fontSize: '16px', fontWeight: 'bold', color: T.text }}>👥 {dept.staffCount} staff members</p>
                      <button
                        onClick={() => handleDeleteDepartment(dept.departmentCode)}
                        style={{ padding: '8px 16px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}
                      >
                        🗑️ Delete Department
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'classes' && (
          <>
            <div className="page-header">
              <h1>Manage Classes</h1>
              <p>Create classes and add students in bulk</p>
            </div>
            
            <div className="card">
              <h3>Create New Class</h3>
              <form onSubmit={handleCreateClass}>
                <div className="form-group">
                  <label>Class Name</label>
                  <input
                    type="text"
                    placeholder="e.g., CSE-A, ECE-B"
                    value={formData.className || ''}
                    onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Semester</label>
                  <input
                    type="text"
                    placeholder="e.g., 5th Semester, Fall 2024"
                    value={formData.semester || ''}
                    onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Department</label>
                  <select
                    value={formData.department || ''}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '4px', border: `1px solid ${T.border}`, background: T.inputBg, color: T.text }}
                    required
                  >
                    <option value="">-- Select Department --</option>
                    {departments.map(dept => (
                      <option key={dept.departmentCode} value={dept.departmentName}>
                        {dept.departmentName} ({dept.departmentCode})
                      </option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Class'}
                </button>
              </form>
            </div>

            <div className="card" style={{ marginTop: '20px' }}>
              <h3>Add Students to Class (Bulk)</h3>
              <div className="form-group">
                <label>Select Class</label>
                <select
                  value={selectedClass || ''}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: `1px solid ${T.border}`, background: T.inputBg, color: T.text }}
                >
                  <option value="">-- Select Class --</option>
                  {classes.map(cls => (
                    <option key={cls.className} value={cls.className}>
                      {cls.className} ({cls.totalStudents} students)
                    </option>
                  ))}
                </select>
              </div>
              <form onSubmit={handleAddBulkStudents}>
                <div className="form-group">
                  <label>Student Data (Format: email,name,regNo,password - one per line)</label>
                  <textarea
                    rows="10"
                    placeholder="student1@example.com,John Doe,REG001,password123&#10;student2@example.com,Jane Smith,REG002,password123"
                    value={bulkStudents}
                    onChange={(e) => setBulkStudents(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '4px', border: `1px solid ${T.border}`, fontFamily: 'monospace', background: T.inputBg, color: T.text }}
                    required
                  />
                </div>
                <button type="submit" className="btn-primary" disabled={loading || !selectedClass}>
                  {loading ? 'Adding...' : 'Add Students to Class'}
                </button>
              </form>
            </div>

            <div className="card" style={{ marginTop: '20px' }}>
              <h3>All Classes</h3>
              {classes.length === 0 ? (
                <p>No classes created yet.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
                  {classes.map(cls => (
                    <div key={cls.className} style={{ border: `1px solid ${T.border}`, borderRadius: '8px', padding: '15px', background: T.cardBg }}>
                      <h4 style={{ margin: '0 0 10px 0', color: T.text }}>{cls.className}</h4>
                      <p style={{ margin: '5px 0', fontSize: '14px', color: T.sub }}>{cls.semester}</p>
                      <p style={{ margin: '5px 0', fontSize: '14px', color: T.sub }}>{cls.department}</p>
                      <p style={{ margin: '10px 0', fontSize: '16px', fontWeight: 'bold', color: T.text }}>👥 {cls.totalStudents} students</p>
                      <button
                        onClick={() => handleDeleteClass(cls.className)}
                        style={{ padding: '8px 16px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}
                      >
                        🗑️ Delete Class
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'staff' && (
          <>
            <div className="page-header">
              <h1>Add Staff Member</h1>
              <p>Create new staff account</p>
            </div>
            <div className="card">
              <form onSubmit={handleAddStaff}>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Department</label>
                  <select
                    value={formData.department || ''}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '4px', border: `1px solid ${T.border}`, background: T.inputBg, color: T.text }}
                    required
                  >
                    <option value="">-- Select Department --</option>
                    {departments.map(dept => (
                      <option key={dept.departmentCode} value={dept.departmentCode}>
                        {dept.departmentName} ({dept.departmentCode})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <input
                    type="password"
                    value={formData.password || ''}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                </div>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Adding...' : 'Add Staff'}
                </button>
              </form>
            </div>
          </>
        )}

        {activeTab === 'staff-list' && (
          <>
            <div className="page-header">
              <h1>Staff List</h1>
              <p>All registered staff members</p>
            </div>
            <div className="card">
              {staffList.length === 0 ? (
                <p>No staff members found.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: T.headBg, borderBottom: `2px solid ${T.border}` }}>
                      <th style={th}>#</th>
                      <th style={th}>Name</th>
                      <th style={th}>Email</th>
                      <th style={th}>Department</th>
                      <th style={th}>Created</th>
                      <th style={th}>Reset Password</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffList.map((s, i) => (
                      <tr key={s.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                        <td style={td}>{i + 1}</td>
                        <td style={td}>{s.name}</td>
                        <td style={td}>{s.email}</td>
                        <td style={td}>{s.department}</td>
                        <td style={td}>{s.createdAt ? new Date(s.createdAt).toLocaleDateString() : 'N/A'}</td>
                        <td style={td}>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input
                              type="password"
                              placeholder="New password"
                              value={resetPasswords[s.id] || ''}
                              onChange={e => setResetPasswords({ ...resetPasswords, [s.id]: e.target.value })}
                              style={{ padding: '6px 10px', borderRadius: '6px', border: `1px solid ${T.border}`, fontSize: '13px', width: '140px', background: T.inputBg, color: T.text }}
                            />
                            <button
                              onClick={() => handleResetPassword(s.id)}
                              style={{ padding: '6px 12px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}
                            >
                              🔑 Reset
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {activeTab === 'student-list' && (
          <>
            <div className="page-header">
              <h1>Student List</h1>
              <p>All registered students with credentials</p>
            </div>
            <div className="card">
              {studentList.length === 0 ? (
                <p>No students found.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: T.headBg, borderBottom: `2px solid ${T.border}` }}>
                      <th style={th}>#</th>
                      <th style={th}>Name</th>
                      <th style={th}>Email</th>
                      <th style={th}>Reg No</th>
                      <th style={th}>Class</th>
                      <th style={th}>Password</th>
                      <th style={th}>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentList.map((s, i) => (
                      <tr key={s.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                        <td style={td}>{i + 1}</td>
                        <td style={td}>{s.name}</td>
                        <td style={td}>{s.email}</td>
                        <td style={td}>{s.regNo}</td>
                        <td style={td}>{s.className}</td>
                        <td style={td}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontFamily: 'monospace', fontSize: '13px' }}>
                              {showPasswords[s.id] ? s.password : '••••••••'}
                            </span>
                            <button
                              onClick={() => setShowPasswords(p => ({ ...p, [s.id]: !p[s.id] }))}
                              style={{ padding: '3px 8px', fontSize: '12px', background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: '4px', cursor: 'pointer', color: T.text }}
                            >
                              {showPasswords[s.id] ? '🙈' : '👁️'}
                            </button>
                          </div>
                        </td>
                        <td style={td}>{s.createdAt ? new Date(s.createdAt).toLocaleDateString() : 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {activeTab === 'student' && (
          <>
            <div className="page-header">
              <h1>Add Student</h1>
              <p>Create new student account</p>
            </div>
            <div className="card">
              <form onSubmit={handleAddStudent}>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Registration Number</label>
                  <input
                    type="text"
                    value={formData.regNo || ''}
                    onChange={(e) => setFormData({ ...formData, regNo: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Class (Optional)</label>
                  <select
                    value={formData.className || ''}
                    onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '4px', border: `1px solid ${T.border}`, background: T.inputBg, color: T.text }}
                  >
                    <option value="">-- No Class --</option>
                    {classes.map(cls => (
                      <option key={cls.className} value={cls.className}>{cls.className}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <input
                    type="password"
                    value={formData.password || ''}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                </div>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Adding...' : 'Add Student'}
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;
