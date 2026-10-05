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
  const [studentName, setStudentName] = useState(() => localStorage.getItem('studentName') || '')
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
  const [submissionReason, setSubmissionReason] = useState('')

  // Use refs for checking conditions inside event listeners without dependency issues
  const isTestActiveRef = useRef(false)
  const hasStartedExamRef = useRef(false)
  const handleViolationRef = useRef(null)
  const handleSubmitTestRef = useRef(null)
  const fullscreenGracePeriodRef = useRef(0)

  useEffect(() => {
    // Question loading & jumbling
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
          handleViolationRef.current?.('Camera stream was stopped manually.')
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
        if (hasStartedExamRef.current && !isSubmittedRef.current) {
          handleViolationRef.current?.('Screen sharing was stopped manually.')
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

      if (hasStartedExamRef.current && !isSubmittedRef.current) {
        const stream = window.__proctoringStreams?.screenStream;
        const isStreamActive = stream && stream.active && stream.getVideoTracks().length > 0 && stream.getVideoTracks()[0].readyState === 'live';

        if (!isStreamActive) {
          handleViolationRef.current?.('Screen sharing was stopped or permission revoked.');
        }
      }
    }

    checkStatus()
    intervalId = setInterval(checkStatus, 2000)

    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [])

  useEffect(() => {
    setHasScreenStream(!!window.__proctoringStreams?.screenStream)
  }, [])

  useEffect(() => {
    const email = localStorage.getItem('studentEmail') || ''
    const name = localStorage.getItem('studentName') || ''
    setStudentEmail(email)
    setStudentName(name)

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
  }, [navigate])

  const answersRef = useRef(answers)
  const fileInputsRef = useRef(fileInputs)
  const isSubmittedRef = useRef(isSubmitted)
  const studentEmailRef = useRef(studentEmail)
  const studentNameRef = useRef(studentName)
  const isFilePickerOpenRef = useRef(false)
  const blurTimeoutRef = useRef(null)
  const examStartRef = useRef(null)
  const timerIntervalRef = useRef(null)

  useEffect(() => {
    answersRef.current = answers
    fileInputsRef.current = fileInputs
    isSubmittedRef.current = isSubmitted
    studentEmailRef.current = studentEmail
    studentNameRef.current = studentName
  }, [answers, fileInputs, isSubmitted, studentEmail, studentName])

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
        handleSubmitTestRef.current?.(true, { useRefs: true, reason: 'Time is up. Auto-submitting test.' })
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

  const isFullscreenActive = () =>
    Boolean(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    )

  const enterFullscreen = async () => {
    const docEl = document.documentElement
    try {
      if (docEl.requestFullscreen) {
        await docEl.requestFullscreen()
      } else if (docEl.webkitRequestFullscreen) {
        await docEl.webkitRequestFullscreen()
      } else if (docEl.mozRequestFullScreen) {
        await docEl.mozRequestFullScreen()
      } else if (docEl.msRequestFullscreen) {
        await docEl.msRequestFullscreen()
      }
      return true
    } catch (err) {
      console.warn('Fullscreen request failed:', err)
      return false
    }
  }

  const handleViolation = (reason) => {
    if (!isTestActiveRef.current || !hasStartedExamRef.current) return
    if (isSubmittedRef.current || autoSubmitTriggeredRef.current) return

    autoSubmitTriggeredRef.current = true
    setSubmissionReason(reason)
    handleSubmitTestRef.current?.(true, { useRefs: true, reason })
  }

  // Synchronize mutable refs every render for event handlers
  isTestActiveRef.current = isTestActive
  hasStartedExamRef.current = hasStartedExam
  handleViolationRef.current = handleViolation
  handleSubmitTestRef.current = handleSubmitTest
  answersRef.current = answers
  fileInputsRef.current = fileInputs
  isSubmittedRef.current = isSubmitted
  studentEmailRef.current = studentEmail
  studentNameRef.current = studentName

  // Continuous Fullscreen Integrity Monitor
  useEffect(() => {
    if (!hasStartedExam || isSubmitted) return

    const checkFullscreen = () => {
      if (!hasStartedExamRef.current || isSubmittedRef.current) return
      if (Date.now() < (fullscreenGracePeriodRef.current || 0)) return

      if (!isFullscreenActive()) {
        handleViolationRef.current?.('Fullscreen mode is not active. Assessment automatically submitted.')
      }
    }

    checkFullscreen()
    const interval = setInterval(checkFullscreen, 400)
    return () => clearInterval(interval)
  }, [hasStartedExam, isSubmitted])

  // Anti-cheating & Security
  useEffect(() => {
    const handleBlur = () => {
      if (!isSubmittedRef.current && !isFilePickerOpenRef.current) {
        blurTimeoutRef.current = setTimeout(() => {
          handleViolationRef.current?.('Tab switching or window focus lost.')
        }, 5000)
      }
    }

    const handleFocus = () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current)
        blurTimeoutRef.current = null
      }
      setTimeout(() => { isFilePickerOpenRef.current = false }, 1000)
    }

    const handleFullscreenChange = () => {
      if (hasStartedExamRef.current && !isSubmittedRef.current) {
        if (Date.now() < (fullscreenGracePeriodRef.current || 0)) return
        if (!isFullscreenActive()) {
          handleViolationRef.current?.('Fullscreen mode exited. Assessment automatically submitted.')
        }
      }
    }

    const handleWindowResize = () => {
      if (hasStartedExamRef.current && !isSubmittedRef.current) {
        if (Date.now() < (fullscreenGracePeriodRef.current || 0)) return
        if (!isFullscreenActive()) {
          handleViolationRef.current?.('Fullscreen mode exited or window altered. Assessment automatically submitted.')
        }
      }
    }

    window.addEventListener('blur', handleBlur)
    window.addEventListener('focus', handleFocus)
    window.addEventListener('resize', handleWindowResize)

    const handlePopState = (e) => {
      e.preventDefault()
      window.history.pushState(null, null, window.location.href)
    }
    window.history.pushState(null, null, window.location.href)
    window.addEventListener('popstate', handlePopState)

    const preventSwipe = (e) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.preventDefault()
      }
    }
    window.addEventListener('wheel', preventSwipe, { passive: false })
    document.body.style.overscrollBehaviorX = 'none'

    const handleKeyDownRestrictions = (e) => {
      const key = e.key ? e.key.toLowerCase() : ''
      const isCtrlOrMeta = e.ctrlKey || e.metaKey

      if (e.key === 'Meta' || e.key === 'OS' || e.keyCode === 91 || e.keyCode === 92) {
        e.preventDefault()
        e.stopPropagation()
        return false
      }

      if (isCtrlOrMeta && ['i', 'a', 'v', 'j', 'c', 'u', 's', 'p'].includes(key)) {
        e.preventDefault()
        e.stopPropagation()
        return false
      }

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
      window.removeEventListener('resize', handleWindowResize)
      window.removeEventListener('popstate', handlePopState)
      window.removeEventListener('wheel', preventSwipe)
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
      <div className="flex h-screen w-full items-center justify-center bg-[#F4F1DE]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#D4C4A8] border-t-[#0D1B2A]"></div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#415A77]">Preparing Examination Session...</p>
        </div>
      </div>
    )
  }

  // Pre-test: Waiting for Admin to Begin
  if (!isTestActive && !isSubmitted) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-[#F4F1DE] px-4 text-center">
        <div className="w-full max-w-md rounded-2xl border border-[#0D1B2A]/10 bg-[#FFFFFF] p-8 shadow-sm">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EDF2EE] text-[#415A77] border border-[#778D7A]/30">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <h1 className="mb-2 text-xl font-bold tracking-tight text-[#0D1B2A]">Waiting for Invigilator to Start</h1>
          <p className="text-xs leading-relaxed text-[#415A77] mb-6">
            The assessment has not yet been unlocked by the examination administrator.<br />
            Please remain on this screen. The session will automatically activate.
          </p>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#D4C4A8]/60 bg-[#F7F3EA] px-3.5 py-1.5 text-[11px] font-semibold text-[#415A77]">
            <span className="h-2 w-2 rounded-full bg-[#778D7A] animate-pulse"></span>
            <span>Live Session Listener Active</span>
          </div>
        </div>
      </div>
    )
  }

  // Pre-test: Admin has started, student confirms and enters fullscreen
  if (isTestActive && !hasStartedExam && !isSubmitted) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-[#F4F1DE] px-4 text-center">
        <div className="w-full max-w-md rounded-2xl border border-[#0D1B2A]/10 bg-[#FFFFFF] p-8 shadow-sm">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EDF2EE] text-[#778D7A] border border-[#778D7A]/40">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h1 className="mb-2 text-xl font-bold tracking-tight text-[#0D1B2A]">Assessment Unlocked</h1>
          <p className="text-xs leading-relaxed text-[#415A77] mb-6">
            The examination is now active. Click below to enter full-screen mode and initiate your timer.
            <span className="mt-2 block font-semibold text-[#9E2A2B]">
              Notice: Leaving full-screen or switching tabs will trigger immediate auto-submission.
            </span>
          </p>
          <button
            type="button"
            onClick={async () => {
              try {
                await enterFullscreen()
              } catch (e) {
                console.warn('Enter fullscreen error:', e)
              }
              fullscreenGracePeriodRef.current = Date.now() + 1500
              examStartRef.current = Date.now()
              setHasStartedExam(true)
            }}
            className="w-full rounded-xl bg-[#0D1B2A] py-3 text-sm font-semibold text-[#F4F1DE] shadow-xs transition-colors duration-200 hover:bg-[#1B263B] active:scale-[0.99]"
          >
            Start Assessment & Enter Fullscreen
          </button>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#F4F1DE] p-4">
        <div className="rounded-xl border border-[#9E2A2B]/20 bg-[#FBEAEA] p-4 text-xs font-semibold text-[#782828]">
          {error}
        </div>
      </div>
    )
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
        [questionId]: { type: 'error', message: 'Please choose a file to upload.' },
      }))
      return
    }

    setUploadStatus((prev) => ({
      ...prev,
      [questionId]: { type: 'loading', message: 'Uploading document...' },
    }))

    const formData = new FormData()
    formData.append('file', file)
    formData.append('studentEmail', studentEmail || 'student@klu.ac.in')

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
        [questionId]: { type: 'success', message: 'File successfully uploaded.' },
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
    const currentStudentName = useRefs ? studentNameRef.current : studentName
    const currentAnswers = useRefs ? answersRef.current : answers
    const currentFileInputs = useRefs ? fileInputsRef.current : fileInputs
    const currentIsSubmitted = useRefs ? isSubmittedRef.current : isSubmitted

    if (!currentStudentEmail) {
      setSubmitStatus({ type: 'error', message: 'Login required before submitting.' })
      return
    }

    if (currentIsSubmitted) {
      return
    }

    if (!forced) {
      if (!skipConfirm) {
        const answeredIds = new Set([
          ...Object.keys(currentAnswers),
          ...Object.keys(currentFileInputs).filter(id => currentFileInputs[id])
        ])
        const count = answeredIds.size
        const total = questions.length

        if (!window.confirm(`Do you want to submit the assessment?\n\nAttempted: ${count}\nTotal Questions: ${total}`)) {
          return
        }
      }
    } else {
      if (reason) {
        setSubmissionReason(reason)
      }
    }

    setSubmitStatus({
      type: 'loading',
      message: forced
        ? (reason ? `Auto-submitting: ${reason}` : 'Auto-submitting assessment...')
        : 'Submitting assessment...',
    })

    try {
      let resultScore = 0
      let resultTotal = questions.length

      const response = await fetch(API_ENDPOINTS.submitTest, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          studentEmail: currentStudentEmail,
          studentName: currentStudentName,
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

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.message || 'Failed to submit test to server.')
      }

      const resData = await response.json()
      resultScore = resData.score !== undefined ? resData.score : 0
      resultTotal = resData.totalMarks !== undefined ? resData.totalMarks : questions.length

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
      if (forced) {
        setIsSubmitted(true)
      }
      setSubmitStatus({ type: 'error', message: err.message })
    }
  }

  return (
    <div className="flex h-screen w-full bg-[#F4F1DE] font-sans text-[#0D1B2A] overflow-hidden select-none">
      
      {/* 1. LEFT NAVIGATION: Deep navy / dark navy accents & Question Palette */}
      <aside className="hidden md:flex w-72 flex-col border-r border-[#0D1B2A]/10 bg-[#FAF8F2] shadow-2xs z-20">
        
        {/* Monitoring Panel */}
        <div className="p-4 border-b border-[#0D1B2A]/10">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#415A77]">
              Proctoring Monitor
            </span>
            <span className="flex items-center gap-1.5 text-[10px] font-semibold text-[#778D7A]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#778D7A] animate-pulse" />
              Recording
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Camera Preview */}
            <div className="relative aspect-video overflow-hidden rounded-xl bg-[#0D1B2A] border border-[#1B263B] shadow-inner">
              <div className="absolute top-1 left-1.5 z-10 flex items-center gap-1">
                <span className="text-[9px] font-bold text-[#D4C4A8] uppercase tracking-wider">Camera</span>
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
                <div className="flex h-full items-center justify-center text-[9px] text-[#415A77]">Standby</div>
              )}
              {hasCameraStream && (
                <div className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-[#778D7A] border border-[#0D1B2A]" />
              )}
            </div>

            {/* Screen Preview */}
            <div className="relative aspect-video overflow-hidden rounded-xl bg-[#0D1B2A] border border-[#1B263B] shadow-inner">
              <div className="absolute top-1 left-1.5 z-10 flex items-center gap-1">
                <span className="text-[9px] font-bold text-[#D4C4A8] uppercase tracking-wider">Screen</span>
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
                <div className="flex h-full items-center justify-center text-[9px] text-[#415A77]">Standby</div>
              )}
              {hasScreenStream && (
                <div className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-[#778D7A] border border-[#0D1B2A]" />
              )}
            </div>
          </div>
        </div>

        {/* Question Palette Header */}
        <div className="px-4 py-3 border-b border-[#0D1B2A]/10 bg-[#FAF8F2]">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#0D1B2A]">
              Question Palette
            </h2>
            <span className="text-[11px] font-medium text-[#415A77]">
              {questions.length} Items
            </span>
          </div>
        </div>

        {/* Question Palette Matrix */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-4 gap-2.5">
            {questions.map((q, index) => {
              const qId = q._id || q.id || index;
              const isCurrent = index === currentQuestionIndex;
              const isAnswered = answers[qId] !== undefined || fileInputs[qId];
              const isReview = markedForReview[qId];

              // Holst palette question statuses:
              // Current → #415A77
              // Answered → #778D7A
              // Mark for review → #D4C4A8
              // Answered + review → dark navy (#1B263B) with beige indicator
              // Unattempted → muted neutral border
              let btnStyle = "bg-white text-[#415A77] border border-[#0D1B2A]/15 hover:bg-[#FAF8F2]";

              if (isCurrent) {
                btnStyle = "border-2 border-[#415A77] bg-[#415A77]/10 text-[#0D1B2A] font-bold shadow-2xs";
              } else if (isReview && isAnswered) {
                btnStyle = "bg-[#1B263B] text-[#F4F1DE] border-2 border-[#D4C4A8] font-semibold";
              } else if (isReview) {
                btnStyle = "bg-[#D4C4A8] text-[#0D1B2A] border border-[#D4C4A8] font-semibold";
              } else if (isAnswered) {
                btnStyle = "bg-[#778D7A] text-[#F4F1DE] border border-[#778D7A] font-semibold";
              }

              return (
                <button
                  key={qId}
                  type="button"
                  onClick={() => setCurrentQuestionIndex(index)}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl text-xs transition-all duration-150 ${btnStyle}`}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
        </div>

        {/* Compact Status Legend */}
        <div className="border-t border-[#0D1B2A]/10 bg-[#FAF8F2] p-4 text-[11px] font-medium text-[#415A77] space-y-2">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-md border-2 border-[#415A77] bg-[#415A77]/20" />
            <span>Current</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-md bg-[#778D7A]" />
            <span>Answered</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-md bg-[#D4C4A8]" />
            <span>Marked for review</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-md bg-[#1B263B] border border-[#D4C4A8]" />
            <span>Answered & Review</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-md border border-[#0D1B2A]/20 bg-white" />
            <span>Unattempted</span>
          </div>
        </div>
      </aside>

      {/* 2. MAIN VIEWPORT */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* TOP HEADER */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-[#0D1B2A]/10 bg-[#FAF8F2] px-6 z-10">
          <div className="flex items-center gap-3">
            <img
              src="/CB-KARE.jpeg"
              alt="CB-KARE Logo"
              className="h-8 w-auto rounded-md object-contain border border-[#0D1B2A]/10"
            />
            <span className="font-bold text-sm tracking-tight text-[#0D1B2A]">
              CB-KARE Examination
            </span>
            <span className="rounded-lg border border-[#0D1B2A]/10 bg-white px-2.5 py-1 text-xs font-semibold text-[#415A77]">
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Student Chip */}
            <div className="hidden sm:flex items-center gap-2 rounded-xl border border-[#0D1B2A]/10 bg-white px-3 py-1.5">
              <div className="text-right">
                <div className="text-xs font-bold text-[#0D1B2A] max-w-[140px] truncate">{studentName || studentEmail || 'student@klu.ac.in'}</div>
                <div className="text-[10px] text-[#415A77] uppercase tracking-wider">{studentName ? studentEmail : 'Candidate'}</div>
              </div>
            </div>

            {/* Timer */}
            <div className="flex items-center gap-2 rounded-xl border border-[#0D1B2A]/10 bg-white px-3.5 py-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={remainingSeconds <= 60 ? 'text-[#9E2A2B]' : 'text-[#415A77]'}>
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#415A77] block leading-none">Time Left</span>
                <span className={`text-sm font-bold tracking-wider ${remainingSeconds <= 60 ? 'text-[#9E2A2B] animate-pulse' : 'text-[#0D1B2A]'}`}>
                  {formatTime(remainingSeconds)}
                </span>
              </div>
            </div>

            {/* Finish Button */}
            <button
              type="button"
              onClick={() => setShowFinishModal(true)}
              disabled={isSubmitted}
              className="rounded-xl bg-[#0D1B2A] px-4 py-2 text-xs font-semibold text-[#F4F1DE] shadow-xs transition-colors duration-200 hover:bg-[#1B263B] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Finish Assessment
            </button>
          </div>
        </header>

        {/* 3. MAIN QUESTION WORKSPACE */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#F4F1DE]">
          
          {submitStatus.message && !isSubmitted && submitStatus.type === 'error' && (
            <div className="mb-4 rounded-xl border border-[#9E2A2B]/20 bg-[#FBEAEA] p-3.5 text-xs font-semibold text-[#782828]">
              {submitStatus.message}
            </div>
          )}

          {questions.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-[#415A77]">
              <p className="text-sm">No assessment questions loaded.</p>
            </div>
          ) : (
            <div className="mx-auto max-w-4xl">
              
              {/* Question Control Ribbon */}
              <div className="mb-4 flex items-center justify-between">
                <label className="flex cursor-pointer items-center gap-2 select-none rounded-xl border border-[#0D1B2A]/10 bg-white px-3.5 py-1.5 shadow-2xs hover:bg-[#FAF8F2] transition-colors">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-[#0D1B2A]/20 text-[#415A77] focus:ring-0 accent-[#415A77]"
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
                  <span className="text-xs font-semibold text-[#415A77]">Mark for Review</span>
                </label>

                <div className="flex items-center gap-2 text-xs">
                  <span className="rounded-lg border border-[#778D7A]/30 bg-[#EDF2EE] px-2.5 py-1 font-bold text-[#415A77]">
                    +{questions[currentQuestionIndex]?.marks || 1}.0 Marks
                  </span>
                  <span className="rounded-lg border border-[#D4C4A8]/60 bg-[#F7F3EA] px-2.5 py-1 font-bold text-[#415A77]">
                    0.0 Negative
                  </span>
                </div>
              </div>

              {/* Question Card */}
              {(() => {
                const question = questions[currentQuestionIndex];
                if (!question) return null;
                const qId = question._id || question.id;
                const currentAnswer = answers[qId];

                return (
                  <article className="rounded-2xl border border-[#0D1B2A]/10 bg-white p-6 md:p-8 shadow-xs">
                    
                    {/* Prompt Header */}
                    <div className="mb-6">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#415A77] mb-1.5 block">
                        Question {currentQuestionIndex + 1}
                      </span>
                      <h2 className="text-lg md:text-xl font-semibold leading-relaxed text-[#0D1B2A]">
                        {question.text}
                      </h2>
                    </div>

                    {/* MCQ Options List */}
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
                              className={`flex cursor-pointer items-center gap-3.5 rounded-xl border p-4 transition-all duration-150 ${
                                isSelected
                                  ? 'border-[#415A77] bg-[#415A77]/5 text-[#0D1B2A]'
                                  : 'border-[#0D1B2A]/10 bg-white hover:border-[#415A77]/30 hover:bg-[#FAF8F2] text-[#415A77]'
                              }`}
                            >
                              <div
                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all ${
                                  isSelected ? 'border-[#415A77]' : 'border-[#0D1B2A]/20'
                                }`}
                              >
                                {isSelected && <div className="h-2.5 w-2.5 rounded-full bg-[#415A77]" />}
                              </div>
                              <span className="text-sm font-medium leading-relaxed">
                                {optObj.text}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* File Upload Question Type */}
                    {question.type === 'file' && (
                      <div className="rounded-xl border border-dashed border-[#0D1B2A]/20 bg-[#FAF8F2] p-6 text-center">
                        <p className="text-xs text-[#415A77] mb-3">Upload your document response for this question.</p>
                        <div className="flex flex-col items-center gap-3">
                          <input
                            type="file"
                            accept={question.fileUpload?.accept?.join(',') || undefined}
                            onChange={(event) =>
                              handleFileChange(qId, event.target.files?.[0] || null)
                            }
                            onClick={() => { isFilePickerOpenRef.current = true }}
                            className="text-xs text-[#415A77] file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#0D1B2A] file:text-[#F4F1DE] hover:file:bg-[#1B263B]"
                            disabled={isSubmitted}
                          />
                          <button
                            type="button"
                            onClick={() => handleUpload(question)}
                            className="rounded-xl bg-[#0D1B2A] px-5 py-2 text-xs font-semibold text-[#F4F1DE] shadow-xs hover:bg-[#1B263B] transition-colors"
                            disabled={isSubmitted}
                          >
                            Upload File Response
                          </button>
                          {uploadStatus[qId] && (
                            <div className={`text-xs font-semibold mt-1 ${
                              uploadStatus[qId].type === 'success' ? 'text-[#778D7A]' :
                              uploadStatus[qId].type === 'loading' ? 'text-[#415A77]' : 'text-[#9E2A2B]'
                            }`}>
                              {uploadStatus[qId].message}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Bottom Question Controls */}
                    <div className="mt-8 pt-6 border-t border-[#0D1B2A]/10 flex flex-wrap items-center justify-between gap-4">
                      <button
                        type="button"
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
                        className="text-xs font-semibold text-[#415A77] hover:text-[#9E2A2B] transition-colors disabled:opacity-50"
                      >
                        Clear Response
                      </button>

                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                          disabled={currentQuestionIndex === 0}
                          className="rounded-xl border border-[#0D1B2A]/15 bg-white px-4 py-2 text-xs font-semibold text-[#415A77] hover:bg-[#FAF8F2] hover:text-[#0D1B2A] disabled:opacity-40 transition-colors"
                        >
                          Previous
                        </button>
                        <button
                          type="button"
                          onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
                          disabled={currentQuestionIndex === questions.length - 1}
                          className="rounded-xl bg-[#0D1B2A] px-5 py-2 text-xs font-semibold text-[#F4F1DE] hover:bg-[#1B263B] disabled:opacity-40 transition-colors"
                        >
                          Next Question
                        </button>
                      </div>
                    </div>

                  </article>
                );
              })()}

            </div>
          )}
        </div>
      </main>

      {/* Confirmation Modal */}
      {showFinishModal && (() => {
        const answeredCount = new Set([
          ...Object.keys(answers),
          ...Object.keys(fileInputs).filter(id => fileInputs[id])
        ]).size
        const totalQuestions = questions.length
        const unansweredCount = totalQuestions - answeredCount
        const progress = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0D1B2A]/40 p-4">
            <div className="w-full max-w-md rounded-2xl border border-[#0D1B2A]/10 bg-white p-6 shadow-xl">
              
              <div className="flex items-center justify-between pb-3 border-b border-[#0D1B2A]/10">
                <h3 className="text-base font-bold text-[#0D1B2A]">Confirm Assessment Submission</h3>
                <button
                  type="button"
                  onClick={() => setShowFinishModal(false)}
                  className="rounded-lg p-1 text-[#415A77] hover:bg-[#FAF8F2]"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <div className="py-4 space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#415A77]">Completion Progress</span>
                  <span className="font-bold text-[#0D1B2A]">{Math.round(progress)}%</span>
                </div>

                <div className="h-2 w-full overflow-hidden rounded-full bg-[#F7F3EA] border border-[#0D1B2A]/10">
                  <div
                    className="h-full bg-[#778D7A] transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 text-center pt-2">
                  <div className="rounded-xl border border-[#778D7A]/30 bg-[#EDF2EE] p-3">
                    <span className="text-[11px] font-semibold text-[#415A77] uppercase tracking-wider block">Answered</span>
                    <span className="text-xl font-bold text-[#0D1B2A]">{answeredCount}</span>
                  </div>
                  <div className="rounded-xl border border-[#D4C4A8]/40 bg-[#F7F3EA] p-3">
                    <span className="text-[11px] font-semibold text-[#415A77] uppercase tracking-wider block">Unanswered</span>
                    <span className="text-xl font-bold text-[#0D1B2A]">{unansweredCount}</span>
                  </div>
                </div>

                <p className="text-[11px] text-[#415A77] text-center leading-relaxed">
                  Once submitted, responses are committed to the examination registry and cannot be altered.
                </p>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowFinishModal(false)}
                    className="flex-1 rounded-xl border border-[#0D1B2A]/15 bg-white py-2.5 text-xs font-semibold text-[#415A77] hover:bg-[#FAF8F2]"
                  >
                    Return to Test
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowFinishModal(false)
                      handleSubmitTest(false, { skipConfirm: true })
                    }}
                    className="flex-1 rounded-xl bg-[#0D1B2A] py-2.5 text-xs font-semibold text-[#F4F1DE] hover:bg-[#1B263B] shadow-xs"
                  >
                    Confirm Submission
                  </button>
                </div>
              </div>

            </div>
          </div>
        )
      })()}

      {/* Auto-submitting In-Progress Overlay */}
      {!isSubmitted && submitStatus.type === 'loading' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0D1B2A]/75 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl border border-[#0D1B2A]/20 bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-3 border-[#D4C4A8] border-t-[#0D1B2A]" />
            <h3 className="text-sm font-bold text-[#0D1B2A] mb-1">Submitting Assessment</h3>
            <p className="text-xs text-[#415A77]">{submitStatus.message || 'Recording responses in database...'}</p>
          </div>
        </div>
      )}

      {/* Submission Success Screen */}
      {isSubmitted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#F4F1DE]/95 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#0D1B2A]/10 bg-white p-8 text-center shadow-xl">
            <div className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl ${
              submissionReason
                ? 'bg-[#FBEAEA] text-[#9E2A2B] border border-[#9E2A2B]/40'
                : 'bg-[#EDF2EE] text-[#778D7A] border border-[#778D7A]/40'
            }`}>
              {submissionReason ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
            <h2 className="text-xl font-bold text-[#0D1B2A] mb-1.5">
              {submissionReason ? 'Assessment Auto-Submitted' : 'Assessment Completed'}
            </h2>
            <p className="text-xs text-[#415A77] leading-relaxed mb-6">
              {submissionReason
                ? `${submissionReason} Your responses have been saved and submitted to the evaluation system.`
                : 'Your examination responses have been securely transmitted and recorded in the database.'}
            </p>
            {submitStatus.type === 'error' && submitStatus.message && (
              <div className="mb-4 rounded-xl border border-[#9E2A2B]/20 bg-[#FBEAEA] p-3 text-xs font-semibold text-[#782828]">
                {submitStatus.message}
              </div>
            )}
            <button
              type="button"
              onClick={() => navigate('/')}
              className="w-full rounded-xl bg-[#0D1B2A] py-3 text-xs font-semibold text-[#F4F1DE] hover:bg-[#1B263B] shadow-xs"
            >
              Exit Examination Portal
            </button>
          </div>
        </div>
      )}

    </div>
  )
}

export default StudentQuestions
