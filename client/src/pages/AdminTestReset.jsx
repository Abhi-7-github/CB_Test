import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import AdminNavbar from '../components/AdminNavbar'
import TextField from '../components/TextField'
import { API_ENDPOINTS } from '../api'

function AdminTestReset() {
  const [resetEmail, setResetEmail] = useState('')
  const [resetStatus, setResetStatus] = useState({ type: 'idle', message: '' })
  const [isVerified, setIsVerified] = useState(true)
  const [isResetting, setIsResetting] = useState(false)

  useEffect(() => {
    const verified = localStorage.getItem('adminVerified') === 'true'
    if (!verified) {
      setIsVerified(false)
    }
  }, [])

  if (!isVerified) {
    return <Navigate to="/admin" replace />
  }

  const handleResetAttempt = async () => {
    if (!resetEmail.trim()) {
      setResetStatus({ type: 'error', message: 'Please enter a student email to reset.' })
      return
    }

    const cleanEmail = resetEmail.trim().toLowerCase()
    setIsResetting(true)
    setResetStatus({ type: 'idle', message: '' })

    try {
      const res = await fetch(API_ENDPOINTS.resetScore(cleanEmail), {
        method: 'DELETE'
      })
      if (res.ok) {
        setResetStatus({
          type: 'success',
          message: `Examination submission and scores have been cleared for ${resetEmail}.`
        })
        setResetEmail('')
      } else {
        const errData = await res.json().catch(() => ({}))
        setResetStatus({
          type: 'error',
          message: `Database reset returned: ${errData.message || res.statusText}`
        })
      }
    } catch (err) {
      console.error('Error resetting student score in DB:', err)
      setResetStatus({
        type: 'error',
        message: `Network communication failed for ${resetEmail}.`
      })
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F4F1DE] px-4 py-8 md:px-8 font-sans text-[#0D1B2A]">
      <div className="mx-auto max-w-5xl">
        <AdminNavbar />
        
        <div className="rounded-2xl border border-[#0D1B2A]/10 bg-white p-6 md:p-8 shadow-xs max-w-xl">
          <div className="mb-6">
            <h1 className="text-xl font-bold tracking-tight text-[#0D1B2A]">Reset Candidate Attempt</h1>
            <p className="mt-1 text-xs text-[#415A77]">
              Specify a registered student email to purge their prior exam submission from the database and allow a fresh session.
            </p>
          </div>

          <div className="space-y-4">
            <TextField
              id="reset-email"
              label="Candidate University Email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              placeholder="student@klu.ac.in"
            />
            
            <button
              type="button"
              onClick={handleResetAttempt}
              disabled={isResetting}
              className="rounded-xl bg-[#0D1B2A] px-5 py-2.5 text-xs font-semibold text-[#F4F1DE] shadow-xs hover:bg-[#1B263B] transition-colors disabled:opacity-50"
            >
              {isResetting ? 'Processing Reset...' : 'Reset Assessment Attempt'}
            </button>

            {resetStatus.message && (
              <div
                className={`mt-4 rounded-xl border p-3.5 text-xs font-semibold ${
                  resetStatus.type === 'success'
                    ? 'border-[#778D7A]/40 bg-[#EDF2EE] text-[#1B263B]'
                    : 'border-[#9E2A2B]/20 bg-[#FBEAEA] text-[#782828]'
                }`}
              >
                {resetStatus.message}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

export default AdminTestReset
