import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import AdminNavbar from '../components/AdminNavbar'
import TextField from '../components/TextField'

function AdminTestReset() {
  const [resetEmail, setResetEmail] = useState('')
  const [resetStatus, setResetStatus] = useState('')
  const [isVerified, setIsVerified] = useState(true) // assume true initially to avoid flicker, then check

  useEffect(() => {
    const verified = localStorage.getItem('adminVerified') === 'true'
    if (!verified) {
      setIsVerified(false)
    }
  }, [])


  if (!isVerified) {
    return <Navigate to="/admin" replace />
  }

  const handleResetAttempt = () => {
    if (!resetEmail.trim()) {
      setResetStatus('Enter a student email to reset.')
      return
    }

    
    localStorage.removeItem(`testSubmitted:${resetEmail.trim().toLowerCase()}`)
    setResetStatus(`Attempt reset for ${resetEmail} (local browser context).`)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <AdminNavbar />
        
        <div className="bg-white p-6 rounded-lg shadow border border-slate-200">
          <h1 className="text-xl font-semibold text-slate-900 mb-4">Reset Student Test Attempt</h1>
          <p className="mb-4 text-sm text-slate-500">
            Enter the student's email to reset their test submission status in this browser.
          </p>

          <div className="max-w-md space-y-4">
            <TextField
              id="reset-email"
              label="Student Email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              placeholder="student@klu.ac.in"
            />
            
            <button
              onClick={handleResetAttempt}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm font-medium"
            >
              Reset Attempt
            </button>

            {resetStatus && (
              <div className="mt-2 text-sm font-semibold text-slate-700">
                {resetStatus}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminTestReset
