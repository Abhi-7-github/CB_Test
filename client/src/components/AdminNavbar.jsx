import { Link, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { API_ENDPOINTS } from '../api'

export default function AdminNavbar() {
  const location = useLocation()

  const isActive = (path) => {
    return location.pathname === path
      ? 'border-[#D4C4A8] text-[#F4F1DE] font-semibold'
      : 'border-transparent text-[#D4C4A8]/70 hover:text-[#F4F1DE] hover:border-[#D4C4A8]/40'
  }

  const [isTestActive, setIsTestActive] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(API_ENDPOINTS.testStatus, { cache: 'no-store' })
        if (!res.ok) {
          throw new Error(`Status fetch failed with ${res.status}`)
        }
        const data = await res.json()
        if (typeof data.isTestActive !== 'boolean') {
          throw new Error('Invalid status payload from server')
        }
        setIsTestActive(data.isTestActive)
      } catch (err) {
        console.error('Failed to fetch test status', err)
      } finally {
        setLoading(false)
      }
    }

    fetchStatus()
  }, [])

  const toggleTestStatus = async () => {
    try {
      setLoading(true)
      const adminKey = localStorage.getItem('adminKey') || ''
      const res = await fetch(API_ENDPOINTS.testStatus, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey
        },
        body: JSON.stringify({ isTestActive: !isTestActive })
      })
      if (!res.ok) {
        const serverError = await res.json().catch(() => ({}))
        throw new Error(serverError.message || `Status update failed with ${res.status}`)
      }
      const data = await res.json()
      if (typeof data.isTestActive !== 'boolean') {
        throw new Error('Invalid status payload from server')
      }
      setIsTestActive(data.isTestActive)
    } catch (err) {
      console.error('Failed to update test status', err)
      alert(`Failed to update status: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <nav className="rounded-2xl bg-[#0D1B2A] border border-[#1B263B] px-6 mb-8 shadow-sm">
      <div className="flex flex-wrap items-center justify-between min-h-16 py-2 gap-4">
        
        {/* Brand & Tabs */}
        <div className="flex flex-wrap items-center gap-6 md:gap-8">
          <div className="flex items-center gap-2.5">
            <img
              src="/CB-KARE.jpeg"
              alt="CB-KARE Logo"
              className="h-8 w-auto rounded-lg object-contain bg-white p-0.5"
            />
            <span className="text-sm font-bold tracking-tight text-[#F4F1DE]">CB-KARE Admin</span>
          </div>

          <div className="flex flex-wrap items-center space-x-1 sm:space-x-3 text-xs">
            <Link
              to="/admin"
              className={`inline-flex items-center px-2 py-3 border-b-2 transition-colors ${isActive('/admin')}`}
            >
              Add Question
            </Link>
            <Link
              to="/admin/list"
              className={`inline-flex items-center px-2 py-3 border-b-2 transition-colors ${isActive('/admin/list')}`}
            >
              Questions List
            </Link>
            <Link
              to="/admin/reset"
              className={`inline-flex items-center px-2 py-3 border-b-2 transition-colors ${isActive('/admin/reset')}`}
            >
              Reset Test
            </Link>
            <Link
              to="/admin/score"
              className={`inline-flex items-center px-2 py-3 border-b-2 transition-colors ${isActive('/admin/score')}`}
            >
              Scores
            </Link>
          </div>
        </div>

        {/* Global Test Master Switch */}
        <button
          type="button"
          onClick={toggleTestStatus}
          disabled={loading}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold shadow-xs transition-colors duration-200
            ${isTestActive
              ? 'bg-[#9E2A2B] text-white hover:bg-[#852324]'
              : 'bg-[#778D7A] text-white hover:bg-[#687C6B]'}
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          <span className={`h-2 w-2 rounded-full ${isTestActive ? 'bg-white animate-pulse' : 'bg-white'}`} />
          {loading ? 'Updating...' : isTestActive ? 'End Live Assessment' : 'Begin Live Assessment'}
        </button>

      </div>
    </nav>
  )
}
