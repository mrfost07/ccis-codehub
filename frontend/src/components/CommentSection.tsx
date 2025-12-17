import { useState } from 'react'
import { Heart, MessageCircle, Send, ChevronDown, ChevronUp } from 'lucide-react'
import { communityAPI } from '../services/api'
import toast from 'react-hot-toast'
import { getMediaUrl } from '../utils/mediaUrl'

interface Author {
  username: string
  profile_picture?: string
}

interface Comment {
  id: string
  author: Author
  content: string
  created_at: string
  like_count: number
  is_liked: boolean
  replies?: Comment[]
  parent?: string
}

interface CommentSectionProps {
  postId: string
  comments: Comment[]
  onCommentAdded: (comment: Comment) => void
  onCommentLiked: (commentId: string, liked: boolean, likeCount: number) => void
}

export default function CommentSection({
  postId,
  comments,
  onCommentAdded,
  onCommentLiked
}: CommentSectionProps) {
  const [commentText, setCommentText] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentText.trim()) return

    setLoading(true)
    try {
      const response = await communityAPI.createComment({
        post: postId,
        content: commentText.trim()
      })

      onCommentAdded(response.data)
      setCommentText('')
      toast.success('Comment posted!')
    } catch (error) {
      toast.error('Failed to post comment')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitReply = async (parentId: string) => {
    if (!replyText.trim()) return

    setLoading(true)
    try {
      const response = await communityAPI.createComment({
        post: postId,
        content: replyText.trim(),
        parent: parentId
      })

      onCommentAdded(response.data)
      setReplyText('')
      setReplyingTo(null)
      toast.success('Reply posted!')
    } catch (error) {
      toast.error('Failed to post reply')
    } finally {
      setLoading(false)
    }
  }

  const handleLikeComment = async (commentId: string) => {
    try {
      const response = await communityAPI.likeComment(commentId)
      onCommentLiked(commentId, response.data.liked, response.data.like_count)
    } catch (error) {
      toast.error('Failed to like comment')
    }
  }

  const toggleReplies = (commentId: string) => {
    const newExpanded = new Set(expandedReplies)
    if (newExpanded.has(commentId)) {
      newExpanded.delete(commentId)
    } else {
      newExpanded.add(commentId)
    }
    setExpandedReplies(newExpanded)
  }

  const renderComment = (comment: Comment, isReply = false) => {
    const hasReplies = comment.replies && comment.replies.length > 0
    const isExpanded = expandedReplies.has(comment.id)

    return (
      <div key={comment.id} className={`${isReply ? 'ml-12' : ''} mb-4`}>
        <div className="flex gap-3">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {comment.author.profile_picture ? (
              <img
                src={getMediaUrl(comment.author.profile_picture) || ''}
                alt={comment.author.username}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-semibold">
                  {comment.author.username.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* Comment Content */}
          <div className="flex-1">
            <div className="bg-slate-800 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-white">
                  {comment.author.username}
                </span>
                <span className="text-xs text-slate-500">
                  {new Date(comment.created_at).toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-slate-300">{comment.content}</p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4 mt-2">
              <button
                onClick={() => handleLikeComment(comment.id)}
                className={`flex items-center gap-1 text-xs ${comment.is_liked ? 'text-pink-500' : 'text-slate-400 hover:text-pink-500'
                  } transition`}
              >
                <Heart className={`w-3 h-3 ${comment.is_liked ? 'fill-current' : ''}`} />
                <span>{comment.like_count}</span>
              </button>

              <button
                onClick={() => setReplyingTo(comment.id)}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-500 transition"
              >
                <MessageCircle className="w-3 h-3" />
                <span>Reply</span>
              </button>

              {hasReplies && (
                <button
                  onClick={() => toggleReplies(comment.id)}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-purple-500 transition"
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="w-3 h-3" />
                      <span>Hide {comment.replies!.length} replies</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3 h-3" />
                      <span>Show {comment.replies!.length} replies</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Reply Input */}
            {replyingTo === comment.id && (
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSubmitReply(comment.id)
                    }
                  }}
                  placeholder={`Reply to ${comment.author.username}...`}
                  className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  autoFocus
                />
                <button
                  onClick={() => handleSubmitReply(comment.id)}
                  disabled={loading || !replyText.trim()}
                  className="p-2 bg-purple-600 rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
                >
                  <Send className="w-4 h-4 text-white" />
                </button>
                <button
                  onClick={() => {
                    setReplyingTo(null)
                    setReplyText('')
                  }}
                  className="p-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            )}

            {/* Nested Replies */}
            {hasReplies && isExpanded && (
              <div className="mt-3">
                {comment.replies!.map(reply => renderComment(reply, true))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Comment Input */}
      <form onSubmit={handleSubmitComment} className="flex gap-3">
        <input
          type="text"
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="Write a comment..."
          className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <button
          type="submit"
          disabled={loading || !commentText.trim()}
          className="px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 transition disabled:opacity-50 flex items-center gap-2"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">Comment</span>
        </button>
      </form>

      {/* Comments List */}
      <div className="space-y-3">
        {comments.filter(c => !c.parent).map(comment => renderComment(comment))}
      </div>
    </div>
  )
}

// Add missing import
import { X } from 'lucide-react'
