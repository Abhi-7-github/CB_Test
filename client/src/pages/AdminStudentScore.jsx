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

  const downloadCSV = () => {
    if (scores.length === 0) return

    const headers = ['Student Email', 'Score', 'Total Marks', 'Percentage', 'Date']
    const csvRows = [headers.join(',')]

    scores.forEach(score => {
      const percentage = score.totalMarks > 0 ? ((score.score / score.totalMarks) * 100).toFixed(1) + '%' : '0%'
      const date = new Date(score.updatedAt || score.createdAt).toLocaleString()
      
      const values = [
        score.studentEmail,
        score.score,
        score.totalMarks,
        percentage,
        date
      ]

      // Escape fields containing commas or quotes
      const escapedValues = values.map(val => {
          const str = String(val)
          if (str.includes(',') || str.includes('"')) {
              return `"${str.replace(/"/g, '""')}"`
          }
          return str
      })
      
      csvRows.push(escapedValues.join(','))
    })

    const csvContent = csvRows.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'student_scores.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <AdminNavbar />

        <div className="bg-white p-6 rounded-lg shadow border border-slate-200">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-xl font-semibold text-slate-900">Student Scores</h1>
            <button
                onClick={downloadCSV}
                disabled={scores.length === 0}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center gap-2"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Download CSV
            </button>
          </div>
          
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
