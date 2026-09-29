import { useState, useEffect, useMemo } from 'react'
import AdminNavbar from '../components/AdminNavbar'
import { API_ENDPOINTS } from '../api'

function AdminStudentScore() {
  const [studentData, setStudentData] = useState([])
  const [scores, setScores] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadStudentData = async () => {
      try {
        const res = await fetch('/data/studentdata.json')
        if (res.ok) {
          const data = await res.json()
          setStudentData(data)
        }
      } catch (err) {
        console.error('Failed to load student data:', err)
      }
    }
    loadStudentData()
  }, [])

  useEffect(() => {
    const fetchScores = async () => {
      setLoading(true)
      try {
        let serverScores = []
        try {
          const response = await fetch(API_ENDPOINTS.scores)
          if (response.ok) {
            serverScores = await response.json()
          }
        } catch (err) {
          console.warn('Backend server scores fetch failed, checking local storage:', err)
        }

        let localScores = []
        try {
          localScores = JSON.parse(localStorage.getItem('allStudentScores') || '[]')
        } catch {
          // ignore
        }

        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && key.startsWith('studentScore:')) {
            try {
              const item = JSON.parse(localStorage.getItem(key))
              if (item?.studentEmail) {
                localScores.push(item)
              }
            } catch {
              // ignore
            }
          }
        }

        const scoreMapCombined = new Map()
        localScores.forEach((s) => {
          if (s?.studentEmail) {
            scoreMapCombined.set(String(s.studentEmail).trim().toLowerCase(), s)
          }
        })
        serverScores.forEach((s) => {
          if (s?.studentEmail) {
            scoreMapCombined.set(String(s.studentEmail).trim().toLowerCase(), s)
          }
        })

        setScores(Array.from(scoreMapCombined.values()))
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchScores()
  }, [])

  const scoreMap = useMemo(() => {
    const map = new Map()
    scores.forEach((score) => {
      if (score?.studentEmail) {
        map.set(String(score.studentEmail).trim().toLowerCase(), score)
      }
    })
    return map
  }, [scores])

  const mergedRows = useMemo(() => {
    return (studentData || []).map((student) => {
      const email = student.email ? String(student.email).trim().toLowerCase() : ''
      const score = scoreMap.get(email)
      return {
        teamName: student.teamName || 'N/A',
        email: student.email,
        score: score,
      }
    })
  }, [studentData, scoreMap])

  const formatPercentage = (score) => {
    if (!score || score.totalMarks === undefined || score.totalMarks === 0) return 'N/A'
    const pct = ((score.score / score.totalMarks) * 100).toFixed(1)
    return `${pct}%`
  }

  const formatFinishTime = (score) => {
    if (!score || !score.updatedAt) return 'N/A'
    try {
      return new Date(score.updatedAt).toLocaleString()
    } catch {
      return 'N/A'
    }
  }

  const downloadCSV = () => {
    if (!mergedRows.length) return

    const headers = ['Team Name', 'Student Email', 'Score', 'Total Marks', 'Percentage', 'Exam Finished Time']
    const rows = mergedRows.map((row) => {
      const scoreVal = row.score ? row.score.score : 'N/A'
      const totalMarksVal = row.score ? row.score.totalMarks : 'N/A'
      const pctVal = formatPercentage(row.score)
      const finishedTimeVal = formatFinishTime(row.score)

      return [
        `"${row.teamName.replace(/"/g, '""')}"`,
        `"${row.email ? row.email.replace(/"/g, '""') : ''}"`,
        `"${scoreVal}"`,
        `"${totalMarksVal}"`,
        `"${pctVal}"`,
        `"${finishedTimeVal.replace(/"/g, '""')}"`,
      ].join(',')
    })

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `student_scores_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleResetScore = async (emailToReset) => {
    if (!emailToReset) return
    if (!window.confirm(`Reset score and examination attempt for ${emailToReset}?`)) {
      return
    }

    const cleanEmail = String(emailToReset).trim().toLowerCase()
    localStorage.removeItem(`studentScore:${cleanEmail}`)

    try {
      const allLocal = JSON.parse(localStorage.getItem('allStudentScores') || '[]')
      const updatedLocal = allLocal.filter(
        (s) => String(s?.studentEmail).trim().toLowerCase() !== cleanEmail
      )
      localStorage.setItem('allStudentScores', JSON.stringify(updatedLocal))
    } catch (e) {
      console.error('Failed to update local storage array on reset:', e)
    }

    try {
      const response = await fetch(API_ENDPOINTS.resetScore(cleanEmail), {
        method: 'DELETE',
      })
      if (!response.ok) {
        console.warn('Server score reset failed:', response.statusText)
      }
    } catch (err) {
      console.error('API call failed to reset score:', err)
    }

    setScores((prevScores) =>
      prevScores.filter((s) => String(s?.studentEmail).trim().toLowerCase() !== cleanEmail)
    )
  }

  return (
    <div className="min-h-screen bg-[#F4F1DE] px-4 py-8 md:px-8 font-sans text-[#0D1B2A]">
      <div className="mx-auto max-w-5xl">
        <AdminNavbar />

        <div className="rounded-2xl border border-[#0D1B2A]/10 bg-white p-6 md:p-8 shadow-xs">
          
          {/* Header Row */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[#0D1B2A]">Student Assessment Records</h1>
              <p className="mt-1 text-xs text-[#415A77]">
                Live evaluation metrics, percentage aggregates, and submission timestamps.
              </p>
            </div>

            <button
              type="button"
              onClick={downloadCSV}
              disabled={mergedRows.length === 0}
              className="flex items-center gap-2 rounded-xl bg-[#778D7A] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#687C6B] transition-colors disabled:opacity-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              <span>Export CSV</span>
            </button>
          </div>

          {loading && (
            <p className="py-6 text-center text-xs font-semibold uppercase tracking-wider text-[#415A77]">
              Querying candidate score records...
            </p>
          )}

          {error && (
            <div className="mb-4 rounded-xl border border-[#9E2A2B]/20 bg-[#FBEAEA] p-3 text-xs text-[#782828]">
              {error}
            </div>
          )}

          {/* Table Container */}
          <div className="overflow-x-auto rounded-xl border border-[#0D1B2A]/10">
            <table className="min-w-full divide-y divide-[#0D1B2A]/10 text-left text-xs">
              <thead className="bg-[#FAF8F2] text-[#0D1B2A]">
                <tr>
                  <th scope="col" className="px-5 py-3.5 font-bold uppercase tracking-wider">
                    Team Name
                  </th>
                  <th scope="col" className="px-5 py-3.5 font-bold uppercase tracking-wider">
                    Student Email
                  </th>
                  <th scope="col" className="px-5 py-3.5 font-bold uppercase tracking-wider">
                    Score
                  </th>
                  <th scope="col" className="px-5 py-3.5 font-bold uppercase tracking-wider">
                    Percentage
                  </th>
                  <th scope="col" className="px-5 py-3.5 font-bold uppercase tracking-wider">
                    Completed At
                  </th>
                  <th scope="col" className="px-5 py-3.5 font-bold uppercase tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#0D1B2A]/10 bg-white">
                {mergedRows.length === 0 && !loading && !error && (
                  <tr>
                    <td className="px-5 py-8 text-center text-xs text-[#415A77]" colSpan="6">
                      No candidate records found in registry.
                    </td>
                  </tr>
                )}
                {mergedRows.map((row) => (
                  <tr key={row.email} className="hover:bg-[#FAF8F2]/60 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-[#0D1B2A]">
                      {row.teamName}
                    </td>
                    <td className="px-5 py-3.5 text-[#415A77]">
                      {row.email}
                    </td>
                    <td className="px-5 py-3.5">
                      {row.score ? (
                        <span className="font-semibold text-[#0D1B2A]">
                          {row.score.score} / {row.score.totalMarks}
                        </span>
                      ) : (
                        <span className="rounded-md bg-[#F7F3EA] px-2 py-0.5 text-[11px] font-medium text-[#415A77] border border-[#D4C4A8]/40">
                          Not Attempted
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {row.score ? (
                        <span className="rounded-md bg-[#EDF2EE] px-2 py-0.5 text-[11px] font-bold text-[#778D7A] border border-[#778D7A]/30">
                          {formatPercentage(row.score)}
                        </span>
                      ) : (
                        <span className="text-[#415A77]/60">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-[#415A77]">
                      {formatFinishTime(row.score)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {row.score ? (
                        <button
                          type="button"
                          onClick={() => handleResetScore(row.email)}
                          className="rounded-lg border border-[#9E2A2B]/30 bg-[#FBEAEA] px-3 py-1 text-xs font-semibold text-[#9E2A2B] hover:bg-[#9E2A2B] hover:text-white transition-colors"
                        >
                          Reset Attempt
                        </button>
                      ) : (
                        <span className="text-[#415A77]/40 text-[11px]">No attempt</span>
                      )}
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
