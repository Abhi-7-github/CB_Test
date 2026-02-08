import { Link, useLocation } from 'react-router-dom'

export default function AdminNavbar() {
  const location = useLocation()
  
  const isActive = (path) => {
    return location.pathname === path 
      ? 'border-slate-900 text-slate-900' 
      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
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
              Questions
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
      </div>
    </nav>
  )
}
