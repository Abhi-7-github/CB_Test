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
			<div className="min-h-screen bg-[#F4F1DE] text-[#0D1B2A] font-sans antialiased">
				<Suspense fallback={
					<div className="flex h-screen w-full items-center justify-center bg-[#F4F1DE]">
						<div className="flex flex-col items-center gap-3">
							<div className="h-8 w-8 animate-spin rounded-full border-3 border-[#D4C4A8] border-t-[#0D1B2A]" />
							<p className="text-xs font-medium tracking-wide text-[#415A77]">Loading Examination Platform...</p>
						</div>
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
			</div>
		</Router>
	)
}

export default App
