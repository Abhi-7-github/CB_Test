import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_ENDPOINTS } from '../api'

function SystemCheck() {
  const navigate = useNavigate()

  // Initialize state from existing window streams if available (prevents double permission request on back nav)
  const [screenStream, setScreenStream] = useState(() => window.__proctoringStreams?.screenStream || null)
  const [cameraStream, setCameraStream] = useState(() => window.__proctoringStreams?.cameraStream || null)

  const [isFullscreen, setIsFullscreen] = useState(false)
  const [code, setCode] = useState(Array(6).fill(''))
  const [error, setError] = useState('')
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [isVerifyingStart, setIsVerifyingStart] = useState(false)
  const [_isChrome, setIsChrome] = useState(true)

  const screenRef = useRef(null)
  const cameraRef = useRef(null)
  const inputRefs = useRef([])

  useEffect(() => {
    // Browser Check
    const isChromeCheck = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
    setIsChrome(isChromeCheck);

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)

    // Key & Context Menu Proctoring Restrictions
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

    // Auto-attach existing streams to refs if they exist on mount
    if (screenStream && screenRef.current) {
      screenRef.current.srcObject = screenStream
    }
    if (cameraStream && cameraRef.current) {
      cameraRef.current.srcObject = cameraStream
    }

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      window.removeEventListener('keydown', handleKeyDownRestrictions, true)
      window.removeEventListener('contextmenu', handleContextMenuRestrictions, true)
    }
  }, [screenStream, cameraStream])

  useEffect(() => {
    let ignore = false
    const loadQuestionsCount = async () => {
      try {
        const response = await fetch(API_ENDPOINTS.questions)
        if (!response.ok) throw new Error('Failed to load questions')
        const data = await response.json()
        if (!ignore) setTotalQuestions(Array.isArray(data) ? data.length : 0)
      } catch {
        if (!ignore) setTotalQuestions(0)
      }
    }
    loadQuestionsCount()

    const email = localStorage.getItem('studentEmail')
    if (email) {
      fetch(API_ENDPOINTS.checkScore(email.trim().toLowerCase()))
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!ignore && (data?.hasSubmitted || data?.isSubmitted)) {
            setError('You have already submitted the exam. Scores are saved in DB and rewriting is not allowed.')
          }
        })
        .catch((err) => console.warn('Check score error in SystemCheck:', err))
    }

    return () => { ignore = true }
  }, [])

  // Camera & Microphone Access
  const enableCameraAndMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      })

      setCameraStream(stream)
      if (cameraRef.current) {
        cameraRef.current.srcObject = stream
      }

      window.__proctoringStreams = {
        ...window.__proctoringStreams,
        cameraStream: stream,
      }
    } catch (err) {
      console.error(err)
      setError('Camera and Microphone permission is required to proceed.')
    }
  }

  // Screen Sharing
  const enableScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor',
        },
        audio: false,
      })

      const track = stream.getVideoTracks()[0]
      const settings = track.getSettings()

      if (settings.displaySurface && settings.displaySurface !== 'monitor') {
        track.stop()
        setError('You must select your ENTIRE SCREEN, not a window or tab.')
        return
      }

      setScreenStream(stream)
      if (screenRef.current) {
        screenRef.current.srcObject = stream
      }

      window.__proctoringStreams = {
        ...window.__proctoringStreams,
        screenStream: stream,
      }

      track.onended = () => {
        setScreenStream(null)
        if (window.__proctoringStreams) {
          window.__proctoringStreams.screenStream = null
        }
        setError('Screen sharing was stopped. Please share again to proceed.')
      }
    } catch (err) {
      console.error(err)
      setError('Screen sharing permission is required to proceed.')
    }
  }

  // Fullscreen Toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {
        setError('Could not enter fullscreen mode.')
      })
    } else {
      document.exitFullscreen()
    }
  }

  // Code Input Handling
  const handleCodeChange = (index, value) => {
    if (!/^\d*$/.test(value)) return
    const newCode = [...code]
    newCode[index] = value
    setCode(newCode)
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  // Validation & Start
  const startAssessment = async () => {
    setError('')
    if (!cameraStream) {
      setError('Please enable Camera and Microphone access.')
      return
    }
    if (!screenStream) {
      setError('Please share your entire screen.')
      return
    }
    if (!isFullscreen) {
      setError('Fullscreen mode is required before starting.')
      return
    }

    const enteredCode = code.join('')
    const validCode = import.meta.env.VITE_VERIFY_CODE

    if (enteredCode !== validCode) {
      setError('Invalid security verification code. Please check with your invigilator.')
      return
    }

    const email = localStorage.getItem('studentEmail')
    if (email) {
      try {
        const checkRes = await fetch(API_ENDPOINTS.checkScore(email.trim().toLowerCase()))
        if (checkRes.ok) {
          const checkData = await checkRes.json()
          if (checkData.hasSubmitted || checkData.isSubmitted) {
            setError('You have already submitted the exam. Scores are saved in DB and rewriting is not allowed.')
            return
          }
        }
      } catch (err) {
        console.warn('DB score check failed on startAssessment:', err)
      }
    }

    setIsVerifyingStart(true)
    try {
      const targetUrl = API_ENDPOINTS.testStatus
      const res = await fetch(targetUrl, {
        cache: 'no-store',
        headers: { 'Accept': 'application/json' }
      })

      const contentType = res.headers.get("content-type")
      if (contentType && contentType.indexOf("application/json") === -1) {
        throw new Error('Received non-JSON response from server. Check API URL or Server Status.')
      }

      const data = await res.json()
      if (!data.isTestActive) {
        setError('The assessment has not been started by the administrator yet. Please wait for the admin to begin the test.')
        setIsVerifyingStart(false)
        return
      }
    } catch (err) {
      console.error('Failed to check status', err)
      setError('Failed to verify test status. Please check your connection or contact admin.')
      setIsVerifyingStart(false)
      return
    }

    // Ensure streams are saved
    window.__proctoringStreams = { ...window.__proctoringStreams, screenStream }
    localStorage.setItem('systemCheckPassed', 'true')
    navigate('/student')
  }

  return (
    <div className="min-h-screen bg-[#F4F1DE] px-4 py-8 md:px-8 font-sans text-[#0D1B2A]">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-2xl border border-[#0D1B2A]/10 bg-[#FFFFFF] shadow-sm">

        {/* Header */}
        <header className="flex flex-wrap items-center justify-between border-b border-[#0D1B2A]/10 bg-[#FAF8F2] px-8 py-5">
          <div className="flex items-center gap-3">
            <img
              src="/CB-KARE.jpeg"
              alt="CB-KARE Logo"
              className="h-10 w-auto rounded-lg object-contain border border-[#0D1B2A]/10 shadow-2xs"
            />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[#0D1B2A]">Examination Readiness Check</h1>
              <p className="text-xs text-[#415A77]">CB-KARE Onboarding & Proctoring Verification</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-lg border border-[#778D7A]/30 bg-[#EDF2EE] px-3 py-1 text-xs font-semibold text-[#415A77]">
              Step 1 of 2: Environment Setup
            </span>
          </div>
        </header>

        <div className="flex flex-col md:flex-row">

          {/* Left Sidebar (Kalvium Stepper & Meta) */}
          <aside className="w-full border-r border-[#0D1B2A]/10 bg-[#FAF8F2]/60 p-6 md:w-80">
            
            {/* Assessment Meta Box */}
            <div className="mb-6 rounded-xl border border-[#0D1B2A]/10 bg-[#FFFFFF] p-4 shadow-2xs">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#415A77] mb-3">Assessment Details</h2>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-[#0D1B2A]/5">
                  <span className="text-[#415A77]">Proctoring Mode</span>
                  <span className="font-semibold text-[#0D1B2A]">Automated Remote</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-[#0D1B2A]/5">
                  <span className="text-[#415A77]">Session Duration</span>
                  <span className="font-semibold text-[#0D1B2A]">60 Minutes</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-[#415A77]">Total Questions</span>
                  <span className="font-semibold text-[#0D1B2A]">{totalQuestions}</span>
                </div>
              </div>
            </div>

            {/* Progress Stepper */}
            <div className="mb-8 space-y-3">
              <div className="flex items-center gap-3 rounded-xl border border-[#778D7A]/40 bg-[#EDF2EE] p-3 text-[#1B263B]">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0D1B2A] text-xs font-bold text-[#F4F1DE]">
                  1
                </span>
                <div>
                  <p className="text-xs font-bold text-[#0D1B2A]">Environment Setup</p>
                  <p className="text-[11px] text-[#415A77]">Hardware & stream checks</p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-[#0D1B2A]/10 bg-white/60 p-3 text-[#415A77]/70">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#0D1B2A]/20 bg-white text-xs font-bold text-[#415A77]">
                  2
                </span>
                <div>
                  <p className="text-xs font-semibold text-[#415A77]">Examination</p>
                  <p className="text-[11px] text-[#415A77]/60">Proctored test session</p>
                </div>
              </div>
            </div>

            {/* Examination Guidelines */}
            <div className="rounded-xl border border-[#D4C4A8]/40 bg-[#F7F3EA] p-4 text-xs">
              <h3 className="mb-2 font-bold text-[#0D1B2A] flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#415A77]">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
                Important Guidelines
              </h3>
              <ul className="space-y-2 text-[#415A77] pl-3.5 list-disc marker:text-[#D4C4A8]">
                <li>You must share your <strong>entire screen</strong>. Sharing a single window is prohibited.</li>
                <li>Do not leave full-screen mode or switch tabs once the session begins.</li>
                <li>Ensure stable internet and proper front-facing lighting.</li>
              </ul>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 p-6 md:p-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-[#0D1B2A]">Hardware & Proctoring Verification</h2>
              <p className="mt-1 text-sm text-[#415A77]">
                Grant camera, microphone, and entire screen sharing access to validate your environment.
              </p>
            </div>

            {/* Media Checks: 2-Column Dark Navy Previews */}
            <div className="mb-6 grid gap-6 md:grid-cols-2">
              
              {/* Camera & Mic Box */}
              <div className="flex flex-col gap-3">
                <div className="relative flex aspect-video items-center justify-center rounded-xl bg-[#0D1B2A] text-[#D4C4A8] overflow-hidden border border-[#1B263B] shadow-inner">
                  {cameraStream ? (
                    <video ref={cameraRef} autoPlay muted playsInline className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 p-4 text-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#D4C4A8]/70">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <circle cx="12" cy="13" r="4" />
                      </svg>
                      <span className="text-xs font-medium text-[#F4F1DE]/70">Camera & Microphone Preview</span>
                    </div>
                  )}
                  {cameraStream && (
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 rounded-lg bg-[#1B263B]/90 px-2.5 py-1 text-[11px] font-semibold text-[#F4F1DE] border border-[#778D7A]/40">
                      <span className="h-2 w-2 rounded-full bg-[#778D7A]" />
                      <span>Camera & Mic Active</span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={enableCameraAndMic}
                  className={`w-full rounded-xl py-2.5 text-xs font-semibold transition-colors duration-200 border ${
                    cameraStream
                      ? 'bg-[#EDF2EE] text-[#1B263B] border-[#778D7A]/50 hover:bg-[#E3EDE5]'
                      : 'bg-[#0D1B2A] text-[#F4F1DE] border-transparent hover:bg-[#1B263B]'
                  }`}
                >
                  {cameraStream ? '✓ Camera & Mic Configured' : 'Enable Camera & Microphone'}
                </button>
              </div>

              {/* Screen Share Box */}
              <div className="flex flex-col gap-3">
                <div className="relative flex aspect-video items-center justify-center rounded-xl bg-[#0D1B2A] text-[#D4C4A8] overflow-hidden border border-[#1B263B] shadow-inner">
                  {screenStream ? (
                    <video ref={screenRef} autoPlay muted playsInline className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 p-4 text-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#D4C4A8]/70">
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                        <line x1="8" y1="21" x2="16" y2="21" />
                        <line x1="12" y1="17" x2="12" y2="21" />
                      </svg>
                      <span className="text-xs font-medium text-[#F4F1DE]/70">Entire Screen Stream Preview</span>
                    </div>
                  )}
                  {screenStream && (
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 rounded-lg bg-[#1B263B]/90 px-2.5 py-1 text-[11px] font-semibold text-[#F4F1DE] border border-[#778D7A]/40">
                      <span className="h-2 w-2 rounded-full bg-[#778D7A]" />
                      <span>Screen Stream Active</span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={enableScreenShare}
                  className={`w-full rounded-xl py-2.5 text-xs font-semibold transition-colors duration-200 border ${
                    screenStream
                      ? 'bg-[#EDF2EE] text-[#1B263B] border-[#778D7A]/50 hover:bg-[#E3EDE5]'
                      : 'bg-[#0D1B2A] text-[#F4F1DE] border-transparent hover:bg-[#1B263B]'
                  }`}
                >
                  {screenStream ? '✓ Screen Sharing Configured' : 'Share Entire Screen'}
                </button>
              </div>

            </div>

            {/* Fullscreen Verification Banner */}
            <div
              className={`mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 transition-colors duration-200 ${
                isFullscreen
                  ? 'border-[#778D7A]/50 bg-[#EDF2EE] text-[#1B263B]'
                  : 'border-[#D4C4A8]/60 bg-[#F7F3EA] text-[#0D1B2A]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                    isFullscreen ? 'bg-[#778D7A] text-white' : 'border border-[#D4C4A8] bg-white text-[#415A77]'
                  }`}
                >
                  {isFullscreen ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold text-[#0D1B2A]">
                    {isFullscreen ? 'Full-screen Mode Active' : 'Full-screen Mode Required'}
                  </p>
                  <p className="text-[11px] text-[#415A77]">
                    {isFullscreen
                      ? 'Display locked to assessment viewport.'
                      : 'Please expand to full-screen before continuing to the test room.'}
                  </p>
                </div>
              </div>

              {!isFullscreen && (
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="rounded-lg bg-[#415A77] px-3.5 py-1.5 text-xs font-semibold text-[#F4F1DE] hover:bg-[#1B263B] transition-colors"
                >
                  Enable Fullscreen
                </button>
              )}
            </div>

            {/* 6-Box Security PIN Input */}
            <div className="mb-6 rounded-xl border border-[#0D1B2A]/10 bg-[#FAF8F2] p-5">
              <div className="mb-3 flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#0D1B2A]">
                  Enter Security Verification Code
                </label>
                <span className="text-[11px] font-medium text-[#415A77]">
                  Provided by Core Invigilator
                </span>
              </div>

              <div className="flex gap-2.5 sm:gap-3">
                {code.map((digit, index) => (
                  <input
                    key={index}
                    ref={el => inputRefs.current[index] = el}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="h-12 w-11 sm:h-14 sm:w-12 rounded-xl border border-[#0D1B2A]/15 bg-white text-center text-xl font-bold text-[#0D1B2A] shadow-2xs transition-colors duration-200 outline-none focus:border-[#415A77] focus:ring-1 focus:ring-[#415A77]/20"
                  />
                ))}
              </div>
              <p className="mt-2 text-[11px] text-[#415A77]/80">
                Contact your exam coordinator if you do not have the 6-digit session code.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 rounded-xl border border-[#9E2A2B]/20 bg-[#FBEAEA] p-3.5 text-xs font-medium text-[#782828] flex items-start gap-2">
                <svg className="h-4 w-4 shrink-0 text-[#9E2A2B] mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Start Button */}
            <div className="flex justify-end pt-2 border-t border-[#0D1B2A]/10">
              <button
                type="button"
                onClick={startAssessment}
                disabled={isVerifyingStart}
                className="flex items-center gap-2 rounded-xl bg-[#0D1B2A] px-6 py-3 text-sm font-semibold text-[#F4F1DE] shadow-xs transition-colors duration-200 hover:bg-[#1B263B] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isVerifyingStart ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#D4C4A8] border-t-transparent" />
                    <span>Verifying Session...</span>
                  </>
                ) : (
                  <>
                    <span>Proceed to Assessment</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </>
                )}
              </button>
            </div>

          </main>
        </div>
      </div>
    </div>
  )
}

export default SystemCheck
