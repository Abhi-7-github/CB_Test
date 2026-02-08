import { BrowserRouter as Router, Routes, Route, Navigate, NavLink } from 'react-router-dom'
import StudentLogin from './pages/StudentLogin'
import StudentQuestions from './pages/StudentQuestions'
import AdminQuestions from './pages/AdminQuestions'

function App() {
	return (
		<Router>
			<div className="min-h-screen bg-slate-50 text-slate-900">
				<header className="border-b border-slate-200 bg-white">
					<nav className="mx-auto flex w-full max-w-5xl items-center gap-4 px-4 py-3 text-sm">
						<NavLink
							to="/student"
							className={({ isActive }) =>
								`rounded-md px-3 py-1.5 ${
									isActive ? 'bg-slate-900 text-white' : 'text-slate-600'
								}`
							}
						>
							Student
						</NavLink>
						<NavLink
							to="/admin"
							className={({ isActive }) =>
								`rounded-md px-3 py-1.5 ${
									isActive ? 'bg-slate-900 text-white' : 'text-slate-600'
								}`
							}
						>
							Admin
						</NavLink>
						<NavLink
							to="/login"
							className={({ isActive }) =>
								`rounded-md px-3 py-1.5 ${
									isActive ? 'bg-slate-900 text-white' : 'text-slate-600'
								}`
							}
						>
							Student Login
						</NavLink>
					</nav>
				</header>

				<main className="mx-auto w-full max-w-5xl px-4 py-6">
					<Routes>
						<Route path="/" element={<Navigate to="/student" replace />} />
						<Route path="/student" element={<StudentQuestions />} />
						<Route path="/admin" element={<AdminQuestions />} />
						<Route path="/login" element={<StudentLogin />} />
						<Route path="*" element={<Navigate to="/student" replace />} />
					</Routes>
				</main>
			</div>
		</Router>
	)
}

export default App
