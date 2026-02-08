const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:1000'

const API_ENDPOINTS = {
  health: `${API_BASE_URL}/health`,
  questions: `${API_BASE_URL}/api/questions`,
}

export { API_BASE_URL, API_ENDPOINTS }
