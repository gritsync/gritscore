import { render, screen } from '@testing-library/react'
import Layout from './Layout'
import { BrowserRouter } from 'react-router-dom'
import { vi } from 'vitest'

// Mock AuthContext
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { name: 'Test User' }, logout: vi.fn() })
}))

describe('Layout', () => {
  it('renders the logo', () => {
    render(
      <BrowserRouter>
        <Layout />
      </BrowserRouter>
    )
    const logo = screen.getAllByAltText('GritScore.ai')[0]
    expect(logo).toBeInTheDocument()
  })
}) 