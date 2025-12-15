/**
 * AI Action Handler Service
 * Handles automation actions from AI Mentor
 */

import { NavigateFunction } from 'react-router-dom'
import { aiAPI, learningAPI, projectsAPI, communityAPI } from './api'
import toast from 'react-hot-toast'

export interface AIAction {
  type: 'search_results' | 'enrolled' | 'project_created' | 'post_created' |
  'confirmation_required' | 'cancelled' | 'navigate' | 'progress_results' |
  'projects_results' | 'unenrolled' | 'user_followed' | 'user_unfollowed' |
  'post_liked' | 'comment_created' | 'open_chat' | 'error' | 'info'
  navigate_to?: string
  search_query?: string
  results?: any
  result?: any
  action_type?: string
  data?: any
  chat_user_id?: string
}

export interface SearchResult {
  paths: Array<{
    id: number
    name: string
    description: string
    icon: string
    module_count: number
  }>
  modules: Array<{
    id: number
    title: string
    description: string
    path_name: string
  }>
  total: number
}

export interface ConfirmationCallback {
  message: string
  onConfirm: () => Promise<void>
  onCancel?: () => void
}

export class AIActionHandler {
  private navigate: NavigateFunction
  private showConfirmation: (callback: ConfirmationCallback) => void

  constructor(
    navigate: NavigateFunction,
    showConfirmation: (callback: ConfirmationCallback) => void
  ) {
    this.navigate = navigate
    this.showConfirmation = showConfirmation
  }

  /**
   * Main handler for AI actions
   */
  async handleAction(action: AIAction, sessionId: string): Promise<void> {
    if (!action || !action.type) return

    try {
      switch (action.type) {
        case 'search_results':
          await this.handleSearchResults(action)
          break

        case 'enrolled':
          await this.handleEnrollment(action)
          break

        case 'project_created':
          await this.handleProjectCreated(action)
          break

        case 'post_created':
          await this.handlePostCreated(action)
          break

        case 'confirmation_required':
          await this.handleConfirmationRequired(action, sessionId)
          break

        case 'navigate':
          await this.handleNavigation(action)
          break

        case 'cancelled':
          toast('Action cancelled', { icon: '🚫' })
          break

        case 'progress_results':
          await this.handleProgressResults(action)
          break

        case 'projects_results':
          await this.handleProjectsResults(action)
          break

        case 'unenrolled':
          toast.success('Successfully unenrolled from course', { icon: '📚' })
          break

        case 'user_followed':
          await this.handleUserFollowed(action)
          break

        case 'user_unfollowed':
          toast.success('Unfollowed user', { icon: '👋' })
          break

        case 'post_liked':
          toast.success('Post liked!', { icon: '❤️' })
          break

        case 'comment_created':
          toast.success('Comment added!', { icon: '💬' })
          break

        case 'open_chat':
          await this.handleOpenChat(action)
          break

        case 'error':
          toast.error(action.result?.message || 'Action failed')
          break

        case 'info':
          // Just informational, no toast needed
          break

        default:
          console.log('Unknown action type:', action.type)
      }
    } catch (error) {
      console.error('Error handling action:', error)
      toast.error('Failed to execute action')
    }
  }

  /**
   * Handle search results display
   */
  private async handleSearchResults(action: AIAction): Promise<void> {
    const { results, navigate_to, search_query } = action

    if (!results) return

    // Dispatch custom event for search results (pages can listen to this)
    window.dispatchEvent(new CustomEvent('ai-search-results', {
      detail: {
        query: search_query,
        results: results,
        timestamp: Date.now()
      }
    }))

    // Navigate to learning page if specified
    if (navigate_to) {
      toast.success(`Found ${results.total} results!`, { icon: '🔍' })

      // Small delay for user to see the results in chat
      setTimeout(() => {
        this.navigate(navigate_to)
      }, 500)
    }
  }

  /**
   * Handle successful enrollment
   */
  private async handleEnrollment(action: AIAction): Promise<void> {
    const { result, navigate_to } = action

    if (result?.success) {
      toast.success(`Enrolled in ${result.path?.name || 'course'}!`, {
        icon: '🎉',
        duration: 4000
      })

      // Navigate to the enrolled path
      if (navigate_to) {
        setTimeout(() => {
          this.navigate(navigate_to)
        }, 1000)
      }
    } else {
      toast.error(result?.message || 'Enrollment failed')
    }
  }

  /**
   * Handle project creation
   */
  private async handleProjectCreated(action: AIAction): Promise<void> {
    const { result, navigate_to } = action

    if (result?.success) {
      toast.success(`Project "${result.project?.title}" created!`, {
        icon: '🚀',
        duration: 4000
      })

      // Navigate to the created project
      if (navigate_to) {
        setTimeout(() => {
          this.navigate(navigate_to)
        }, 1000)
      }
    } else {
      toast.error(result?.message || 'Project creation failed')
    }
  }

  /**
   * Handle post creation
   */
  private async handlePostCreated(action: AIAction): Promise<void> {
    const { result, navigate_to } = action

    if (result?.success) {
      toast.success('Post published successfully!', {
        icon: '✨',
        duration: 4000
      })

      // Navigate to community
      if (navigate_to) {
        setTimeout(() => {
          this.navigate(navigate_to)
        }, 1000)
      }
    } else {
      toast.error(result?.message || 'Post creation failed')
    }
  }

  /**
   * Handle actions that require confirmation
   */
  private async handleConfirmationRequired(action: AIAction, sessionId: string): Promise<void> {
    const { action_type, data } = action

    let confirmMessage = 'Do you want to proceed with this action?'

    // Customize confirmation message based on action type
    switch (action_type) {
      case 'create_project':
        confirmMessage = `Create project "${data?.title}"?`
        break
      case 'create_post':
        confirmMessage = 'Publish this post to Community?'
        break
      case 'enroll':
        confirmMessage = 'Enroll in this course?'
        break
      default:
        confirmMessage = `Confirm: ${action_type?.replace('_', ' ')}`
    }

    // Show confirmation dialog
    this.showConfirmation({
      message: confirmMessage,
      onConfirm: async () => {
        try {
          // Send confirmation message to AI with execute_action flag set to true
          toast.loading('Executing action...', { id: 'confirm-action' })

          const response = await aiAPI.sendMessage(sessionId, 'Yes, do it', { execute_action: true })

          toast.dismiss('confirm-action')

          // Handle the resulting action
          if (response.data.action) {
            await this.handleAction(response.data.action, sessionId)
          } else {
            toast.success('Action completed!')
          }
        } catch (error) {
          toast.dismiss('confirm-action')
          console.error('Error confirming action:', error)
          toast.error('Failed to execute action')
        }
      },
      onCancel: async () => {
        // Send cancellation to AI
        try {
          await aiAPI.sendMessage(sessionId, 'No, cancel it', { execute_action: false })
          toast('Action cancelled', { icon: '🚫' })
        } catch (error) {
          console.error('Error cancelling action:', error)
        }
      }
    })
  }

  /**
   * Handle navigation action
   */
  private async handleNavigation(action: AIAction): Promise<void> {
    const { navigate_to } = action

    if (navigate_to) {
      this.navigate(navigate_to)
    }
  }

  /**
   * Quick action: Enroll in a path
   */
  async enrollInPath(pathId: number, sessionId: string): Promise<void> {
    try {
      toast.loading('Enrolling...', { id: 'enroll' })

      const response = await aiAPI.sendMessage(
        sessionId,
        `Enroll me in path ${pathId}`,
        { execute_action: true }  // Execute action immediately
      )

      toast.dismiss('enroll')

      if (response.data.action) {
        await this.handleAction(response.data.action, sessionId)
      }
    } catch (error) {
      toast.dismiss('enroll')
      toast.error('Failed to enroll')
      console.error('Enrollment error:', error)
    }
  }

  /**
   * Quick action: View path details
   */
  viewPath(pathId: number): void {
    this.navigate(`/learning/${pathId}`)
  }

  /**
   * Quick action: View project details
   */
  viewProject(projectId: number): void {
    this.navigate(`/projects/${projectId}`)
  }

  /**
   * Handle progress results
   */
  private async handleProgressResults(action: AIAction): Promise<void> {
    const { results, navigate_to } = action

    if (results?.total > 0) {
      toast.success(`You're enrolled in ${results.total} courses!`, { icon: '📚' })
    }

    if (navigate_to) {
      setTimeout(() => {
        this.navigate(navigate_to)
      }, 500)
    }
  }

  /**
   * Handle projects results
   */
  private async handleProjectsResults(action: AIAction): Promise<void> {
    const { results, navigate_to } = action

    if (results?.total > 0) {
      toast.success(`You have ${results.total} projects!`, { icon: '🚀' })
    }

    if (navigate_to) {
      setTimeout(() => {
        this.navigate(navigate_to)
      }, 500)
    }
  }

  /**
   * Handle user followed action
   */
  private async handleUserFollowed(action: AIAction): Promise<void> {
    const { result, navigate_to } = action

    if (result?.success) {
      toast.success(result.message || 'Follow request sent!', { icon: '👤' })

      if (navigate_to) {
        setTimeout(() => {
          this.navigate(navigate_to)
        }, 500)
      }
    } else {
      toast.error(result?.message || 'Failed to follow user')
    }
  }

  /**
   * Handle open chat action
   */
  private async handleOpenChat(action: AIAction): Promise<void> {
    const { navigate_to, chat_user_id } = action

    if (navigate_to) {
      // Navigate to community and dispatch event to open chat
      this.navigate(navigate_to)

      if (chat_user_id) {
        // Dispatch event that community page can listen to
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('ai-open-chat', {
            detail: { userId: chat_user_id }
          }))
        }, 500)
      }
    }
  }

  /**
   * Quick action: View user profile
   */
  viewUserProfile(userId: string): void {
    this.navigate(`/user/${userId}`)
  }

  /**
   * Quick action: Navigate to a page
   */
  navigateTo(path: string): void {
    this.navigate(path)
  }
}

/**
 * Action Button Component Data
 */
export interface ActionButton {
  label: string
  icon?: string
  onClick: () => void | Promise<void>
  variant?: 'primary' | 'secondary' | 'success' | 'danger'
}

/**
 * Generate action buttons for search results
 */
export function generateSearchActionButtons(
  results: SearchResult,
  handler: AIActionHandler,
  sessionId: string
): ActionButton[] {
  const buttons: ActionButton[] = []

  // Add buttons for each career path result
  results.paths?.forEach((path) => {
    buttons.push({
      label: `Enroll in ${path.name}`,
      icon: '📚',
      variant: 'primary',
      onClick: () => handler.enrollInPath(path.id, sessionId)
    })

    buttons.push({
      label: `View ${path.name}`,
      icon: '👁️',
      variant: 'secondary',
      onClick: () => handler.viewPath(path.id)
    })
  })

  return buttons
}
