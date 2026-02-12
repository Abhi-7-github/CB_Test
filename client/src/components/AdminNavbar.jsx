import { Link, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { API_ENDPOINTS } from '../api'

export default function AdminNavbar() {
  const location = useLocation()
  
  const isActive = (path) => {
    return location.pathname === path 
      ? 'border-slate-900 text-slate-900' 
      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
  }

  const [isTestActive, setIsTestActive] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(API_ENDPOINTS.testStatus, { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        setIsTestActive(data.isTestActive)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to fetch test status', err)
        setLoading(false)
      })
  }, [])

  const toggleTestStatus = async () => {
    try {
      setLoading(true)
      const res = await fetch(API_ENDPOINTS.testStatus, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isTestActive: !isTestActive })
      })
      const data = await res.json()
      setIsTestActive(data.isTestActive)
    } catch (err) {
      console.error('Failed to update test status', err)
      alert('Failed to update status')
    } finally {
      setLoading(false)
    }
  }

  return (
    <nav className="bg-white border-b border-slate-200 mb-6">
      <div className="flex items-center justify-between h-14">
        <div className="flex items-center gap-8">
          <span className="text-slate-900 font-bold text-lg">Admin Panel</span>
          <div className="flex space-x-1">
            <Link
              to="/admin"
              className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${isActive('/admin')}`}
            >
              Add Question
            </Link>
            <Link
              to="/admin/list"
              className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${isActive('/admin/list')}`}
            >
              Questions List
            </Link>
            <Link
              to="/admin/reset"
              className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${isActive('/admin/reset')}`}
            >
              Reset Test
            </Link>
            <Link
              to="/admin/score"
              className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${isActive('/admin/score')}`}
            >
              Scores
            </Link>
          </div>
        </div>

             <button
                onClick={toggleTestStatus}
                disabled={loading}
                className={`
                  px-4 py-2 rounded-md font-bold text-sm shadow-sm transition-all
                  ${isTestActive 
                    ? 'bg-rose-100 text-rose-700 hover:bg-rose-200 border border-rose-200' 
                    : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border border-emerald-200'}
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
             >
                {loading ? '...' : isTestActive ? 'Stop Test' : 'Begin Test'}
             </button>
      </div>
    </nav>
  )
}
