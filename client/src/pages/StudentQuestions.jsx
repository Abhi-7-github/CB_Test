import { useEffect, useState } from 'react'
import { API_ENDPOINTS } from '../api'

function StudentQuestions() {
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let ignore = false

    const loadQuestions = async () => {
      try {
        const response = await fetch(API_ENDPOINTS.questions)
        if (!response.ok) {
          throw new Error('Failed to load questions')
        }
        const data = await response.json()
        if (!ignore) {
          setQuestions(data)
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message)
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    loadQuestions()

    return () => {
      ignore = true
    }
  }, [])

  if (loading) {
    return <p className="text-sm text-slate-500">Loading questions...</p>
  }

  if (error) {
    return <p className="text-sm text-rose-600">{error}</p>
  }

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Questions</h1>
        <p className="mt-1 text-sm text-slate-500">Review the available questions.</p>
      </div>

      {questions.length === 0 ? (
        <div className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-500">
          No questions available yet.
        </div>
      ) : (
        <div className="grid gap-3">
          {questions.map((question) => (
            <article
              key={question._id || question.id}
              className="rounded-md border border-slate-200 bg-white p-4"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="rounded-full border border-slate-200 px-2 py-0.5">
                  {question.type?.toUpperCase() || 'MCQ'}
                </span>
                <span>Marks: {question.marks ?? 1}</span>
                {question.id && <span>ID: {question.id}</span>}
              </div>
              <h2 className="mt-2 text-sm font-semibold text-slate-900">
                {question.text}
              </h2>
              {Array.isArray(question.options) && question.options.length > 0 && (
                <ol className="mt-2 list-decimal pl-5 text-sm text-slate-700">
                  {question.options.map((option, index) => (
                    <li key={`${question._id || question.id}-opt-${index}`}>{option}</li>
                  ))}
                </ol>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

export default StudentQuestions
