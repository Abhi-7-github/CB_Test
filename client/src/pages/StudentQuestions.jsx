import { useEffect, useState, useRef } from 'react'
import { API_ENDPOINTS } from '../api'

import { useNavigate } from 'react-router-dom'

function shuffleArray(array) {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function StudentQuestions() {
  const navigate = useNavigate()
  const [questions, setQuestions] = useState([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [fileInputs, setFileInputs] = useState({})
  const [uploadStatus, setUploadStatus] = useState({})
  const [studentEmail, setStudentEmail] = useState(() => localStorage.getItem('studentEmail') || '')
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [submitStatus, setSubmitStatus] = useState({ type: 'idle', message: '' })
  const [answers, setAnswers] = useState({})
  const [markedForReview, setMarkedForReview] = useState({})
  const examDurationSeconds = 60 * 60
  const [remainingSeconds, setRemainingSeconds] = useState(examDurationSeconds)
  const autoSubmitTriggeredRef = useRef(false)
  const screenPreviewRef = useRef(null)
  const [hasScreenStream, setHasScreenStream] = useState(() => !!(window.__proctoringStreams && window.__proctoringStreams.screenStream))

  const [showFinishModal, setShowFinishModal] = useState(false)
  const [isTestActive, setIsTestActive] = useState(false)
  const [statusChecked, setStatusChecked] = useState(false)
  const [hasStartedExam, setHasStartedExam] = useState(false)

  // Use refs for checking conditions inside event listeners without dependency issues
  const isTestActiveRef = useRef(false)
  const hasStartedExamRef = useRef(false)

  useEffect(() => {
    isTestActiveRef.current = isTestActive
    hasStartedExamRef.current = hasStartedExam
  }, [isTestActive, hasStartedExam])

  useEffect(() => {
    // Question loading & jumbling (shuffling questions and options)
    let ignore = false
    const loadQuestions = async () => {
      try {
        const response = await fetch(API_ENDPOINTS.questions)
        if (!response.ok) throw new Error('Failed to load questions')
        const data = await response.json()
        if (!ignore) {
          const rawQuestions = Array.isArray(data) ? data : []
          const formattedQuestions = rawQuestions.map((q) => {
            let jumbledOptions = []
            if (Array.isArray(q.options) && q.options.length > 0) {
              const optionsWithOrig = q.options.map((optText, origIdx) => ({
                text: optText,
                originalIndex: origIdx
              }))
              jumbledOptions = shuffleArray(optionsWithOrig)
            }
            return {
              ...q,
              jumbledOptions
            }
          })
          const shuffledQuestions = shuffleArray(formattedQuestions)
          setQuestions(shuffledQuestions)
        }
      } catch (err) {
        if (!ignore) setError(err.message)
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    loadQuestions()
    return () => { ignore = true }
  }, [])

  const [hasCameraStream, setHasCameraStream] = useState(() => !!(window.__proctoringStreams && window.__proctoringStreams.cameraStream))

  useEffect(() => {
    // Camera stream tracking
    if (window.__proctoringStreams?.cameraStream) {
      const stream = window.__proctoringStreams.cameraStream;
      const track = stream.getVideoTracks()[0];

      const handleTrackEnded = () => {
        if (hasStartedExamRef.current && !isSubmittedRef.current) {
          handleViolation('Camera stream was stopped manually.')
        }
        setHasCameraStream(false)
      }

      if (track) {
        track.addEventListener('ended', handleTrackEnded);
        return () => {
          track.removeEventListener('ended', handleTrackEnded);
        }
      }
    }
  }, [])

  useEffect(() => {
    // Screen share tracking
    if (window.__proctoringStreams?.screenStream) {
      const stream = window.__proctoringStreams.screenStream;
      const track = stream.getVideoTracks()[0];

      const handleTrackEnded = () => {
        // Use refs to check current status without stale closures
        if (hasStartedExamRef.current && !isSubmittedRef.current) {
          handleViolation('Screen sharing was stopped manually.')
        }
        setHasScreenStream(false)
      }

      if (track) {
        track.addEventListener('ended', handleTrackEnded);
        return () => {
          track.removeEventListener('ended', handleTrackEnded);
        }
      }
    }
  }, [])

  // Check test status & Screen Share liveness
  useEffect(() => {
    let intervalId = null

    const checkStatus = async () => {
      // 1. Check if test was stopped by admin
      try {
        const res = await fetch(API_ENDPOINTS.testStatus, { cache: 'no-store' })
        if (!res.ok) {
          throw new Error(`Status check failed with ${res.status}`)
        }
        const data = await res.json()
        if (typeof data.isTestActive !== 'boolean') {
          throw new Error('Invalid status payload from server')
        }
        setIsTestActive(data.isTestActive)
      } catch (err) {
        console.error('Failed to check status', err)
        setError('Unable to verify test status. Please check your connection and refresh.')
      } finally {
        setStatusChecked(true)
      }

      // 2. Check if screen share is still active (Only if exam started)
      if (hasStartedExamRef.current && !isSubmittedRef.current) {
        // Check if global stream object is valid
        const stream = window.__proctoringStreams?.screenStream;
        const isStreamActive = stream && stream.active && stream.getVideoTracks().length > 0 && stream.getVideoTracks()[0].readyState === 'live';

        if (!isStreamActive) {
          handleViolation('Screen sharing was stopped or permission revoked.');
        }
      }
    }

    checkStatus()
    intervalId = setInterval(checkStatus, 2000) // Increased frequency for better security

    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [])

  useEffect(() => {
    // Keep preview flags in sync if streams appear later
    setHasScreenStream(!!window.__proctoringStreams?.screenStream)
  }, [])

  useEffect(() => {
    const email = localStorage.getItem('studentEmail') || ''
    setStudentEmail(email)

    // Check if system check passed
    const systemCheckPassed = localStorage.getItem('systemCheckPassed') === 'true'
    if (!systemCheckPassed) {
      navigate('/system-check', { replace: true })
      return
    }

    if (email) {
      const cleanEmail = email.trim().toLowerCase()
      fetch(API_ENDPOINTS.checkScore(cleanEmail))
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.hasSubmitted || data?.isSubmitted) {
            setIsSubmitted(true)
          }
        })
        .catch((err) => console.warn('Failed to verify DB score on StudentQuestions mount:', err))
    }

  }, [])

  // Refs for auto-submission to access latest state without re-binding listeners
  const answersRef = useRef(answers)
  const fileInputsRef = useRef(fileInputs)
  const isSubmittedRef = useRef(isSubmitted)
  const studentEmailRef = useRef(studentEmail)
  const isFilePickerOpenRef = useRef(false)
  const blurTimeoutRef = useRef(null)
  const examStartRef = useRef(null)
  const timerIntervalRef = useRef(null)

  useEffect(() => {
    answersRef.current = answers
    fileInputsRef.current = fileInputs
    isSubmittedRef.current = isSubmitted
    studentEmailRef.current = studentEmail
  }, [answers, fileInputs, isSubmitted, studentEmail])

  useEffect(() => {
    if (!hasStartedExam || isSubmitted) {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
        timerIntervalRef.current = null
      }
      return
    }

    if (!examStartRef.current) {
      examStartRef.current = Date.now()
    }

    const tick = () => {
      const elapsedSeconds = Math.floor((Date.now() - examStartRef.current) / 1000)
      const nextRemaining = Math.max(0, examDurationSeconds - elapsedSeconds)
      setRemainingSeconds(nextRemaining)

      if (nextRemaining === 0 && !isSubmittedRef.current && !autoSubmitTriggeredRef.current) {
        autoSubmitTriggeredRef.current = true
        handleSubmitTest(true, { useRefs: true, reason: 'Time is up. Auto-submitting test.' })
      }
    }

    tick()
    timerIntervalRef.current = setInterval(tick, 1000)

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
        timerIntervalRef.current = null
      }
    }
  }, [hasStartedExam, isSubmitted, examDurationSeconds])

  const formatTime = (totalSeconds) => {
    const safeSeconds = Math.max(0, totalSeconds)
    const minutes = Math.floor(safeSeconds / 60)
    const seconds = safeSeconds % 60
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  const getFullscreenElement = () =>
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement

  const enterFullscreen = () => {
    const docEl = document.documentElement
    if (docEl.requestFullscreen) {
      docEl.requestFullscreen().catch(() => { })
    } else if (docEl.mozRequestFullScreen) {
      docEl.mozRequestFullScreen().catch(() => { })
    } else if (docEl.webkitRequestFullscreen) {
      docEl.webkitRequestFullscreen().catch(() => { })
    } else if (docEl.msRequestFullscreen) {
      docEl.msRequestFullscreen().catch(() => { })
    }
  }

  const isDevToolsOpen = () => {
    const widthGap = Math.abs(window.outerWidth - window.innerWidth)
    const heightGap = Math.abs(window.outerHeight - window.innerHeight)
    return widthGap > 160 || heightGap > 160
  }

  const handleViolation = (reason) => {
    // Only handle violations if the test is active AND the student has actually started the exam
    if (!isTestActiveRef.current || !hasStartedExamRef.current) return
    if (isSubmittedRef.current || autoSubmitTriggeredRef.current) return

    autoSubmitTriggeredRef.current = true
    handleSubmitTest(true, { useRefs: true, reason })
  }

  // Anti-cheating & Security
  useEffect(() => {
    // 1. Tab Switching / Window Blur (with grace period for system popups)
    const handleBlur = () => {
      if (!isSubmittedRef.current && !isFilePickerOpenRef.current) {
        // Delay violation trigger to allow for quick interactions (like "Hide" sharing bar)
        blurTimeoutRef.current = setTimeout(() => {
          handleViolation('Tab switching or window focus lost.')
        }, 5000) // 5 seconds grace period
      }
    }

    const handleFocus = () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current)
        blurTimeoutRef.current = null
      }
      setTimeout(() => { isFilePickerOpenRef.current = false }, 1000)
    }

    // 2. Fullscreen Exit Detection
    const handleFullscreenChange = () => {
      // Only check if test is active AND started
      if (isTestActiveRef.current && hasStartedExamRef.current) {
        if (!getFullscreenElement() && !isSubmittedRef.current) {
          handleViolation('Fullscreen mode exited.')
        }
      }
    }

    window.addEventListener('blur', handleBlur)
    window.addEventListener('focus', handleFocus)

    // 3. Prevent Back Navigation & Gestures
    const handlePopState = (e) => {
      e.preventDefault()
      window.history.pushState(null, null, window.location.href)
    }
    window.history.pushState(null, null, window.location.href)
    window.addEventListener('popstate', handlePopState)

    // Prevent horizontal scroll/swipe gestures
    const preventSwipe = (e) => {
      // Prevent 2-finger swipe back (horizontal scroll)
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.preventDefault()
      }
    }
    window.addEventListener('wheel', preventSwipe, { passive: false })

    // CSS to prevent swipe navigation
    document.body.style.overscrollBehaviorX = 'none'

    // Key & Context Menu Proctoring Restrictions (Blocks Ctrl+I, Ctrl+A, Ctrl+V, Ctrl+J, Windows Key, etc.)
    const handleKeyDownRestrictions = (e) => {
      const key = e.key ? e.key.toLowerCase() : ''
      const isCtrlOrMeta = e.ctrlKey || e.metaKey

      // Block Windows Key / Meta Key / OS Key
      if (e.key === 'Meta' || e.key === 'OS' || e.keyCode === 91 || e.keyCode === 92) {
        e.preventDefault()
        e.stopPropagation()
        return false
      }

      // Block Ctrl+I, Ctrl+A, Ctrl+V, Ctrl+J, Ctrl+C, Ctrl+U, Ctrl+S, Ctrl+P
      if (isCtrlOrMeta && ['i', 'a', 'v', 'j', 'c', 'u', 's', 'p'].includes(key)) {
        e.preventDefault()
        e.stopPropagation()
        return false
      }

      // Block F12 DevTools
      if (e.key === 'F12' || e.keyCode === 123) {
        e.preventDefault()
        e.stopPropagation()
        return false
      }
    }

    const handleContextMenuRestrictions = (e) => {
      e.preventDefault()
      e.stopPropagation()
      return false
    }

    window.addEventListener('keydown', handleKeyDownRestrictions, true)
    window.addEventListener('contextmenu', handleContextMenuRestrictions, true)

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    document.addEventListener('mozfullscreenchange', handleFullscreenChange)
    document.addEventListener('MSFullscreenChange', handleFullscreenChange)

    return () => {
      window.removeEventListener('blur', handleBlur)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('keydown', handleKeyDownRestrictions, true)
      window.removeEventListener('contextmenu', handleContextMenuRestrictions, true)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange)
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange)
    }
  }, [])

  if (loading || !statusChecked) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600 mx-auto"></div>
          <p className="text-sm font-medium text-slate-500">Loading assessment...</p>
        </div>
      </div>
    )
  }

  if (!isTestActive && !isSubmitted) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-50 px-4 text-center">
        <div className="max-w-md rounded-2xl bg-white p-10 shadow-xl ring-1 ring-slate-900/5">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
          </div>
          <h1 className="mb-3 text-2xl font-bold text-slate-900">Waiting for Exam to Start</h1>
          <p className="text-slate-500 mb-8">
            The assessment has not been started by the administrator yet.<br />
            Please wait, the page will refresh automatically.
          </p>
          <div className="flex items-center justify-center gap-2 text-xs font-medium text-slate-400 uppercase tracking-wider">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            Live Status Check
          </div>
        </div>
      </div>
    )
  }

  // New Block: Test is Active, but Student hasn't explicitly started (clicked the button to enter fullscreen/set state)
  if (isTestActive && !hasStartedExam && !isSubmitted) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-50 px-4 text-center">
        <div className="max-w-md rounded-2xl bg-white p-10 shadow-xl ring-1 ring-slate-900/5">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
          </div>
          <h1 className="mb-3 text-2xl font-bold text-slate-900">Assessment Ready</h1>
          <p className="text-slate-500 mb-8">
            The assessment is live. Click the button below to enter fullscreen mode and begin.<br />
            <span className="text-rose-500 text-xs font-bold mt-2 block">Note: Exiting fullscreen will trigger an auto-submission.</span>
          </p>
          <button
            onClick={() => {
              enterFullscreen()
              setHasStartedExam(true)
            }}
            className="w-full rounded-lg bg-emerald-600 px-8 py-4 text-lg font-bold text-white shadow-lg hover:bg-emerald-700 transition-transform active:scale-95"
          >
            Start Assessment
          </button>
        </div>
      </div>
    )
  }

  if (error) {
    return <p className="text-sm text-rose-600">{error}</p>
  }

  const handleFileChange = (questionId, file) => {
    setFileInputs((prev) => ({ ...prev, [questionId]: file }))
  }

  const handleUpload = async (question) => {
    const questionId = question._id
    if (!questionId) {
      setUploadStatus((prev) => ({
        ...prev,
        [question.id || 'unknown']: { type: 'error', message: 'Question id missing.' },
      }))
      return
    }

    const file = fileInputs[questionId]
    if (!file) {
      setUploadStatus((prev) => ({
        ...prev,
        [questionId]: { type: 'error', message: 'Please choose a file.' },
      }))
      return
    }

    setUploadStatus((prev) => ({
      ...prev,
      [questionId]: { type: 'loading', message: 'Uploading...' },
    }))

    const formData = new FormData()
    formData.append('file', file)
    formData.append('studentEmail', 'student@klu.ac.in')

    try {
      const response = await fetch(API_ENDPOINTS.submissions(questionId), {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      setUploadStatus((prev) => ({
        ...prev,
        [questionId]: { type: 'success', message: 'File uploaded.' },
      }))
      setFileInputs((prev) => ({ ...prev, [questionId]: null }))
    } catch (err) {
      setUploadStatus((prev) => ({
        ...prev,
        [questionId]: { type: 'error', message: err.message },
      }))
    }
  }

  async function handleSubmitTest(forced = false, options = {}) {
    const { useRefs = false, reason = '', skipConfirm = false } = options
    const currentStudentEmail = useRefs ? studentEmailRef.current : studentEmail
    const currentAnswers = useRefs ? answersRef.current : answers
    const currentFileInputs = useRefs ? fileInputsRef.current : fileInputs
    const currentIsSubmitted = useRefs ? isSubmittedRef.current : isSubmitted

    if (!currentStudentEmail) {
      setSubmitStatus({ type: 'error', message: 'Login required before submitting.' })
      return
    }

    if (currentIsSubmitted) {
      // If already submitted, just return
      return
    }

    if (!forced) {
      if (!skipConfirm) {
        // Calculate answered questions count
        const answeredIds = new Set([
          ...Object.keys(currentAnswers),
          ...Object.keys(currentFileInputs).filter(id => currentFileInputs[id])
        ])
        const count = answeredIds.size
        const total = questions.length

        if (!window.confirm(`Do you want to submit the test?\n\nAttempted: ${count}\nTotal: ${total}`)) {
          return
        }
      }
    } else {
      const alertMessage = reason || 'Fullscreen mode exited. Auto-submitting test.'
      alert(alertMessage)
    }

    setSubmitStatus({
      type: 'loading',
      message: forced
        ? reason
          ? `Auto-submitting: ${reason}`
          : 'Auto-submitting due to fullscreen exit...'
        : 'Submitting...',
    })

    try {
      let resultScore = 0
      let resultTotal = questions.length

      function resolveCorrectIndex(question) {
        if (!question || !Array.isArray(question.options)) return null
        const total = question.options.length
        const raw = question.correctAnswer
        if (raw === null || raw === undefined) return null

        if (typeof raw === 'number' && Number.isFinite(raw)) {
          if (raw >= 0 && raw < total) return raw
          if (raw >= 1 && raw <= total) return raw - 1
          return null
        }

        const text = String(raw).trim()
        if (!text) return null

        if (/^[A-Za-z]$/.test(text)) {
          const idx = text.toUpperCase().charCodeAt(0) - 65
          return idx >= 0 && idx < total ? idx : null
        }

        if (/^\d+$/.test(text)) {
          const num = Number(text)
          if (num >= 0 && num < total) return num
          if (num >= 1 && num <= total) return num - 1
          return null
        }

        const exactIdx = question.options.indexOf(text)
        if (exactIdx !== -1) return exactIdx

        const lowered = text.toLowerCase()
        const ciIdx = question.options.findIndex((opt) => String(opt).toLowerCase() === lowered)
        return ciIdx !== -1 ? ciIdx : null
      }

      try {
        const response = await fetch(API_ENDPOINTS.submitTest, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            studentEmail: currentStudentEmail,
            responses: currentAnswers
          })
        })

        if (response.status === 403) {
          const errData = await response.json().catch(() => ({}))
          setIsSubmitted(true)
          setSubmitStatus({
            type: 'error',
            message: errData.message || 'Exam already submitted. You are not allowed to rewrite the exam.'
          })
          return
        }

        if (response.ok) {
          const resData = await response.json()
          resultScore = resData.score !== undefined ? resData.score : 0
          resultTotal = resData.totalMarks !== undefined ? resData.totalMarks : questions.length
        } else {
          questions.forEach(q => {
            const qId = q._id || q.id
            const correctIdx = resolveCorrectIndex(q)
            if (currentAnswers[qId] !== undefined && correctIdx !== null && Number(currentAnswers[qId]) === Number(correctIdx)) {
              resultScore += (q.marks || 1)
            }
          })
        }
      } catch (fetchErr) {
        console.warn('Backend endpoint error, saving score locally:', fetchErr)
        questions.forEach(q => {
          const qId = q._id || q.id
          const correctIdx = resolveCorrectIndex(q)
          if (currentAnswers[qId] !== undefined && correctIdx !== null && Number(currentAnswers[qId]) === Number(correctIdx)) {
            resultScore += (q.marks || 1)
          }
        })
      }

      const cleanEmail = currentStudentEmail.trim().toLowerCase()
      const scoreObj = {
        studentEmail: cleanEmail,
        score: resultScore,
        totalMarks: resultTotal,
        updatedAt: new Date().toISOString()
      }

      localStorage.setItem(`studentScore:${cleanEmail}`, JSON.stringify(scoreObj))

      try {
        const existingScores = JSON.parse(localStorage.getItem('allStudentScores') || '[]')
        const updatedScores = [
          scoreObj,
          ...existingScores.filter(s => s?.studentEmail !== cleanEmail)
        ]
        localStorage.setItem('allStudentScores', JSON.stringify(updatedScores))
      } catch (e) {
        console.error('Failed to update local scores array:', e)
      }

      setIsSubmitted(true)
      setSubmitStatus({ type: 'success', message: 'Test submitted successfully!' })
    } catch (err) {
      console.error(err)
      setSubmitStatus({ type: 'error', message: err.message })
    }
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
      {/* LEFT SIDEBAR - QUESTION PANEL */}
      <aside className="flex w-64 flex-col border-r border-slate-200 bg-white shadow-sm hidden md:flex z-10">
        {/* MONITORING PANEL */}
        <div className="p-4 border-b border-slate-100">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Monitoring</h2>
          <div className="grid grid-cols-2 gap-2">
            {/* Camera & Mic */}
            <div className="relative aspect-video overflow-hidden rounded-lg bg-slate-900 border border-slate-200 shadow-sm">
              <div className="absolute top-1 left-1.5 z-10 flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                <span className="text-[8px] font-bold text-white uppercase tracking-wider shadow-black drop-shadow-md">Camera</span>
              </div>
              {hasCameraStream ? (
                <video
                  ref={el => {
                    if (el && window.__proctoringStreams?.cameraStream) {
                      el.srcObject = window.__proctoringStreams.cameraStream
                    }
                  }}
                  autoPlay
                  muted
                  playsInline
                  className="h-full w-full object-cover opacity-90"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-[8px] text-slate-400">Off</div>
              )}
              {hasCameraStream && <div className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-emerald-500 border border-white animate-pulse shadow-sm" />}
            </div>

            {/* Screen */}
            <div className="relative aspect-video overflow-hidden rounded-lg bg-slate-900 border border-slate-200 shadow-sm">
              <div className="absolute top-1 left-1.5 z-10 flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white"><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
                <span className="text-[8px] font-bold text-white uppercase tracking-wider shadow-black drop-shadow-md">Screen</span>
              </div>
              {hasScreenStream ? (
                <video
                  ref={el => {
                    if (el && window.__proctoringStreams?.screenStream) {
                      el.srcObject = window.__proctoringStreams.screenStream
                    }
                    screenPreviewRef.current = el
                  }}
                  autoPlay
                  muted
                  playsInline
                  className="h-full w-full object-cover opacity-90"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-[8px] text-slate-400">Off</div>
              )}
              {hasScreenStream && <div className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-emerald-500 border border-white animate-pulse shadow-sm" />}
            </div>
          </div>
        </div>

        <div className="p-4 border-b border-slate-100">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Question Panel
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-4 gap-3">
            {questions.map((q, index) => {
              const qId = q._id || q.id || index;
              const isCurrent = index === currentQuestionIndex;
              const isAnswered = answers[qId] !== undefined || fileInputs[qId];
              const isReview = markedForReview[qId];

              let btnClass = "bg-white border text-slate-600 hover:bg-slate-50"; // Default

              if (isCurrent) {
                btnClass = "border-blue-500 text-blue-600 ring-1 ring-blue-500 bg-blue-50 font-bold";
              } else if (isReview && isAnswered) {
                btnClass = "border-purple-500 text-purple-600 bg-purple-50";
              } else if (isReview) {
                btnClass = "border-orange-500 text-orange-600 bg-orange-50";
              } else if (isAnswered) {
                btnClass = "border-emerald-500 text-emerald-600 bg-emerald-50";
              } else {
                btnClass = "border-slate-200";
              }

              return (
                <button
                  key={qId}
                  onClick={() => setCurrentQuestionIndex(index)}
                  className={`
                    flex h-10 w-10 items-center justify-center rounded-lg text-sm font-medium transition-all shadow-sm
                    ${btnClass}
                  `}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="border-t border-slate-100 p-4 text-xs font-medium text-slate-600 space-y-2">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-blue-500"></span> Current
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-emerald-500"></span> Answered
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-orange-500"></span> Review
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-purple-500"></span> Both
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">

        {/* TOP HEADER */}
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm z-10">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-slate-900">Event Assessment</h1>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              Question {currentQuestionIndex + 1} / {questions.length}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 shadow-sm">
              <div className="text-xs">
                <div className="font-semibold text-slate-800">{studentEmail || 'Unknown email'}</div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500">Student</div>
              </div>
              <div className="h-8 w-px bg-slate-200" />
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-slate-500">Time Left</div>
                <div className={`text-sm font-bold ${remainingSeconds <= 60 ? 'text-rose-600' : 'text-slate-900'}`}>
                  {formatTime(remainingSeconds)}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowFinishModal(true)}
              className="rounded-md bg-slate-900 px-5 py-2 text-sm font-bold text-white shadow-md hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-transform active:scale-95"
              disabled={isSubmitted}
            >
              Finish Assessment
            </button>
          </div>
        </header>

        {/* QUESTION AREA */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">


          {/* Alerts */}
          {submitStatus.message && !isSubmitted && submitStatus.type === 'error' && (
            <div className="w-full mb-6 p-4 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 shadow-sm">
              {submitStatus.message}
            </div>
          )}

          {questions.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-slate-400">
              <svg className="h-12 w-12 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>No questions loaded.</p>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col">
              {/* Controls Bar */}
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <label className="flex cursor-pointer items-center gap-2 select-none">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-slate-300 shadow-sm transition-all checked:border-indigo-500 checked:bg-indigo-500 hover:border-indigo-400"
                      checked={(() => {
                        const q = questions[currentQuestionIndex];
                        return q && markedForReview[(q._id || q.id || currentQuestionIndex)];
                      })() || false}
                      onChange={() => {
                        const q = questions[currentQuestionIndex];
                        if (!q) return;
                        const qId = q._id || q.id || currentQuestionIndex;
                        setMarkedForReview(prev => ({
                          ...prev,
                          [qId]: !prev[qId]
                        }))
                      }}
                    />
                    <svg className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 transition-opacity peer-checked:opacity-100" width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-slate-600">Mark for review</span>
                </label>

                <div className="flex items-center gap-2">
                  <span className="rounded border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-sm font-bold text-emerald-600 shadow-sm">+1</span>
                  <span className="rounded border border-rose-200 bg-rose-50 px-2.5 py-1 text-sm font-bold text-rose-600 shadow-sm">0</span>
                </div>
              </div>

              {/* Question Card */}
              {(() => {
                const question = questions[currentQuestionIndex];
                if (!question) return null;
                const qId = question._id || question.id;
                const currentAnswer = answers[qId];

                return (
                  <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all">
                    <div className="p-6 md:p-8">
                      <div className="mb-6">
                        <p className="text-sm font-medium text-slate-500 mb-2">Question {currentQuestionIndex + 1} of {questions.length}</p>
                        <h2 className="text-xl md:text-2xl font-semibold text-slate-900 leading-snug">
                          {question.text}
                        </h2>
                      </div>

                      {/* Options */}
                      {((Array.isArray(question.jumbledOptions) && question.jumbledOptions.length > 0) ||
                        (Array.isArray(question.options) && question.options.length > 0)) && (
                        <div className="space-y-3">
                          {(
                            question.jumbledOptions ||
                            question.options.map((optText, origIdx) => ({
                              text: optText,
                              originalIndex: origIdx,
                            }))
                          ).map((optObj, index) => {
                            const isSelected = currentAnswer === optObj.originalIndex;
                            return (
                              <div
                                key={`${qId}-opt-${index}`}
                                onClick={() => {
                                  if (!isSubmitted) setAnswers(prev => ({ ...prev, [qId]: optObj.originalIndex }))
                                }}
                                className={`
                                       group flex cursor-pointer items-center gap-4 rounded-lg border-2 p-4 transition-all
                                       ${isSelected
                                    ? 'border-blue-500 bg-blue-50/50'
                                    : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50'}
                                    `}
                              >
                                <div className={`
                                        flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all
                                        ${isSelected ? 'border-blue-500' : 'border-slate-300 group-hover:border-slate-400'}
                                     `}>
                                  {isSelected && <div className="h-3 w-3 rounded-full bg-blue-500" />}
                                </div>
                                <span className={`text-base font-medium ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>
                                  {optObj.text}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* File Upload Type - Styling match */}
                      {question.type === 'file' && (
                        <div className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                          <p className="text-slate-600 mb-4">Upload your response for this question.</p>
                          <div className="flex flex-col items-center gap-4">
                            <input
                              type="file"
                              accept={question.fileUpload?.accept?.join(',') || undefined}
                              onChange={(event) =>
                                handleFileChange(qId, event.target.files?.[0] || null)
                              }
                              onClick={() => { isFilePickerOpenRef.current = true }}
                              className="file:mr-4 file:py-2.5 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 text-sm text-slate-500"
                              disabled={isSubmitted}
                            />
                            <button
                              type="button"
                              onClick={() => handleUpload(question)}
                              className="rounded-full bg-slate-900 px-6 py-2 text-sm font-bold text-white shadow-md transition-transform active:scale-95"
                              disabled={isSubmitted}
                            >
                              Upload Answer
                            </button>
                            {uploadStatus[qId] && (
                              <div className={`mt-2 text-sm font-bold ${uploadStatus[qId].type === 'success' ? 'text-emerald-600' :
                                uploadStatus[qId].type === 'loading' ? 'text-blue-600' : 'text-rose-600'
                                }`}>
                                {uploadStatus[qId].message}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Clear Response */}
                      <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
                        <button
                          onClick={() => {
                            if (isSubmitted) return;
                            setAnswers(prev => {
                              const next = { ...prev };
                              delete next[qId];
                              return next;
                            });
                            setFileInputs(prev => {
                              const next = { ...prev };
                              delete next[qId];
                              return next;
                            });
                          }}
                          disabled={isSubmitted}
                          className="group flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-rose-600 transition-colors disabled:opacity-50"
                        >
                          <span className="flex h-4 w-4 items-center justify-center rounded border border-slate-300 group-hover:border-rose-400 bg-white shadow-sm">
                            {/* Dummy checkbox look */}
                          </span>
                          Clear Response
                        </button>

                        {/* Nav Buttons integrated here for better flow */}
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                            disabled={currentQuestionIndex === 0}
                            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 disabled:opacity-50"
                          >
                            Previous
                          </button>
                          <button
                            onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
                            disabled={currentQuestionIndex === questions.length - 1}
                            className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-bold text-white shadow hover:bg-indigo-700 disabled:opacity-50"
                          >
                            Next
                          </button>
                        </div>
                      </div>

                    </div>
                  </article>
                );
              })()}
            </div>
          )}
        </div>
      </main>

      {/* Custom Finish Assessment Modal */}
      {showFinishModal && (() => {
        const answeredCount = new Set([
          ...Object.keys(answers),
          ...Object.keys(fileInputs).filter(id => fileInputs[id])
        ]).size
        const totalQuestions = questions.length
        const unansweredCount = totalQuestions - answeredCount
        const progress = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between p-6 pb-2">
                <h3 className="text-xl font-bold text-slate-900">Finish Assessment?</h3>
                <button
                  onClick={() => setShowFinishModal(false)}
                  className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>

              {/* Body */}
              <div className="px-6 py-4">
                <p className="text-sm font-medium text-slate-600 mb-3">Total Questions: <span className="text-slate-900 font-bold">{totalQuestions}</span></p>

                {/* Progress Bar */}
                <div className="h-6 w-full bg-blue-100 border border-blue-200 overflow-hidden mb-4 relative">
                  <div
                    className="h-full bg-blue-600 transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>

                <div className="flex items-center justify-between text-base font-medium mb-6">
                  <div className="flex flex-col">
                    <span className="text-slate-500 text-sm">Answered</span>
                    <span className="text-2xl font-bold text-slate-900">{answeredCount}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-slate-500 text-sm">Unanswered</span>
                    <span className="text-2xl font-bold text-slate-900">{unansweredCount}</span>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex justify-center pt-2">
                  <button
                    onClick={() => {
                      setShowFinishModal(false)
                      handleSubmitTest(false, { skipConfirm: true })
                    }}
                    className="w-full rounded-none bg-black py-4 text-base font-bold text-white shadow-lg hover:bg-slate-800 transition-all active:scale-[0.99] flex items-center justify-center gap-2"
                  >
                    Yes, Finish Assessment
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}
      {/* Success Card Modal - Shown when isSubmitted is true */}
      {isSubmitted && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-50/95 backdrop-blur-sm p-4 animate-in fade-in duration-500">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/5 text-center p-10 transform transition-all scale-100">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100 mb-6 animate-bounce">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Excellent!</h2>
            <h3 className="text-xl font-semibold text-slate-700 mb-6">Exam Submitted Successfully</h3>
            <p className="text-slate-500 mb-8 leading-relaxed">
              Your assessment has been recorded securely.<br />You may now exit the exam window.
            </p>
            <button
              onClick={() => navigate('/')}
              className="w-full rounded-xl bg-slate-900 py-4 text-lg font-bold text-white shadow-xl hover:bg-slate-800 hover:shadow-2xl transition-all active:scale-[0.98]"
            >
              Return to Home
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default StudentQuestions
