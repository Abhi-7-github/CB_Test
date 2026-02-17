import { useEffect, useState } from 'react'
import { API_ENDPOINTS } from '../api'
import AdminNavbar from '../components/AdminNavbar'
import { useNavigate } from 'react-router-dom'

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
    if (!window.confirm('Are you sure you want to delete this question?')) return

    const adminKey = localStorage.getItem('adminKey') || ''
    if (!adminKey) {
        alert('Admin key is missing. Please verify in the Add Question page.')
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

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <AdminNavbar />

        <div className="mb-6 flex items-center justify-between">
            <div>
                <h1 className="text-xl font-semibold text-slate-900">Questions List</h1>
                <p className="mt-1 text-sm text-slate-500">View all questions in the question bank.</p>
            </div>
            <button 
                onClick={() => navigate('/admin')}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700"
            >
                Add New Question
            </button>
        </div>

        {loading ? (
            <div className="text-center py-10 text-slate-500">Loading questions...</div>
        ) : (
            <div className="space-y-4">
            {questions.length === 0 ? (
                <div className="bg-white p-8 rounded-lg border border-slate-200 text-center text-slate-500">
                    No questions found. Go to "Add Question" to create one.
                </div>
            ) : (
                questions.map((q) => (
                <div key={q._id} className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative">
                    <div className="absolute top-4 right-4 flex gap-2">
                        <button 
                            onClick={() => handleEdit(q)}
                            className="bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded text-xs font-semibold hover:bg-indigo-100 border border-indigo-200"
                        >
                            Edit
                        </button>
                        <button 
                            onClick={() => handleDelete(q._id)}
                            className="bg-rose-50 text-rose-600 px-3 py-1.5 rounded text-xs font-semibold hover:bg-rose-100 border border-rose-200"
                        >
                            Delete
                        </button>
                    </div>

                    <div className="flex justify-between items-start mb-4 pr-32">
                        <div>
                            <span className={`inline-block px-2.5 py-0.5 text-xs font-bold rounded mb-2 uppercase tracking-wide ${
                                q.type === 'mcq' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                            }`}>
                                {q.type}
                            </span>
                            <h3 className="text-lg font-medium text-slate-900 leading-snug">{q.text}</h3>
                        </div>
                    </div>

                    {q.type === 'mcq' && (
                    <div className="bg-slate-50 rounded-md p-4 mb-3 border border-slate-100">
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        {q.options.map((opt, idx) => {
                                                            const correctIndex = resolveCorrectIndex(q)
                                                            const isCorrect = idx === correctIndex
                                                            return (
                                                        <li key={idx} className={`flex items-start gap-2 text-sm p-2 rounded ${
                                                                isCorrect ? 'bg-green-50 text-green-700 border border-green-200 font-medium' : 'text-slate-600'
                                                        }`}>
                                <span className={`flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full text-xs border ${
                                                                         isCorrect ? 'border-green-500 bg-green-500 text-white' : 'border-slate-300'
                                }`}>
                                    {String.fromCharCode(65 + idx)}
                                </span>
                                <span>{opt}</span>
                                                                {isCorrect && <span className="ml-auto text-xs font-bold uppercase tracking-wider text-green-600">Correct</span>}
                            </li>
                                                            )})}
                        </ul>
                    </div>
                    )}

                    {q.type === 'file' && (
                        <div className="bg-slate-50 rounded-md p-4 mb-3 border border-slate-100 text-sm text-slate-600">
                            <div className="flex gap-6">
                                <div>
                                    <span className="font-semibold text-slate-900">Allowed Types:</span>
                                    <span className="ml-2 px-2 py-0.5 bg-white border border-slate-200 rounded text-xs">{q.fileUpload?.accept?.join(', ')}</span>
                                </div>
                                <div>
                                    <span className="font-semibold text-slate-900">Max Size:</span>
                                    <span className="ml-2">{q.fileUpload?.maxSizeMb} MB</span>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                         <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-1 rounded select-all">
                            ID: {q._id}
                        </span>
                         <span className="text-sm font-semibold text-slate-700">
                            Marks: <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-900 border border-slate-200">{q.marks}</span>
                         </span>
                    </div>
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
