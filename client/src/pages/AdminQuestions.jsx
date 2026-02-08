import { useEffect, useState } from 'react'
import { API_ENDPOINTS } from '../api'
import TextField from '../components/TextField'
import TextAreaField from '../components/TextAreaField'

function AdminQuestions() {
  const [adminKey, setAdminKey] = useState('')
  const [isVerified, setIsVerified] = useState(false)
  const [verifyStatus, setVerifyStatus] = useState({ type: 'idle', message: '' })
  const [formData, setFormData] = useState({
    id: '',
    type: 'mcq',
    text: '',
    options: '',
    correctAnswer: '',
    marks: '1',
    fileAccept: '',
    fileMaxSizeMb: '5',
  })
  const [status, setStatus] = useState({ type: 'idle', message: '' })
  const [submitting, setSubmitting] = useState(false)
  const [verifying, setVerifying] = useState(false)

  useEffect(() => {
    const verified = localStorage.getItem('adminVerified') === 'true'
    if (verified) {
      setIsVerified(true)
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
      ? formData.options
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
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
        options: '',
        correctAnswer: '',
        marks: '1',
        fileAccept: '',
        fileMaxSizeMb: '5',
      })
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
            label="Question ID"
            value={formData.id}
            onChange={handleChange('id')}
            placeholder="Q101"
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
              <TextAreaField
                id="question-options"
                label="Options (comma separated)"
                value={formData.options}
                onChange={handleChange('options')}
                placeholder="Option A, Option B, Option C, Option D"
                required
                rows={2}
              />
              <TextField
                id="question-answer"
                label="Correct Answer (index or text)"
                value={formData.correctAnswer}
                onChange={handleChange('correctAnswer')}
                placeholder="0"
                required
              />
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
    </div>
  )
}

export default AdminQuestions
