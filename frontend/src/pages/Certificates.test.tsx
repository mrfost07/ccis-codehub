import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import Certificates from './Certificates'

/**
 * The certificate a student receives.
 *
 * This page used to draw its own HTML lookalike and print that: a text
 * "CCIS-CodeHub" wordmark, an emoji seal, an empty "Platform Director" rule. The
 * real certificate is rendered on the server with the SNSU and CCIS seals, the
 * instructor's name and the CEO's scanned signature — and it was never shown.
 * Two documents from one platform, and students got the wrong one.
 *
 * So what is pinned here is that the page shows and hands over the *server's*
 * file, and renders no certificate of its own.
 */

const get = vi.fn()
const post = vi.fn()

vi.mock('../services/api', () => ({
  default: {
    get: (...a: any[]) => get(...a),
    post: (...a: any[]) => post(...a),
  },
}))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))
vi.mock('../components/Navbar', () => ({ default: () => null }))

const CERT = {
  id: 'c1',
  certificate_id: 'CCIS-2025-F215E646CE',
  issued_at: '2025-12-27T00:00:00Z',
  pdf_url: '/media/certificates/issued/cert_CCIS-2025-F215E646CE.png',
  career_path: { id: 'p1', name: 'Hosting a Website on AWS EC2' },
}

const route = (url: string, certs: any[] = [CERT]) => {
  if (url.includes('eligibility')) return Promise.resolve({ data: [] })
  if (url.includes('certificates/')) return Promise.resolve({ data: { results: certs } })
  return Promise.resolve({ data: {} })
}

afterEach(cleanup)
beforeEach(() => {
  get.mockReset()
  post.mockReset()
  get.mockImplementation((url: string) => route(url))
  post.mockResolvedValue({ data: {} })
  // jsdom has neither; the download path uses both.
  window.URL.createObjectURL = vi.fn(() => 'blob:x')
  window.URL.revokeObjectURL = vi.fn()
})

describe('showing the certificate', () => {
  it('previews the file the server rendered', async () => {
    render(<Certificates />)

    const image = await screen.findByRole('img', { name: /Hosting a Website on AWS EC2/i })
    // Not a placeholder, not a locally drawn one: the generated file.
    expect(image.getAttribute('src')).toContain(
      '/media/certificates/issued/cert_CCIS-2025-F215E646CE.png',
    )
  })

  it('draws no certificate of its own', async () => {
    render(<Certificates />)
    await screen.findByText('Hosting a Website on AWS EC2')

    // The lookalike's own furniture. Any of these means a second design is back.
    expect(screen.queryByText(/Platform Director/i)).toBeNull()
    expect(screen.queryByText(/✦ CCIS-CodeHub ✦/)).toBeNull()
    expect(screen.queryByText(/This certifies that/i)).toBeNull()
  })

  it('offers no download until the file exists, only a way to render it', async () => {
    get.mockImplementation((url: string) => route(url, [{ ...CERT, pdf_url: null }]))
    render(<Certificates />)

    await screen.findByRole('button', { name: /generate certificate/i })
    expect(screen.queryByRole('button', { name: /^pdf$/i })).toBeNull()
  })

  it('renders a missing one on demand and reloads to pick it up', async () => {
    get.mockImplementation((url: string) => route(url, [{ ...CERT, pdf_url: null }]))
    render(<Certificates />)
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: /generate certificate/i }))

    expect(post).toHaveBeenCalledWith('/learning/certificates/c1/claim/')
    // Without the refetch the card would still think it has no file.
    await waitFor(() => expect(get.mock.calls.filter(c => c[0] === '/learning/certificates/').length)
      .toBeGreaterThan(1))
  })
})

describe('downloading', () => {
  const blobFor = (format?: string) => {
    get.mockImplementation((url: string, config?: any) => {
      if (url.includes('/download/')) {
        expect(config?.responseType).toBe('blob')
        expect(config?.params?.as).toBe(format)
        return Promise.resolve({ data: new Blob(['x']) })
      }
      return route(url)
    })
  }

  it('asks the server for the PDF rather than printing the page', async () => {
    blobFor('pdf')
    render(<Certificates />)
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: /^pdf$/i }))

    await waitFor(() => expect(get).toHaveBeenCalledWith(
      '/learning/certificates/c1/download/',
      expect.objectContaining({ params: { as: 'pdf' }, responseType: 'blob' }),
    ))
  })

  it('downloads the image without a format, which is the default', async () => {
    blobFor(undefined)
    render(<Certificates />)
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: /image/i }))

    await waitFor(() => expect(get).toHaveBeenCalledWith(
      '/learning/certificates/c1/download/',
      expect.objectContaining({ responseType: 'blob' }),
    ))
  })
})
