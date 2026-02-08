const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:1000'

const API_ENDPOINTS = {
  health: `${API_BASE_URL}/health`,
  questions: `${API_BASE_URL}/api/questions`,
  submissions: (questionId) => `${API_BASE_URL}/api/questions/${questionId}/submissions`,
  submitTest: `${API_BASE_URL}/api/submit-test`,
  adminVerify: `${API_BASE_URL}/api/admin/verify`,
}

export { API_BASE_URL, API_ENDPOINTS }
