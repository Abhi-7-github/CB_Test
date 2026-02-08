import { useState } from 'react'
import studentData from '../data/studentdata.json'
import TextField from '../components/TextField'

function StudentLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState({ type: 'idle', message: '' })

  const handleSubmit = (event) => {
    event.preventDefault()

    if (!email.endsWith('@klu.ac.in')) {
      setStatus({ type: 'error', message: 'Use your @klu.ac.in email.' })
      return
    }

    const match = studentData.find(
      (student) => student.email === email && student.password === password
    )

    if (match) {
      setStatus({ type: 'success', message: 'Login successful.' })
    } else {
      setStatus({ type: 'error', message: 'Invalid email or password.' })
    }
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-semibold text-slate-900">Student Login</h1>
      <p className="mt-1 text-sm text-slate-500">Use your KLU student credentials.</p>

      <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
          <TextField
            id="email"
            label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="student@klu.ac.in"
            required
          />

          <TextField
            id="password"
            label="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            required
          />

        <button
          type="submit"
          className="mt-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
        >
          Login
        </button>
      </form>

      {status.message && (
        <div
          className={`mt-4 rounded-md px-3 py-2 text-sm font-semibold ${
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

export default StudentLogin
