import { useEffect, useState } from 'react'
import { API_ENDPOINTS } from '../api'
import TextField from '../components/TextField'
import TextAreaField from '../components/TextAreaField'
import { useLocation, useNavigate } from 'react-router-dom'
import AdminNavbar from '../components/AdminNavbar'

function AdminQuestions() {
  const [adminKey, setAdminKey] = useState('')
  const [isVerified, setIsVerified] = useState(false)
  const [verifyStatus, setVerifyStatus] = useState({ type: 'idle', message: '' })
  
  const location = useLocation()
  const navigate = useNavigate()
  const [isEditing, setIsEditing] = useState(false)

  const [formData, setFormData] = useState({
    _id: null,
    id: '',
    type: 'mcq',
    text: '',
    options: [''],
    correctAnswer: '',
    marks: '1',
    fileAccept: '',
    fileMaxSizeMb: '5',
  })
  const [status, setStatus] = useState({ type: 'idle', message: '' })
  const [submitting, setSubmitting] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [_questions, setQuestions] = useState([])

  useEffect(() => {
    fetchQuestions()
    const storedVerified = localStorage.getItem('adminVerified') === 'true'
    const storedKey = localStorage.getItem('adminKey') || ''
    if (storedVerified && storedKey) {
      setIsVerified(true)
      setAdminKey(storedKey)
    }
  }, [])

  const resolveCorrectIndex = (question) => {
    if (!question || !Array.isArray(question.options)) return ''
    const total = question.options.length
    const raw = question.correctAnswer
    if (raw === null || raw === undefined) return ''

    if (typeof raw === 'number' && Number.isFinite(raw)) {
      if (raw >= 0 && raw < total) return String(raw)
      if (raw >= 1 && raw <= total) return String(raw - 1)
      return ''
    }

    const text = String(raw).trim()
    if (!text) return ''

    if (/^[A-Za-z]$/.test(text)) {
      const idx = text.toUpperCase().charCodeAt(0) - 65
      return idx >= 0 && idx < total ? String(idx) : ''
    }

    if (/^\d+$/.test(text)) {
      const num = Number(text)
      if (num >= 0 && num < total) return String(num)
      if (num >= 1 && num <= total) return String(num - 1)
      return ''
    }

    const exactIdx = question.options.indexOf(text)
    if (exactIdx !== -1) return String(exactIdx)

    const lowered = text.toLowerCase()
    const ciIdx = question.options.findIndex((opt) => String(opt).toLowerCase() === lowered)
    return ciIdx !== -1 ? String(ciIdx) : ''
  }

  useEffect(() => {
    if (location.state?.question) {
      const q = location.state.question
      setIsEditing(true)
      setFormData({
        _id: q._id,
        id: q.id || '',
        type: q.type,
        text: q.text,
        options: q.type === 'mcq' ? (q.options.length ? q.options : ['']) : [''],
        correctAnswer: q.type === 'mcq' ? resolveCorrectIndex(q) : '',
        marks: q.marks?.toString() || '1',
        fileAccept: q.fileUpload?.accept?.join(', ') || '',
        fileMaxSizeMb: q.fileUpload?.maxSizeMb?.toString() || '5'
      })
    } else {
      setIsEditing(false)
    }
  }, [location.state])

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

  const handleChange = (field) => (event) => {
    setFormData((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setStatus({ type: 'idle', message: '' })

    try {
      const payload = {
        id: formData.id ? Number(formData.id) : undefined,
        type: formData.type,
        text: formData.text,
        marks: Number(formData.marks || 1),
      }

      if (formData.type === 'mcq') {
        const validOptions = formData.options.map((opt) => opt.trim()).filter(Boolean)
        if (validOptions.length < 2) {
          throw new Error('Please provide at least 2 non-empty options for MCQ.')
        }

        if (formData.correctAnswer === '') {
          throw new Error('Please select the correct option.')
        }

        const correctIndex = Number(formData.correctAnswer)
        if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= validOptions.length) {
          throw new Error('Please select a valid correct option.')
        }

        payload.options = validOptions
        payload.correctAnswer = correctIndex
      }

      if (formData.type === 'file') {
        payload.fileUpload = {
          accept: formData.fileAccept
            ? formData.fileAccept.split(',').map((item) => item.trim()).filter(Boolean)
            : [],
          maxSizeMb: Number(formData.fileMaxSizeMb || 5),
        }
      }

      const activeAdminKey = adminKey || localStorage.getItem('adminKey') || ''
      const url = isEditing
        ? `${API_ENDPOINTS.questions}/${formData._id}`
        : API_ENDPOINTS.questions
      const method = isEditing ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': activeAdminKey,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.message || 'Failed to save question')
      }

      setStatus({
        type: 'success',
        message: isEditing ? 'Question updated successfully.' : 'Question created successfully.',
      })

      if (isEditing) {
        setIsEditing(false)
        navigate('/admin/list')
      } else {
        setFormData({
          _id: null,
          id: '',
          type: 'mcq',
          text: '',
          options: [''],
          correctAnswer: '',
          marks: '1',
          fileAccept: '',
          fileMaxSizeMb: '5',
        })
      }
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
        throw new Error('Invalid admin credentials key.')
      }

      localStorage.setItem('adminVerified', 'true')
      localStorage.setItem('adminKey', adminKey)
      setIsVerified(true)
      setVerifyStatus({ type: 'success', message: 'Admin authentication verified.' })
    } catch (err) {
      setIsVerified(false)
      setVerifyStatus({ type: 'error', message: err.message })
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F4F1DE] px-4 py-8 md:px-8 font-sans text-[#0D1B2A]">
      <div className="mx-auto max-w-5xl">
        
        {isVerified && <AdminNavbar />}

        {/* Header Ribbon */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#0D1B2A]">
              {isEditing ? 'Edit Examination Question' : 'Author New Question'}
            </h1>
            <p className="mt-1 text-xs text-[#415A77]">
              {isEditing
                ? 'Update specifications and choices for this assessment item.'
                : 'Configure a new problem statement and answer criteria for candidates.'}
            </p>
          </div>

          {isEditing && (
            <button
              type="button"
              onClick={() => {
                setIsEditing(false)
                setFormData({
                  _id: null,
                  id: '',
                  type: 'mcq',
                  text: '',
                  options: [''],
                  correctAnswer: '',
                  marks: '1',
                  fileAccept: '',
                  fileMaxSizeMb: '5',
                })
                navigate('/admin')
              }}
              className="text-xs font-semibold text-[#415A77] hover:text-[#0D1B2A] transition-colors"
            >
              ← Cancel Editing
            </button>
          )}
        </div>

        {/* Verification Screen if unverified */}
        {!isVerified && (
          <div className="mb-6 rounded-2xl border border-[#0D1B2A]/10 bg-white p-6 shadow-xs max-w-md">
            <h2 className="text-sm font-bold text-[#0D1B2A] mb-1">Invigilator Authorization</h2>
            <p className="text-xs text-[#415A77] mb-4">Enter administrative key to unlock question authoring.</p>

            <TextField
              id="admin-key"
              label="Admin Security Key"
              type="password"
              value={adminKey}
              onChange={(event) => setAdminKey(event.target.value)}
              placeholder="Enter admin security key"
              required
            />
            
            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={handleVerify}
                disabled={!adminKey || verifying}
                className="rounded-xl bg-[#0D1B2A] px-4 py-2 text-xs font-semibold text-[#F4F1DE] shadow-xs hover:bg-[#1B263B] transition-colors disabled:opacity-50"
              >
                {verifying ? 'Authenticating...' : 'Verify Access'}
              </button>
              {verifyStatus.message && (
                <span
                  className={`text-xs font-semibold ${
                    verifyStatus.type === 'success' ? 'text-[#778D7A]' : 'text-[#9E2A2B]'
                  }`}
                >
                  {verifyStatus.message}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Question Form */}
        {isVerified ? (
          <form
            className="rounded-2xl border border-[#0D1B2A]/10 bg-white p-6 md:p-8 shadow-xs space-y-5"
            onSubmit={handleSubmit}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                id="question-id"
                label="Question Index / Number"
                value={formData.id}
                onChange={handleChange('id')}
                placeholder="1"
              />

              <div className="grid gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#0D1B2A]" htmlFor="question-type">
                  Question Format
                </label>
                <select
                  id="question-type"
                  value={formData.type}
                  onChange={handleChange('type')}
                  className="w-full rounded-xl border border-[#0D1B2A]/15 bg-[#FCFAF5] px-3.5 py-2.5 text-sm text-[#0D1B2A] outline-none focus:border-[#415A77]"
                >
                  <option value="mcq">Multiple Choice Question (MCQ)</option>
                  <option value="file">File Submission / Upload</option>
                </select>
              </div>
            </div>

            <TextAreaField
              id="question-text"
              label="Question Prompt Statement"
              value={formData.text}
              onChange={handleChange('text')}
              placeholder="Enter the complete question prompt..."
              required
              rows={3}
            />

            {/* MCQ Options Config */}
            {formData.type === 'mcq' && (
              <div className="rounded-xl border border-[#0D1B2A]/10 bg-[#FAF8F2] p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#0D1B2A]">
                    Multiple Choice Options
                  </label>
                  <span className="text-[11px] text-[#415A77]">Minimum 2 choices</span>
                </div>

                {formData.options.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="flex-1">
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
                    </div>
                    {formData.options.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const newOptions = formData.options.filter((_, i) => i !== index)
                          setFormData(prev => ({ ...prev, options: newOptions }))
                        }}
                        className="mt-5 rounded-xl border border-[#9E2A2B]/30 bg-white px-3 py-2 text-xs font-semibold text-[#9E2A2B] hover:bg-[#FBEAEA] transition-colors"
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
                  className="rounded-xl border border-[#415A77]/30 bg-white px-3.5 py-1.5 text-xs font-semibold text-[#415A77] hover:bg-[#EDF2EE] transition-colors"
                >
                  + Add Option Choice
                </button>

                <div className="pt-3 border-t border-[#0D1B2A]/10">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#0D1B2A] block mb-1.5" htmlFor="question-answer">
                    Correct Option Key
                  </label>
                  <select
                    id="question-answer"
                    value={formData.correctAnswer}
                    onChange={handleChange('correctAnswer')}
                    className="w-full rounded-xl border border-[#0D1B2A]/15 bg-white px-3.5 py-2.5 text-sm text-[#0D1B2A] outline-none focus:border-[#415A77]"
                    required
                  >
                    <option value="">Select the designated correct answer</option>
                    {formData.options.map((opt, idx) => {
                      const trimmed = opt.trim()
                      if (!trimmed) return null
                      return (
                        <option key={idx} value={idx}>
                          Option {idx + 1}: {trimmed}
                        </option>
                      )
                    })}
                  </select>
                </div>
              </div>
            )}

            {/* File Upload Config */}
            {formData.type === 'file' && (
              <div className="grid gap-4 sm:grid-cols-2 rounded-xl border border-[#0D1B2A]/10 bg-[#FAF8F2] p-5">
                <TextField
                  id="file-accept"
                  label="Accepted Extensions (comma-separated)"
                  value={formData.fileAccept}
                  onChange={handleChange('fileAccept')}
                  placeholder=".pdf, .docx, .zip"
                />
                <TextField
                  id="file-max-size"
                  label="Maximum Allowed Size (MB)"
                  type="number"
                  value={formData.fileMaxSizeMb}
                  onChange={handleChange('fileMaxSizeMb')}
                  placeholder="5"
                />
              </div>
            )}

            <div className="max-w-xs">
              <TextField
                id="question-marks"
                label="Assigned Marks"
                type="number"
                value={formData.marks}
                onChange={handleChange('marks')}
                placeholder="1"
              />
            </div>

            <div className="pt-4 border-t border-[#0D1B2A]/10 flex items-center justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-[#0D1B2A] px-6 py-2.5 text-xs font-semibold text-[#F4F1DE] shadow-xs hover:bg-[#1B263B] transition-colors disabled:opacity-50"
              >
                {submitting ? 'Saving Question...' : (isEditing ? 'Update Question' : 'Commit Question to Bank')}
              </button>
            </div>
          </form>
        ) : null}

        {status.message && (
          <div
            className={`mt-4 rounded-xl border p-3.5 text-xs font-semibold ${
              status.type === 'success'
                ? 'border-[#778D7A]/40 bg-[#EDF2EE] text-[#1B263B]'
                : 'border-[#9E2A2B]/20 bg-[#FBEAEA] text-[#782828]'
            }`}
          >
            {status.message}
          </div>
        )}

      </div>
    </div>
  )
}

export default AdminQuestions
