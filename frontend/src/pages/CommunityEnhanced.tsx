import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import CommunityChat from '../components/CommunityChat'
import FollowRequests from '../components/FollowRequests'
import toast from 'react-hot-toast'
import api, { communityAPI } from '../services/api'
import { Heart, MessageCircle, Share2, Image, Send, X, Reply, ChevronDown, ChevronUp, ChevronRight, UserPlus, UserMinus, Bell, Users, Users2, Clock, Building2, Crown, Shield, Lock, Search, Check, ArrowLeft, Settings, Camera, Edit3, Trash2, Globe, MoreVertical } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { getMediaUrl } from '../utils/mediaUrl'

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
      <div className="mt-4 pt-4 border-t border-slate-700 flex justify-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  return (
    <div className="mt-4 pt-4 border-t border-slate-700">
      {/* Tabs */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setActiveSection('pending')}
          className={`text-xs px-3 py-1 rounded transition ${activeSection === 'pending'
            ? 'bg-yellow-500/20 text-yellow-400'
            : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
            }`}
        >
          Pending ({pendingMembers.length})
        </button>
        <button
          onClick={() => setActiveSection('members')}
          className={`text-xs px-3 py-1 rounded transition ${activeSection === 'members'
            ? 'bg-purple-500/20 text-purple-400'
            : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
            }`}
        >
          Members ({members.length})
        </button>
      </div>

      {/* Pending Requests */}
      {activeSection === 'pending' && (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {pendingMembers.length > 0 ? pendingMembers.map(member => (
            <div key={member.id} className="flex items-center justify-between bg-slate-700/50 rounded-lg p-2">
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
            <p className="text-slate-500 text-xs text-center py-2">No pending requests</p>
          )}
        </div>
      )}

      {/* Members List */}
      {activeSection === 'members' && (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {members.map(member => (
            <div key={member.id} className="flex items-center justify-between bg-slate-700/50 rounded-lg p-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-purple-500/30 flex items-center justify-center text-xs font-bold">
                  {member.user.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <span className="text-white text-sm">{member.user.username}</span>
                  <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${member.role === 'owner' ? 'bg-yellow-500/20 text-yellow-400' :
                    member.role === 'admin' ? 'bg-purple-500/20 text-purple-400' :
                      member.role === 'moderator' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-slate-600 text-slate-400'
                    }`}>
                    {member.role}
                  </span>
                </div>
              </div>
              {org.user_role === 'owner' && member.role !== 'owner' && (
                <select
                  value={member.role}
                  onChange={(e) => handleSetRole(member.user.id, e.target.value)}
                  className="text-xs bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white"
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
  const [showPostMenu, setShowPostMenu] = useState(false)
  const [isEditingPost, setIsEditingPost] = useState(false)
  const [editedPostContent, setEditedPostContent] = useState(post.content)

  // Comment menu state
  const [showCommentMenu, setShowCommentMenu] = useState<{ [key: string]: boolean }>({})
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editedCommentContent, setEditedCommentContent] = useState('')

  const isPostAuthor = currentUser?.id?.toString() === post.author.id?.toString()

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
    setShowPostMenu(false)
  }

  const handleEditPost = () => {
    setEditedPostContent(post.content)
    setIsEditingPost(true)
    setShowPostMenu(false)
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

  const isCommentAuthor = (comment: Comment) => {
    return currentUser?.id?.toString() === comment.author.id?.toString()
  }

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

  // Close menu when clicking outside
  const handleClickOutside = () => {
    setShowPostMenu(false)
    setShowCommentMenu({})
  }

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-4" onClick={handleClickOutside}>
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
            <p className="text-slate-500 text-xs">
              {new Date(post.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* 3-dot menu for post owner */}
        {isPostAuthor && (
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowPostMenu(!showPostMenu) }}
              className="p-1 rounded-full hover:bg-slate-700 transition"
            >
              <MoreVertical className="w-5 h-5 text-slate-400" />
            </button>

            {showPostMenu && (
              <div
                className="absolute right-0 mt-1 w-32 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={handleEditPost}
                  className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 flex items-center gap-2 rounded-t-lg"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={handleDeletePost}
                  className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-slate-700 flex items-center gap-2 rounded-b-lg"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Post Content - Edit Mode or Display */}
      {isEditingPost ? (
        <div className="mb-3">
          <textarea
            value={editedPostContent}
            onChange={(e) => setEditedPostContent(e.target.value)}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm resize-none focus:ring-2 focus:ring-purple-500 focus:outline-none"
            rows={4}
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleSavePostEdit}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg flex items-center gap-1"
            >
              <Check className="w-4 h-4" />
              Save
            </button>
            <button
              onClick={handleCancelPostEdit}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="text-slate-300 mb-3 whitespace-pre-wrap">{post.content}</p>
      )}

      {post.image_url && (
        <img
          src={getMediaUrl(post.image_url) || ''}
          alt=""
          className="rounded-lg max-h-96 w-full object-cover mb-3"
        />
      )}

      <div className="flex items-center gap-4 pt-3 border-t border-slate-800">
        <button
          onClick={() => onLike(post.id)}
          className={`flex items-center gap-1 text-sm ${post.is_liked ? 'text-red-500' : 'text-slate-400 hover:text-red-400'}`}
        >
          <Heart className={`w-4 h-4 ${post.is_liked ? 'fill-current' : ''}`} />
          {post.like_count}
        </button>
        <button
          onClick={handleToggleComments}
          className="flex items-center gap-1 text-sm text-slate-400 hover:text-purple-400"
        >
          <MessageCircle className="w-4 h-4" />
          {post.comment_count}
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="mt-4 pt-4 border-t border-slate-700">
          {/* Add Comment Form */}
          <form onSubmit={handleAddComment} className="flex gap-2 mb-4">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!newComment.trim()}
              className="px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg text-white text-sm"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          {/* Comments List */}
          {loadingComments ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-500"></div>
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
                      <div className="flex-1">
                        <div className="bg-slate-800 rounded-lg p-2 relative">
                          <div className="flex items-center justify-between">
                            <span className="text-white text-sm font-medium">{comment.author.username}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-500 text-xs">{new Date(comment.created_at).toLocaleDateString()}</span>

                              {/* 3-dot menu for comment owner */}
                              {isCommentAuthor(comment) && (
                                <div className="relative">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setShowCommentMenu({ ...showCommentMenu, [comment.id]: !showCommentMenu[comment.id] }) }}
                                    className="p-0.5 rounded hover:bg-slate-700 transition"
                                  >
                                    <MoreVertical className="w-4 h-4 text-slate-400" />
                                  </button>

                                  {showCommentMenu[comment.id] && (
                                    <div
                                      className="absolute right-0 mt-1 w-28 bg-slate-700 border border-slate-600 rounded-lg shadow-xl z-50"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <button
                                        onClick={() => handleEditComment(comment)}
                                        className="w-full px-2 py-1.5 text-left text-xs text-slate-300 hover:bg-slate-600 flex items-center gap-2 rounded-t-lg"
                                      >
                                        <Edit3 className="w-3 h-3" />
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => handleDeleteComment(comment.id)}
                                        className="w-full px-2 py-1.5 text-left text-xs text-red-400 hover:bg-slate-600 flex items-center gap-2 rounded-b-lg"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                        Delete
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Comment Content - Edit Mode or Display */}
                          {editingCommentId === comment.id ? (
                            <div className="mt-1">
                              <input
                                type="text"
                                value={editedCommentContent}
                                onChange={(e) => setEditedCommentContent(e.target.value)}
                                className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-sm text-white focus:ring-1 focus:ring-purple-500 focus:outline-none"
                                onKeyPress={(e) => e.key === 'Enter' && handleSaveCommentEdit(comment.id)}
                              />
                              <div className="flex gap-1 mt-1">
                                <button
                                  onClick={() => handleSaveCommentEdit(comment.id)}
                                  className="px-2 py-0.5 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded flex items-center gap-1"
                                >
                                  <Check className="w-3 h-3" />
                                  Save
                                </button>
                                <button
                                  onClick={handleCancelCommentEdit}
                                  className="px-2 py-0.5 bg-slate-600 hover:bg-slate-500 text-white text-xs rounded flex items-center gap-1"
                                >
                                  <X className="w-3 h-3" />
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-slate-300 text-sm mt-1">{comment.content}</p>
                          )}
                        </div>

                        {/* Comment Actions */}
                        <div className="flex items-center gap-3 mt-1 ml-1">
                          <button
                            onClick={() => handleLikeComment(comment.id)}
                            className={`flex items-center gap-1 text-xs ${comment.is_liked ? 'text-red-500' : 'text-slate-400 hover:text-red-400'}`}
                          >
                            <Heart className={`w-3 h-3 ${comment.is_liked ? 'fill-current' : ''}`} />
                            {comment.like_count || 0}
                          </button>
                          <button
                            onClick={() => toggleReplyInput(comment.id)}
                            className="flex items-center gap-1 text-xs text-slate-400 hover:text-purple-400"
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
                              className="flex-1 px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:ring-1 focus:ring-purple-500 focus:outline-none"
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
                                      <div className="bg-slate-800/70 rounded-lg p-2 relative">
                                        <div className="flex items-center justify-between">
                                          <span className="text-white text-xs font-medium">{reply.author.username}</span>
                                          <div className="flex items-center gap-2">
                                            <span className="text-slate-500 text-xs">{new Date(reply.created_at).toLocaleDateString()}</span>

                                            {/* 3-dot menu for reply owner */}
                                            {isCommentAuthor(reply) && (
                                              <div className="relative">
                                                <button
                                                  onClick={(e) => { e.stopPropagation(); setShowCommentMenu({ ...showCommentMenu, [reply.id]: !showCommentMenu[reply.id] }) }}
                                                  className="p-0.5 rounded hover:bg-slate-600 transition"
                                                >
                                                  <MoreVertical className="w-3 h-3 text-slate-400" />
                                                </button>

                                                {showCommentMenu[reply.id] && (
                                                  <div
                                                    className="absolute right-0 mt-1 w-24 bg-slate-700 border border-slate-600 rounded-lg shadow-xl z-50"
                                                    onClick={(e) => e.stopPropagation()}
                                                  >
                                                    <button
                                                      onClick={() => handleEditComment(reply)}
                                                      className="w-full px-2 py-1 text-left text-xs text-slate-300 hover:bg-slate-600 flex items-center gap-1 rounded-t-lg"
                                                    >
                                                      <Edit3 className="w-3 h-3" />
                                                      Edit
                                                    </button>
                                                    <button
                                                      onClick={() => handleDeleteComment(reply.id)}
                                                      className="w-full px-2 py-1 text-left text-xs text-red-400 hover:bg-slate-600 flex items-center gap-1 rounded-b-lg"
                                                    >
                                                      <Trash2 className="w-3 h-3" />
                                                      Delete
                                                    </button>
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        </div>

                                        {/* Reply Content - Edit Mode or Display */}
                                        {editingCommentId === reply.id ? (
                                          <div className="mt-1">
                                            <input
                                              type="text"
                                              value={editedCommentContent}
                                              onChange={(e) => setEditedCommentContent(e.target.value)}
                                              className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-xs text-white focus:ring-1 focus:ring-purple-500 focus:outline-none"
                                              onKeyPress={(e) => e.key === 'Enter' && handleSaveCommentEdit(reply.id)}
                                            />
                                            <div className="flex gap-1 mt-1">
                                              <button
                                                onClick={() => handleSaveCommentEdit(reply.id)}
                                                className="px-1.5 py-0.5 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded flex items-center gap-1"
                                              >
                                                <Check className="w-3 h-3" />
                                                Save
                                              </button>
                                              <button
                                                onClick={handleCancelCommentEdit}
                                                className="px-1.5 py-0.5 bg-slate-600 hover:bg-slate-500 text-white text-xs rounded flex items-center gap-1"
                                              >
                                                <X className="w-3 h-3" />
                                                Cancel
                                              </button>
                                            </div>
                                          </div>
                                        ) : (
                                          <p className="text-slate-300 text-xs mt-1">{reply.content}</p>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-3 mt-1 ml-1">
                                        <button
                                          onClick={() => handleLikeComment(reply.id)}
                                          className={`flex items-center gap-1 text-xs ${reply.is_liked ? 'text-red-500' : 'text-slate-400 hover:text-red-400'}`}
                                        >
                                          <Heart className={`w-3 h-3 ${reply.is_liked ? 'fill-current' : ''}`} />
                                          {reply.like_count || 0}
                                        </button>
                                        <button
                                          onClick={() => toggleReplyInput(reply.id)}
                                          className="flex items-center gap-1 text-xs text-slate-400 hover:text-purple-400"
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
                                            className="flex-1 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-white focus:ring-1 focus:ring-purple-500 focus:outline-none"
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
            <p className="text-slate-500 text-sm text-center py-2">No comments yet</p>
          )}
        </div>
      )}
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
    <div className="min-h-screen bg-slate-950">
      {/* Cover Image */}
      <div className="relative h-48 sm:h-64 bg-gradient-to-r from-purple-600/40 to-blue-600/40">
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
          <div className="w-24 h-24 bg-slate-800 rounded-2xl flex items-center justify-center text-5xl border-4 border-slate-900 shadow-xl">
            {org.icon}
          </div>
          <div className="flex-1 pb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-white">{org.name}</h1>
              {org.is_official && <Crown className="w-5 h-5 text-yellow-400" />}
              {org.is_private && <Lock className="w-4 h-4 text-slate-400" />}
            </div>
            <p className="text-slate-400 text-sm mt-1">
              {org.member_count} members · {org.post_count} posts · {org.org_type}
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition"
            >
              <Settings className="w-5 h-5 text-white" />
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-6 border-b border-slate-800 overflow-x-auto">
          {['posts', 'members', 'about'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-3 text-sm font-medium capitalize whitespace-nowrap transition ${activeTab === tab
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-slate-400 hover:text-white'
                }`}
            >
              {tab}
              {tab === 'members' && pendingMembers.length > 0 && isAdmin && (
                <span className="ml-2 px-1.5 py-0.5 bg-yellow-500 text-black text-xs rounded-full">
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
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          </div>
        ) : (
          <>
            {/* Posts Tab */}
            {activeTab === 'posts' && (
              <div className="space-y-6">
                {/* Create Post */}
                {org.is_member && (
                  <form onSubmit={handleCreatePost} className="bg-slate-900 rounded-xl border border-slate-800 p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-500/30 flex items-center justify-center text-sm font-bold">
                        {currentUser?.username?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div className="flex-1">
                        <textarea
                          value={newPost}
                          onChange={(e) => setNewPost(e.target.value)}
                          placeholder={`Share something with ${org.name}...`}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
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
                          <label className="p-2 hover:bg-slate-700 rounded-lg cursor-pointer transition">
                            <Image className="w-5 h-5 text-slate-400" />
                            <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                          </label>
                          <button
                            type="submit"
                            disabled={!newPost.trim() && !postImage}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg text-white text-sm transition"
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
                  <div className="text-center py-12 bg-slate-900 rounded-xl border border-slate-800">
                    <MessageCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">No posts yet. Be the first to share!</p>
                  </div>
                )}
              </div>
            )}

            {/* Members Tab */}
            {activeTab === 'members' && (
              <div className="space-y-6">
                {/* Pending Requests (Admin Only) */}
                {isAdmin && pendingMembers.length > 0 && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                    <h3 className="text-lg font-semibold text-yellow-400 mb-3">
                      Pending Requests ({pendingMembers.length})
                    </h3>
                    <div className="space-y-2">
                      {pendingMembers.map(member => (
                        <div key={member.id} className="flex items-center justify-between bg-slate-800/50 rounded-lg p-3">
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
                <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
                  <h3 className="text-lg font-semibold text-white mb-4">Members ({members.length})</h3>
                  <div className="space-y-2">
                    {members.map(member => (
                      <div key={member.id} className="flex items-center justify-between bg-slate-800/50 rounded-lg p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-purple-500/30 flex items-center justify-center font-bold">
                            {member.user.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="text-white">{member.user.username}</span>
                            <span className={`ml-2 text-xs px-2 py-0.5 rounded ${member.role === 'owner' ? 'bg-yellow-500/20 text-yellow-400' :
                              member.role === 'admin' ? 'bg-purple-500/20 text-purple-400' :
                                member.role === 'moderator' ? 'bg-blue-500/20 text-blue-400' :
                                  'bg-slate-700 text-slate-400'
                              }`}>
                              {member.role}
                            </span>
                          </div>
                        </div>
                        {isOwner && member.role !== 'owner' && (
                          <select
                            value={member.role}
                            onChange={(e) => handleSetRole(member.user.id, e.target.value)}
                            className="text-sm bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white"
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
              <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">About {org.name}</h3>
                <p className="text-slate-300 mb-6">{org.description || 'No description provided.'}</p>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-800 rounded-lg p-4">
                    <p className="text-slate-400 text-sm">Type</p>
                    <p className="text-white capitalize">{org.org_type}</p>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-4">
                    <p className="text-slate-400 text-sm">Privacy</p>
                    <p className="text-white">{org.is_private ? 'Private' : 'Public'}</p>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-4">
                    <p className="text-slate-400 text-sm">Members</p>
                    <p className="text-white">{org.member_count}</p>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-4">
                    <p className="text-slate-400 text-sm">Posts</p>
                    <p className="text-white">{org.post_count}</p>
                  </div>
                </div>

                {org.program && (
                  <div className="mt-4 bg-slate-800 rounded-lg p-4">
                    <p className="text-slate-400 text-sm">Program</p>
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
          <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Group Settings</h2>
              <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-slate-800 rounded-lg">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Group Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="text-sm text-slate-400 mb-1 block">Icon (emoji)</label>
                <input
                  type="text"
                  value={editForm.icon}
                  onChange={(e) => setEditForm({ ...editForm, icon: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-2xl"
                  maxLength={2}
                />
              </div>

              <div>
                <label className="text-sm text-slate-400 mb-1 block">Description</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white resize-none"
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-white">Private Group</p>
                  <p className="text-slate-400 text-sm">Only invited members can join</p>
                </div>
                <button
                  onClick={() => setEditForm({ ...editForm, is_private: !editForm.is_private })}
                  className={`w-12 h-6 rounded-full transition ${editForm.is_private ? 'bg-purple-600' : 'bg-slate-700'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${editForm.is_private ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-white">Require Approval</p>
                  <p className="text-slate-400 text-sm">Admins must approve new members</p>
                </div>
                <button
                  onClick={() => setEditForm({ ...editForm, requires_approval: !editForm.requires_approval })}
                  className={`w-12 h-6 rounded-full transition ${editForm.requires_approval ? 'bg-purple-600' : 'bg-slate-700'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${editForm.requires_approval ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>

            <div className="p-6 border-t border-slate-700 flex gap-3 justify-end">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateGroup}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white"
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
  const [posts, setPosts] = useState<Post[]>([])
  const [newPost, setNewPost] = useState('')
  const [postImage, setPostImage] = useState<File | null>(null)
  const [loading, setLoading] = useState(true)
  const [showComments, setShowComments] = useState<{ [key: string]: boolean }>({})
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

  // Post edit/delete state for main feed
  const [showPostMenu, setShowPostMenu] = useState<{ [key: string]: boolean }>({})
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
    fetchMyOrgs() // Fetch user's groups for post selector
  }, [])

  useEffect(() => {
    if (activeTab === 'groups') {
      fetchOrganizations()
    }
  }, [activeTab, user])

  const fetchMyOrgs = async () => {
    if (!user) return
    try {
      const response = await api.get('/community/organizations/', { params: { my_orgs: 'true' } })
      setMyOrgs(response.data.results || response.data || [])
    } catch (error) {
      console.error('Failed to fetch my orgs:', error)
    }
  }

  const handleSearchCoders = async (query: string) => {
    setSearchQuery(query)
    if (query.length < 2) {
      setSearchResults([])
      return
    }

    try {
      setSearchLoading(true)
      const response = await communityAPI.searchCoders(query)
      setSearchResults(response.data || [])
    } catch (error) {
      console.error('Failed to search coders:', error)
    } finally {
      setSearchLoading(false)
    }
  }

  const fetchPosts = async () => {
    try {
      setLoading(true)
      // Use smart feed: shows posts from followed users + your organizations + your own posts
      const response = await communityAPI.getFeed()
      const postsData = response.data.results || response.data
      setPosts(Array.isArray(postsData) ? postsData : [])
    } catch (error) {
      console.error('Failed to fetch posts:', error)
      toast.error('Failed to load posts')
    } finally {
      setLoading(false)
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
    setShowPostMenu({ ...showPostMenu, [postId]: false })
  }

  const handleEditPost = (post: Post) => {
    setEditingPostId(post.id)
    setEditedPostContent(post.content)
    setShowPostMenu({ ...showPostMenu, [post.id]: false })
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

  const isPostAuthor = (post: Post) => {
    return user?.id?.toString() === post.author.id?.toString()
  }

  // Comment edit/delete handlers for main feed
  const isCommentAuthor = (comment: Comment) => {
    return user?.id?.toString() === comment.author.id?.toString()
  }

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

  const toggleComments = async (postId: string) => {
    const newShowState = !showComments[postId]
    setShowComments({ ...showComments, [postId]: newShowState })

    if (newShowState && !posts.find(p => p.id === postId)?.comments) {
      try {
        const response = await communityAPI.getComments(postId)
        setPosts(posts.map(post =>
          post.id === postId
            ? { ...post, comments: response.data.results || response.data }
            : post
        ))
      } catch (error) {
        console.error('Failed to fetch comments:', error)
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

      // Clear input
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

  const handleShare = (postId: string) => {
    // Copy post link to clipboard
    const postUrl = `${window.location.origin}/community/post/${postId}`
    navigator.clipboard.writeText(postUrl)
    toast.success('Post link copied to clipboard!')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
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
    <div className="min-h-screen bg-slate-950">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">👥 Community</h1>
            <p className="text-slate-400">Connect, share, and compete with fellow developers</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSearchModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
            >
              <Search className="w-5 h-5" />
              <span className="hidden sm:inline">Search Coder</span>
            </button>
            <button
              onClick={() => setShowFollowRequests(true)}
              className="relative flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition"
            >
              <Bell className="w-5 h-5" />
              <span className="hidden sm:inline">Requests</span>
              {pendingRequestsCount > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {pendingRequestsCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-slate-800 pb-4">
          <button
            onClick={() => setActiveTab('feed')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${activeTab === 'feed'
              ? 'bg-purple-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
          >
            <MessageCircle className="w-4 h-4" />
            Feed
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${activeTab === 'groups'
              ? 'bg-purple-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
          >
            <Building2 className="w-4 h-4" />
            Groups
            {orgInvitations.length > 0 && (
              <span className="bg-yellow-500 text-black text-xs px-1.5 py-0.5 rounded-full">
                {orgInvitations.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'feed' && (
          <>
            {/* Create Post Form */}
            <form onSubmit={handleCreatePost} className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4 sm:p-6 mb-6 shadow-lg">
              <textarea
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                placeholder="Share your thoughts, code snippets, or ask questions..."
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                  <label className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-purple-400">
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
                      <Users className="w-4 h-4 text-slate-400" />
                      <select
                        value={selectedPostOrg}
                        onChange={(e) => setSelectedPostOrg(e.target.value)}
                        className="bg-slate-800 border border-slate-700 rounded-lg text-sm text-white px-2 py-1.5 focus:ring-2 focus:ring-purple-500 focus:outline-none"
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
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg font-semibold hover:from-purple-700 hover:to-indigo-700"
                >
                  Post
                </button>
              </div>
            </form>

            {/* Posts List */}
            <div className="space-y-6">
              {posts.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <p className="text-lg">No posts yet. Be the first to share!</p>
                </div>
              ) : (
                posts.map((post) => (
                  <div key={post.id} className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4 sm:p-6 shadow-lg hover:border-slate-600/50 transition">
                    {/* Group Badge - Shows above post if it's a group post */}
                    {post.organization_data && (
                      <div
                        className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800 cursor-pointer hover:bg-slate-800/30 -mx-2 px-2 py-1 rounded transition"
                        onClick={() => {
                          const org = myOrgs.find(o => o.id === post.organization_data?.id)
                          if (org) setViewingGroup(org)
                        }}
                      >
                        <span className="text-lg">{post.organization_data.icon}</span>
                        <span className="text-purple-400 font-medium text-sm">{post.organization_data.name}</span>
                        <ChevronRight className="w-3 h-3 text-slate-500" />
                      </div>
                    )}

                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center">
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
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <Link
                              to={`/user/${post.author.id}`}
                              className="text-white font-semibold hover:text-purple-400"
                            >
                              {post.author.username}
                            </Link>
                            {post.author.id && String(user?.id) !== String(post.author.id) && (
                              followingUsers.has(String(post.author.id)) ? (
                                <button
                                  onClick={() => handleUnfollow(post.author.id)}
                                  className="flex items-center gap-1 px-2 py-0.5 bg-slate-700 hover:bg-red-600 text-slate-300 hover:text-white text-xs rounded-full transition"
                                >
                                  <UserMinus className="w-3 h-3" />
                                  Following
                                </button>
                              ) : pendingUsers.has(String(post.author.id)) ? (
                                <button
                                  onClick={() => handleCancelRequest(post.author.id)}
                                  className="flex items-center gap-1 px-2 py-0.5 bg-yellow-600/50 hover:bg-red-600 text-yellow-200 hover:text-white text-xs rounded-full transition"
                                >
                                  <Clock className="w-3 h-3" />
                                  Requested
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleFollow(post.author.id)}
                                  className="flex items-center gap-1 px-2 py-0.5 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-full transition"
                                >
                                  <UserPlus className="w-3 h-3" />
                                  Follow
                                </button>
                              )
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <span>{new Date(post.created_at).toLocaleDateString()}</span>
                            <span>·</span>
                            {/* Visibility Icon - Based on where post was shared */}
                            {post.organization_data ? (
                              <span className="flex items-center gap-1 text-purple-400" title={`Shared in ${post.organization_data.name} (Members only)`}>
                                <Users2 className="w-3 h-3" />
                                <span className="hidden sm:inline">{post.organization_data.name}</span>
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-blue-400" title="Public post (Visible to all)">
                                <Globe className="w-3 h-3" />
                                <span className="hidden sm:inline">Public</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">

                        {/* 3-dot menu for post owner */}
                        {isPostAuthor(post) && (
                          <div className="relative">
                            <button
                              onClick={() => setShowPostMenu({ ...showPostMenu, [post.id]: !showPostMenu[post.id] })}
                              className="p-1 rounded-full hover:bg-slate-700 transition"
                            >
                              <MoreVertical className="w-5 h-5 text-slate-400" />
                            </button>

                            {showPostMenu[post.id] && (
                              <div className="absolute right-0 mt-1 w-32 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50">
                                <button
                                  onClick={() => handleEditPost(post)}
                                  className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 flex items-center gap-2 rounded-t-lg"
                                >
                                  <Edit3 className="w-4 h-4" />
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeletePost(post.id)}
                                  className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-slate-700 flex items-center gap-2 rounded-b-lg"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {post.title && (
                      <h3 className="text-xl font-semibold text-white mb-3">{post.title}</h3>
                    )}

                    {/* Post Content - Edit Mode or Display */}
                    {editingPostId === post.id ? (
                      <div className="mb-4">
                        <textarea
                          value={editedPostContent}
                          onChange={(e) => setEditedPostContent(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm resize-none focus:ring-2 focus:ring-purple-500 focus:outline-none"
                          rows={4}
                        />
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => handleSavePostEdit(post.id)}
                            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg flex items-center gap-1"
                          >
                            <Check className="w-4 h-4" />
                            Save
                          </button>
                          <button
                            onClick={handleCancelPostEdit}
                            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg flex items-center gap-1"
                          >
                            <X className="w-4 h-4" />
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-slate-300 mb-4">{post.content}</p>
                    )}

                    {(post.image_url || post.image) && (
                      <img
                        src={getMediaUrl(post.image_url || post.image) || ''}
                        alt="Post"
                        className="w-full rounded-lg mb-4 max-h-96 object-cover"
                      />
                    )}

                    {/* Interaction Buttons */}
                    <div className="flex items-center gap-6 pt-4 border-t border-slate-800">
                      <button
                        onClick={() => handleLike(post.id)}
                        className={`flex items-center gap-2 ${post.is_liked ? 'text-pink-500' : 'text-slate-400 hover:text-pink-500'
                          } transition`}
                      >
                        <Heart className={`w-5 h-5 ${post.is_liked ? 'fill-current' : ''}`} />
                        <span className="text-sm">{post.like_count}</span>
                      </button>

                      <button
                        onClick={() => toggleComments(post.id)}
                        className="flex items-center gap-2 text-slate-400 hover:text-blue-500 transition"
                      >
                        <MessageCircle className="w-5 h-5" />
                        <span className="text-sm">{post.comment_count}</span>
                      </button>

                      <button
                        onClick={() => handleShare(post.id)}
                        className="flex items-center gap-2 text-slate-400 hover:text-green-500 transition"
                      >
                        <Share2 className="w-5 h-5" />
                        <span className="text-sm">Share</span>
                      </button>
                    </div>

                    {/* Comments Section */}
                    {showComments[post.id] && (
                      <div className="mt-4 pt-4 border-t border-slate-800">
                        {/* Comment Input */}
                        <div className="flex gap-3 mb-4">
                          <input
                            type="text"
                            value={commentInputs[post.id] || ''}
                            onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                            onKeyPress={(e) => e.key === 'Enter' && handleComment(post.id)}
                            placeholder="Write a comment..."
                            className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                          <button
                            onClick={() => handleComment(post.id)}
                            className="p-2 bg-purple-600 rounded-lg hover:bg-purple-700 transition"
                          >
                            <Send className="w-5 h-5" />
                          </button>
                        </div>

                        {/* Comments List */}
                        <div className="space-y-4">
                          {post.comments?.map((comment) => {
                            const commentProfilePic = getCommentProfilePic(comment.author)
                            return (
                              <div key={comment.id} className="space-y-2">
                                {/* Main Comment */}
                                <div className="flex gap-3">
                                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                                    {commentProfilePic ? (
                                      <img src={commentProfilePic} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      <span className="text-xs text-white font-bold">
                                        {comment.author.username.charAt(0).toUpperCase()}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex-1">
                                    <div className="bg-slate-800 rounded-lg p-3 relative">
                                      <div className="flex items-center justify-between">
                                        <p className="text-sm font-semibold text-white">
                                          {comment.author.username}
                                        </p>

                                        {/* 3-dot menu for comment owner */}
                                        {isCommentAuthor(comment) && (
                                          <div className="relative">
                                            <button
                                              onClick={() => setShowCommentMenu({ ...showCommentMenu, [comment.id]: !showCommentMenu[comment.id] })}
                                              className="p-1 rounded hover:bg-slate-700 transition"
                                            >
                                              <MoreVertical className="w-4 h-4 text-slate-400" />
                                            </button>

                                            {showCommentMenu[comment.id] && (
                                              <div className="absolute right-0 mt-1 w-28 bg-slate-700 border border-slate-600 rounded-lg shadow-xl z-50">
                                                <button
                                                  onClick={() => handleEditComment(comment)}
                                                  className="w-full px-3 py-1.5 text-left text-xs text-slate-300 hover:bg-slate-600 flex items-center gap-2 rounded-t-lg"
                                                >
                                                  <Edit3 className="w-3 h-3" />
                                                  Edit
                                                </button>
                                                <button
                                                  onClick={() => handleDeleteComment(post.id, comment.id)}
                                                  className="w-full px-3 py-1.5 text-left text-xs text-red-400 hover:bg-slate-600 flex items-center gap-2 rounded-b-lg"
                                                >
                                                  <Trash2 className="w-3 h-3" />
                                                  Delete
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>

                                      {/* Comment Content - Edit Mode or Display */}
                                      {editingCommentId === comment.id ? (
                                        <div className="mt-2">
                                          <input
                                            type="text"
                                            value={editedCommentContent}
                                            onChange={(e) => setEditedCommentContent(e.target.value)}
                                            className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded text-sm text-white focus:ring-1 focus:ring-purple-500 focus:outline-none"
                                            onKeyPress={(e) => e.key === 'Enter' && handleSaveCommentEdit(post.id, comment.id)}
                                          />
                                          <div className="flex gap-2 mt-2">
                                            <button
                                              onClick={() => handleSaveCommentEdit(post.id, comment.id)}
                                              className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded flex items-center gap-1"
                                            >
                                              <Check className="w-3 h-3" />
                                              Save
                                            </button>
                                            <button
                                              onClick={handleCancelCommentEdit}
                                              className="px-2 py-1 bg-slate-600 hover:bg-slate-500 text-white text-xs rounded flex items-center gap-1"
                                            >
                                              <X className="w-3 h-3" />
                                              Cancel
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <p className="text-sm text-slate-300 mt-1">{comment.content}</p>
                                      )}
                                    </div>

                                    {/* Comment Actions */}
                                    <div className="flex items-center gap-4 mt-2 ml-1">
                                      <span className="text-xs text-slate-500">
                                        {new Date(comment.created_at).toLocaleDateString()}
                                      </span>

                                      <button
                                        onClick={() => handleLikeComment(post.id, comment.id)}
                                        className={`flex items-center gap-1 text-xs ${comment.is_liked ? 'text-pink-500' : 'text-slate-400 hover:text-pink-500'
                                          } transition`}
                                      >
                                        <Heart className={`w-3.5 h-3.5 ${comment.is_liked ? 'fill-current' : ''}`} />
                                        <span>{comment.like_count || 0}</span>
                                      </button>

                                      <button
                                        onClick={() => toggleReplyInput(comment.id)}
                                        className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-400 transition"
                                      >
                                        <Reply className="w-3.5 h-3.5" />
                                        <span>Reply</span>
                                      </button>

                                      {comment.replies && comment.replies.length > 0 && (
                                        <button
                                          onClick={() => toggleReplies(comment.id)}
                                          className="flex items-center gap-1 text-xs text-slate-400 hover:text-purple-400 transition"
                                        >
                                          {showReplies[comment.id] ? (
                                            <ChevronUp className="w-3.5 h-3.5" />
                                          ) : (
                                            <ChevronDown className="w-3.5 h-3.5" />
                                          )}
                                          <span>{comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}</span>
                                        </button>
                                      )}
                                    </div>

                                    {/* Reply Input */}
                                    {showReplyInput[comment.id] && (
                                      <div className="flex gap-2 mt-3 ml-1">
                                        <input
                                          type="text"
                                          value={replyInputs[comment.id] || ''}
                                          onChange={(e) => setReplyInputs({ ...replyInputs, [comment.id]: e.target.value })}
                                          onKeyPress={(e) => e.key === 'Enter' && handleReply(post.id, comment.id)}
                                          placeholder="Write a reply..."
                                          className="flex-1 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500"
                                        />
                                        <button
                                          onClick={() => handleReply(post.id, comment.id)}
                                          className="p-1.5 bg-purple-600 rounded-lg hover:bg-purple-700 transition"
                                        >
                                          <Send className="w-4 h-4" />
                                        </button>
                                      </div>
                                    )}

                                    {/* Replies */}
                                    {showReplies[comment.id] && comment.replies && comment.replies.length > 0 && (
                                      <div className="mt-3 ml-4 space-y-3 border-l-2 border-slate-700 pl-4">
                                        {comment.replies.map((reply) => {
                                          const replyProfilePic = getCommentProfilePic(reply.author)
                                          return (
                                            <div key={reply.id} className="space-y-2">
                                              <div className="flex gap-2">
                                                <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                                                  {replyProfilePic ? (
                                                    <img src={replyProfilePic} alt="" className="w-full h-full object-cover" />
                                                  ) : (
                                                    <span className="text-[10px] text-white font-bold">
                                                      {reply.author.username.charAt(0).toUpperCase()}
                                                    </span>
                                                  )}
                                                </div>
                                                <div className="flex-1">
                                                  <div className="bg-slate-800/50 rounded-lg p-2 relative">
                                                    <div className="flex items-center justify-between">
                                                      <p className="text-xs font-semibold text-white">
                                                        {reply.author.username}
                                                      </p>

                                                      {/* 3-dot menu for reply owner */}
                                                      {isCommentAuthor(reply) && (
                                                        <div className="relative">
                                                          <button
                                                            onClick={() => setShowCommentMenu({ ...showCommentMenu, [reply.id]: !showCommentMenu[reply.id] })}
                                                            className="p-0.5 rounded hover:bg-slate-700 transition"
                                                          >
                                                            <MoreVertical className="w-3 h-3 text-slate-400" />
                                                          </button>

                                                          {showCommentMenu[reply.id] && (
                                                            <div className="absolute right-0 mt-1 w-24 bg-slate-700 border border-slate-600 rounded-lg shadow-xl z-50">
                                                              <button
                                                                onClick={() => handleEditComment(reply)}
                                                                className="w-full px-2 py-1 text-left text-[10px] text-slate-300 hover:bg-slate-600 flex items-center gap-1 rounded-t-lg"
                                                              >
                                                                <Edit3 className="w-3 h-3" />
                                                                Edit
                                                              </button>
                                                              <button
                                                                onClick={() => handleDeleteComment(post.id, reply.id)}
                                                                className="w-full px-2 py-1 text-left text-[10px] text-red-400 hover:bg-slate-600 flex items-center gap-1 rounded-b-lg"
                                                              >
                                                                <Trash2 className="w-3 h-3" />
                                                                Delete
                                                              </button>
                                                            </div>
                                                          )}
                                                        </div>
                                                      )}
                                                    </div>

                                                    {/* Reply Content - Edit Mode or Display */}
                                                    {editingCommentId === reply.id ? (
                                                      <div className="mt-1">
                                                        <input
                                                          type="text"
                                                          value={editedCommentContent}
                                                          onChange={(e) => setEditedCommentContent(e.target.value)}
                                                          className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-xs text-white focus:ring-1 focus:ring-purple-500 focus:outline-none"
                                                          onKeyPress={(e) => e.key === 'Enter' && handleSaveCommentEdit(post.id, reply.id)}
                                                        />
                                                        <div className="flex gap-1 mt-1">
                                                          <button
                                                            onClick={() => handleSaveCommentEdit(post.id, reply.id)}
                                                            className="px-1.5 py-0.5 bg-purple-600 hover:bg-purple-700 text-white text-[10px] rounded flex items-center gap-1"
                                                          >
                                                            <Check className="w-2.5 h-2.5" />
                                                            Save
                                                          </button>
                                                          <button
                                                            onClick={handleCancelCommentEdit}
                                                            className="px-1.5 py-0.5 bg-slate-600 hover:bg-slate-500 text-white text-[10px] rounded flex items-center gap-1"
                                                          >
                                                            <X className="w-2.5 h-2.5" />
                                                            Cancel
                                                          </button>
                                                        </div>
                                                      </div>
                                                    ) : (
                                                      <p className="text-xs text-slate-300 mt-0.5">
                                                        {reply.content.split(/(@\w+)/g).map((part, i) =>
                                                          part.startsWith('@') ? (
                                                            <span key={i} className="text-blue-400 font-medium">{part}</span>
                                                          ) : (
                                                            <span key={i}>{part}</span>
                                                          )
                                                        )}
                                                      </p>
                                                    )}
                                                  </div>
                                                  <div className="flex items-center gap-3 mt-1 ml-1">
                                                    <span className="text-[10px] text-slate-500">
                                                      {new Date(reply.created_at).toLocaleDateString()}
                                                    </span>
                                                    <button
                                                      onClick={() => handleLikeComment(post.id, reply.id, true, comment.id)}
                                                      className={`flex items-center gap-1 text-[10px] ${reply.is_liked ? 'text-pink-500' : 'text-slate-400 hover:text-pink-500'
                                                        } transition`}
                                                    >
                                                      <Heart className={`w-3 h-3 ${reply.is_liked ? 'fill-current' : ''}`} />
                                                      <span>{reply.like_count || 0}</span>
                                                    </button>
                                                    <button
                                                      onClick={() => toggleReplyInput(reply.id)}
                                                      className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-blue-400 transition"
                                                    >
                                                      <Reply className="w-3 h-3" />
                                                      <span>Reply</span>
                                                    </button>
                                                  </div>

                                                  {/* Reply to Reply Input */}
                                                  {showReplyInput[reply.id] && (
                                                    <div className="flex gap-2 mt-2">
                                                      <input
                                                        type="text"
                                                        value={replyInputs[reply.id] || ''}
                                                        onChange={(e) => setReplyInputs({ ...replyInputs, [reply.id]: e.target.value })}
                                                        onKeyPress={(e) => e.key === 'Enter' && handleReplyToReply(post.id, comment.id, reply.author.username, reply.id)}
                                                        placeholder={`Reply to ${reply.author.username}...`}
                                                        className="flex-1 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500"
                                                      />
                                                      <button
                                                        onClick={() => handleReplyToReply(post.id, comment.id, reply.author.username, reply.id)}
                                                        className="p-1 bg-purple-600 rounded hover:bg-purple-700 transition"
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

                          {(!post.comments || post.comments.length === 0) && (
                            <p className="text-sm text-slate-500 text-center py-4">No comments yet. Be the first to comment!</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* Groups Tab */}
        {activeTab === 'groups' && (
          <div className="space-y-6">
            {/* Pending Invitations */}
            {orgInvitations.length > 0 && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-yellow-400 mb-3 flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  Pending Invitations ({orgInvitations.length})
                </h3>
                <div className="space-y-3">
                  {orgInvitations.map(inv => (
                    <div key={inv.id} className="flex items-center justify-between bg-slate-800/50 rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{inv.organization.icon}</span>
                        <div>
                          <p className="text-white font-medium">{inv.organization.name}</p>
                          <p className="text-slate-400 text-sm">Invited by {inv.inviter.username}</p>
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
                    <div key={org.id} className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-3 sm:p-4 hover:border-purple-500/50 transition cursor-pointer shadow-lg" onClick={() => setViewingGroup(org)}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{org.icon}</span>
                          <div>
                            <h4 className="text-white font-semibold flex items-center gap-2">
                              {org.name}
                              {org.is_official && <Crown className="w-3 h-3 text-yellow-400" />}
                              {org.is_private && <Lock className="w-3 h-3 text-slate-400" />}
                            </h4>
                            <p className="text-slate-400 text-sm">{org.member_count} members · {org.post_count} posts</p>
                          </div>
                        </div>
                        {org.user_role && ['admin', 'owner'].includes(org.user_role) && (
                          <span className="text-xs text-purple-400 flex items-center gap-1">
                            <Shield className="w-3 h-3" />
                            {org.user_role}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-400 text-sm mt-2 line-clamp-2">{org.description}</p>
                      <div className="flex justify-between items-center mt-3" onClick={(e) => e.stopPropagation()}>
                        {/* Admin Controls */}
                        {org.user_role && ['admin', 'owner', 'moderator'].includes(org.user_role) && (
                          <button
                            onClick={() => setSelectedOrg(selectedOrg?.id === org.id ? null : org)}
                            className="text-xs px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded transition flex items-center gap-1"
                          >
                            <Shield className="w-3 h-3" />
                            Manage
                          </button>
                        )}
                        <button
                          onClick={() => handleLeaveOrg(org)}
                          className="text-xs px-3 py-1 bg-slate-700 hover:bg-red-600 text-slate-300 hover:text-white rounded transition ml-auto"
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
                <Building2 className="w-5 h-5 text-blue-400" />
                Discover Groups
              </h3>

              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search groups..."
                  value={orgSearchQuery}
                  onChange={(e) => setOrgSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredOrgs.filter(org => !org.is_member).map(org => (
                  <div key={org.id} className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4 hover:border-purple-500/30 transition cursor-pointer" onClick={() => !org.is_private && setViewingGroup(org)}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{org.icon}</span>
                        <div>
                          <h4 className="text-white font-semibold flex items-center gap-2">
                            {org.name}
                            {org.is_official && <Crown className="w-3 h-3 text-yellow-400" />}
                            {org.is_private && <Lock className="w-3 h-3 text-slate-400" />}
                          </h4>
                          <p className="text-slate-400 text-sm">{org.member_count} members · {org.post_count} posts</p>
                        </div>
                      </div>
                    </div>
                    <p className="text-slate-400 text-sm mt-2 line-clamp-2">{org.description}</p>
                    <div className="flex justify-end mt-3" onClick={(e) => e.stopPropagation()}>
                      {org.membership_status === 'pending' ? (
                        <span className="text-xs px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Pending
                        </span>
                      ) : (
                        <button
                          onClick={() => handleJoinOrg(org)}
                          className="text-xs px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded transition flex items-center gap-1"
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
                <div className="text-center py-8 text-slate-400">
                  <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No groups found. Check back later!</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Community Chat */}
      <CommunityChat />

      {/* Search Coder Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
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
                className="p-1 hover:bg-slate-800 rounded-lg transition"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-4 border-b border-slate-800">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchCoders(e.target.value)}
                  placeholder="Search by username, name, or email..."
                  className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  autoFocus
                />
              </div>
              {searchQuery.length > 0 && searchQuery.length < 2 && (
                <p className="text-slate-500 text-sm mt-2">Type at least 2 characters to search</p>
              )}
            </div>

            {/* Search Results */}
            <div className="overflow-y-auto max-h-96 p-4">
              {searchLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
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
                      className="flex items-center gap-3 p-3 bg-slate-800/50 hover:bg-slate-800 rounded-xl transition"
                    >
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center overflow-hidden">
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
                        <span className="text-xs px-2 py-1 bg-slate-700 text-slate-300 rounded-full">
                          {coder.role || 'Student'}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : searchQuery.length >= 2 ? (
                <div className="text-center py-8 text-slate-400">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No coders found for "{searchQuery}"</p>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
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
    </div>
  )
}
