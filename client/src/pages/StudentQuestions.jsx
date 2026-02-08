import { useEffect, useState } from 'react'
import { API_ENDPOINTS } from '../api'

function StudentQuestions() {
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [fileInputs, setFileInputs] = useState({})
  const [uploadStatus, setUploadStatus] = useState({})

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

  const handleFileChange = (questionId, file) => {
    setFileInputs((prev) => ({ ...prev, [questionId]: file }))
  }

  const handleUpload = async (question) => {
    const questionId = question._id
    if (!questionId) {
      setUploadStatus((prev) => ({
        ...prev,
        [question.id || 'unknown']: { type: 'error', message: 'Question id missing.' },
      }))
      return
    }

    const file = fileInputs[questionId]
    if (!file) {
      setUploadStatus((prev) => ({
        ...prev,
        [questionId]: { type: 'error', message: 'Please choose a file.' },
      }))
      return
    }

    setUploadStatus((prev) => ({
      ...prev,
      [questionId]: { type: 'loading', message: 'Uploading...' },
    }))

    const formData = new FormData()
    formData.append('file', file)
    formData.append('studentEmail', 'student@klu.ac.in')

    try {
      const response = await fetch(API_ENDPOINTS.submissions(questionId), {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      setUploadStatus((prev) => ({
        ...prev,
        [questionId]: { type: 'success', message: 'File uploaded.' },
      }))
      setFileInputs((prev) => ({ ...prev, [questionId]: null }))
    } catch (err) {
      setUploadStatus((prev) => ({
        ...prev,
        [questionId]: { type: 'error', message: err.message },
      }))
    }
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

              {question.type === 'file' && (
                <div className="mt-4 grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs text-slate-600">
                    Upload a file for this question.
                    {question.fileUpload?.maxSizeMb && (
                      <span> Max size: {question.fileUpload.maxSizeMb} MB.</span>
                    )}
                  </div>
                  <input
                    type="file"
                    accept={question.fileUpload?.accept?.join(',') || undefined}
                    onChange={(event) =>
                      handleFileChange(question._id, event.target.files?.[0] || null)
                    }
                    className="text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => handleUpload(question)}
                    className="w-fit rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    Upload
                  </button>
                  {uploadStatus[question._id]?.message && (
                    <div
                      className={`text-xs font-semibold ${
                        uploadStatus[question._id].type === 'success'
                          ? 'text-emerald-700'
                          : uploadStatus[question._id].type === 'loading'
                          ? 'text-slate-600'
                          : 'text-rose-700'
                      }`}
                    >
                      {uploadStatus[question._id].message}
                    </div>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

export default StudentQuestions
