import { useEffect, useState } from 'react'
import { API_ENDPOINTS } from '../api'
import AdminNavbar from '../components/AdminNavbar'
import { useNavigate } from 'react-router-dom'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

function AdminQuestionList() {
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetchQuestions()
  }, [])

  const resolveCorrectIndex = (question) => {
    if (!question || !Array.isArray(question.options)) return -1
    const total = question.options.length
    const raw = question.correctAnswer
    if (raw === null || raw === undefined) return -1

    if (typeof raw === 'number' && Number.isFinite(raw)) {
      if (raw >= 0 && raw < total) return raw
      if (raw >= 1 && raw <= total) return raw - 1
      return -1
    }

    const text = String(raw).trim()
    if (!text) return -1

    if (/^[A-Za-z]$/.test(text)) {
      const idx = text.toUpperCase().charCodeAt(0) - 65
      return idx >= 0 && idx < total ? idx : -1
    }

    if (/^\d+$/.test(text)) {
      const num = Number(text)
      if (num >= 0 && num < total) return num
      if (num >= 1 && num <= total) return num - 1
      return -1
    }

    const exactIdx = question.options.indexOf(text)
    if (exactIdx !== -1) return exactIdx

    const lowered = text.toLowerCase()
    const ciIdx = question.options.findIndex((opt) => String(opt).toLowerCase() === lowered)
    return ciIdx
  }

  const fetchQuestions = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.questions)
      if (response.ok) {
        const data = await response.json()
        setQuestions(data)
      }
    } catch (error) {
      console.error('Failed to fetch questions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this question from the bank?')) return

    const adminKey = localStorage.getItem('adminKey') || ''
    if (!adminKey) {
      alert('Admin key is missing. Please authenticate on the Add Question page.')
      return
    }

    try {
      const response = await fetch(`${API_ENDPOINTS.questions}/${id}`, {
        method: 'DELETE',
        headers: {
          'x-admin-key': adminKey
        }
      })

      if (response.ok) {
        setQuestions(prev => prev.filter(q => q._id !== id))
      } else {
        const data = await response.json()
        alert(data.message || 'Failed to delete question')
      }
    } catch (error) {
      console.error('Failed to delete question:', error)
      alert('Error deleting question')
    }
  }

  const handleEdit = (question) => {
    navigate('/admin', { state: { question } })
  }

  const resolveCorrectAnswerText = (question) => {
    if (!question) return 'N/A'
    const correctIndex = resolveCorrectIndex(question)
    if (correctIndex !== -1 && question.options?.[correctIndex]) {
      return `${String.fromCharCode(65 + correctIndex)}. ${question.options[correctIndex]}`
    }
    if (question.correctAnswer !== undefined && question.correctAnswer !== null) {
      return String(question.correctAnswer)
    }
    return 'N/A'
  }

  const handleDownloadQuestions = () => {
    if (!questions.length) {
      alert('No questions available to download.')
      return
    }

    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
    const date = new Date().toISOString().split('T')[0]

    doc.setFontSize(16)
    doc.text('Assessment Question Bank Registry', 40, 40)
    doc.setFontSize(10)
    doc.text(`Generated on: ${new Date().toLocaleString()} | Total Items: ${questions.length}`, 40, 58)

    const rows = questions.map((q, idx) => {
      const questionNumber = q.id !== undefined && q.id !== null ? String(q.id) : String(idx + 1)
      const optionsText = q.type === 'mcq' && Array.isArray(q.options)
        ? q.options.map((opt, i) => `${String.fromCharCode(65 + i)}. ${opt}`).join('\n')
        : 'N/A'
      const correctText = q.type === 'mcq' ? resolveCorrectAnswerText(q) : 'N/A'

      return [
        questionNumber,
        q.type.toUpperCase(),
        q.text,
        optionsText,
        correctText,
        String(q.marks || 1),
      ]
    })

    autoTable(doc, {
      startY: 75,
      head: [['#', 'Type', 'Question Prompt', 'Options', 'Designated Answer', 'Marks']],
      body: rows,
      styles: {
        fontSize: 8.5,
        cellPadding: 5,
        valign: 'top',
      },
      headStyles: {
        fillColor: [13, 27, 42],
        textColor: 255,
        fontStyle: 'bold',
      },
      margin: { left: 40, right: 40 },
    })

    doc.save(`examination-question-bank-${date}.pdf`)
  }

  return (
    <div className="min-h-screen bg-[#F4F1DE] px-4 py-8 md:px-8 font-sans text-[#0D1B2A]">
      <div className="mx-auto max-w-5xl">
        <AdminNavbar />

        {/* Action Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#0D1B2A]">Question Bank Registry</h1>
            <p className="mt-1 text-xs text-[#415A77]">
              Manage questions, answer keys, and export comprehensive assessment documentation.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleDownloadQuestions}
              className="flex items-center gap-2 rounded-xl bg-[#778D7A] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#687C6B] transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              <span>Download PDF</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="flex items-center gap-2 rounded-xl bg-[#0D1B2A] px-4 py-2 text-xs font-semibold text-[#F4F1DE] shadow-xs hover:bg-[#1B263B] transition-colors"
            >
              <span>+ Add New Question</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs font-semibold uppercase tracking-wider text-[#415A77]">
            Loading Assessment Questions...
          </div>
        ) : (
          <div className="space-y-4">
            {questions.length === 0 ? (
              <div className="rounded-2xl border border-[#0D1B2A]/10 bg-white p-10 text-center text-xs text-[#415A77]">
                No questions found in registry. Navigate to "Add Question" to construct one.
              </div>
            ) : (
              questions.map((q, idx) => (
                <div
                  key={q._id}
                  className="relative rounded-2xl border border-[#0D1B2A]/10 bg-white p-6 shadow-xs hover:border-[#415A77]/30 transition-all duration-200"
                >
                  {/* Top Action Pills */}
                  <div className="absolute top-5 right-5 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(q)}
                      className="rounded-lg border border-[#415A77]/30 bg-[#EDF2EE] px-3 py-1 text-xs font-semibold text-[#415A77] hover:bg-[#415A77] hover:text-white transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(q._id)}
                      className="rounded-lg border border-[#9E2A2B]/30 bg-[#FBEAEA] px-3 py-1 text-xs font-semibold text-[#9E2A2B] hover:bg-[#9E2A2B] hover:text-white transition-colors"
                    >
                      Delete
                    </button>
                  </div>

                  {/* Header & Badges */}
                  <div className="mb-3 pr-28">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold text-[#0D1B2A]">
                        #{q.id || idx + 1}
                      </span>
                      <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        q.type === 'mcq'
                          ? 'border border-[#778D7A]/30 bg-[#EDF2EE] text-[#415A77]'
                          : 'border border-[#D4C4A8]/40 bg-[#F7F3EA] text-[#0D1B2A]'
                      }`}>
                        {q.type === 'mcq' ? 'Multiple Choice' : 'File Submission'}
                      </span>
                      <span className="text-[11px] text-[#415A77] font-medium">
                        • {q.marks || 1} {q.marks === 1 ? 'mark' : 'marks'}
                      </span>
                    </div>

                    <h3 className="text-base font-semibold leading-relaxed text-[#0D1B2A]">
                      {q.text}
                    </h3>
                  </div>

                  {/* MCQ Options Display */}
                  {q.type === 'mcq' && Array.isArray(q.options) && (
                    <div className="mt-3 rounded-xl border border-[#0D1B2A]/10 bg-[#FAF8F2] p-4">
                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                        {q.options.map((opt, oIdx) => {
                          const correctIndex = resolveCorrectIndex(q)
                          const isCorrect = oIdx === correctIndex
                          return (
                            <li
                              key={oIdx}
                              className={`flex items-center gap-2 p-2.5 rounded-lg border transition-colors ${
                                isCorrect
                                  ? 'border-[#778D7A]/50 bg-[#EDF2EE] text-[#1B263B] font-semibold'
                                  : 'border-[#0D1B2A]/10 bg-white text-[#415A77]'
                              }`}
                            >
                              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold border ${
                                isCorrect
                                  ? 'bg-[#778D7A] text-white border-[#778D7A]'
                                  : 'border-[#0D1B2A]/20 bg-white text-[#415A77]'
                              }`}>
                                {String.fromCharCode(65 + oIdx)}
                              </span>
                              <span className="truncate">{opt}</span>
                              {isCorrect && (
                                <span className="ml-auto text-[10px] uppercase font-bold text-[#778D7A]">
                                  Key
                                </span>
                              )}
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )}

                  {/* File Upload Info Display */}
                  {q.type === 'file' && (
                    <div className="mt-2 text-xs text-[#415A77] flex items-center gap-3">
                      <span>Accepted: {q.fileUpload?.accept?.join(', ') || 'Any format'}</span>
                      <span>•</span>
                      <span>Max: {q.fileUpload?.maxSizeMb || 5}MB</span>
                    </div>
                  )}

                </div>
              ))
            )}
          </div>
        )}

      </div>
    </div>
  )
}

export default AdminQuestionList
