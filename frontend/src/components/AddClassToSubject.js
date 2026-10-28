import React, { useState, useEffect } from 'react';
import { staffAPI } from '../api';

function AddClassToSubject({ subjectId, onSuccess }) {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const response = await staffAPI.getAvailableClasses();
      setClasses(response.data.classes || []);
    } catch (err) {
      console.error('Failed to fetch classes');
    }
  };

  const handleAddClass = async (e) => {
    e.preventDefault();
    if (!selectedClass) {
      alert('Please select a class');
      return;
    }

    setLoading(true);
    try {
      const response = await staffAPI.addClassToSubject({
        subjectId,
        className: selectedClass
      });
      alert(response.data.message);
      if (onSuccess) onSuccess();
      setSelectedClass('');
    } catch (err) {
      alert('Failed to add class: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: '#f0f8ff', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
      <h3 style={{ marginTop: 0 }}>Add Class to Subject</h3>
      <p style={{ color: '#666', marginBottom: '15px' }}>
        Select a class to add all students to this subject. Automated emails will be sent to all students.
      </p>
      <form onSubmit={handleAddClass}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Select Class</label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            required
            style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
          >
            <option value="">-- Select Class --</option>
            {classes.map(cls => (
              <option key={cls.className} value={cls.className}>
                {cls.className} - {cls.semester} ({cls.totalStudents} students)
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '10px 20px',
            background: loading ? '#ccc' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          {loading ? 'Adding Class...' : '➕ Add Class & Notify Students'}
        </button>
      </form>
    </div>
  );
}

export default AddClassToSubject;
