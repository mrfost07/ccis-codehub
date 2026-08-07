import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useCareerPaths } from './useApiCache'

/**
 * Which catalogue the student learning page reads.
 *
 * It used to try `/learning/admin/career-paths/` first and fall back to the
 * public list when that returned 401. A student got the ten published paths; an
 * admin or instructor opening the same page got thirteen — including two
 * retired shells with placeholder descriptions and a duplicate that had been
 * merged away. Found by loading the page in a browser and counting.
 *
 * The public endpoint filters `is_active=True` server-side, so asking it is the
 * whole fix. The admin dashboard has its own calls for unpublished paths.
 */

const get = vi.fn()
vi.mock('../services/api', () => ({ default: { get: (...a: any[]) => get(...a) } }))

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

beforeEach(() => {
  get.mockReset()
  get.mockResolvedValue({ data: { results: [{ id: 'p1', name: 'Backend Engineer' }] } })
})
afterEach(() => { vi.clearAllMocks() })

describe('the student course catalogue', () => {
  it('reads the published list', async () => {
    const { result } = renderHook(() => useCareerPaths(), { wrapper })

    await waitFor(() => expect(result.current.data).toBeTruthy())
    expect(get).toHaveBeenCalledWith('/learning/career-paths/?')
  })

  it('never asks the admin endpoint', async () => {
    // The whole bug: whoever could read it saw a different course list.
    const { result } = renderHook(() => useCareerPaths(), { wrapper })

    await waitFor(() => expect(result.current.data).toBeTruthy())
    expect(get.mock.calls.map(c => c[0]).join(' ')).not.toContain('admin')
  })

  it('sends the filters it was given', async () => {
    const { result } = renderHook(
      () => useCareerPaths({ program: 'bscs', difficulty: 'intermediate' }),
      { wrapper })

    await waitFor(() => expect(result.current.data).toBeTruthy())
    const url = get.mock.calls[0][0]
    expect(url).toContain('program_type=bscs')
    expect(url).toContain('difficulty_level=intermediate')
  })

  it('copes with a bare array instead of a paged response', async () => {
    get.mockResolvedValue({ data: [{ id: 'p1' }] })
    const { result } = renderHook(() => useCareerPaths(), { wrapper })

    await waitFor(() => expect(result.current.data).toHaveLength(1))
  })
})
