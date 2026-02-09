import { useState, useEffect } from 'react'
import AdminNavbar from '../components/AdminNavbar'
import { API_ENDPOINTS } from '../api'

function AdminStudentScore() {
  const [scores, setScores] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchScores = async () => {
      setLoading(true)
      try {
        const response = await fetch(API_ENDPOINTS.scores)
        if (!response.ok) {
          throw new Error('Failed to fetch scores')
        }
        const data = await response.json()
        setScores(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchScores()
  }, [])

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <AdminNavbar />

        <div className="bg-white p-6 rounded-lg shadow border border-slate-200">
          <h1 className="text-xl font-semibold text-slate-900 mb-4">Student Scores</h1>
          
          {loading && <p className="text-blue-500">Loading scores...</p>}
          {error && <p className="text-rose-500">{error}</p>}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student Email
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Score
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Percentage
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Exam Finished Time
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {scores.length === 0 && !loading && !error && (
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" colSpan="4">
                      No scores available yet.
                    </td>
                  </tr>
                )}
                {scores.map((score) => (
                  <tr key={score._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {score.studentEmail}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {score.score} / {score.totalMarks}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {score.totalMarks > 0 ? ((score.score / score.totalMarks) * 100).toFixed(1) + '%' : '0%'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(score.updatedAt || score.createdAt).toLocaleString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminStudentScore
