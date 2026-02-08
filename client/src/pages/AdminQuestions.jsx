import { useState } from 'react'
import { API_ENDPOINTS } from '../api'
import TextField from '../components/TextField'
import TextAreaField from '../components/TextAreaField'

function AdminQuestions() {
  const [formData, setFormData] = useState({
    id: '',
    text: '',
    options: '',
    correctAnswer: '',
    marks: '1',
  })
  const [status, setStatus] = useState({ type: 'idle', message: '' })
  const [submitting, setSubmitting] = useState(false)

  const handleChange = (field) => (event) => {
    setFormData((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setStatus({ type: 'idle', message: '' })

    const options = formData.options
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)

    const parsedCorrectAnswer = Number(formData.correctAnswer)
    const correctAnswer = Number.isNaN(parsedCorrectAnswer)
      ? formData.correctAnswer
      : parsedCorrectAnswer

    const payload = {
      id: formData.id.trim() || undefined,
      type: 'mcq',
      text: formData.text.trim(),
      options,
      correctAnswer,
      marks: Number(formData.marks) || 1,
    }

    try {
      const response = await fetch(API_ENDPOINTS.questions, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-role': 'admin',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error('Failed to create question')
      }

      setStatus({ type: 'success', message: 'Question created.' })
      setFormData({ id: '', text: '', options: '', correctAnswer: '', marks: '1' })
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Admin: Add Question</h1>
        <p className="mt-1 text-sm text-slate-500">
          Create a new MCQ question for students.
        </p>
      </div>

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
        <TextAreaField
          id="question-text"
          label="Question Text"
          value={formData.text}
          onChange={handleChange('text')}
          placeholder="Enter the question here"
          required
          rows={3}
        />
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
