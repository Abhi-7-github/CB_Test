import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import StudentLogin from './pages/StudentLogin'
import StudentQuestions from './pages/StudentQuestions'
import AdminQuestions from './pages/AdminQuestions'
import AdminTestReset from './pages/AdminTestReset'
import AdminStudentScore from './pages/AdminStudentScore'

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
					<Routes>
						<Route path="/" element={<Navigate to="/login" replace />} />
						<Route
							path="/student"
							element={
								isStudentVerified ? <StudentQuestions /> : <Navigate to="/login" replace />
							}
						/>
            <Route path="/admin" element={<AdminQuestions />} />
            <Route path="/admin/reset" element={<AdminTestReset />} />
            <Route path="/admin/score" element={<AdminStudentScore />} />
						<Route path="/login" element={<StudentLogin />} />
						<Route path="*" element={<Navigate to="/login" replace />} />
					</Routes>
				</main>
			</div>
		</Router>
	)
}

export default App
