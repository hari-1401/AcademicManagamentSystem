import React, { useState, useEffect, useRef } from 'react';
import './QuizFullscreen.css';

const QuizFullscreen = ({ quizId, token, onComplete }) => {
  const [quiz, setQuiz] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState('');
  const [quizStarted, setQuizStarted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const tabSwitchRef = useRef(0);
  const quizRef = useRef(null);
  const answersRef = useRef({});
  
  const MAX_TAB_SWITCHES = 3;
  const API_BASE = 'http://localhost:8000';

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3000);
  };

  useEffect(() => {
    const loadQuiz = async () => {
      try {
        const response = await fetch(`${API_BASE}/student/quiz/${quizId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load quiz');
        
        const data = await response.json();
        setQuiz(data);
        if (data.timeLimit) {
          setTimeRemaining(data.timeLimit * 60); // Convert minutes to seconds
        }
        setLoading(false);
      } catch (error) {
        showNotification('Error loading quiz: ' + error.message);
      }
    };
    
    loadQuiz();
  }, [quizId, token]);

  const startQuiz = () => {
    setQuizStarted(true);
    console.log('Quiz started');
  };

  useEffect(() => {
    quizRef.current = quiz;
    answersRef.current = answers;
  }, [quiz, answers]);

  useEffect(() => {
    tabSwitchRef.current = tabSwitchCount;
  }, [tabSwitchCount]);

  // Timer countdown
  useEffect(() => {
    if (!quizStarted || timeRemaining === null || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          showNotification('Time is up! Auto-submitting quiz...');
          setTimeout(() => handleSubmit(true), 1000);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [quizStarted, timeRemaining]);

  const handleSubmit = async (autoSubmit = false) => {
    if (!quiz) return;
    
    if (!autoSubmit) {
      const answered = Object.keys(answers).length;
      const total = quiz.questions.length;
      
      if (answered < total) {
        if (!window.confirm(`Only ${answered}/${total} answered. Submit anyway?`)) {
          return;
        }
      }
    }

    try {
      const response = await fetch(`${API_BASE}/student/submit-quiz`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          quizId: quizRef.current.id,
          answers: answersRef.current,
          tabSwitchCount: tabSwitchRef.current,
          autoSubmitted: autoSubmit
        })
      });

      const result = await response.json();

      if (response.ok) {
        alert(`Quiz submitted!\nMarks: ${result.marks}/${result.totalMarks}\nCorrect: ${result.correctAnswers}`);
        onComplete && onComplete(result);
      } else {
        showNotification('Error: ' + result.detail);
      }
    } catch (error) {
      showNotification('Error submitting quiz: ' + error.message);
    }
  };

  useEffect(() => {
    if (!quizStarted || !quiz) return;

    let lastSwitch = 0;

    const incrementCounter = () => {
      const now = Date.now();
      if (now - lastSwitch < 1000) return;
      lastSwitch = now;
      
      const newCount = tabSwitchRef.current + 1;
      tabSwitchRef.current = newCount;
      setTabSwitchCount(newCount);
      
      if (newCount >= MAX_TAB_SWITCHES) {
        showNotification('Maximum tab switches! Auto-submitting...');
        setTimeout(() => handleSubmit(true), 2000);
      } else {
        showNotification(`Warning: Tab switch ${newCount}/${MAX_TAB_SWITCHES}`);
      }
    };

    const handleBlur = () => {
      console.log('Tab/Window switched');
      incrementCounter();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('Tab hidden');
        incrementCounter();
      }
    };

    window.addEventListener('blur', handleBlur, true);
    document.addEventListener('visibilitychange', handleVisibilityChange, true);
    
    return () => {
      window.removeEventListener('blur', handleBlur, true);
      document.removeEventListener('visibilitychange', handleVisibilityChange, true);
    };
  }, [quiz, quizStarted]);

  const formatTime = (seconds) => {
    if (seconds === null) return null;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    if (timeRemaining === null) return '#28a745';
    if (timeRemaining < 60) return '#dc3545';
    if (timeRemaining < 300) return '#ffc107';
    return '#28a745';
  };

  if (loading) return <div className="loading">Loading quiz...</div>;
  if (!quiz) return <div className="error">Failed to load quiz</div>;

  if (!quizStarted) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}>
        <div style={{
          background: 'white',
          padding: '40px',
          borderRadius: '15px',
          textAlign: 'center',
          maxWidth: '500px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
        }}>
          <h2 style={{ marginBottom: '20px', color: '#333' }}>{quiz.title}</h2>
          <p style={{ marginBottom: '15px', color: '#666' }}>Total Questions: <strong>{quiz.questions.length}</strong></p>
          <p style={{ marginBottom: '15px', color: '#666' }}>Total Marks: <strong>{quiz.totalMarks}</strong></p>
          {quiz.timeLimit && (
            <p style={{ marginBottom: '15px', color: '#dc3545', fontWeight: 'bold' }}>⏱️ Time Limit: <strong>{quiz.timeLimit} minutes</strong></p>
          )}
          <div style={{
            background: '#fff3cd',
            border: '1px solid #ffc107',
            padding: '15px',
            borderRadius: '8px',
            marginBottom: '25px'
          }}>
            <p style={{ margin: '5px 0', fontSize: '14px', color: '#856404' }}>⚠️ Quiz will take full screen</p>
            <p style={{ margin: '5px 0', fontSize: '14px', color: '#856404' }}>⚠️ Tab switching is monitored (Max 3 switches)</p>
            {quiz.timeLimit && (
              <p style={{ margin: '5px 0', fontSize: '14px', color: '#856404' }}>⚠️ Quiz will auto-submit when time expires</p>
            )}
          </div>
          <button
            onClick={startQuiz}
            style={{
              background: '#4CAF50',
              color: 'white',
              border: 'none',
              padding: '15px 40px',
              fontSize: '18px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Start Quiz
          </button>
        </div>
      </div>
    );
  }

  const answered = Object.keys(answers).length;
  const total = quiz.questions.length;
  const remaining = total - answered;
  const progress = (answered / total) * 100;
  const currentQ = quiz.questions[currentQuestion];

  return (
    <div className="quiz-container">
      {notification && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: '#f44336',
          color: 'white',
          padding: '15px 25px',
          borderRadius: '8px',
          zIndex: 10000,
          fontSize: '16px',
          fontWeight: 'bold',
          boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
        }}>
          {notification}
        </div>
      )}
      
      <div style={{
        background: '#ff9800',
        color: 'white',
        padding: '10px',
        textAlign: 'center',
        fontWeight: 'bold',
        borderRadius: '5px',
        maxWidth: '900px',
        margin: '0 auto 20px auto'
      }}>
        ⚠️ Tab switching monitoring is active
      </div>

      <div className="header">
        <h1 className="quiz-title">{quiz.title}</h1>
        
        <div className="progress-section">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }}>
              {Math.round(progress)}%
            </div>
          </div>
          
          <div className="stats">
            {timeRemaining !== null && (
              <span className="stat-item" style={{ background: getTimerColor(), color: 'white', fontWeight: 'bold' }}>
                ⏱️ Time: <strong>{formatTime(timeRemaining)}</strong>
              </span>
            )}
            <span className="stat-item">Total: <strong>{total}</strong></span>
            <span className="stat-item">Answered: <strong>{answered}</strong></span>
            <span className="stat-item">Remaining: <strong>{remaining}</strong></span>
            <span className="stat-item warning">
              Tab Switches: <strong className="tab-switch-counter">{tabSwitchCount}/{MAX_TAB_SWITCHES}</strong>
            </span>
          </div>
        </div>

        <div className="question-grid">
          {quiz.questions.map((_, index) => (
            <div
              key={index}
              className={`question-number ${answers[index] !== undefined ? 'answered' : ''} ${index === currentQuestion ? 'current' : ''}`}
              onClick={() => setCurrentQuestion(index)}
            >
              {index + 1}
            </div>
          ))}
        </div>
      </div>

      <div className="question-card">
        <div className="question-header">
          Question {currentQuestion + 1} of {total}
        </div>
        <div className="question-text">{currentQ.question}</div>
        
        <div className="options">
          {Object.entries(currentQ.options).map(([key, value]) => (
            <div
              key={key}
              className={`option ${answers[currentQuestion] === key ? 'selected' : ''}`}
              onClick={() => setAnswers({ ...answers, [currentQuestion]: key })}
            >
              <input
                type="radio"
                name="answer"
                value={key}
                checked={answers[currentQuestion] === key}
                onChange={() => {}}
              />
              <span><strong>{key}.</strong> {value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="navigation">
        <button
          className="btn btn-primary"
          onClick={() => setCurrentQuestion(prev => prev - 1)}
          disabled={currentQuestion === 0}
        >
          Previous
        </button>
        
        <button
          className="btn btn-primary"
          onClick={() => setCurrentQuestion(prev => prev + 1)}
          disabled={currentQuestion === total - 1}
        >
          Next
        </button>
        
        <button
          className="btn btn-success"
          onClick={() => handleSubmit(false)}
        >
          Submit Quiz
        </button>
      </div>
    </div>
  );
};

export default QuizFullscreen;
