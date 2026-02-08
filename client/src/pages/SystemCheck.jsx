import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_ENDPOINTS } from '../api'

function SystemCheck() {
  const navigate = useNavigate()
  const [cameraStream, setCameraStream] = useState(null)
  const [screenStream, setScreenStream] = useState(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [code, setCode] = useState(Array(6).fill(''))
  const [error, setError] = useState('')
  const [totalQuestions, setTotalQuestions] = useState(0)

  const videoRef = useRef(null)
  const screenRef = useRef(null)
  const inputRefs = useRef([])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  useEffect(() => {
    let ignore = false

    const loadQuestionsCount = async () => {
      try {
        const response = await fetch(API_ENDPOINTS.questions)
        if (!response.ok) {
          throw new Error('Failed to load questions')
        }
        const data = await response.json()
        if (!ignore) {
          setTotalQuestions(Array.isArray(data) ? data.length : 0)
        }
      } catch (err) {
        if (!ignore) {
          setTotalQuestions(0)
        }
      }
    }

    loadQuestionsCount()

    return () => {
      ignore = true
    }
  }, [])

  // Camera Access
  const enableCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      setCameraStream(stream)
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play().catch(() => {})
      }
      setError('')
    } catch (err) {
      setError('Camera/Microphone access denied or not available.')
    }
  }

  // Screen Share Access
  const enableScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: { displaySurface: 'monitor' }, // Prefer monitor for full screen
        audio: false // Usually not needed for proctoring unless system audio is required
      })
      
      const track = stream.getVideoTracks()[0];
      const settings = track.getSettings();

      // Enforce entire screen sharing
      // Note: displaySurface might not be supported in all browsers or could value 'monitor'/'screen' depending on spec version
      if (settings.displaySurface && settings.displaySurface !== 'monitor' && settings.displaySurface !== 'screen') {
          stream.getTracks().forEach(t => t.stop());
          setError('You must share your ENTIRE SCREEN. Please try again and select the "Entire Screen" tab.');
          return;
      }

      setScreenStream(stream)
      if (screenRef.current) {
        screenRef.current.srcObject = stream
        screenRef.current.play().catch(() => {})
      }
      
      // Handle user stopping share via browser UI
      track.onended = () => {
        setScreenStream(null)
      };
      
      setError('')
    } catch (err) {
        console.error(err)
      setError('Screen sharing cancelled or failed.')
    }
  }

  // Fullscreen Toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        setError(`Error attempting to enable fullscreen: ${err.message}`)
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

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1].focus()
    }
  }
  
  const handleKeyDown = (index, e) => {
      if (e.key === 'Backspace' && !code[index] && index > 0) {
          inputRefs.current[index - 1].focus()
      }
  }

  // Validation & Start
  const startAssessment = () => {
    if (!cameraStream) {
      setError('Please enable your camera and microphone.')
      return
    }
    if (!screenStream) {
      setError('Please share your entire screen.')
      return
    }
    if (!isFullscreen) {
      setError('Fullscreen mode is required.')
      return
    }
    
    // Code Validation
    const enteredCode = code.join('')
    const validCode = import.meta.env.VITE_VERIFY_CODE
    
    if (enteredCode !== validCode) {
      setError('Invalid security code.')
      return
    }

    window.__proctoringStreams = {
      cameraStream,
      screenStream,
    }

    // Success - In real app, you might want to persist stream tracks or re-request them
    // For this demo, we assume the next page might re-request or just trust the check passed.
    // Ideally, pass the state or just set a flag.
    localStorage.setItem('systemCheckPassed', 'true')
    navigate('/student')
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-900">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-xl bg-white shadow-xl">
        
        {/* Header */}
        <header className="flex items-center justify-between border-b border-slate-200 px-8 py-5">
            <h1 className="text-2xl font-bold text-slate-800">Take an Assessment</h1>
            <h2 className="text-xl font-semibold text-slate-600">System Check</h2>
        </header>

        <div className="flex flex-col md:flex-row">
            
            {/* Sidebar */}
            <aside className="w-full border-r border-slate-200 bg-slate-50 p-6 md:w-80">
                <div className="mb-8 rounded-lg bg-white p-4 shadow-sm border border-slate-200">
                    <div className="mb-2 flex justify-between text-sm">
                        <span className="text-slate-500">Proctoring</span>
                        <span className="font-semibold">Remote</span>
                    </div>
                    <div className="mb-2 flex justify-between text-sm">
                        <span className="text-slate-500">Max. Duration</span>
                        <span className="font-semibold">1h</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Total Questions</span>
                        <span className="font-semibold">{totalQuestions}</span>
                    </div>
                </div>

                <div className="mb-8 space-y-4">
                    <div className="flex items-center gap-3 text-blue-600">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-sm">1</span>
                        <span className="font-medium">Environment Setup</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-400">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-300 font-bold text-sm">2</span>
                        <span className="font-medium">Test</span>
                    </div>
                </div>

                <div>
                    <h3 className="mb-3 font-bold text-slate-800">Important Notes</h3>
                    <ul className="list-disc space-y-2 pl-4 text-sm text-slate-600">
                        <li>You must share your <strong>entire screen</strong> when prompted. Sharing a window or tab is not allowed.</li>
                        <li>Ensure you have a stable internet connection.</li>
                        <li>Do not switch tabs or exit fullscreen mode.</li>
                        <li>Keep your camera and microphone on at all times.</li>
                    </ul>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-8">
                <h2 className="mb-2 text-2xl font-bold text-slate-800">System Check</h2>
                <p className="mb-8 text-slate-500">Enable access to your Camera, Microphone and Screen Sharing</p>
                
                {/* Media Checks Grid */}
                <div className="mb-8 grid gap-8 md:grid-cols-2">
                    
                    {/* Camera Box */}
                    <div className="flex flex-col gap-4">
                        <div className="relative flex aspect-video items-center justify-center rounded-lg bg-slate-800 text-slate-400 overflow-hidden">
                            {cameraStream ? (
                              <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
                            ) : (
                                <div className="flex flex-col items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                                    <span>Camera Off</span>
                                </div>
                            )}
                        </div>
                        <button 
                            onClick={enableCamera}
                            className={`w-full rounded-full py-3 font-semibold text-white transition-colors ${cameraStream ? 'bg-[#00C853] hover:bg-[#009624]' : 'bg-blue-600 hover:bg-blue-700'}`}
                        >
                            {cameraStream ? 'Camera Enabled' : 'Turn on camera & mic'}
                        </button>
                    </div>

                    {/* Screen Share Box */}
                     <div className="flex flex-col gap-4">
                        <div className="relative flex aspect-video items-center justify-center rounded-lg bg-slate-800 text-slate-400 overflow-hidden">
                              {screenStream ? (
                                <video ref={screenRef} autoPlay muted playsInline className="h-full w-full object-cover" />
                            ) : (
                                <div className="flex flex-col items-center gap-2">
                                     <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                                    <span>No Screen Share</span>
                                </div>
                            )}
                        </div>
                        <button 
                            onClick={enableScreenShare}
                            className={`w-full rounded-full py-3 font-semibold text-white transition-colors ${screenStream ? 'bg-[#00C853] hover:bg-[#009624]' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                        >
                             {screenStream ? 'Screen Shared' : 'Start screen sharing'}
                        </button>
                    </div>
                </div>

                {/* Fullscreen Alert */}
                <div className={`mb-8 flex items-center justify-between rounded-lg border p-4 ${isFullscreen ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50'}`}>
                    <div className="flex items-center gap-3">
                         {isFullscreen ? (
                             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                         ) : (
                             <div className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-white text-xs font-bold">X</div>
                         )}
                        <div>
                            <p className={`font-bold ${isFullscreen ? 'text-emerald-800' : 'text-slate-800'}`}>Fullscreen Mode</p>
                            <p className={`text-sm ${isFullscreen ? 'text-emerald-600' : 'text-slate-500'}`}>{isFullscreen ? 'Fullscreen enabled.' : 'Please enable fullscreen before starting.'}</p>
                        </div>
                    </div>
                    {!isFullscreen && (
                        <button 
                            onClick={toggleFullscreen}
                            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                        >
                            Enable Fullscreen
                        </button>
                    )}
                </div>

                {/* Security Code */}
                <div className="mb-8 rounded-lg border border-slate-200 bg-slate-50 p-6">
                    <label className="mb-4 block font-bold text-slate-800">Enter the Security code</label>
                    <div className="flex gap-3">
                        {code.map((digit, index) => (
                            <input
                                key={index}
                                ref={el => inputRefs.current[index] = el}
                                type="text"
                                maxLength={1}
                                value={digit}
                                onChange={(e) => handleCodeChange(index, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(index, e)}
                                className="h-14 w-12 rounded-lg border border-slate-300 text-center text-2xl font-bold text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        ))}
                    </div>
                     <p className="mt-2 text-sm text-slate-500">CORE TEAM WILL GIVE THE VERIFICATION CODE</p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 rounded-md bg-rose-50 p-4 text-sm font-semibold text-rose-600 border border-rose-200">
                        {error}
                    </div>
                )}

                {/* Start Button */}
                <div className="flex justify-end">
                    <button 
                        onClick={startAssessment}
                        className="rounded-lg bg-blue-600 px-8 py-3 text-lg font-bold text-white shadow-lg hover:bg-blue-700 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Start Assessment
                    </button>
                </div>

            </main>
        </div>
      </div>
    </div>
  )
}

export default SystemCheck
