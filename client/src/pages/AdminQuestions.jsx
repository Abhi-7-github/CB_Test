import { useEffect, useState } from 'react'
import { API_ENDPOINTS } from '../api'
import TextField from '../components/TextField'
import TextAreaField from '../components/TextAreaField'

import AdminNavbar from '../components/AdminNavbar'

function AdminQuestions() {
  const [adminKey, setAdminKey] = useState('')
  const [isVerified, setIsVerified] = useState(false)
  const [verifyStatus, setVerifyStatus] = useState({ type: 'idle', message: '' })

  const [formData, setFormData] = useState({
    id: '',
    type: 'mcq',
    text: '',
    options: [''], // Initialize with one empty option
    correctAnswer: '',
    marks: '1',
    fileAccept: '',
    fileMaxSizeMb: '5',
  })
  const [status, setStatus] = useState({ type: 'idle', message: '' })
  const [submitting, setSubmitting] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [questions, setQuestions] = useState([])

  useEffect(() => {
    fetchQuestions()
  }, [])

  const fetchQuestions = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.questions)
      if (response.ok) {
        const data = await response.json()
        setQuestions(data)
      }
    } catch (error) {
      console.error('Failed to fetch questions:', error)
    }
  }

  useEffect(() => {
    const verified = localStorage.getItem('adminVerified') === 'true'
    const storedKey = localStorage.getItem('adminKey') || ''
    if (verified) {
      setIsVerified(true)
      setAdminKey(storedKey)
    }
  }, [])

  const handleChange = (field) => (event) => {
    setFormData((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setStatus({ type: 'idle', message: '' })

    const options = formData.type === 'mcq'
      ? formData.options.filter((opt) => opt.trim())
      : []

    const parsedCorrectAnswer = Number(formData.correctAnswer)
    const correctAnswer = formData.type === 'mcq'
      ? (Number.isNaN(parsedCorrectAnswer) ? formData.correctAnswer : parsedCorrectAnswer)
      : 'file'

    const payload = {
      id: formData.id.trim() || undefined,
      type: formData.type,
      text: formData.text.trim(),
      options,
      correctAnswer,
      marks: Number(formData.marks) || 1,
      fileUpload: formData.type === 'file'
        ? {
            required: true,
            accept: formData.fileAccept
              .split(',')
              .map((item) => item.trim())
              .filter(Boolean),
            maxSizeMb: Number(formData.fileMaxSizeMb) || 5,
          }
        : undefined,
    }

    try {
      const response = await fetch(API_ENDPOINTS.questions, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error('Failed to create question')
      }

      setStatus({ type: 'success', message: 'Question created.' })
      setFormData({
        id: '',
        type: 'mcq',
        text: '',
        options: [''],
        correctAnswer: '',
        marks: '1',
        fileAccept: '',
        fileMaxSizeMb: '5',
      })
      fetchQuestions()
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  const handleVerify = async () => {
    setVerifying(true)
    setVerifyStatus({ type: 'idle', message: '' })
    setIsVerified(false)

    try {
      const response = await fetch(API_ENDPOINTS.adminVerify, {
        method: 'POST',
        headers: {
          'x-admin-key': adminKey,
        },
      })

      if (!response.ok) {
        throw new Error('Invalid admin key')
      }

      localStorage.setItem('adminVerified', 'true')
      localStorage.setItem('adminKey', adminKey)
      setIsVerified(true)
      setVerifyStatus({ type: 'success', message: 'Admin key verified.' })
    } catch (err) {
      setIsVerified(false)
      setVerifyStatus({ type: 'error', message: err.message })
    } finally {
      setVerifying(false)
    }
  }



  return (
    <div className="grid gap-4">
      {isVerified && <AdminNavbar />}
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Admin: Add Question</h1>
        <p className="mt-1 text-sm text-slate-500">
          Create a new question for students.
        </p>
      </div>

      {!isVerified && (
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <TextField
            id="admin-key"
            label="Admin Key"
            type="password"
            value={adminKey}
            onChange={(event) => setAdminKey(event.target.value)}
            placeholder="Enter admin key"
            required
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleVerify}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
              disabled={!adminKey || verifying}
            >
              {verifying ? 'Verifying...' : 'Verify Key'}
            </button>
            {verifyStatus.message && (
              <span
                className={`text-xs font-semibold ${
                  verifyStatus.type === 'success'
                    ? 'text-emerald-700'
                    : 'text-rose-700'
                }`}
              >
                {verifyStatus.message}
              </span>
            )}
          </div>
        </div>
      )}

      {isVerified ? (
        <form
          className="grid gap-4 rounded-md border border-slate-200 bg-white p-5"
          onSubmit={handleSubmit}
        >
          <TextField
            id="question-id"
            label="Question Number"
            value={formData.id}
            onChange={handleChange('id')}
            placeholder="1"
          />
          <div className="grid gap-2">
            <label className="text-sm font-semibold text-slate-800" htmlFor="question-type">
              Question Type
            </label>
            <select
              id="question-type"
              value={formData.type}
              onChange={handleChange('type')}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
            >
              <option value="mcq">MCQ</option>
              <option value="file">File Upload</option>
            </select>
          </div>
          <TextAreaField
            id="question-text"
            label="Question Text"
            value={formData.text}
            onChange={handleChange('text')}
            placeholder="Enter the question here"
            required
            rows={3}
          />
          {formData.type === 'mcq' && (
            <>
              <div className="grid gap-2">
                <label className="text-sm font-semibold text-slate-800">Options</label>
                {formData.options.map((option, index) => (
                  <div key={index} className="flex gap-2">
                     <TextField
                        id={`option-${index}`}
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...formData.options]
                          newOptions[index] = e.target.value
                          setFormData(prev => ({ ...prev, options: newOptions }))
                        }}
                        placeholder={`Option ${index + 1}`}
                     />
                     {formData.options.length > 1 && (
                       <button
                         type="button"
                         onClick={() => {
                           const newOptions = formData.options.filter((_, i) => i !== index)
                           setFormData(prev => ({ ...prev, options: newOptions }))
                         }}
                         className="px-3 py-2 text-sm text-red-600 border border-slate-200 rounded hover:bg-red-50"
                       >
                         Remove
                       </button>
                     )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({ ...prev, options: [...prev.options, ''] }))
                  }}
                  className="w-fit px-3 py-1.5 text-sm text-blue-600 border border-blue-200 rounded hover:bg-blue-50 mt-1"
                >
                  + Add Option
                </button>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-semibold text-slate-800" htmlFor="question-answer">
                  Right Option
                </label>
                <select
                  id="question-answer"
                  value={formData.correctAnswer}
                  onChange={handleChange('correctAnswer')}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
                  required
                >
                  <option value="">Select the correct option</option>
                  {formData.options.map((opt, idx) => {
                     const trimmed = opt.trim()
                     if (!trimmed) return null
                     return (
                        <option key={idx} value={idx}>
                          {trimmed}
                        </option>
                     )
                  })}
                </select>
              </div>
            </>
          )}
          {formData.type === 'file' && (
            <>
              <TextField
                id="file-accept"
                label="Accepted File Types (comma separated)"
                value={formData.fileAccept}
                onChange={handleChange('fileAccept')}
                placeholder=".pdf, .docx"
              />
              <TextField
                id="file-max-size"
                label="Max Size (MB)"
                type="number"
                value={formData.fileMaxSizeMb}
                onChange={handleChange('fileMaxSizeMb')}
                placeholder="5"
              />
            </>
          )}
          <TextField
            id="question-marks"
            label="Marks"
            type="number"
            value={formData.marks}
            onChange={handleChange('marks')}
            placeholder="1"
          />

          <button
            type="submit"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={submitting}
          >
            {submitting ? 'Saving...' : 'Create Question'}
          </button>
        </form>
      ) : (
        <div className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-500">
          Verify the admin key to unlock question creation.
        </div>
      )}



      {status.message && (
        <div
          className={`rounded-md px-3 py-2 text-sm font-semibold ${
            status.type === 'success'
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-rose-50 text-rose-700'
          }`}
        >
          {status.message}
        </div>
      )}

      {/* Questions List */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Existing Questions</h2>
        <div className="space-y-4">
          {questions.length === 0 ? (
            <p className="text-sm text-slate-500">No questions found.</p>
          ) : (
            questions.map((q) => (
              <div key={q._id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="inline-block px-2 py-1 text-xs font-semibold bg-slate-100 text-slate-700 rounded mb-2">
                      {q.type.toUpperCase()}
                    </span>
                    <h3 className="text-md font-medium text-slate-900">{q.text}</h3>
                    {q.type === 'mcq' && (
                      <div className="mt-2 pl-4 border-l-2 border-slate-100">
                        {q.options.map((opt, idx) => (
                          <div key={idx} className={`text-sm ${idx === q.correctAnswer ? 'text-green-600 font-semibold' : 'text-slate-600'}`}>
                            {opt} {idx === q.correctAnswer && '(Correct)'}
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="mt-2 text-xs text-slate-500">Marks: {q.marks}</p>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">{q._id}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminQuestions
