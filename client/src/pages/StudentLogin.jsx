import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TextField from '../components/TextField'
import { API_ENDPOINTS } from '../api'

function StudentLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState({ type: 'idle', message: '' })
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!email.endsWith('@klu.ac.in')) {
      setStatus({ type: 'error', message: 'Bro Use your @klu.ac.in email.' })
      return
    }

    const cleanEmail = email.trim().toLowerCase()
    setIsLoading(true)

    try {
      // Check database if test is already submitted / scores are saved
      const checkRes = await fetch(API_ENDPOINTS.checkScore(cleanEmail))
      if (checkRes.ok) {
        const checkData = await checkRes.json()
        if (checkData.hasSubmitted || checkData.isSubmitted) {
          setStatus({
            type: 'error',
            message: 'You have already submitted the exam. Scores are saved in DB and rewriting is not allowed.'
          })
          setIsLoading(false)
          return
        }
      }

      const res = await fetch('/data/studentdata.json')
      if (!res.ok) {
        throw new Error('Failed to load student data')
      }
      const studentData = await res.json()

      const match = studentData.find(
        (student) => student.email === email && student.password === password
      )

      if (match) {
        localStorage.setItem('studentVerified', 'true')
        localStorage.setItem('studentEmail', email)
        if (match.teamName) {
          localStorage.setItem('teamName', match.teamName)
        }
        localStorage.removeItem('systemCheckPassed')
        window.dispatchEvent(new Event('student-verified'))
        setStatus({ type: 'success', message: 'Login successful. Redirecting to system check...' })
        navigate('/system-check', { replace: true })
      } else {
        setStatus({ type: 'error', message: 'Bro check your email or password.' })
      }
    } catch {
      setStatus({ type: 'error', message: 'Error verifying credentials. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#F4F1DE] px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-[#0D1B2A]/10 bg-[#FFFFFF] p-8 shadow-sm transition-all duration-200">
        
        {/* Academic / Portal Badge */}
        <div className="mb-6 flex items-center justify-between border-b border-[#0D1B2A]/10 pb-4">
          <div className="flex items-center gap-3">
            <img
              src="/CB-KARE.jpeg"
              alt="CB-KARE Logo"
              className="h-10 w-auto rounded-lg object-contain border border-[#0D1B2A]/10 shadow-2xs"
            />
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#0D1B2A] block leading-tight">CB-KARE</span>
              <p className="text-[11px] text-[#415A77] font-medium">Secure Examination System</p>
            </div>
          </div>
          <span className="rounded-md bg-[#EDF2EE] px-2 py-0.5 text-[11px] font-semibold text-[#415A77] border border-[#778D7A]/30">
            KLU Proctored
          </span>
        </div>

        {/* Headings */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-[#0D1B2A]">Student Login</h1>
          <p className="mt-1 text-sm text-[#415A77]">
            Please enter your university credentials to access the examination session.
          </p>
        </div>

        {/* Form */}
        <form className="space-y-4" onSubmit={handleSubmit}>
          <TextField
            id="email"
            label="University Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="student@klu.ac.in"
            required
          />

          <TextField
            id="password"
            label="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            required
          />

          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0D1B2A] py-3 text-sm font-semibold text-[#F4F1DE] shadow-xs transition-colors duration-200 hover:bg-[#1B263B] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#D4C4A8] border-t-transparent" />
                <span>Verifying Credentials...</span>
              </>
            ) : (
              <span>Sign In to Assessment</span>
            )}
          </button>
        </form>

        {/* Status Notification */}
        {status.message && (
          <div
            className={`mt-5 rounded-xl border p-3.5 text-xs font-medium leading-relaxed transition-all duration-200 ${
              status.type === 'success'
                ? 'border-[#778D7A]/40 bg-[#EDF2EE] text-[#1B263B]'
                : 'border-[#9E2A2B]/20 bg-[#FBEAEA] text-[#782828]'
            }`}
          >
            <div className="flex items-start gap-2">
              {status.type === 'success' ? (
                <svg className="h-4 w-4 shrink-0 text-[#778D7A] mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              ) : (
                <svg className="h-4 w-4 shrink-0 text-[#9E2A2B] mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              )}
              <span>{status.message}</span>
            </div>
          </div>
        )}

        {/* Footer Help text */}
        <div className="mt-8 border-t border-[#0D1B2A]/10 pt-4 text-center">
          <p className="text-[11px] text-[#415A77]/70">
            For access or authorization issues, contact your examination invigilator.
          </p>
        </div>

      </div>
    </div>
  )
}

export default StudentLogin
