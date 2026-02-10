import { useEffect, useState, useRef } from 'react'
import { API_ENDPOINTS } from '../api'

import { useNavigate } from 'react-router-dom'

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
  const [result, setResult] = useState(null)
  const wasFullscreenRef = useRef(false)
  const autoSubmitTriggeredRef = useRef(false)
  const warnedRef = useRef(false)
  const violationTimerRef = useRef(null)
  const cameraPreviewRef = useRef(null)
  const screenPreviewRef = useRef(null)
  const [hasCameraStream, setHasCameraStream] = useState(() => !!(window.__proctoringStreams && window.__proctoringStreams.cameraStream))
  const [hasScreenStream, setHasScreenStream] = useState(() => !!(window.__proctoringStreams && window.__proctoringStreams.screenStream))

  useEffect(() => {
    let ignore = false

    const loadQuestions = async () => {
      try {
        const response = await fetch(API_ENDPOINTS.questions)
        if (!response.ok) {
          throw new Error('Failed to load questions')
        }
        const data = await response.json()
        if (!ignore) {
          setQuestions(data)
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message)
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    loadQuestions()

    return () => {
      ignore = true
    }
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
      setIsSubmitted(localStorage.getItem(`testSubmitted:${email}`) === 'true')
    }

  }, [])

  // Refs for auto-submission to access latest state without re-binding listeners
  const answersRef = useRef(answers)
  const fileInputsRef = useRef(fileInputs)
  const isSubmittedRef = useRef(isSubmitted)
  const studentEmailRef = useRef(studentEmail)
  const isFilePickerOpenRef = useRef(false)
  const blurTimeoutRef = useRef(null)

  useEffect(() => {
      answersRef.current = answers
      fileInputsRef.current = fileInputs
      isSubmittedRef.current = isSubmitted
      studentEmailRef.current = studentEmail
  }, [answers, fileInputs, isSubmitted, studentEmail])

  const getFullscreenElement = () =>
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement

  const isDevToolsOpen = () => {
    const widthGap = Math.abs(window.outerWidth - window.innerWidth)
    const heightGap = Math.abs(window.outerHeight - window.innerHeight)
    return widthGap > 160 || heightGap > 160
  }

  const handleViolation = (reason) => {
    if (isSubmittedRef.current || autoSubmitTriggeredRef.current) return
    autoSubmitTriggeredRef.current = true
    handleSubmitTest(true, { useRefs: true, reason })
  }

  // Anti-cheating & Security
  useEffect(() => {
    // 1. Disable Right Click
    const handleContextMenu = (e) => {
      e.preventDefault()
      // Optional: warnedRef logic could go here if we wanted to warn before submit
      // For now, user requested "inspect click also test exit and auto submit"
      // triggering immediatley might be harsh for just right click, but let's prevent it
      // and maybe warn. If they mistakenly right click, immediate fail is rough.
      // But let's assume "if inspect click" implies trying to inspect.
      // We will just block it. If they try shortcuts, we submit.
    }

    // 2. Disable Keyboard Shortcuts for DevTools
    const handleKeyDown = (e) => {
      // F12
      if (e.key === 'F12') {
        e.preventDefault()
        handleViolation('Inspector usage attempt detected.')
      }
      // Ctrl+Shift+I (Inspect), Ctrl+Shift+J (Console), Ctrl+Shift+C (Element Inspector), Ctrl+U (Source)
      if (
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
        (e.ctrlKey && e.key === 'U')
      ) {
        e.preventDefault()
        handleViolation('Inspector usage attempt detected.')
      }
    }



    // 3. Tab Switching / Window Blur (with grace period for system popups)
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

    // 4. Fullscreen Exit Detection
    const handleFullscreenChange = () => {
        if (!getFullscreenElement() && !isSubmittedRef.current) {
             handleViolation('Fullscreen mode exited.')
        }
    }

    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('blur', handleBlur)
    window.addEventListener('focus', handleFocus)
    
    // 5. Prevent Back Navigation & Gestures
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

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    document.addEventListener('mozfullscreenchange', handleFullscreenChange)
    document.addEventListener('MSFullscreenChange', handleFullscreenChange)

    // Interval for DevTools check (using dimensions)
    const intervalId = setInterval(() => {
      if (isDevToolsOpen() && !isSubmittedRef.current) {
        handleViolation('Developer tools detected.')
      }
    }, 1000)

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('blur', handleBlur)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange)
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange)
      clearInterval(intervalId)
    }
  }, [])

  if (loading) {
    return <p className="text-sm text-slate-500">Loading questions...</p>
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
    const { useRefs = false, reason = '' } = options
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

      if (!response.ok) {
        throw new Error('Submission failed')
      }

      const data = await response.json()
      
      localStorage.setItem(`testSubmitted:${currentStudentEmail}`, 'true')
      setIsSubmitted(true)
      navigate('/')
    } catch (err) {
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
              {/* Camera */}
              <div className="relative aspect-video overflow-hidden rounded-lg bg-slate-900 border border-slate-200 shadow-sm">
                  <div className="absolute top-1 left-1.5 z-10 flex items-center gap-1">
                     <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                     <span className="text-[8px] font-bold text-white uppercase tracking-wider shadow-black drop-shadow-md">Camera</span>
                  </div>
                  {hasCameraStream ? (
                     <video 
                        ref={el => {
                            if (el && window.__proctoringStreams?.cameraStream) {
                                el.srcObject = window.__proctoringStreams.cameraStream
                                el.play().catch(() => {})
                            }
                            cameraPreviewRef.current = el
                        }}
                        autoPlay 
                        muted 
                        playsInline 
                        className="h-full w-full object-cover opacity-90" 
                     />
                  ) : (
                     <div className="flex h-full items-center justify-center text-[8px] text-slate-400">Off</div>
                  )}
                  {hasCameraStream && <div className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-red-500 border border-white animate-pulse shadow-sm" />}
              </div>

               {/* Screen */}
              <div className="relative aspect-video overflow-hidden rounded-lg bg-slate-900 border border-slate-200 shadow-sm">
                   <div className="absolute top-1 left-1.5 z-10 flex items-center gap-1">
                     <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                     <span className="text-[8px] font-bold text-white uppercase tracking-wider shadow-black drop-shadow-md">Screen</span>
                  </div>
                  {hasScreenStream ? (
                     <video 
                        ref={el => {
                             if (el && window.__proctoringStreams?.screenStream) {
                                el.srcObject = window.__proctoringStreams.screenStream
                                el.play().catch(() => {})
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


             <button
                type="button"
                onClick={() => handleSubmitTest(false)}
                className="rounded-md bg-slate-900 px-5 py-2 text-sm font-bold text-white shadow-md hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-transform active:scale-95"
                disabled={isSubmitted}
              >
                Finish Assessment
            </button>
          </div>
        </header>

        {/* QUESTION AREA */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
           {isSubmitted && (
            <div className="w-full mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 shadow-sm">
               <h3 className="font-bold">Test Submitted!</h3>
               <p className="text-sm mt-1">Your response has been recorded.</p>
               {submitStatus.message && <div className="mt-2 text-sm font-semibold">{submitStatus.message}</div>}
            </div>
          )}

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
                             if(!q) return;
                             const qId = q._id || q.id || currentQuestionIndex;
                             setMarkedForReview(prev => ({
                               ...prev,
                               [qId]: !prev[qId]
                             }))
                          }}
                        />
                         <svg className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 transition-opacity peer-checked:opacity-100" width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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
                        {Array.isArray(question.options) && question.options.length > 0 && (
                          <div className="space-y-3">
                            {question.options.map((option, index) => {
                               const isSelected = currentAnswer === index;
                               return (
                                  <div 
                                    key={`${qId}-opt-${index}`}
                                    onClick={() => {
                                        if(!isSubmitted) setAnswers(prev => ({ ...prev, [qId]: index }))
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
                                        {option}
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
                                     <div className={`mt-2 text-sm font-bold ${
                                         uploadStatus[qId].type === 'success' ? 'text-emerald-600' : 
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
                                  if(isSubmitted) return;
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
    </div>
  )
}

export default StudentQuestions
