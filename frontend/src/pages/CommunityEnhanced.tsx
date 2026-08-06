import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import CommunityChat from '../components/CommunityChat'
import FollowRequests from '../components/FollowRequests'
import toast from 'react-hot-toast'
import api, { communityAPI } from '../services/api'
import JobStories from '../components/JobStories'
import { Heart, MessageCircle, Share2, Image, Send, X, Reply, ChevronDown, ChevronUp, ChevronRight, UserPlus, UserMinus, Bell, Users, Users2, Clock, Building2, Crown, Shield, Lock, Search, Check, ArrowLeft, Settings, Camera, Edit3, Trash2, Globe, MoreVertical } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { getMediaUrl } from '../utils/mediaUrl'
import { Skeleton, SkeletonListRow, Modal, Button } from '../components/ui'
import ContentActionMenu, { buildContentActions } from '../components/community/ContentActionMenu'
import ReportDialog from '../components/community/ReportDialog'
import MoveToChannelDialog from '../components/community/MoveToChannelDialog'
import EditContentDialog from '../components/community/EditContentDialog'
import Reactors from '../components/Reactors'

interface Author {
  id: string
  username: string
  profile_picture?: string
  first_name?: string
  last_name?: string
  role?: string
  program?: string
}

interface Post {
  id: string
  author: Author
  title?: string
  content: string
  image?: string
  image_url?: string
  post_type: string
  like_count: number
  comment_count: number
  view_count: number
  created_at: string
  is_liked: boolean
  comments?: Comment[]
  organization?: string
  organization_data?: {
    id: string
    name: string
    slug: string
    icon: string
  }
}

interface Comment {
  id: string
  post: string
  author: Author
  content: string
  created_at: string
  like_count: number
  is_liked: boolean
  parent?: string
  replies?: Comment[]
}

interface Organization {
  id: string
  name: string
  slug: string
  description: string
  cover_image_url: string | null
  icon: string
  org_type: string
  program: string | null
  is_official: boolean
  is_private: boolean
  requires_approval: boolean
  member_count: number
  post_count: number
  is_member: boolean
  membership_status: string | null
  user_role: string | null
}

interface OrgInvitation {
  id: string
  organization: Organization
  inviter: { id: string; username: string }
  message: string
}

interface CommunityNotification {
  id: string
  sender: Author | null
  notification_type: string
  title: string
  message: string
  is_read: boolean
  related_object_id: string | null
  created_at: string
}

/** Compact relative timestamp for the activity rail ("now", "5m", "3h", "2d"). */
function timeAgo(iso: string) {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return 'now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

interface OrgMember {
  id: string
  user: { id: string; username: string; profile_picture: string | null }
  role: string
  status: string
  joined_at: string
}

// Organization Admin Panel Component
function OrgAdminPanel({ org, onUpdate }: { org: Organization; onUpdate: () => void }) {
  const [pendingMembers, setPendingMembers] = useState<OrgMember[]>([])
  const [members, setMembers] = useState<OrgMember[]>([])
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState<'pending' | 'members'>('pending')

  useEffect(() => {
    fetchData()
  }, [org.slug])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [pendingRes, membersRes] = await Promise.all([
        communityAPI.getOrgPendingRequests(org.slug).catch(() => ({ data: [] })),
        communityAPI.getOrgMembers(org.slug).catch(() => ({ data: [] }))
      ])
      setPendingMembers(Array.isArray(pendingRes.data) ? pendingRes.data : [])
      setMembers(Array.isArray(membersRes.data) ? membersRes.data : [])
    } catch (error) {
      console.error('Failed to fetch org data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (userId: string) => {
    try {
      await communityAPI.approveMember(org.slug, userId)
      toast.success('Member approved')
      fetchData()
      onUpdate()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to approve')
    }
  }

  const handleReject = async (userId: string) => {
    try {
      await communityAPI.rejectMember(org.slug, userId)
      toast.success('Request rejected')
      fetchData()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to reject')
    }
  }

  const handleSetRole = async (userId: string, role: string) => {
    try {
      await communityAPI.setMemberRole(org.slug, userId, role)
      toast.success(`Role updated to ${role}`)
      fetchData()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update role')
    }
  }

  if (loading) {
    return (
      <div className="mt-4 pt-4 border-t border-neutral-700 flex justify-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  return (
    <div className="mt-4 pt-4 border-t border-neutral-700">
      {/* Tabs */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setActiveSection('pending')}
          className={`text-xs px-3 py-1 rounded transition ${activeSection === 'pending'
            ? 'bg-amber-500/20 text-amber-400'
            : 'bg-neutral-700 text-neutral-400 hover:bg-neutral-600'
            }`}
        >
          Pending ({pendingMembers.length})
        </button>
        <button
          onClick={() => setActiveSection('members')}
          className={`text-xs px-3 py-1 rounded transition ${activeSection === 'members'
            ? 'bg-purple-500/20 text-purple-400'
            : 'bg-neutral-700 text-neutral-400 hover:bg-neutral-600'
            }`}
        >
          Members ({members.length})
        </button>
      </div>

      {/* Pending Requests */}
      {activeSection === 'pending' && (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {pendingMembers.length > 0 ? pendingMembers.map(member => (
            <div key={member.id} className="flex items-center justify-between bg-neutral-700/50 rounded-lg p-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-purple-500/30 flex items-center justify-center text-xs font-bold">
                  {member.user.username.charAt(0).toUpperCase()}
                </div>
                <span className="text-white text-sm">{member.user.username}</span>
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleApprove(member.user.id)} className="p-1 bg-green-600 hover:bg-green-700 rounded text-white">
                  <Check className="w-3 h-3" />
                </button>
                <button onClick={() => handleReject(member.user.id)} className="p-1 bg-red-600 hover:bg-red-700 rounded text-white">
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          )) : (
            <p className="text-neutral-500 text-xs text-center py-2">No pending requests</p>
          )}
        </div>
      )}

      {/* Members List */}
      {activeSection === 'members' && (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {members.map(member => (
            <div key={member.id} className="flex items-center justify-between bg-neutral-700/50 rounded-lg p-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-purple-500/30 flex items-center justify-center text-xs font-bold">
                  {member.user.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <span className="text-white text-sm">{member.user.username}</span>
                  <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${member.role === 'owner' ? 'bg-amber-500/20 text-amber-400' :
                    member.role === 'admin' ? 'bg-purple-500/20 text-purple-400' :
                      member.role === 'moderator' ? 'bg-purple-500/20 text-purple-400' :
                        'bg-neutral-600 text-neutral-400'
                    }`}>
                    {member.role}
                  </span>
                </div>
              </div>
              {org.user_role === 'owner' && member.role !== 'owner' && (
                <select
                  value={member.role}
                  onChange={(e) => handleSetRole(member.user.id, e.target.value)}
                  className="text-xs bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white"
                >
                  <option value="member">Member</option>
                  <option value="moderator">Moderator</option>
                  <option value="admin">Admin</option>
                </select>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Group Post Card Component with Comments and Replies
/**
 * Ownership, decided only when BOTH ids are known.
 *
 * These compared `a?.id?.toString() === b?.id?.toString()`, so when both sides
 * were undefined — an auth context still loading, or a payload without a nested
 * author id — `undefined === undefined` came out true and the viewer was treated
 * as the author of everything. That is how a menu ends up offering Delete on
 * someone else's comment. The API refuses it, so nothing was lost, but the menu
 * should not offer what the server will reject.
 */
function sameUser(a: any, b: any) {
  const mine = a?.id
  const theirs = b?.id
  return !!mine && !!theirs && String(mine) === String(theirs)
}

function GroupPostCard({
  post,
  onLike,
  onRefresh,
  currentUser
}: {
  post: Post
  onLike: (postId: string) => void
  onRefresh: () => void
  currentUser: any
}) {
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [loadingComments, setLoadingComments] = useState(false)
  const [replyInputs, setReplyInputs] = useState<{ [key: string]: string }>({})
  const [showReplyInput, setShowReplyInput] = useState<{ [key: string]: boolean }>({})
  const [showReplies, setShowReplies] = useState<{ [key: string]: boolean }>({})

  // Post menu state
  const [isEditingPost, setIsEditingPost] = useState(false)
  const [editedPostContent, setEditedPostContent] = useState(post.content)
  // Dialog state is local rather than threaded down from the page: both dialogs
  // call the API themselves, and Modal portals to the body, so nothing is gained
  // by hoisting it.
  const [reportOpen, setReportOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)

  const copyPostLink = async (postId: string) => {
    const url = `${window.location.origin}/community/posts/${postId}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link copied')
    } catch {
      toast.error(`Could not copy. The link is ${url}`)
    }
  }

  const toggleComments = async () => {
    const next = !(post as any).comments_disabled
    try {
      await communityAPI.updatePost(post.id, { comments_disabled: next })
      toast.success(next ? 'Comments turned off' : 'Comments turned back on')
      onRefresh()
    } catch {
      toast.error('Could not change that. Try again.')
    }
  }

  // Comment menu state
  const [showCommentMenu, setShowCommentMenu] = useState<{ [key: string]: boolean }>({})
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editedCommentContent, setEditedCommentContent] = useState('')

  const isPostAuthor = sameUser(currentUser, post.author)

  const fetchComments = async () => {
    try {
      setLoadingComments(true)
      const response = await communityAPI.getComments(post.id)
      setComments(response.data.results || response.data || [])
    } catch (error) {
      console.error('Failed to fetch comments:', error)
    } finally {
      setLoadingComments(false)
    }
  }

  const handleToggleComments = () => {
    if (!showComments && comments.length === 0) {
      fetchComments()
    }
    setShowComments(!showComments)
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return

    try {
      await communityAPI.createComment({ post: post.id, content: newComment })
      setNewComment('')
      fetchComments()
      onRefresh()
      toast.success('Comment added!')
    } catch (error) {
      toast.error('Failed to add comment')
    }
  }

  const handleLikeComment = async (commentId: string) => {
    try {
      await communityAPI.likeComment(commentId)
      fetchComments()
    } catch (error) {
      console.error('Failed to like comment:', error)
    }
  }

  // Post edit/delete handlers
  const handleDeletePost = async () => {
    if (!confirm('Are you sure you want to delete this post?')) return

    try {
      await communityAPI.deletePost(post.id)
      toast.success('Post deleted!')
      onRefresh()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete post')
    }
  }

  const handleEditPost = () => {
    // The dialog owns the text and the image; this only opens it.
    setIsEditingPost(true)
  }

  const handleSavePostEdit = async () => {
    if (!editedPostContent.trim()) return

    try {
      await communityAPI.updatePost(post.id, { content: editedPostContent })
      toast.success('Post updated!')
      setIsEditingPost(false)
      onRefresh()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update post')
    }
  }

  const handleCancelPostEdit = () => {
    setEditedPostContent(post.content)
    setIsEditingPost(false)
  }

  // Comment edit/delete handlers
  const copyCommentLink = async (comment: Comment) => {
    // A comment has no page of its own, so the link is the post plus a hash.
    const url = `${window.location.origin}/community/posts/${post.id}#comment-${comment.id}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link copied')
    } catch {
      toast.error(`Could not copy. The link is ${url}`)
    }
  }

  const [commentReportId, setCommentReportId] = useState<string | null>(null)

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return

    try {
      await communityAPI.deleteComment(commentId)
      toast.success('Comment deleted!')
      fetchComments()
      onRefresh()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete comment')
    }
    setShowCommentMenu({ ...showCommentMenu, [commentId]: false })
  }

  const handleEditComment = (comment: Comment) => {
    setEditingCommentId(comment.id)
    setEditedCommentContent(comment.content)
    setShowCommentMenu({ ...showCommentMenu, [comment.id]: false })
  }

  const handleSaveCommentEdit = async (commentId: string) => {
    if (!editedCommentContent.trim()) return

    try {
      await communityAPI.updateComment(commentId, editedCommentContent)
      toast.success('Comment updated!')
      setEditingCommentId(null)
      setEditedCommentContent('')
      fetchComments()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update comment')
    }
  }

  const handleCancelCommentEdit = () => {
    setEditingCommentId(null)
    setEditedCommentContent('')
  }

  const isCommentAuthor = (comment: Comment) => sameUser(currentUser, comment.author)

  const handleReply = async (parentCommentId: string) => {
    const content = replyInputs[parentCommentId]
    if (!content?.trim()) return

    try {
      const response = await communityAPI.createComment({
        post: post.id,
        content,
        parent: parentCommentId
      })

      // Update local state immediately
      setComments(prev => prev.map(comment => {
        if (comment.id === parentCommentId) {
          return {
            ...comment,
            replies: [...(comment.replies || []), response.data]
          }
        }
        return comment
      }))

      setReplyInputs({ ...replyInputs, [parentCommentId]: '' })
      setShowReplyInput({ ...showReplyInput, [parentCommentId]: false })
      setShowReplies({ ...showReplies, [parentCommentId]: true }) // Auto-expand replies
      onRefresh()
      toast.success('Reply posted!')
    } catch (error) {
      toast.error('Failed to post reply')
    }
  }

  const handleReplyToReply = async (parentCommentId: string, replyToUsername: string, replyId: string) => {
    const content = replyInputs[replyId]
    if (!content?.trim()) return

    try {
      const response = await communityAPI.createComment({
        post: post.id,
        content: `@${replyToUsername} ${content}`,
        parent: parentCommentId
      })

      // Update local state immediately
      setComments(prev => prev.map(comment => {
        if (comment.id === parentCommentId) {
          return {
            ...comment,
            replies: [...(comment.replies || []), response.data]
          }
        }
        return comment
      }))

      setReplyInputs({ ...replyInputs, [replyId]: '' })
      setShowReplyInput({ ...showReplyInput, [replyId]: false })
      onRefresh()
      toast.success('Reply posted!')
    } catch (error) {
      toast.error('Failed to post reply')
    }
  }

  const toggleReplyInput = (commentId: string) => {
    setShowReplyInput({ ...showReplyInput, [commentId]: !showReplyInput[commentId] })
  }

  const toggleReplies = (commentId: string) => {
    setShowReplies({ ...showReplies, [commentId]: !showReplies[commentId] })
  }

  const getProfilePic = (author: any) => {
    return getMediaUrl(author?.profile_picture)
  }

  const profilePicUrl = getProfilePic(post.author)

  // ContentActionMenu handles its own outside-click and Escape, so this only
  // still clears the legacy comment-menu map.
  const handleClickOutside = () => {
    setShowCommentMenu({})
  }

  return (
    <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-4" onClick={handleClickOutside}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-500/30 flex items-center justify-center text-sm font-bold overflow-hidden">
            {profilePicUrl ? (
              <img src={profilePicUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white">{post.author.username.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div>
            <p className="text-white font-medium">{post.author.username}</p>
            <p className="text-neutral-500 text-xs">
              {new Date(post.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/*
          The same shared menu as the main feed. This copy offered edit and delete
          to the author only, on the modal layer (z-50), and had already drifted
          from the other one on width and rounding.
        */}
        <div onClick={e => e.stopPropagation()}>
          <ContentActionMenu
            label="Post actions"
            actions={buildContentActions({
              kind: 'post',
              canEdit: isPostAuthor,
              canDelete: isPostAuthor || currentUser?.role === 'admin',
              commentsDisabled: !!(post as any).comments_disabled,
              onCopyLink: () => copyPostLink(post.id),
              onReport: () => setReportOpen(true),
              onDelete: handleDeletePost,
              onMoveToChannel: () => setShareOpen(true),
              onEdit: handleEditPost,
              onToggleComments: toggleComments,
            })}
          />
        </div>
      </div>

      {/* Editing happens in EditContentDialog now: the inline textarea here only
          ever sent `content`, so a post's image could not be changed. */}
      <p className="text-neutral-200 text-[15px] leading-relaxed mb-3 whitespace-pre-wrap break-words">{post.content}</p>

      {post.image_url && (
        <div className="rounded-xl overflow-hidden border border-neutral-800 bg-neutral-950 mb-3">
          <img
            src={getMediaUrl(post.image_url) || ''}
            alt="Post attachment"
            loading="lazy"
            className="w-full max-h-[70vh] sm:max-h-[32rem] object-contain"
          />
        </div>
      )}

      {/* Engagement summary + equal ghost action bar */}
      {(post.like_count > 0 || post.comment_count > 0) && (
        <div className="flex items-center gap-3 text-xs text-neutral-500 tabular-nums mb-1">
          {post.like_count > 0 && (
            /* Was a plain <span>: the count was displayed but not openable, even
               though PostLike.user has always recorded who. */
            <Reactors
              count={post.like_count}
              title="Liked by"
              noun="like"
              loadPage={async page => {
                const { data } = await communityAPI.getPostLikers(post.id, page)
                return { results: data.results ?? data, next: data.next ?? null }
              }}
              className="h-10 -my-1 gap-1 px-1 text-xs text-neutral-500 sm:h-auto sm:my-0"
            >
              <span className="flex items-center gap-1">
                <Heart className="w-3 h-3 fill-red-400 text-red-400" />
                {post.like_count}
              </span>
            </Reactors>
          )}
          {post.comment_count > 0 && (
            <button onClick={handleToggleComments} className="hover:text-neutral-300 transition-colors ms-auto">
              {post.comment_count} comment{post.comment_count !== 1 ? 's' : ''}
            </button>
          )}
        </div>
      )}
      <div className="flex items-center border-t border-neutral-800 pt-1 -mx-2">
        <button
          onClick={() => onLike(post.id)}
          className={`flex-1 flex items-center justify-center gap-2 h-9 rounded-lg text-sm font-medium transition-colors hover:bg-neutral-800/60 ${post.is_liked ? 'text-red-400' : 'text-neutral-400 hover:text-neutral-200'}`}
        >
          <Heart className={`w-4 h-4 ${post.is_liked ? 'fill-current' : ''}`} />
          Like
        </button>
        <button
          onClick={handleToggleComments}
          className="flex-1 flex items-center justify-center gap-2 h-9 rounded-lg text-sm font-medium text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60 transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          Comment
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="mt-4 pt-4 border-t border-neutral-700">
          {/*
            Said, rather than a composer that accepts text and then fails. The
            server refuses these too — this only saves the typing.
          */}
          {(post as any).comments_disabled ? (
            <p className="mb-4 rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2.5 text-xs text-neutral-400">
              The author has turned off comments for this post.
            </p>
          ) : (
          /* Add Comment Form — pill input with inline send */
          <form onSubmit={handleAddComment} className="relative mb-4">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment…"
              className="w-full h-9 rounded-full bg-neutral-800 border border-neutral-700 pl-4 pr-10 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-purple-500 transition-colors"
            />
            <button
              type="submit"
              disabled={!newComment.trim()}
              aria-label="Post comment"
              className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-purple-400 hover:bg-neutral-700 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          )}

          {/* Comments List */}
          {loadingComments ? (
            <div className="space-y-3 py-1" aria-hidden="true">
              {[0, 1].map(i => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-neutral-800 shrink-0" />
                  <div className="h-10 bg-neutral-800 rounded-2xl w-2/3" />
                </div>
              ))}
            </div>
          ) : comments.length > 0 ? (
            <div className="space-y-3">
              {comments.filter(c => !c.parent).map(comment => {
                const commentPic = getProfilePic(comment.author)
                const replies = comment.replies || []

                return (
                  <div key={comment.id}>
                    <div className="flex gap-2">
                      <div className="w-8 h-8 rounded-full bg-purple-500/30 flex items-center justify-center text-xs font-bold overflow-hidden flex-shrink-0">
                        {commentPic ? (
                          <img src={commentPic} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-white">{comment.author.username.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="inline-block max-w-full bg-neutral-800 rounded-2xl px-3 py-1.5 relative">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-white text-xs font-semibold">{comment.author.username}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-neutral-600 text-[11px] tabular-nums">{timeAgo(comment.created_at)}</span>

                              {/* Shared menu. Was edit/delete for the author only, in four places. */}
                              <div onClick={e => e.stopPropagation()}>
                                <ContentActionMenu
                                  label="Comment actions"
                                  actions={buildContentActions({
                                    kind: 'comment',
                                    canEdit: isCommentAuthor(comment),
                                    canDelete: isCommentAuthor(comment) || currentUser?.role === 'admin',
                                    onCopyLink: () => copyCommentLink(comment),
                                    onReport: () => setCommentReportId(comment.id),
                                    onDelete: () => handleDeleteComment(comment.id),
                                    onEdit: () => handleEditComment(comment),
                                  })}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Comment Content - Edit Mode or Display */}
                          {editingCommentId === comment.id ? (
                            <div className="mt-1">
                              <input
                                type="text"
                                value={editedCommentContent}
                                onChange={(e) => setEditedCommentContent(e.target.value)}
                                className="w-full px-2 py-1 bg-neutral-700 border border-neutral-600 rounded text-sm text-white focus:ring-1 focus:ring-purple-500 focus:outline-none"
                                onKeyPress={(e) => e.key === 'Enter' && handleSaveCommentEdit(comment.id)}
                              />
                              <div className="flex gap-1 mt-1">
                                <button
                                  onClick={() => handleSaveCommentEdit(comment.id)}
                                  className="px-2 py-0.5 bg-purple-600 hover:bg-purple-500 text-white text-xs rounded flex items-center gap-1"
                                >
                                  <Check className="w-3 h-3" />
                                  Save
                                </button>
                                <button
                                  onClick={handleCancelCommentEdit}
                                  className="px-2 py-0.5 bg-neutral-600 hover:bg-neutral-500 text-white text-xs rounded flex items-center gap-1"
                                >
                                  <X className="w-3 h-3" />
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-neutral-300 text-sm mt-1">{comment.content}</p>
                          )}
                        </div>

                        {/* Comment Actions */}
                        <div className="flex items-center gap-3 mt-1 ml-1">
                          {/* Heart toggles, count opens the list — two questions,
                              two controls. */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleLikeComment(comment.id)}
                              aria-label={comment.is_liked ? 'Remove like' : 'Like this comment'}
                              className={`flex items-center text-xs ${comment.is_liked ? 'text-red-500' : 'text-neutral-400 hover:text-red-400'}`}
                            >
                              <Heart className={`w-3 h-3 ${comment.is_liked ? 'fill-current' : ''}`} />
                            </button>
                            <Reactors
                              count={comment.like_count || 0}
                              title="Liked by"
                              noun="like"
                              loadPage={async page => {
                                const { data } = await communityAPI.getCommentLikers(comment.id, page)
                                return { results: data.results ?? data, next: data.next ?? null }
                              }}
                              className="h-10 px-1 text-xs sm:h-auto"
                            />
                          </div>
                          <button
                            onClick={() => toggleReplyInput(comment.id)}
                            className="flex items-center gap-1 text-xs text-neutral-400 hover:text-purple-400"
                          >
                            <Reply className="w-3 h-3" />
                            Reply
                          </button>
                          {replies.length > 0 && (
                            <button
                              onClick={() => toggleReplies(comment.id)}
                              className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300"
                            >
                              {showReplies[comment.id] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                            </button>
                          )}
                        </div>

                        {/* Reply Input */}
                        {showReplyInput[comment.id] && (
                          <div className="flex gap-2 mt-2 ml-1">
                            <input
                              type="text"
                              value={replyInputs[comment.id] || ''}
                              onChange={(e) => setReplyInputs({ ...replyInputs, [comment.id]: e.target.value })}
                              onKeyPress={(e) => e.key === 'Enter' && handleReply(comment.id)}
                              placeholder="Write a reply..."
                              className="flex-1 px-2 py-1.5 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white focus:ring-1 focus:ring-purple-500 focus:outline-none"
                            />
                            <button
                              onClick={() => handleReply(comment.id)}
                              className="p-1.5 bg-purple-600 rounded-lg hover:bg-purple-700"
                            >
                              <Send className="w-3 h-3" />
                            </button>
                          </div>
                        )}

                        {/* Replies */}
                        {showReplies[comment.id] && replies.length > 0 && (
                          <div className="mt-2 ml-4 space-y-2">
                            {replies.map(reply => {
                              const replyPic = getProfilePic(reply.author)
                              return (
                                <div key={reply.id}>
                                  <div className="flex gap-2">
                                    <div className="w-6 h-6 rounded-full bg-purple-500/30 flex items-center justify-center text-xs font-bold overflow-hidden flex-shrink-0">
                                      {replyPic ? (
                                        <img src={replyPic} alt="" className="w-full h-full object-cover" />
                                      ) : (
                                        <span className="text-white text-xs">{reply.author.username.charAt(0).toUpperCase()}</span>
                                      )}
                                    </div>
                                    <div className="flex-1">
                                      <div className="bg-neutral-800/70 rounded-lg p-2 relative">
                                        <div className="flex items-center justify-between">
                                          <span className="text-white text-xs font-medium">{reply.author.username}</span>
                                          <div className="flex items-center gap-2">
                                            <span className="text-neutral-500 text-xs">{new Date(reply.created_at).toLocaleDateString()}</span>

                                            {/* Shared menu. Was edit/delete for the author only, in four places. */}
                                            <div onClick={e => e.stopPropagation()}>
                                              <ContentActionMenu
                                                label="Comment actions"
                                                actions={buildContentActions({
                                                  kind: 'comment',
                                                  canEdit: isCommentAuthor(reply),
                                                  canDelete: isCommentAuthor(reply) || currentUser?.role === 'admin',
                                                  onCopyLink: () => copyCommentLink(reply),
                                                  onReport: () => setCommentReportId(reply.id),
                                                  onDelete: () => handleDeleteComment(reply.id),
                                                  onEdit: () => handleEditComment(reply),
                                                })}
                                              />
                                            </div>
                                          </div>
                                        </div>

                                        {/* Reply Content - Edit Mode or Display */}
                                        {editingCommentId === reply.id ? (
                                          <div className="mt-1">
                                            <input
                                              type="text"
                                              value={editedCommentContent}
                                              onChange={(e) => setEditedCommentContent(e.target.value)}
                                              className="w-full px-2 py-1 bg-neutral-700 border border-neutral-600 rounded text-xs text-white focus:ring-1 focus:ring-purple-500 focus:outline-none"
                                              onKeyPress={(e) => e.key === 'Enter' && handleSaveCommentEdit(reply.id)}
                                            />
                                            <div className="flex gap-1 mt-1">
                                              <button
                                                onClick={() => handleSaveCommentEdit(reply.id)}
                                                className="px-1.5 py-0.5 bg-purple-600 hover:bg-purple-500 text-white text-xs rounded flex items-center gap-1"
                                              >
                                                <Check className="w-3 h-3" />
                                                Save
                                              </button>
                                              <button
                                                onClick={handleCancelCommentEdit}
                                                className="px-1.5 py-0.5 bg-neutral-600 hover:bg-neutral-500 text-white text-xs rounded flex items-center gap-1"
                                              >
                                                <X className="w-3 h-3" />
                                                Cancel
                                              </button>
                                            </div>
                                          </div>
                                        ) : (
                                          <p className="text-neutral-300 text-xs mt-1">{reply.content}</p>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-3 mt-1 ml-1">
                                        {/* Replies are Comments with a parent, so
                                            the same endpoint serves them. */}
                                        <div className="flex items-center gap-1">
                                          <button
                                            onClick={() => handleLikeComment(reply.id)}
                                            aria-label={reply.is_liked ? 'Remove like' : 'Like this reply'}
                                            className={`flex items-center text-xs ${reply.is_liked ? 'text-red-500' : 'text-neutral-400 hover:text-red-400'}`}
                                          >
                                            <Heart className={`w-3 h-3 ${reply.is_liked ? 'fill-current' : ''}`} />
                                          </button>
                                          <Reactors
                                            count={reply.like_count || 0}
                                            title="Liked by"
                                            noun="like"
                                            loadPage={async page => {
                                              const { data } = await communityAPI.getCommentLikers(reply.id, page)
                                              return { results: data.results ?? data, next: data.next ?? null }
                                            }}
                                            className="h-10 px-1 text-xs sm:h-auto"
                                          />
                                        </div>
                                        <button
                                          onClick={() => toggleReplyInput(reply.id)}
                                          className="flex items-center gap-1 text-xs text-neutral-400 hover:text-purple-400"
                                        >
                                          <Reply className="w-3 h-3" />
                                          Reply
                                        </button>
                                      </div>

                                      {/* Reply to Reply Input */}
                                      {showReplyInput[reply.id] && (
                                        <div className="flex gap-2 mt-2">
                                          <input
                                            type="text"
                                            value={replyInputs[reply.id] || ''}
                                            onChange={(e) => setReplyInputs({ ...replyInputs, [reply.id]: e.target.value })}
                                            onKeyPress={(e) => e.key === 'Enter' && handleReplyToReply(comment.id, reply.author.username, reply.id)}
                                            placeholder={`Reply to ${reply.author.username}...`}
                                            className="flex-1 px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-xs text-white focus:ring-1 focus:ring-purple-500 focus:outline-none"
                                          />
                                          <button
                                            onClick={() => handleReplyToReply(comment.id, reply.author.username, reply.id)}
                                            className="p-1 bg-purple-600 rounded hover:bg-purple-700"
                                          >
                                            <Send className="w-3 h-3" />
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-neutral-500 text-sm text-center py-2">No comments yet</p>
          )}
        </div>
      )}

      <EditContentDialog
        open={isEditingPost}
        onClose={() => setIsEditingPost(false)}
        kind="post"
        id={post.id}
        initialContent={post.content}
        initialImageUrl={post.image_url}
        onSaved={() => onRefresh()}
      />

      {/* Opened from this card's action menu. */}
      <ReportDialog
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="post"
        targetId={post.id}
      />
      <ReportDialog
        open={commentReportId !== null}
        onClose={() => setCommentReportId(null)}
        targetType="comment"
        targetId={commentReportId ?? ''}
      />
      <MoveToChannelDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        postId={post.id}
      />
    </div>
  )
}

// Group Detail View Component
function GroupDetailView({
  org,
  onBack,
  onUpdate,
  currentUser
}: {
  org: Organization
  onBack: () => void
  onUpdate: () => void
  currentUser: any
}) {
  const [activeTab, setActiveTab] = useState<'posts' | 'members' | 'about' | 'settings'>('posts')
  const [posts, setPosts] = useState<Post[]>([])
  const [members, setMembers] = useState<OrgMember[]>([])
  const [pendingMembers, setPendingMembers] = useState<OrgMember[]>([])
  const [loading, setLoading] = useState(true)
  const [newPost, setNewPost] = useState('')
  const [postImage, setPostImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [editForm, setEditForm] = useState({
    name: org.name,
    description: org.description,
    icon: org.icon,
    is_private: org.is_private,
    requires_approval: org.requires_approval
  })
  const [coverImage, setCoverImage] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(org.cover_image_url)

  const isAdmin = org.user_role && ['admin', 'owner', 'moderator'].includes(org.user_role)
  const isOwner = org.user_role === 'owner'

  useEffect(() => {
    fetchData()
  }, [org.id])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [postsRes, membersRes, pendingRes] = await Promise.all([
        communityAPI.getOrgFeed(org.id).catch(() => ({ data: [] })),
        communityAPI.getOrgMembers(org.slug).catch(() => ({ data: [] })),
        isAdmin ? communityAPI.getOrgPendingRequests(org.slug).catch(() => ({ data: [] })) : Promise.resolve({ data: [] })
      ])
      const postsData = postsRes.data?.results || postsRes.data || []
      setPosts(Array.isArray(postsData) ? postsData : [])
      setMembers(Array.isArray(membersRes.data) ? membersRes.data : [])
      setPendingMembers(Array.isArray(pendingRes.data) ? pendingRes.data : [])
    } catch (error) {
      console.error('Failed to fetch group data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPost.trim() && !postImage) return

    try {
      const formData = new FormData()
      formData.append('content', newPost)
      formData.append('post_type', postImage ? 'image' : 'text')
      formData.append('organization', org.id)
      if (postImage) {
        formData.append('image', postImage)
      }

      await api.post('/community/posts/', formData)
      toast.success('Posted to group!')
      setNewPost('')
      setPostImage(null)
      setImagePreview(null)
      fetchData()
      onUpdate()
    } catch (error) {
      toast.error('Failed to create post')
    }
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPostImage(file)
      const reader = new FileReader()
      reader.onloadend = () => setImagePreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setCoverImage(file)
      const reader = new FileReader()
      reader.onloadend = () => setCoverPreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleUpdateGroup = async () => {
    try {
      const formData = new FormData()
      formData.append('name', editForm.name)
      formData.append('description', editForm.description)
      formData.append('icon', editForm.icon)
      formData.append('is_private', String(editForm.is_private))
      formData.append('requires_approval', String(editForm.requires_approval))
      if (coverImage) {
        formData.append('cover_image', coverImage)
      }

      await communityAPI.updateOrganization(org.slug, formData)
      toast.success('Group updated!')
      setShowSettings(false)
      onUpdate()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update group')
    }
  }

  const handleApprove = async (userId: string) => {
    try {
      await communityAPI.approveMember(org.slug, userId)
      toast.success('Member approved')
      fetchData()
      onUpdate()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to approve')
    }
  }

  const handleReject = async (userId: string) => {
    try {
      await communityAPI.rejectMember(org.slug, userId)
      toast.success('Request rejected')
      fetchData()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to reject')
    }
  }

  const handleSetRole = async (userId: string, role: string) => {
    try {
      await communityAPI.setMemberRole(org.slug, userId, role)
      toast.success(`Role updated to ${role}`)
      fetchData()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update role')
    }
  }

  const handleLikePost = async (postId: string) => {
    try {
      await communityAPI.likePost(postId)
      fetchData()
    } catch (error) {
      console.error('Failed to like post:', error)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950">
      {/* Cover Image */}
      <div className="relative h-48 sm:h-64 bg-neutral-900 bg-gradient-to-r from-purple-600/20 to-transparent">
        {coverPreview && (
          <img src={coverPreview} alt="" className="w-full h-full object-cover" />
        )}
        {isOwner && (
          <label className="absolute bottom-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-full cursor-pointer transition">
            <Camera className="w-5 h-5 text-white" />
            <input type="file" accept="image/*" onChange={handleCoverSelect} className="hidden" />
          </label>
        )}
        <button
          onClick={onBack}
          className="absolute top-4 left-4 p-2 bg-black/50 hover:bg-black/70 rounded-full transition"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Group Header */}
      <div className="max-w-4xl mx-auto px-4 -mt-16 relative z-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
          <div className="w-24 h-24 bg-neutral-800 rounded-2xl flex items-center justify-center text-5xl border-4 border-neutral-900 shadow-xl">
            {org.icon}
          </div>
          <div className="flex-1 pb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-white">{org.name}</h1>
              {org.is_official && <Crown className="w-5 h-5 text-amber-400" />}
              {org.is_private && <Lock className="w-4 h-4 text-neutral-400" />}
            </div>
            <p className="text-neutral-400 text-sm mt-1">
              {org.member_count} members · {org.post_count} posts · {org.org_type}
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition"
            >
              <Settings className="w-5 h-5 text-white" />
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-6 border-b border-neutral-800 overflow-x-auto">
          {['posts', 'members', 'about'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-3 text-sm font-medium capitalize whitespace-nowrap transition ${activeTab === tab
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-neutral-400 hover:text-white'
                }`}
            >
              {tab}
              {tab === 'members' && pendingMembers.length > 0 && isAdmin && (
                <span className="ml-2 px-1.5 py-0.5 bg-amber-500 text-black text-xs rounded-full">
                  {pendingMembers.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="space-y-4">
            {[0, 1, 2].map(i => <SkeletonListRow key={i} />)}
          </div>
        ) : (
          <>
            {/* Posts Tab */}
            {activeTab === 'posts' && (
              <div className="space-y-6">
                {/* Create Post */}
                {org.is_member && (
                  <form onSubmit={handleCreatePost} className="bg-neutral-900 rounded-xl border border-neutral-800 p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-500/30 flex items-center justify-center text-sm font-bold">
                        {currentUser?.username?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div className="flex-1">
                        <textarea
                          value={newPost}
                          onChange={(e) => setNewPost(e.target.value)}
                          placeholder={`Share something with ${org.name}...`}
                          className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                          rows={3}
                        />
                        {imagePreview && (
                          <div className="relative mt-2">
                            <img src={imagePreview} alt="Preview" className="max-h-48 rounded-lg" />
                            <button
                              type="button"
                              onClick={() => { setPostImage(null); setImagePreview(null) }}
                              className="absolute top-2 right-2 p-1 bg-red-600 rounded-full"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                        <div className="flex items-center justify-between mt-3">
                          <label className="p-2 hover:bg-neutral-700 rounded-lg cursor-pointer transition">
                            <Image className="w-5 h-5 text-neutral-400" />
                            <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                          </label>
                          <button
                            type="submit"
                            disabled={!newPost.trim() && !postImage}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-lg text-white text-sm transition"
                          >
                            Post
                          </button>
                        </div>
                      </div>
                    </div>
                  </form>
                )}

                {/* Posts List */}
                {posts.length > 0 ? posts.map(post => (
                  <GroupPostCard
                    key={post.id}
                    post={post}
                    onLike={handleLikePost}
                    onRefresh={fetchData}
                    currentUser={currentUser}
                  />
                )) : (
                  <div className="text-center py-12 bg-neutral-900 rounded-xl border border-neutral-800">
                    <MessageCircle className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
                    <p className="text-neutral-400">No posts yet. Be the first to share!</p>
                  </div>
                )}
              </div>
            )}

            {/* Members Tab */}
            {activeTab === 'members' && (
              <div className="space-y-6">
                {/* Pending Requests (Admin Only) */}
                {isAdmin && pendingMembers.length > 0 && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                    <h3 className="text-lg font-semibold text-amber-400 mb-3">
                      Pending Requests ({pendingMembers.length})
                    </h3>
                    <div className="space-y-2">
                      {pendingMembers.map(member => (
                        <div key={member.id} className="flex items-center justify-between bg-neutral-800/50 rounded-lg p-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-purple-500/30 flex items-center justify-center font-bold">
                              {member.user.username.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-white">{member.user.username}</span>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleApprove(member.user.id)} className="p-2 bg-green-600 hover:bg-green-700 rounded-lg">
                              <Check className="w-4 h-4 text-white" />
                            </button>
                            <button onClick={() => handleReject(member.user.id)} className="p-2 bg-red-600 hover:bg-red-700 rounded-lg">
                              <X className="w-4 h-4 text-white" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Members List */}
                <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-4">
                  <h3 className="text-lg font-semibold text-white mb-4">Members ({members.length})</h3>
                  <div className="space-y-2">
                    {members.map(member => (
                      <div key={member.id} className="flex items-center justify-between bg-neutral-800/50 rounded-lg p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-purple-500/30 flex items-center justify-center font-bold">
                            {member.user.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="text-white">{member.user.username}</span>
                            <span className={`ml-2 text-xs px-2 py-0.5 rounded ${member.role === 'owner' ? 'bg-amber-500/20 text-amber-400' :
                              member.role === 'admin' ? 'bg-purple-500/20 text-purple-400' :
                                member.role === 'moderator' ? 'bg-purple-500/20 text-purple-400' :
                                  'bg-neutral-700 text-neutral-400'
                              }`}>
                              {member.role}
                            </span>
                          </div>
                        </div>
                        {isOwner && member.role !== 'owner' && (
                          <select
                            value={member.role}
                            onChange={(e) => handleSetRole(member.user.id, e.target.value)}
                            className="text-sm bg-neutral-700 border border-neutral-600 rounded px-2 py-1 text-white"
                          >
                            <option value="member">Member</option>
                            <option value="moderator">Moderator</option>
                            <option value="admin">Admin</option>
                          </select>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* About Tab */}
            {activeTab === 'about' && (
              <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">About {org.name}</h3>
                <p className="text-neutral-300 mb-6">{org.description || 'No description provided.'}</p>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-neutral-800 rounded-lg p-4">
                    <p className="text-neutral-400 text-sm">Type</p>
                    <p className="text-white capitalize">{org.org_type}</p>
                  </div>
                  <div className="bg-neutral-800 rounded-lg p-4">
                    <p className="text-neutral-400 text-sm">Privacy</p>
                    <p className="text-white">{org.is_private ? 'Private' : 'Public'}</p>
                  </div>
                  <div className="bg-neutral-800 rounded-lg p-4">
                    <p className="text-neutral-400 text-sm">Members</p>
                    <p className="text-white">{org.member_count}</p>
                  </div>
                  <div className="bg-neutral-800 rounded-lg p-4">
                    <p className="text-neutral-400 text-sm">Posts</p>
                    <p className="text-white">{org.post_count}</p>
                  </div>
                </div>

                {org.program && (
                  <div className="mt-4 bg-neutral-800 rounded-lg p-4">
                    <p className="text-neutral-400 text-sm">Program</p>
                    <p className="text-white">{org.program}</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Settings Modal */}
      {showSettings && isAdmin && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 rounded-2xl border border-neutral-700 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-neutral-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Group Settings</h2>
              <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-neutral-800 rounded-lg">
                <X className="w-5 h-5 text-neutral-400" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm text-neutral-400 mb-1 block">Group Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="text-sm text-neutral-400 mb-1 block">Icon (emoji)</label>
                <input
                  type="text"
                  value={editForm.icon}
                  onChange={(e) => setEditForm({ ...editForm, icon: e.target.value })}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-2xl"
                  maxLength={2}
                />
              </div>

              <div>
                <label className="text-sm text-neutral-400 mb-1 block">Description</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white resize-none"
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-white">Private Group</p>
                  <p className="text-neutral-400 text-sm">Only invited members can join</p>
                </div>
                <button
                  onClick={() => setEditForm({ ...editForm, is_private: !editForm.is_private })}
                  className={`w-12 h-6 rounded-full transition ${editForm.is_private ? 'bg-purple-600' : 'bg-neutral-700'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${editForm.is_private ? 'tranneutral-x-6' : 'tranneutral-x-0.5'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-white">Require Approval</p>
                  <p className="text-neutral-400 text-sm">Admins must approve new members</p>
                </div>
                <button
                  onClick={() => setEditForm({ ...editForm, requires_approval: !editForm.requires_approval })}
                  className={`w-12 h-6 rounded-full transition ${editForm.requires_approval ? 'bg-purple-600' : 'bg-neutral-700'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${editForm.requires_approval ? 'tranneutral-x-6' : 'tranneutral-x-0.5'}`} />
                </button>
              </div>
            </div>

            <div className="p-6 border-t border-neutral-700 flex gap-3 justify-end">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 rounded-lg text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateGroup}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-white"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function CommunityEnhanced() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [notifications, setNotifications] = useState<CommunityNotification[]>([])
  const [notifLoading, setNotifLoading] = useState(true)
  const [showNotifications, setShowNotifications] = useState(false) // mobile/tablet sheet
  const [posts, setPosts] = useState<Post[]>([])
  const [newPost, setNewPost] = useState('')
  const [postImage, setPostImage] = useState<File | null>(null)
  const [loading, setLoading] = useState(true)
  const [nextPageUrl, setNextPageUrl] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null)
  const [loadingComments, setLoadingComments] = useState<{ [key: string]: boolean }>({})
  const [commentInputs, setCommentInputs] = useState<{ [key: string]: string }>({})
  const [replyInputs, setReplyInputs] = useState<{ [key: string]: string }>({})
  const [showReplyInput, setShowReplyInput] = useState<{ [key: string]: boolean }>({})
  const [showReplies, setShowReplies] = useState<{ [key: string]: boolean }>({})
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [followingUsers, setFollowingUsers] = useState<Set<string>>(new Set())
  const [pendingUsers, setPendingUsers] = useState<Set<string>>(new Set())
  const [showFollowRequests, setShowFollowRequests] = useState(false)
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0)

  // Search Coder state
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Author[]>([])
  const [searchLoading, setSearchLoading] = useState(false)

  // Organizations state
  const [activeTab, setActiveTab] = useState<'feed' | 'groups'>('feed')
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [myOrgs, setMyOrgs] = useState<Organization[]>([])
  const [orgInvitations, setOrgInvitations] = useState<OrgInvitation[]>([])
  const [orgSearchQuery, setOrgSearchQuery] = useState('')
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null)
  const [viewingGroup, setViewingGroup] = useState<Organization | null>(null)
  const [selectedPostOrg, setSelectedPostOrg] = useState<string>('') // For selecting group when creating post

  // Long-post "See more" + image lightbox state
  const [expandedPosts, setExpandedPosts] = useState<{ [key: string]: boolean }>({})
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)

  // Post edit/delete state for main feed
  const [editingPostId, setEditingPostId] = useState<string | null>(null)
  const [editedPostContent, setEditedPostContent] = useState('')

  // Comment edit/delete state for main feed
  const [showCommentMenu, setShowCommentMenu] = useState<{ [key: string]: boolean }>({})
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editedCommentContent, setEditedCommentContent] = useState('')

  useEffect(() => {
    fetchPosts()
    fetchFollowingData()
    fetchPendingCount()
    // Groups, invitations, and my orgs — used by the post selector, sidebars, and tab badge
    fetchOrganizations()
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
    try {
      setNotifLoading(true)
      const response = await communityAPI.getNotifications()
      const data = response.data.results || response.data || []
      setNotifications(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setNotifLoading(false)
    }
  }

  const unreadNotifCount = notifications.filter(n => !n.is_read).length

  const handleNotificationClick = (n: CommunityNotification) => {
    setShowNotifications(false) // close the mobile sheet before navigating
    // Optimistic read state; server sync is best-effort
    if (!n.is_read) {
      setNotifications(prev => prev.map(x => (x.id === n.id ? { ...x, is_read: true } : x)))
      communityAPI.markNotificationRead(n.id).catch(() => { /* keep optimistic state */ })
    }
    // Route by type: post activity deep-links to the post, follows go to the sender
    if (['like', 'comment', 'mention'].includes(n.notification_type) && n.related_object_id) {
      setActiveTab('feed')
      navigate(`/community?post=${n.related_object_id}`)
    } else if (n.notification_type === 'follow' && n.sender) {
      navigate(`/user/${n.sender.id}`)
    } else if (n.notification_type.startsWith('org_')) {
      setActiveTab('groups')
    }
  }

  const handleMarkAllNotifsRead = () => {
    const unread = notifications.filter(n => !n.is_read)
    if (unread.length === 0) return
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    unread.forEach(n => communityAPI.markNotificationRead(n.id).catch(() => { /* best-effort */ }))
  }

  // Shared notification list — rendered in the xl right rail AND the mobile/tablet sheet
  const notificationListContent = notifLoading ? (
    <div className="p-4 space-y-3" aria-hidden="true">
      {[0, 1, 2].map(i => (
        <div key={i} className="flex items-center gap-3 animate-pulse">
          <div className="w-8 h-8 rounded-full bg-neutral-800 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-neutral-800 rounded w-full" />
            <div className="h-2.5 bg-neutral-800 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  ) : notifications.length === 0 ? (
    <div className="px-4 py-8 text-center">
      <Bell className="w-8 h-8 mx-auto mb-2 text-neutral-700" />
      <p className="text-sm text-neutral-500">You're all caught up</p>
    </div>
  ) : (
    <div className="divide-y divide-neutral-800/60">
      {notifications.slice(0, 12).map(n => (
        <button
          key={n.id}
          onClick={() => handleNotificationClick(n)}
          className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-neutral-800/50 ${!n.is_read ? 'bg-purple-500/[0.04]' : ''}`}
        >
          {/* Sender avatar with a type icon badge */}
          <div className="relative shrink-0">
            <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center overflow-hidden">
              {n.sender?.profile_picture ? (
                <img src={getMediaUrl(n.sender.profile_picture) || ''} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-neutral-300 text-xs font-semibold">
                  {n.sender?.username?.charAt(0).toUpperCase() || '•'}
                </span>
              )}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-neutral-900 flex items-center justify-center">
              {n.notification_type === 'like' ? (
                <Heart className="w-2.5 h-2.5 text-red-400 fill-red-400" />
              ) : n.notification_type === 'comment' || n.notification_type === 'mention' ? (
                <MessageCircle className="w-2.5 h-2.5 text-purple-400" />
              ) : n.notification_type === 'follow' ? (
                <UserPlus className="w-2.5 h-2.5 text-green-400" />
              ) : n.notification_type.startsWith('org_') ? (
                <Building2 className="w-2.5 h-2.5 text-purple-400" />
              ) : (
                <Bell className="w-2.5 h-2.5 text-neutral-400" />
              )}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-xs leading-snug line-clamp-2 ${n.is_read ? 'text-neutral-400' : 'text-neutral-200'}`}>
              {n.message || n.title}
            </p>
            <p className="text-[11px] text-neutral-600 mt-0.5 tabular-nums">{timeAgo(n.created_at)}</p>
          </div>
          {!n.is_read && <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0 mt-1.5" />}
        </button>
      ))}
    </div>
  )

  useEffect(() => {
    if (activeTab === 'groups') {
      fetchOrganizations()
    }
  }, [activeTab, user])

  // Close the image lightbox with Esc
  useEffect(() => {
    if (!lightboxImage) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightboxImage(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightboxImage])

  // Deep link: /community?post=<id> scrolls to and highlights the shared post
  useEffect(() => {
    const targetPost = searchParams.get('post')
    if (!targetPost || loading || posts.length === 0) return
    const el = document.getElementById(`post-${targetPost}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('ring-1', 'ring-purple-500/60')
      const timer = setTimeout(() => el.classList.remove('ring-1', 'ring-purple-500/60'), 2500)
      return () => clearTimeout(timer)
    }
  }, [loading, posts.length, searchParams])

  // Debounced coder search — typing no longer fires a request per keystroke
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([])
      return
    }
    const timer = setTimeout(async () => {
      try {
        setSearchLoading(true)
        const response = await communityAPI.searchCoders(searchQuery)
        setSearchResults(response.data || [])
      } catch (error) {
        console.error('Failed to search coders:', error)
      } finally {
        setSearchLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const fetchPosts = async () => {
    try {
      setLoading(true)
      // Use smart feed: shows posts from followed users + your organizations + your own posts
      const response = await communityAPI.getFeed()
      const postsData = response.data.results || response.data
      setPosts(Array.isArray(postsData) ? postsData : [])
      // Keep DRF's next-page URL so older posts stay reachable
      setNextPageUrl(response.data.next || null)
    } catch (error) {
      console.error('Failed to fetch posts:', error)
      toast.error('Failed to load posts')
    } finally {
      setLoading(false)
    }
  }

  const loadMorePosts = async () => {
    if (!nextPageUrl || loadingMore) return
    try {
      setLoadingMore(true)
      const response = await api.get(nextPageUrl)
      const morePosts = response.data.results || []
      setPosts(prev => [...prev, ...morePosts])
      setNextPageUrl(response.data.next || null)
    } catch (error) {
      console.error('Failed to load more posts:', error)
      toast.error('Failed to load more posts')
    } finally {
      setLoadingMore(false)
    }
  }

  const fetchFollowingData = async () => {
    try {
      const [followingRes, sentRes] = await Promise.all([
        communityAPI.getFollowing(),
        communityAPI.getSentRequests()
      ])
      const followingSet = new Set<string>(followingRes.data.map((f: any) => String(f.following.id)))
      const pendingSet = new Set<string>(sentRes.data.map((f: any) => String(f.following.id)))
      setFollowingUsers(followingSet)
      setPendingUsers(pendingSet)
    } catch (error) {
      console.error('Failed to fetch following data:', error)
    }
  }

  const fetchPendingCount = async () => {
    try {
      const response = await communityAPI.getPendingRequests()
      setPendingRequestsCount(response.data.length)
    } catch (error) {
      console.error('Failed to fetch pending count:', error)
    }
  }

  const fetchOrganizations = async () => {
    try {
      const [allOrgs, userOrgs, invites] = await Promise.all([
        communityAPI.getOrganizations().catch(() => ({ data: [] })),
        user ? communityAPI.getOrganizations({ my_orgs: 'true' }).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
        user ? communityAPI.getMyOrgInvitations().catch(() => ({ data: [] })) : Promise.resolve({ data: [] })
      ])
      // Handle both paginated and non-paginated responses
      const allOrgsData = allOrgs.data?.results || allOrgs.data || []
      const userOrgsData = userOrgs.data?.results || userOrgs.data || []
      const invitesData = invites.data?.results || invites.data || []

      setOrganizations(Array.isArray(allOrgsData) ? allOrgsData : [])
      setMyOrgs(Array.isArray(userOrgsData) ? userOrgsData : [])
      setOrgInvitations(Array.isArray(invitesData) ? invitesData : [])
    } catch (error) {
      console.error('Failed to fetch organizations:', error)
    }
  }

  const handleJoinOrg = async (org: Organization) => {
    try {
      const response = await communityAPI.joinOrganization(org.slug)
      toast.success(response.data.message)
      fetchOrganizations()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to join')
    }
  }

  const handleLeaveOrg = async (org: Organization) => {
    if (!confirm(`Leave ${org.name}?`)) return
    try {
      await communityAPI.leaveOrganization(org.slug)
      toast.success('Left organization')
      fetchOrganizations()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to leave')
    }
  }

  const handleAcceptOrgInvite = async (org: Organization) => {
    try {
      await communityAPI.acceptOrgInvitation(org.slug)
      toast.success('Joined organization!')
      fetchOrganizations()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to accept')
    }
  }

  const handleDeclineOrgInvite = async (org: Organization) => {
    try {
      await communityAPI.declineOrgInvitation(org.slug)
      toast.success('Invitation declined')
      fetchOrganizations()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to decline')
    }
  }

  const filteredOrgs = organizations.filter(org =>
    org.name.toLowerCase().includes(orgSearchQuery.toLowerCase()) ||
    org.description.toLowerCase().includes(orgSearchQuery.toLowerCase())
  )

  const handleFollow = async (userId: string) => {
    try {
      const response = await communityAPI.followUser(userId)
      if (response.data.status === 'pending') {
        setPendingUsers(prev => new Set([...prev, userId]))
        toast.success('Follow request sent!')
      } else if (response.data.status === 'accepted') {
        setFollowingUsers(prev => new Set([...prev, userId]))
        toast.success('Now following!')
      }
    } catch (error) {
      toast.error('Failed to send follow request')
    }
  }

  const handleUnfollow = async (userId: string) => {
    try {
      await communityAPI.unfollowUser(userId)
      setFollowingUsers(prev => {
        const newSet = new Set(prev)
        newSet.delete(userId)
        return newSet
      })
      setPendingUsers(prev => {
        const newSet = new Set(prev)
        newSet.delete(userId)
        return newSet
      })
      toast.success('Unfollowed!')
    } catch (error) {
      toast.error('Failed to unfollow')
    }
  }

  const handleCancelRequest = async (userId: string) => {
    try {
      await communityAPI.unfollowUser(userId)
      setPendingUsers(prev => {
        const newSet = new Set(prev)
        newSet.delete(userId)
        return newSet
      })
      toast.success('Request cancelled')
    } catch (error) {
      toast.error('Failed to cancel request')
    }
  }

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPost.trim() && !postImage) return

    try {
      let response
      if (postImage) {
        // Use FormData for image uploads - interceptor handles Content-Type
        const formData = new FormData()
        formData.append('content', newPost || '')
        formData.append('post_type', 'image')
        formData.append('image', postImage)
        if (selectedPostOrg) {
          formData.append('organization', selectedPostOrg)
        }

        response = await api.post('/community/posts/', formData)
      } else {
        // Use JSON for text-only posts
        const postData: any = {
          content: newPost,
          post_type: 'text'
        }
        if (selectedPostOrg) {
          postData.organization = selectedPostOrg
        }
        response = await communityAPI.createPost(postData)
      }

      setPosts([response.data, ...posts])
      setNewPost('')
      setPostImage(null)
      setImagePreview(null)
      setSelectedPostOrg('')
      const orgName = myOrgs.find(o => o.id === selectedPostOrg)?.name
      toast.success(orgName ? `Posted to ${orgName}!` : 'Post created!')
    } catch (error: any) {
      console.error('Failed to create post:', error)
      const errorMsg = error.response?.data?.error || error.response?.data?.detail || 'Failed to create post'
      toast.error(errorMsg)
    }
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('Image size must be less than 5MB')
        return
      }

      setPostImage(file)

      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleLike = async (postId: string) => {
    try {
      const response = await communityAPI.likePost(postId)
      setPosts(posts.map(post =>
        post.id === postId
          ? { ...post, like_count: response.data.like_count, is_liked: response.data.liked }
          : post
      ))
    } catch (error) {
      console.error('Failed to like post:', error)
      toast.error('Failed to like post')
    }
  }

  /**
   * The rest of the action menu, shared by posts and comments.
   *
   * Kept beside the existing edit/delete handlers so there is one place that owns
   * what a menu item does, rather than a copy per surface.
   */
  const postUrl = (postId: string) => `${window.location.origin}/community/posts/${postId}`
  /** A comment has no page of its own, so it is the post plus a hash. */
  const commentUrl = (postId: string, commentId: string) =>
    `${postUrl(postId)}#comment-${commentId}`

  const handleCopyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link copied')
    } catch {
      // Clipboard access is refused on an insecure origin and in some embedded
      // browsers. Showing the link is better than a silent failure.
      toast.error(`Could not copy. The link is ${url}`)
    }
  }

  const handleToggleComments = async (post: Post) => {
    const next = !(post as any).comments_disabled
    try {
      await communityAPI.updatePost(post.id, { comments_disabled: next })
      setPosts(prev => prev.map(p =>
        p.id === post.id ? ({ ...p, comments_disabled: next } as Post) : p,
      ))
      toast.success(next ? 'Comments turned off' : 'Comments turned back on')
    } catch {
      toast.error('Could not change that. Try again.')
    }
  }

  /** Which post or comment a dialog is currently open for. */
  const [reportTarget, setReportTarget] = useState<
    { type: 'post' | 'comment'; id: string } | null
  >(null)
  const [shareTargetId, setShareTargetId] = useState<string | null>(null)

  // Post edit/delete handlers for main feed
  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return

    try {
      await communityAPI.deletePost(postId)
      toast.success('Post deleted!')
      setPosts(posts.filter(p => p.id !== postId))
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete post')
    }
  }

  const handleEditPost = (post: Post) => {
    // Just marks which post the dialog is for; it owns the text and the image.
    setEditingPostId(post.id)
  }

  const handleSavePostEdit = async (postId: string) => {
    if (!editedPostContent.trim()) return

    try {
      await communityAPI.updatePost(postId, { content: editedPostContent })
      toast.success('Post updated!')
      setPosts(posts.map(p =>
        p.id === postId ? { ...p, content: editedPostContent } : p
      ))
      setEditingPostId(null)
      setEditedPostContent('')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update post')
    }
  }

  const handleCancelPostEdit = () => {
    setEditingPostId(null)
    setEditedPostContent('')
  }

  const isPostAuthor = (post: Post) => sameUser(user, post.author)

  // Comment edit/delete handlers for main feed
  const isCommentAuthor = (comment: Comment) => sameUser(user, comment.author)

  const handleDeleteComment = async (postId: string, commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return

    try {
      await communityAPI.deleteComment(commentId)
      toast.success('Comment deleted!')
      // Update local state
      setPosts(posts.map(p => {
        if (p.id === postId) {
          const updateComments = (comments: Comment[]): Comment[] =>
            comments.filter(c => c.id !== commentId).map(c => ({
              ...c,
              replies: c.replies ? updateComments(c.replies) : undefined
            }))
          return { ...p, comments: p.comments ? updateComments(p.comments) : undefined }
        }
        return p
      }))
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete comment')
    }
    setShowCommentMenu({ ...showCommentMenu, [commentId]: false })
  }

  const handleEditComment = (comment: Comment) => {
    setEditingCommentId(comment.id)
    setEditedCommentContent(comment.content)
    setShowCommentMenu({ ...showCommentMenu, [comment.id]: false })
  }

  const handleSaveCommentEdit = async (postId: string, commentId: string) => {
    if (!editedCommentContent.trim()) return

    try {
      await communityAPI.updateComment(commentId, editedCommentContent)
      toast.success('Comment updated!')
      // Update local state
      setPosts(posts.map(p => {
        if (p.id === postId) {
          const updateComments = (comments: Comment[]): Comment[] =>
            comments.map(c =>
              c.id === commentId
                ? { ...c, content: editedCommentContent }
                : { ...c, replies: c.replies ? updateComments(c.replies) : undefined }
            )
          return { ...p, comments: p.comments ? updateComments(p.comments) : undefined }
        }
        return p
      }))
      setEditingCommentId(null)
      setEditedCommentContent('')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update comment')
    }
  }

  const handleCancelCommentEdit = () => {
    setEditingCommentId(null)
    setEditedCommentContent('')
  }

  const getCommentProfilePic = (author: Author) => {
    return getMediaUrl(author?.profile_picture)
  }

  /** Open the comments dialog for a post, lazy-loading its thread on first open. */
  const openComments = async (postId: string) => {
    setCommentsPostId(postId)

    if (!posts.find(p => p.id === postId)?.comments) {
      try {
        setLoadingComments(prev => ({ ...prev, [postId]: true }))
        const response = await communityAPI.getComments(postId)
        setPosts(prev => prev.map(post =>
          post.id === postId
            ? { ...post, comments: response.data.results || response.data }
            : post
        ))
      } catch (error) {
        console.error('Failed to fetch comments:', error)
        toast.error('Failed to load comments')
      } finally {
        setLoadingComments(prev => ({ ...prev, [postId]: false }))
      }
    }
  }

  const handleComment = async (postId: string) => {
    const content = commentInputs[postId]
    if (!content?.trim()) return

    try {
      const response = await communityAPI.createComment({
        post: postId,
        content: content
      })

      // Add comment to the post
      setPosts(posts.map(post =>
        post.id === postId
          ? {
            ...post,
            comments: [...(post.comments || []), response.data],
            comment_count: post.comment_count + 1
          }
          : post
      ))

      // Clear input — the dialog shows the full thread, so the new comment is visible
      setCommentInputs({ ...commentInputs, [postId]: '' })
      toast.success('Comment posted!')
    } catch (error) {
      console.error('Failed to post comment:', error)
      toast.error('Failed to post comment')
    }
  }

  const handleLikeComment = async (postId: string, commentId: string, isReply: boolean = false, parentId?: string) => {
    try {
      const response = await communityAPI.likeComment(commentId)

      setPosts(posts.map(post => {
        if (post.id !== postId) return post

        const updateComment = (comments: Comment[]): Comment[] => {
          return comments.map(comment => {
            if (comment.id === commentId) {
              return {
                ...comment,
                like_count: response.data.like_count,
                is_liked: response.data.liked
              }
            }
            if (comment.replies && comment.replies.length > 0) {
              return {
                ...comment,
                replies: updateComment(comment.replies)
              }
            }
            return comment
          })
        }

        return {
          ...post,
          comments: updateComment(post.comments || [])
        }
      }))
    } catch (error) {
      console.error('Failed to like comment:', error)
      toast.error('Failed to like comment')
    }
  }

  const handleReply = async (postId: string, parentCommentId: string) => {
    const content = replyInputs[parentCommentId]
    if (!content?.trim()) return

    try {
      const response = await communityAPI.createComment({
        post: postId,
        parent: parentCommentId,
        content: content
      })

      // Add reply to the parent comment
      setPosts(posts.map(post => {
        if (post.id !== postId) return post

        const addReply = (comments: Comment[]): Comment[] => {
          return comments.map(comment => {
            if (comment.id === parentCommentId) {
              return {
                ...comment,
                replies: [...(comment.replies || []), response.data]
              }
            }
            return comment
          })
        }

        return {
          ...post,
          comments: addReply(post.comments || []),
          comment_count: post.comment_count + 1
        }
      }))

      // Clear input and hide reply box
      setReplyInputs({ ...replyInputs, [parentCommentId]: '' })
      setShowReplyInput({ ...showReplyInput, [parentCommentId]: false })
      toast.success('Reply posted!')
    } catch (error) {
      console.error('Failed to post reply:', error)
      toast.error('Failed to post reply')
    }
  }

  const toggleReplyInput = (commentId: string) => {
    setShowReplyInput({ ...showReplyInput, [commentId]: !showReplyInput[commentId] })
  }

  const toggleReplies = (commentId: string) => {
    setShowReplies({ ...showReplies, [commentId]: !showReplies[commentId] })
  }

  const handleReplyToReply = async (postId: string, parentCommentId: string, replyToUsername: string, replyId: string) => {
    const content = replyInputs[replyId]
    if (!content?.trim()) return

    try {
      // Add @mention and send as reply to parent comment
      const response = await communityAPI.createComment({
        post: postId,
        parent: parentCommentId,
        content: `@${replyToUsername} ${content}`
      })

      // Add reply to the parent comment
      setPosts(posts.map(post => {
        if (post.id !== postId) return post

        const addReply = (comments: Comment[]): Comment[] => {
          return comments.map(comment => {
            if (comment.id === parentCommentId) {
              return {
                ...comment,
                replies: [...(comment.replies || []), response.data]
              }
            }
            return comment
          })
        }

        return {
          ...post,
          comments: addReply(post.comments || []),
          comment_count: post.comment_count + 1
        }
      }))

      // Clear input and hide reply box
      setReplyInputs({ ...replyInputs, [replyId]: '' })
      setShowReplyInput({ ...showReplyInput, [replyId]: false })
      toast.success('Reply posted!')
    } catch (error) {
      console.error('Failed to post reply:', error)
      toast.error('Failed to post reply')
    }
  }

  const handleShare = async (postId: string) => {
    // /community/post/:id has no route — link to the feed with a ?post= deep link instead
    const postUrl = `${window.location.origin}/community?post=${postId}`
    try {
      await navigator.clipboard.writeText(postUrl)
      toast.success('Post link copied to clipboard')
    } catch {
      // Clipboard API unavailable (e.g. non-HTTPS context)
      toast.error('Could not copy link — copy it from the address bar instead')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950">
        <Navbar />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-4">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-4 w-80" />
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 divide-y divide-neutral-800/70 mt-6">
            {[0, 1, 2, 3].map(i => <SkeletonListRow key={i} />)}
          </div>
        </div>
      </div>
    )
  }

  // Show Group Detail View when viewing a group
  if (viewingGroup) {
    return (
      <>
        <Navbar />
        <GroupDetailView
          org={viewingGroup}
          onBack={() => {
            setViewingGroup(null)
            fetchOrganizations()
          }}
          onUpdate={fetchOrganizations}
          currentUser={user}
        />
        <CommunityChat />
      </>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Mobile header + tabs (<lg) — desktop uses the left sidebar */}
        <div className="lg:hidden">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Community</h1>
              <p className="text-sm text-neutral-400 mt-1">Connect, share, and compete with fellow developers</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowSearchModal(true)}
                aria-label="Search coders"
                className="p-2.5 bg-neutral-800 border border-neutral-700 hover:bg-neutral-700 text-neutral-300 rounded-lg transition-colors"
              >
                <Search className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowFollowRequests(true)}
                aria-label="Follow requests"
                className="relative p-2.5 bg-neutral-800 border border-neutral-700 hover:bg-neutral-700 text-neutral-300 rounded-lg transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                {pendingRequestsCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-purple-600 text-white text-[10px] rounded-full flex items-center justify-center tabular-nums">
                    {pendingRequestsCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setShowNotifications(true)}
                aria-label="Notifications"
                className="relative p-2.5 bg-neutral-800 border border-neutral-700 hover:bg-neutral-700 text-neutral-300 rounded-lg transition-colors"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-purple-600 text-white text-[10px] rounded-full flex items-center justify-center tabular-nums">
                    {unreadNotifCount}
                  </span>
                )}
              </button>
            </div>
          </div>
          <div className="flex gap-1 mb-6 border-b border-neutral-800">
            <button
              onClick={() => setActiveTab('feed')}
              className={`relative flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium transition-colors ${activeTab === 'feed' ? 'text-white' : 'text-neutral-400 hover:text-neutral-200'}`}
            >
              <MessageCircle className="w-4 h-4" />
              Feed
              {activeTab === 'feed' && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-purple-500" />}
            </button>
            <button
              onClick={() => setActiveTab('groups')}
              className={`relative flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium transition-colors ${activeTab === 'groups' ? 'text-white' : 'text-neutral-400 hover:text-neutral-200'}`}
            >
              <Building2 className="w-4 h-4" />
              Groups
              {orgInvitations.length > 0 && (
                <span className="rounded-full border border-purple-500/30 bg-purple-500/15 px-1.5 text-xs text-purple-300 tabular-nums">
                  {orgInvitations.length}
                </span>
              )}
              {activeTab === 'groups' && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-purple-500" />}
            </button>
          </div>
        </div>

        <div className="flex items-start gap-6 xl:gap-8">
          {/* Left sidebar (≥lg) */}
          <aside className="hidden lg:flex flex-col w-60 shrink-0 sticky top-20 gap-5">
            {/* Profile mini card */}
            <Link
              to="/profile"
              className="flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900 p-3 hover:border-neutral-700 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center overflow-hidden shrink-0">
                {user?.profile_picture ? (
                  <img src={getMediaUrl(user.profile_picture) || ''} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white font-semibold">{user?.username?.charAt(0).toUpperCase() || 'U'}</span>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user?.username}
                </p>
                <p className="text-xs text-neutral-500">View profile</p>
              </div>
            </Link>

            {/* Nav */}
            <nav className="space-y-1">
              <button
                onClick={() => setActiveTab('feed')}
                className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${activeTab === 'feed'
                  ? 'bg-purple-500/10 text-purple-300'
                  : 'text-neutral-400 hover:bg-neutral-800/60 hover:text-white'
                  }`}
              >
                <MessageCircle className="w-4 h-4" />
                <span className="flex-1 text-left">Feed</span>
              </button>
              <button
                onClick={() => setActiveTab('groups')}
                className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${activeTab === 'groups'
                  ? 'bg-purple-500/10 text-purple-300'
                  : 'text-neutral-400 hover:bg-neutral-800/60 hover:text-white'
                  }`}
              >
                <Building2 className="w-4 h-4" />
                <span className="flex-1 text-left">Groups</span>
                {orgInvitations.length > 0 && (
                  <span className="rounded-full border border-purple-500/30 bg-purple-500/15 px-1.5 text-xs text-purple-300 tabular-nums">
                    {orgInvitations.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setShowSearchModal(true)}
                className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-neutral-400 hover:bg-neutral-800/60 hover:text-white transition-colors"
              >
                <Search className="w-4 h-4" />
                <span className="flex-1 text-left">Find Coders</span>
              </button>
              <button
                onClick={() => setShowFollowRequests(true)}
                className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-neutral-400 hover:bg-neutral-800/60 hover:text-white transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                <span className="flex-1 text-left">Requests</span>
                {pendingRequestsCount > 0 && (
                  <span className="rounded-full border border-purple-500/30 bg-purple-500/15 px-1.5 text-xs text-purple-300 tabular-nums">
                    {pendingRequestsCount}
                  </span>
                )}
              </button>
              {/* Only between lg and xl — at xl the right rail shows notifications inline */}
              <button
                onClick={() => setShowNotifications(true)}
                className="xl:hidden w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-neutral-400 hover:bg-neutral-800/60 hover:text-white transition-colors"
              >
                <Bell className="w-4 h-4" />
                <span className="flex-1 text-left">Notifications</span>
                {unreadNotifCount > 0 && (
                  <span className="rounded-full border border-purple-500/30 bg-purple-500/15 px-1.5 text-xs text-purple-300 tabular-nums">
                    {unreadNotifCount}
                  </span>
                )}
              </button>
            </nav>

            {/* My groups shortcuts */}
            {myOrgs.length > 0 && (
              <div className="border-t border-neutral-800 pt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2 px-3">My Groups</p>
                <div className="space-y-0.5">
                  {myOrgs.slice(0, 6).map(org => (
                    <button
                      key={org.id}
                      onClick={() => setViewingGroup(org)}
                      className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-neutral-400 hover:bg-neutral-800/60 hover:text-white transition-colors"
                    >
                      <span className="text-base leading-none">{org.icon}</span>
                      <span className="flex-1 text-left truncate">{org.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </aside>

          {/* Center column */}
          <div className="flex-1 min-w-0 max-w-2xl mx-auto">

        {activeTab === 'feed' && (
          <>
            {/* Create Post Form */}
            <form onSubmit={handleCreatePost} className="bg-neutral-900 rounded-xl border border-neutral-800 p-4 sm:p-6 mb-6">
              <textarea
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                placeholder="Share your thoughts, code snippets, or ask questions..."
                className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                rows={3}
              />

              {imagePreview && (
                <div className="mt-4 relative">
                  <img src={imagePreview} alt="Preview" className="max-h-64 rounded-lg" />
                  <button
                    type="button"
                    onClick={() => {
                      setPostImage(null)
                      setImagePreview(null)
                    }}
                    className="absolute top-2 right-2 p-1 bg-red-600 rounded-full hover:bg-red-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-4 gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer text-neutral-400 hover:text-purple-400">
                    <Image className="w-5 h-5" />
                    <span className="text-sm">Add Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                  </label>

                  {/* Group Selector */}
                  {myOrgs.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-neutral-400" />
                      <select
                        value={selectedPostOrg}
                        onChange={(e) => setSelectedPostOrg(e.target.value)}
                        className="bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white px-2 py-1.5 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      >
                        <option value="">Public Post</option>
                        {myOrgs.map(org => (
                          <option key={org.id} value={org.id}>
                            {org.icon} {org.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-semibold transition-colors"
                >
                  Post
                </button>
              </div>
            </form>

            {/* Job Stories Strip */}
            <JobStories />

            {/* Posts List */}
            <div className="space-y-6">
              {posts.length === 0 ? (
                <div className="text-center py-12 text-neutral-400">
                  <p className="text-lg">No posts yet. Be the first to share!</p>
                </div>
              ) : (
                posts.map((post) => (
                  <div
                    key={post.id}
                    id={`post-${post.id}`}
                    className="scroll-mt-24 bg-neutral-900 rounded-xl border border-neutral-800 p-4 sm:p-6 hover:border-neutral-700 transition-colors"
                  >
                    {/* Group Badge - Shows above post if it's a group post */}
                    {post.organization_data && (
                      <div
                        className="flex items-center gap-2 mb-3 pb-2 border-b border-neutral-800 cursor-pointer hover:bg-neutral-800/30 -mx-2 px-2 py-1 rounded transition"
                        onClick={() => {
                          const org = myOrgs.find(o => o.id === post.organization_data?.id)
                          if (org) setViewingGroup(org)
                        }}
                      >
                        <span className="text-lg">{post.organization_data.icon}</span>
                        <span className="text-purple-400 font-medium text-sm">{post.organization_data.name}</span>
                        <ChevronRight className="w-3 h-3 text-neutral-500" />
                      </div>
                    )}

                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <Link to={`/user/${post.author.id}`} className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center overflow-hidden shrink-0">
                          {post.author.profile_picture ? (
                            <img
                              src={getMediaUrl(post.author.profile_picture) || ''}
                              alt={post.author.username}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-white font-semibold">
                              {post.author.username.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </Link>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <Link
                              to={`/user/${post.author.id}`}
                              className="text-sm font-semibold text-white hover:text-purple-300 transition-colors truncate"
                            >
                              {post.author.username}
                            </Link>
                            {post.author.id && String(user?.id) !== String(post.author.id) && (
                              followingUsers.has(String(post.author.id)) ? (
                                <button
                                  onClick={() => handleUnfollow(post.author.id)}
                                  title="Unfollow"
                                  className="text-xs font-medium text-neutral-500 hover:text-red-400 transition-colors shrink-0"
                                >
                                  · Following
                                </button>
                              ) : pendingUsers.has(String(post.author.id)) ? (
                                <button
                                  onClick={() => handleCancelRequest(post.author.id)}
                                  title="Cancel request"
                                  className="text-xs font-medium text-neutral-500 hover:text-red-400 transition-colors shrink-0"
                                >
                                  · Requested
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleFollow(post.author.id)}
                                  className="text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors shrink-0"
                                >
                                  · Follow
                                </button>
                              )
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-neutral-500">
                            <span className="tabular-nums" title={new Date(post.created_at).toLocaleString()}>{timeAgo(post.created_at)}</span>
                            <span>·</span>
                            {/* Visibility Icon - Based on where post was shared */}
                            {post.organization_data ? (
                              <span className="flex items-center gap-1 text-purple-400" title={`Shared in ${post.organization_data.name} (Members only)`}>
                                <Users2 className="w-3 h-3" />
                                <span className="hidden sm:inline">{post.organization_data.name}</span>
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-purple-400" title="Public post (Visible to all)">
                                <Globe className="w-3 h-3" />
                                <span className="hidden sm:inline">Public</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/*
                          The full menu, for everyone. It used to render only for
                          the author, so nobody else could copy a link or report
                          anything — the two items a reader most needs.
                        */}
                        <ContentActionMenu
                          label="Post actions"
                          actions={buildContentActions({
                            kind: 'post',
                            canEdit: isPostAuthor(post),
                            canDelete: isPostAuthor(post) || user?.role === 'admin',
                            commentsDisabled: !!(post as any).comments_disabled,
                            onCopyLink: () => handleCopyLink(postUrl(post.id)),
                            onReport: () => setReportTarget({ type: 'post', id: post.id }),
                            onDelete: () => handleDeletePost(post.id),
                            onMoveToChannel: () => setShareTargetId(post.id),
                            onEdit: () => handleEditPost(post),
                            onToggleComments: () => handleToggleComments(post),
                          })}
                        />
                      </div>
                    </div>

                    {post.title && (
                      <h3 className="text-lg font-semibold text-white mb-2 break-words">{post.title}</h3>
                    )}

                    {/* Editing happens in EditContentDialog: this inline textarea
                        only ever sent `content`, so the image could not change. */}
                    {(
                      <div className="mb-4">
                        <p className={`text-neutral-200 text-[15px] leading-relaxed whitespace-pre-wrap break-words ${!expandedPosts[post.id] ? 'line-clamp-5' : ''}`}>
                          {post.content}
                        </p>
                        {post.content && (post.content.length > 280 || post.content.split('\n').length > 5) && (
                          <button
                            onClick={() => setExpandedPosts(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                            className="mt-1 text-sm font-medium text-neutral-400 hover:text-neutral-200 transition-colors"
                          >
                            {expandedPosts[post.id] ? 'See less' : 'See more'}
                          </button>
                        )}
                      </div>
                    )}

                    {(post.image_url || post.image) && (
                      <button
                        type="button"
                        onClick={() => setLightboxImage(getMediaUrl(post.image_url || post.image) || '')}
                        className="block w-full mb-4 rounded-xl overflow-hidden border border-neutral-800 bg-neutral-950 cursor-zoom-in"
                        aria-label="View image"
                      >
                        <img
                          src={getMediaUrl(post.image_url || post.image) || ''}
                          alt="Post attachment"
                          loading="lazy"
                          className="w-full max-h-[70vh] sm:max-h-[32rem] object-contain"
                        />
                      </button>
                    )}

                    {/* Engagement summary — counts live here, buttons stay clean labels */}
                    {(post.like_count > 0 || post.comment_count > 0) && (
                      <div className="flex items-center gap-3 text-xs text-neutral-500 tabular-nums mb-2">
                        {post.like_count > 0 && (
                          <Reactors
                            count={post.like_count}
                            title="Liked by"
                            noun="like"
                            loadPage={async page => {
                              const { data } = await communityAPI.getPostLikers(post.id, page)
                              return { results: data.results ?? data, next: data.next ?? null }
                            }}
                            className="h-10 -my-1 gap-1 px-1 text-xs text-neutral-500 sm:h-auto sm:my-0"
                          >
                            <span className="flex items-center gap-1">
                              <Heart className="w-3 h-3 fill-red-400 text-red-400" />
                              {post.like_count}
                            </span>
                          </Reactors>
                        )}
                        {post.comment_count > 0 && (
                          <button
                            onClick={() => openComments(post.id)}
                            className="hover:text-neutral-300 transition-colors ms-auto"
                          >
                            {post.comment_count} comment{post.comment_count !== 1 ? 's' : ''}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Action bar — equal ghost buttons */}
                    <div className="flex items-center border-t border-neutral-800 pt-1 -mx-2">
                      <button
                        onClick={() => handleLike(post.id)}
                        className={`flex-1 flex items-center justify-center gap-2 h-9 rounded-lg text-sm font-medium transition-colors hover:bg-neutral-800/60 ${post.is_liked ? 'text-red-400' : 'text-neutral-400 hover:text-neutral-200'}`}
                      >
                        <Heart className={`w-4 h-4 ${post.is_liked ? 'fill-current' : ''}`} />
                        Like
                      </button>
                      <button
                        onClick={() => openComments(post.id)}
                        className="flex-1 flex items-center justify-center gap-2 h-9 rounded-lg text-sm font-medium text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60 transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" />
                        Comment
                      </button>
                      <button
                        onClick={() => handleShare(post.id)}
                        className="flex-1 flex items-center justify-center gap-2 h-9 rounded-lg text-sm font-medium text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60 transition-colors"
                      >
                        <Share2 className="w-4 h-4" />
                        Share
                      </button>
                    </div>

                    {/* Comments Dialog — full thread in its own window, composer pinned at the bottom */}
                    <Modal
                      open={commentsPostId === post.id}
                      onClose={() => setCommentsPostId(null)}
                      title={`Comments${post.comment_count > 0 ? ` (${post.comment_count})` : ''}`}
                      size="lg"
                      footer={
                        <div className="flex items-center gap-2.5 w-full">
                          <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center overflow-hidden shrink-0">
                            {user?.profile_picture ? (
                              <img src={getMediaUrl(user.profile_picture) || ''} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xs text-white font-semibold">{user?.username?.charAt(0).toUpperCase() || 'U'}</span>
                            )}
                          </div>
                          {(post as any).comments_disabled ? (
                            /* Said, rather than a composer that takes text and then
                               fails. The server refuses these too. */
                            <p className="flex-1 rounded-full border border-neutral-800 bg-neutral-900/60 px-4 py-2 text-xs text-neutral-400">
                              The author has turned off comments for this post.
                            </p>
                          ) : (
                          <div className="relative flex-1">
                            <input
                              type="text"
                              value={commentInputs[post.id] || ''}
                              onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                              onKeyPress={(e) => e.key === 'Enter' && handleComment(post.id)}
                              placeholder="Write a comment…"
                              className="w-full h-9 rounded-full bg-neutral-800 border border-neutral-700 pl-4 pr-10 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-purple-500 transition-colors"
                            />
                            <button
                              onClick={() => handleComment(post.id)}
                              disabled={!commentInputs[post.id]?.trim()}
                              aria-label="Post comment"
                              className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-purple-400 hover:bg-neutral-700 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          </div>
                          )}
                        </div>
                      }
                    >
                        {/* Comments List — skeleton while loading, full thread scrolls in the dialog */}
                        {loadingComments[post.id] ? (
                          <div className="space-y-3 py-1" aria-hidden="true">
                            {[0, 1].map(i => (
                              <div key={i} className="flex gap-3 animate-pulse">
                                <div className="w-8 h-8 rounded-full bg-neutral-800 shrink-0" />
                                <div className="h-10 bg-neutral-800 rounded-2xl w-2/3" />
                              </div>
                            ))}
                          </div>
                        ) : (
                        <>
                        <div className="space-y-4">
                          {post.comments?.map((comment) => {
                            const commentProfilePic = getCommentProfilePic(comment.author)
                            return (
                              <div key={comment.id} className="space-y-2">
                                {/* Main Comment */}
                                <div className="flex gap-3">
                                  <div className="w-7 h-7 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                                    {commentProfilePic ? (
                                      <img src={commentProfilePic} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      <span className="text-xs text-white font-bold">
                                        {comment.author.username.charAt(0).toUpperCase()}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="inline-block max-w-full bg-neutral-800 rounded-2xl px-3 py-1.5 relative">
                                      <div className="flex items-center justify-between gap-2">
                                        <Link
                                          to={`/user/${comment.author.id}`}
                                          className="text-xs font-semibold text-white hover:text-purple-300 transition-colors"
                                        >
                                          {comment.author.username}
                                        </Link>

                                        {/* Shared menu. Was edit/delete for the author only, in four places. */}
                                        <div onClick={e => e.stopPropagation()}>
                                          <ContentActionMenu
                                            label="Comment actions"
                                            actions={buildContentActions({
                                              kind: 'comment',
                                              canEdit: isCommentAuthor(comment),
                                              canDelete: isCommentAuthor(comment) || user?.role === 'admin',
                                              onCopyLink: () => handleCopyLink(commentUrl(post.id, comment.id)),
                                              onReport: () => setReportTarget({ type: 'comment', id: comment.id }),
                                              onDelete: () => handleDeleteComment(post.id, comment.id),
                                              onEdit: () => handleEditComment(comment),
                                            })}
                                          />
                                        </div>
                                      </div>

                                      {/* Comment Content - Edit Mode or Display */}
                                      {editingCommentId === comment.id ? (
                                        <div className="mt-2">
                                          <input
                                            type="text"
                                            value={editedCommentContent}
                                            onChange={(e) => setEditedCommentContent(e.target.value)}
                                            className="w-full px-3 py-1.5 bg-neutral-700 border border-neutral-600 rounded text-sm text-white focus:ring-1 focus:ring-purple-500 focus:outline-none"
                                            onKeyPress={(e) => e.key === 'Enter' && handleSaveCommentEdit(post.id, comment.id)}
                                          />
                                          <div className="flex gap-2 mt-2">
                                            <button
                                              onClick={() => handleSaveCommentEdit(post.id, comment.id)}
                                              className="px-2 py-1 bg-purple-600 hover:bg-purple-500 text-white text-xs rounded flex items-center gap-1"
                                            >
                                              <Check className="w-3 h-3" />
                                              Save
                                            </button>
                                            <button
                                              onClick={handleCancelCommentEdit}
                                              className="px-2 py-1 bg-neutral-600 hover:bg-neutral-500 text-white text-xs rounded flex items-center gap-1"
                                            >
                                              <X className="w-3 h-3" />
                                              Cancel
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <p className="text-sm text-neutral-200 mt-0.5 whitespace-pre-wrap break-words">{comment.content}</p>
                                      )}
                                    </div>

                                    {/* Comment Actions — Facebook-style tiny text row */}
                                    <div className="flex items-center gap-4 mt-1 px-3.5 text-xs">
                                      <span className="text-neutral-600 tabular-nums">{timeAgo(comment.created_at)}</span>

                                      <button
                                        onClick={() => handleLikeComment(post.id, comment.id)}
                                        className={`font-medium transition-colors ${comment.is_liked ? 'text-red-400' : 'text-neutral-500 hover:text-neutral-300'}`}
                                      >
                                        Like
                                      </button>
                                      {/* The count used to sit inside the Like
                                          button, so tapping it toggled the like
                                          instead of answering "who". */}
                                      <Reactors
                                        count={comment.like_count || 0}
                                        title="Liked by"
                                        noun="like"
                                        loadPage={async page => {
                                          const { data } = await communityAPI.getCommentLikers(comment.id, page)
                                          return { results: data.results ?? data, next: data.next ?? null }
                                        }}
                                        className="h-10 -my-2 px-1 text-xs tabular-nums text-neutral-500 sm:h-auto sm:my-0"
                                      >
                                        <span>· {comment.like_count}</span>
                                      </Reactors>

                                      <button
                                        onClick={() => toggleReplyInput(comment.id)}
                                        className="font-medium text-neutral-500 hover:text-neutral-300 transition-colors"
                                      >
                                        Reply
                                      </button>

                                      {comment.replies && comment.replies.length > 0 && (
                                        <button
                                          onClick={() => toggleReplies(comment.id)}
                                          className="flex items-center gap-1 font-medium text-neutral-500 hover:text-neutral-300 transition-colors tabular-nums"
                                        >
                                          {showReplies[comment.id] ? (
                                            <ChevronUp className="w-3 h-3" />
                                          ) : (
                                            <ChevronDown className="w-3 h-3" />
                                          )}
                                          {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
                                        </button>
                                      )}
                                    </div>

                                    {/* Reply Input */}
                                    {showReplyInput[comment.id] && (
                                      <div className="relative mt-2 px-3.5">
                                        <input
                                          type="text"
                                          autoFocus
                                          value={replyInputs[comment.id] || ''}
                                          onChange={(e) => setReplyInputs({ ...replyInputs, [comment.id]: e.target.value })}
                                          onKeyPress={(e) => e.key === 'Enter' && handleReply(post.id, comment.id)}
                                          placeholder="Write a reply…"
                                          className="w-full h-8 rounded-full bg-neutral-800 border border-neutral-700 pl-3.5 pr-9 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-purple-500 transition-colors"
                                        />
                                        <button
                                          onClick={() => handleReply(post.id, comment.id)}
                                          disabled={!replyInputs[comment.id]?.trim()}
                                          aria-label="Post reply"
                                          className="absolute right-5 top-1/2 -translate-y-1/2 p-1 rounded-full text-purple-400 hover:bg-neutral-700 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                                        >
                                          <Send className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    )}

                                    {/* Replies */}
                                    {showReplies[comment.id] && comment.replies && comment.replies.length > 0 && (
                                      <div className="mt-2 ml-4 space-y-2.5 border-l border-neutral-800 pl-4">
                                        {comment.replies.map((reply) => {
                                          const replyProfilePic = getCommentProfilePic(reply.author)
                                          return (
                                            <div key={reply.id} className="space-y-2">
                                              <div className="flex gap-2">
                                                <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                                                  {replyProfilePic ? (
                                                    <img src={replyProfilePic} alt="" className="w-full h-full object-cover" />
                                                  ) : (
                                                    <span className="text-[10px] text-white font-bold">
                                                      {reply.author.username.charAt(0).toUpperCase()}
                                                    </span>
                                                  )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                  <div className="inline-block max-w-full bg-neutral-800/70 rounded-2xl px-3 py-1.5 relative">
                                                    <div className="flex items-center justify-between gap-2">
                                                      <Link
                                                        to={`/user/${reply.author.id}`}
                                                        className="text-xs font-semibold text-white hover:text-purple-300 transition-colors"
                                                      >
                                                        {reply.author.username}
                                                      </Link>

                                                      {/* Shared menu. Was edit/delete for the author only, in four places. */}
                                                      <div onClick={e => e.stopPropagation()}>
                                                        <ContentActionMenu
                                                          label="Comment actions"
                                                          actions={buildContentActions({
                                                            kind: 'comment',
                                                            canEdit: isCommentAuthor(reply),
                                                            canDelete: isCommentAuthor(reply) || user?.role === 'admin',
                                                            onCopyLink: () => handleCopyLink(commentUrl(post.id, reply.id)),
                                                            onReport: () => setReportTarget({ type: 'comment', id: reply.id }),
                                                            onDelete: () => handleDeleteComment(post.id, reply.id),
                                                            onEdit: () => handleEditComment(reply),
                                                          })}
                                                        />
                                                      </div>
                                                    </div>

                                                    {/* Reply Content - Edit Mode or Display */}
                                                    {editingCommentId === reply.id ? (
                                                      <div className="mt-1">
                                                        <input
                                                          type="text"
                                                          value={editedCommentContent}
                                                          onChange={(e) => setEditedCommentContent(e.target.value)}
                                                          className="w-full px-2 py-1 bg-neutral-700 border border-neutral-600 rounded text-xs text-white focus:ring-1 focus:ring-purple-500 focus:outline-none"
                                                          onKeyPress={(e) => e.key === 'Enter' && handleSaveCommentEdit(post.id, reply.id)}
                                                        />
                                                        <div className="flex gap-1 mt-1">
                                                          <button
                                                            onClick={() => handleSaveCommentEdit(post.id, reply.id)}
                                                            className="px-1.5 py-0.5 bg-purple-600 hover:bg-purple-500 text-white text-[10px] rounded flex items-center gap-1"
                                                          >
                                                            <Check className="w-2.5 h-2.5" />
                                                            Save
                                                          </button>
                                                          <button
                                                            onClick={handleCancelCommentEdit}
                                                            className="px-1.5 py-0.5 bg-neutral-600 hover:bg-neutral-500 text-white text-[10px] rounded flex items-center gap-1"
                                                          >
                                                            <X className="w-2.5 h-2.5" />
                                                            Cancel
                                                          </button>
                                                        </div>
                                                      </div>
                                                    ) : (
                                                      <p className="text-xs text-neutral-200 mt-0.5 whitespace-pre-wrap break-words">
                                                        {reply.content.split(/(@\w+)/g).map((part, i) =>
                                                          part.startsWith('@') ? (
                                                            <span key={i} className="text-purple-400 font-medium">{part}</span>
                                                          ) : (
                                                            <span key={i}>{part}</span>
                                                          )
                                                        )}
                                                      </p>
                                                    )}
                                                  </div>
                                                  <div className="flex items-center gap-3 mt-0.5 px-3 text-[11px]">
                                                    <span className="text-neutral-600 tabular-nums">{timeAgo(reply.created_at)}</span>
                                                    <button
                                                      onClick={() => handleLikeComment(post.id, reply.id, true, comment.id)}
                                                      className={`font-medium transition-colors ${reply.is_liked ? 'text-red-400' : 'text-neutral-500 hover:text-neutral-300'}`}
                                                    >
                                                      Like
                                                    </button>
                                                    <Reactors
                                                      count={reply.like_count || 0}
                                                      title="Liked by"
                                                      noun="like"
                                                      loadPage={async page => {
                                                        const { data } = await communityAPI.getCommentLikers(reply.id, page)
                                                        return { results: data.results ?? data, next: data.next ?? null }
                                                      }}
                                                      className="h-10 -my-2 px-1 text-[11px] tabular-nums text-neutral-500 sm:h-auto sm:my-0"
                                                    >
                                                      <span>· {reply.like_count}</span>
                                                    </Reactors>
                                                    <button
                                                      onClick={() => toggleReplyInput(reply.id)}
                                                      className="font-medium text-neutral-500 hover:text-neutral-300 transition-colors"
                                                    >
                                                      Reply
                                                    </button>
                                                  </div>

                                                  {/* Reply to Reply Input */}
                                                  {showReplyInput[reply.id] && (
                                                    <div className="relative mt-1.5 px-3">
                                                      <input
                                                        type="text"
                                                        autoFocus
                                                        value={replyInputs[reply.id] || ''}
                                                        onChange={(e) => setReplyInputs({ ...replyInputs, [reply.id]: e.target.value })}
                                                        onKeyPress={(e) => e.key === 'Enter' && handleReplyToReply(post.id, comment.id, reply.author.username, reply.id)}
                                                        placeholder={`Reply to ${reply.author.username}…`}
                                                        className="w-full h-8 rounded-full bg-neutral-800 border border-neutral-700 pl-3.5 pr-9 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-purple-500 transition-colors"
                                                      />
                                                      <button
                                                        onClick={() => handleReplyToReply(post.id, comment.id, reply.author.username, reply.id)}
                                                        disabled={!replyInputs[reply.id]?.trim()}
                                                        aria-label="Post reply"
                                                        className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full text-purple-400 hover:bg-neutral-700 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                                                      >
                                                        <Send className="w-3.5 h-3.5" />
                                                      </button>
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          )
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>

                        {post.comments && post.comments.length === 0 && (
                          <p className="text-sm text-neutral-500 text-center py-4">No comments yet. Be the first to comment!</p>
                        )}
                        </>
                        )}
                    </Modal>
                  </div>
                ))
              )}
            </div>

            {/* Load more — older posts stay reachable when the feed is paginated */}
            {nextPageUrl && (
              <div className="mt-6 text-center">
                <button
                  onClick={loadMorePosts}
                  disabled={loadingMore}
                  className="h-10 px-6 rounded-lg border border-neutral-700 bg-neutral-900 text-sm font-medium text-neutral-200 hover:border-neutral-600 hover:text-white transition-colors disabled:opacity-50"
                >
                  {loadingMore ? 'Loading…' : 'Load more posts'}
                </button>
              </div>
            )}
          </>
        )}

        {/* Groups Tab */}
        {activeTab === 'groups' && (
          <div className="space-y-6">
            {/* Pending Invitations */}
            {orgInvitations.length > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-amber-400 mb-3 flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  Pending Invitations ({orgInvitations.length})
                </h3>
                <div className="space-y-3">
                  {orgInvitations.map(inv => (
                    <div key={inv.id} className="flex items-center justify-between bg-neutral-800/50 rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{inv.organization.icon}</span>
                        <div>
                          <p className="text-white font-medium">{inv.organization.name}</p>
                          <p className="text-neutral-400 text-sm">Invited by {inv.inviter.username}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleAcceptOrgInvite(inv.organization)} className="p-2 bg-green-600 hover:bg-green-700 rounded-lg transition">
                          <Check className="w-4 h-4 text-white" />
                        </button>
                        <button onClick={() => handleDeclineOrgInvite(inv.organization)} className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition">
                          <X className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* My Groups */}
            {myOrgs.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-400" />
                  My Groups ({myOrgs.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {myOrgs.map(org => (
                    <div key={org.id} className="bg-neutral-800/50 backdrop-blur-sm rounded-xl border border-neutral-700/50 p-3 sm:p-4 hover:border-purple-500/50 transition cursor-pointer shadow-lg" onClick={() => setViewingGroup(org)}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{org.icon}</span>
                          <div>
                            <h4 className="text-white font-semibold flex items-center gap-2">
                              {org.name}
                              {org.is_official && <Crown className="w-3 h-3 text-amber-400" />}
                              {org.is_private && <Lock className="w-3 h-3 text-neutral-400" />}
                            </h4>
                            <p className="text-neutral-400 text-sm">{org.member_count} members · {org.post_count} posts</p>
                          </div>
                        </div>
                        {org.user_role && ['admin', 'owner'].includes(org.user_role) && (
                          <span className="text-xs text-purple-400 flex items-center gap-1">
                            <Shield className="w-3 h-3" />
                            {org.user_role}
                          </span>
                        )}
                      </div>
                      <p className="text-neutral-400 text-sm mt-2 line-clamp-2">{org.description}</p>
                      <div className="flex justify-between items-center mt-3" onClick={(e) => e.stopPropagation()}>
                        {/* Admin Controls */}
                        {org.user_role && ['admin', 'owner', 'moderator'].includes(org.user_role) && (
                          <button
                            onClick={() => setSelectedOrg(selectedOrg?.id === org.id ? null : org)}
                            className="text-xs px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded transition flex items-center gap-1"
                          >
                            <Shield className="w-3 h-3" />
                            Manage
                          </button>
                        )}
                        <button
                          onClick={() => handleLeaveOrg(org)}
                          className="text-xs px-3 py-1 bg-neutral-700 hover:bg-red-600 text-neutral-300 hover:text-white rounded transition ml-auto"
                        >
                          Leave
                        </button>
                      </div>

                      {/* Expanded Admin Panel */}
                      {selectedOrg?.id === org.id && org.user_role && ['admin', 'owner', 'moderator'].includes(org.user_role) && (
                        <OrgAdminPanel org={org} onUpdate={fetchOrganizations} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Discover Groups */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-purple-400" />
                Discover Groups
              </h3>

              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -tranneutral-y-1/2 w-5 h-5 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search groups..."
                  value={orgSearchQuery}
                  onChange={(e) => setOrgSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredOrgs.filter(org => !org.is_member).map(org => (
                  <div key={org.id} className="bg-neutral-800/50 rounded-xl border border-neutral-700/50 p-4 hover:border-purple-500/30 transition cursor-pointer" onClick={() => !org.is_private && setViewingGroup(org)}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{org.icon}</span>
                        <div>
                          <h4 className="text-white font-semibold flex items-center gap-2">
                            {org.name}
                            {org.is_official && <Crown className="w-3 h-3 text-amber-400" />}
                            {org.is_private && <Lock className="w-3 h-3 text-neutral-400" />}
                          </h4>
                          <p className="text-neutral-400 text-sm">{org.member_count} members · {org.post_count} posts</p>
                        </div>
                      </div>
                    </div>
                    <p className="text-neutral-400 text-sm mt-2 line-clamp-2">{org.description}</p>
                    <div className="flex justify-end mt-3" onClick={(e) => e.stopPropagation()}>
                      {org.membership_status === 'pending' ? (
                        <span className="text-xs px-3 py-1 bg-amber-500/20 text-amber-400 rounded flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Pending
                        </span>
                      ) : (
                        <button
                          onClick={() => handleJoinOrg(org)}
                          className="text-xs px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded transition flex items-center gap-1"
                        >
                          <UserPlus className="w-3 h-3" />
                          {org.is_private ? 'Request' : 'Join'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {filteredOrgs.filter(org => !org.is_member).length === 0 && (
                <div className="text-center py-8 text-neutral-400">
                  <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No groups found. Check back later!</p>
                </div>
              )}
            </div>
          </div>
        )}
          </div>

          {/* Right rail (≥xl): activity notifications — likes, comments, follows */}
          <aside className="hidden xl:block w-72 shrink-0 sticky top-20">
            <div className="rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
                <p className="text-sm font-semibold text-white flex items-center gap-2">
                  <Bell className="w-4 h-4 text-purple-400" />
                  Notifications
                  {unreadNotifCount > 0 && (
                    <span className="rounded-full border border-purple-500/30 bg-purple-500/15 px-1.5 text-xs text-purple-300 tabular-nums">
                      {unreadNotifCount}
                    </span>
                  )}
                </p>
                {unreadNotifCount > 0 && (
                  <button
                    onClick={handleMarkAllNotifsRead}
                    className="text-xs text-neutral-500 hover:text-purple-400 transition-colors"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-[60vh] overflow-y-auto">
                {notificationListContent}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Notifications sheet (mobile/tablet — the xl right rail shows these inline) */}
      <Modal
        open={showNotifications}
        onClose={() => setShowNotifications(false)}
        title="Notifications"
        footer={
          <>
            {unreadNotifCount > 0 && (
              <Button variant="secondary" onClick={handleMarkAllNotifsRead}>
                Mark all read
              </Button>
            )}
            <Button onClick={() => setShowNotifications(false)}>Done</Button>
          </>
        }
      >
        <div className="-mx-5 -my-5">
          {notificationListContent}
        </div>
      </Modal>

      {/* Image lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setLightboxImage(null)}
        >
          <img
            src={lightboxImage}
            alt="Full size attachment"
            className="max-w-full max-h-full object-contain rounded-lg"
          />
          <button
            onClick={() => setLightboxImage(null)}
            aria-label="Close image"
            className="absolute top-4 right-4 p-2 rounded-full bg-neutral-900/80 text-neutral-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Community Chat */}
      <CommunityChat />

      {/* Search Coder Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-neutral-700">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Search className="w-5 h-5 text-purple-400" />
                Search Coder
              </h2>
              <button
                onClick={() => {
                  setShowSearchModal(false)
                  setSearchQuery('')
                  setSearchResults([])
                }}
                className="p-1 hover:bg-neutral-800 rounded-lg transition"
              >
                <X className="w-5 h-5 text-neutral-400" />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-4 border-b border-neutral-800">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -tranneutral-y-1/2 w-5 h-5 text-neutral-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by username, name, or email..."
                  className="w-full pl-10 pr-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  autoFocus
                />
              </div>
              {searchQuery.length > 0 && searchQuery.length < 2 && (
                <p className="text-neutral-500 text-sm mt-2">Type at least 2 characters to search</p>
              )}
            </div>

            {/* Search Results */}
            <div className="overflow-y-auto max-h-96 p-4">
              {searchLoading ? (
                <div className="space-y-2">
                  {[0, 1, 2].map(i => <SkeletonListRow key={i} />)}
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-2">
                  {searchResults.map(coder => (
                    <Link
                      key={coder.id}
                      to={`/user/${coder.id}`}
                      onClick={() => {
                        setShowSearchModal(false)
                        setSearchQuery('')
                        setSearchResults([])
                      }}
                      className="flex items-center gap-3 p-3 bg-neutral-800/50 hover:bg-neutral-800 rounded-xl transition"
                    >
                      <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center overflow-hidden">
                        {coder.profile_picture ? (
                          <img
                            src={getMediaUrl(coder.profile_picture) || ''}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-white font-bold text-lg">
                            {coder.first_name?.[0] || coder.username[0]?.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-medium">
                          {coder.first_name} {coder.last_name}
                        </p>
                        <p className="text-purple-400 text-sm">@{coder.username}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs px-2 py-1 bg-neutral-700 text-neutral-300 rounded-full">
                          {coder.role || 'Student'}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : searchQuery.length >= 2 ? (
                <div className="text-center py-8 text-neutral-400">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No coders found for "{searchQuery}"</p>
                </div>
              ) : (
                <div className="text-center py-8 text-neutral-500">
                  <Search className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Start typing to search for coders</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Follow Requests Modal */}
      <FollowRequests
        isOpen={showFollowRequests}
        onClose={() => {
          setShowFollowRequests(false)
          fetchPendingCount()
        }}
      />

      {/* Opened from the action menu. Mounted at the page root so a dialog is
          never a child of the scrolling card that launched it. */}
      {(() => {
        const editing = posts.find(p => p.id === editingPostId)
        return (
          <EditContentDialog
            open={!!editing}
            onClose={() => setEditingPostId(null)}
            kind="post"
            id={editing?.id ?? ''}
            initialContent={editing?.content ?? ''}
            initialImageUrl={editing?.image_url}
            onSaved={next => {
              setPosts(prev => prev.map(p => (p.id === editing?.id
                ? ({ ...p, content: next.content, image_url: next.imageUrl ?? undefined } as Post)
                : p)))
            }}
          />
        )
      })()}

      <ReportDialog
        open={reportTarget !== null}
        onClose={() => setReportTarget(null)}
        targetType={reportTarget?.type ?? 'post'}
        targetId={reportTarget?.id ?? ''}
      />
      <MoveToChannelDialog
        open={shareTargetId !== null}
        onClose={() => setShareTargetId(null)}
        postId={shareTargetId ?? ''}
      />
    </div>
  )
}
