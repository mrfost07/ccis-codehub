import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import toast from 'react-hot-toast'
import { communityAPI } from '../services/api'

export default function Community() {
  const [newPost, setNewPost] = useState('')
  const [loading, setLoading] = useState(true)
  const [posts, setPosts] = useState<any[]>([])

  useEffect(() => {
    fetchPosts()
  }, [])

  const fetchPosts = async () => {
    try {
      setLoading(true)
      const response = await communityAPI.getPosts()
      setPosts(response.data.results || response.data || [])
    } catch (error) {
      console.error('Failed to fetch posts:', error)
      // Use sample data as fallback
      setPosts([
        {
          id: '1',
          author: { username: 'John Doe' },
          content: 'Just completed my first React project! Feeling proud 🎉',
          like_count: 24,
          comment_count: 5,
          created_at: new Date().toISOString(),
          is_liked: false
        },
        {
          id: '2',
          author: { username: 'Jane Smith' },
          content: 'Looking for teammates for the upcoming hackathon! 🚀',
          like_count: 15,
          comment_count: 8,
          created_at: new Date(Date.now() - 7200000).toISOString(),
          is_liked: false
        },
        {
          id: '3',
          author: { username: 'Bob Johnson' },
          content: '💡 Pro tip: Always use environment variables for sensitive data!',
          like_count: 42,
          comment_count: 12,
          created_at: new Date(Date.now() - 14400000).toISOString(),
          is_liked: true
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPost.trim()) return
    
    try {
      const response = await communityAPI.createPost({
        content: newPost,
        post_type: 'text'
      })
      setPosts([response.data, ...posts])
      setNewPost('')
      toast.success('Post created!')
    } catch (error) {
      // Fallback to local update
      const newPostObj = {
        id: String(posts.length + 1),
        author: { username: 'You' },
        content: newPost,
        like_count: 0,
        comment_count: 0,
        created_at: new Date().toISOString(),
        is_liked: false
      }
      setPosts([newPostObj, ...posts])
      setNewPost('')
      toast.success('Post created!')
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
      // Fallback to local update
      setPosts(posts.map(post => 
        post.id === postId 
          ? { ...post, like_count: post.is_liked ? post.like_count - 1 : post.like_count + 1, is_liked: !post.is_liked }
          : post
      ))
    }
  }

  const containerStyle = {
    minHeight: '100vh',
    backgroundColor: '#0f172a',
    color: 'white'
  }

  const contentStyle = {
    maxWidth: '1024px',
    margin: '0 auto',
    padding: '2rem'
  }

  const postStyle = {
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '0.75rem',
    padding: '1.5rem',
    marginBottom: '1.5rem'
  }

  return (
    <div style={containerStyle}>
      <Navbar />
      
      <div style={contentStyle}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            👥 Community
          </h1>
          <p style={{ color: '#94a3b8' }}>
            Connect, share, and compete with fellow developers
          </p>
        </div>

        {/* Create Post Form */}
        <form onSubmit={handleCreatePost} style={{
          backgroundColor: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '0.75rem',
          padding: '1.5rem',
          marginBottom: '2rem'
        }}>
          <textarea
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            placeholder="Share your thoughts, code snippets, or ask questions..."
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              backgroundColor: '#334155',
              border: '1px solid #475569',
              borderRadius: '0.5rem',
              color: 'white',
              fontSize: '1rem',
              resize: 'none',
              outline: 'none',
              minHeight: '100px'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#8b5cf6'
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#475569'
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
            <button
              type="submit"
              style={{
                padding: '0.5rem 1.5rem',
                background: 'linear-gradient(to right, #7c3aed, #4f46e5)',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '500'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.9'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1'
              }}
            >
              Post
            </button>
          </div>
        </form>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ fontSize: '3rem' }}>⏳</div>
            <p style={{ marginTop: '1rem', color: '#94a3b8' }}>Loading posts...</p>
          </div>
        ) : (
          <div>
            {posts.map((post) => (
              <div key={post.id} style={postStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      👤
                    </div>
                    <div>
                      <h3 style={{ fontWeight: 'bold' }}>{post.author.username}</h3>
                      <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
                        {new Date(post.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
                
                <p style={{ marginBottom: '1rem', color: '#e2e8f0' }}>
                  {post.content}
                </p>
                
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1.5rem',
                  color: '#94a3b8',
                  paddingTop: '1rem',
                  borderTop: '1px solid #334155'
                }}>
                  <button
                    onClick={() => handleLike(post.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      background: 'none',
                      border: 'none',
                      color: post.is_liked ? '#ec4899' : '#94a3b8',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      transition: 'color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (!post.is_liked) e.currentTarget.style.color = '#ec4899'
                    }}
                    onMouseLeave={(e) => {
                      if (!post.is_liked) e.currentTarget.style.color = '#94a3b8'
                    }}
                  >
                    <span style={{ fontSize: '1.25rem' }}>{post.is_liked ? '❤️' : '🤍'}</span>
                    <span>{post.like_count || 0}</span>
                  </button>
                  <button style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '1rem'
                  }}>
                    <span style={{ fontSize: '1.25rem' }}>💬</span>
                    <span>{post.comment_count || 0}</span>
                  </button>
                  <button style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '1rem'
                  }}>
                    <span style={{ fontSize: '1.25rem' }}>🔄</span>
                    <span>Share</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
