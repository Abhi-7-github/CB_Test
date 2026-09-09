import { useEffect, useState, lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'

const StudentLogin = lazy(() => import('./pages/StudentLogin'))
const StudentQuestions = lazy(() => import('./pages/StudentQuestions'))
const AdminQuestions = lazy(() => import('./pages/AdminQuestions'))
const AdminQuestionList = lazy(() => import('./pages/AdminQuestionList'))
const AdminTestReset = lazy(() => import('./pages/AdminTestReset'))
const AdminStudentScore = lazy(() => import('./pages/AdminStudentScore'))
const SystemCheck = lazy(() => import('./pages/SystemCheck'))

function App() {
	const [isStudentVerified, setIsStudentVerified] = useState(
		() => localStorage.getItem('studentVerified') === 'true'
	)

	useEffect(() => {
		const handleVerification = () => {
			setIsStudentVerified(localStorage.getItem('studentVerified') === 'true')
		}

		window.addEventListener('student-verified', handleVerification)

		return () => {
			window.removeEventListener('student-verified', handleVerification)
		}
	}, [])

	return (
		<Router>
			<div className="min-h-screen bg-slate-50 text-slate-900">
				<main className="mx-auto w-full max-w-5xl px-4 py-6">
					<Suspense fallback={
						<div className="flex h-64 w-full items-center justify-center">
							<div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
						</div>
					}>
						<Routes>
							<Route path="/" element={<Navigate to="/login" replace />} />
							<Route
								path="/student"
								element={
									isStudentVerified ? <StudentQuestions /> : <Navigate to="/login" replace />
								}
							/>
							<Route
								path="/system-check"
								element={
									isStudentVerified ? <SystemCheck /> : <Navigate to="/login" replace />
								}
							/>
							<Route path="/admin" element={<AdminQuestions />} />
							<Route path="/admin/list" element={<AdminQuestionList />} />
							<Route path="/admin/reset" element={<AdminTestReset />} />
							<Route path="/admin/score" element={<AdminStudentScore />} />
							<Route path="/login" element={<StudentLogin />} />
							<Route path="*" element={<Navigate to="/login" replace />} />
						</Routes>
					</Suspense>
				</main>
			</div>
		</Router>
	)
}

export default App
