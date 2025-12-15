import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Upload, FileText, Check, Edit, ArrowLeft } from 'lucide-react'
import Navbar from '../components/Navbar'
import api from '../services/api'

interface ParsedContent {
  title: string
  description: string
  type: string
  difficulty: string
  duration: number
  content: string
}

export default function AdminModuleUpload() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const pathId = searchParams.get('path')

  const [step, setStep] = useState<'upload' | 'review' | 'complete'>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [parsedData, setParsedData] = useState<any>(null)
  const [editedContent, setEditedContent] = useState<ParsedContent | null>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (!file || !pathId) return

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('career_path_id', pathId)

    try {
      const response = await api.post('/admin/modules/upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      setParsedData(response.data)
      setEditedContent(response.data.parsed_content)
      setStep('review')
    } catch (error: any) {
      console.error('Upload failed:', error)
      alert(error.response?.data?.error || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleConfirm = async () => {
    if (!editedContent || !pathId) return

    try {
      await api.post('/admin/modules/confirm_upload/', {
        file_path: parsedData.file_path,
        career_path_id: pathId,
        content: editedContent
      })
      
      setStep('complete')
      setTimeout(() => {
        navigate(`/admin/paths/${pathId}`)
      }, 2000)
    } catch (error) {
      console.error('Confirmation failed:', error)
      alert('Failed to save module')
    }
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm sm:text-base text-slate-400 hover:text-white mb-4 sm:mb-6"
        >
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>

        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-6 sm:mb-8">
          Upload Module Content
        </h1>

        {/* Steps Indicator - Responsive */}
        <div className="flex items-center justify-between mb-8 sm:mb-12">
          <StepIndicator number={1} label="Upload" active={step === 'upload'} completed={step !== 'upload'} />
          <div className="flex-1 h-1 bg-slate-800 mx-2 sm:mx-4">
            <div className={`h-full bg-indigo-600 transition-all duration-500 ${step !== 'upload' ? 'w-full' : 'w-0'}`} />
          </div>
          <StepIndicator number={2} label="Review" active={step === 'review'} completed={step === 'complete'} />
          <div className="flex-1 h-1 bg-slate-800 mx-2 sm:mx-4">
            <div className={`h-full bg-indigo-600 transition-all duration-500 ${step === 'complete' ? 'w-full' : 'w-0'}`} />
          </div>
          <StepIndicator number={3} label="Complete" active={step === 'complete'} completed={false} />
        </div>

        {/* Step 1: Upload - Responsive */}
        {step === 'upload' && (
          <div className="bg-slate-900 rounded-lg sm:rounded-xl p-6 sm:p-8 border border-slate-800">
            <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Upload File</h2>
            <p className="text-sm sm:text-base text-slate-400 mb-6 sm:mb-8">
              Supported formats: DOCX, PDF, PPTX, Markdown
            </p>

            <div className="border-2 border-dashed border-slate-700 rounded-lg p-8 sm:p-12 text-center">
              <Upload className="w-12 h-12 sm:w-16 sm:h-16 text-slate-500 mx-auto mb-4" />
              
              {!file ? (
                <>
                  <p className="text-base sm:text-lg text-slate-400 mb-4">
                    Drag and drop your file here, or click to browse
                  </p>
                  <input
                    type="file"
                    accept=".docx,.pdf,.pptx,.md"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="inline-block px-6 py-3 text-sm sm:text-base bg-indigo-600 rounded-lg hover:bg-indigo-700 transition cursor-pointer"
                  >
                    Choose File
                  </label>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-3 text-base sm:text-lg">
                    <FileText className="text-indigo-500" size={24} />
                    <span className="font-medium truncate max-w-xs">{file.name}</span>
                  </div>
                  <p className="text-sm text-slate-400">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                      onClick={() => setFile(null)}
                      className="px-6 py-3 text-sm sm:text-base bg-slate-700 rounded-lg hover:bg-slate-600 transition"
                    >
                      Choose Different File
                    </button>
                    <button
                      onClick={handleUpload}
                      disabled={uploading}
                      className="px-6 py-3 text-sm sm:text-base bg-indigo-600 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 active:scale-95"
                    >
                      {uploading ? 'Uploading...' : 'Upload & Parse'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 sm:mt-8 space-y-2 text-xs sm:text-sm text-slate-400">
              <p>📄 The system will automatically:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Extract text and structure from your file</li>
                <li>Identify headings and create slides</li>
                <li>Generate a preview for your review</li>
                <li>Allow you to edit before saving</li>
              </ul>
            </div>
          </div>
        )}

        {/* Step 2: Review - Responsive */}
        {step === 'review' && editedContent && (
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-slate-900 rounded-lg sm:rounded-xl p-4 sm:p-6 border border-slate-800">
              <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Review & Edit</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Title</label>
                  <input
                    type="text"
                    value={editedContent.title}
                    onChange={(e) => setEditedContent({ ...editedContent, title: e.target.value })}
                    className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    value={editedContent.description}
                    onChange={(e) => setEditedContent({ ...editedContent, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Type</label>
                    <select
                      value={editedContent.type}
                      onChange={(e) => setEditedContent({ ...editedContent, type: e.target.value })}
                      className="w-full px-3 py-2 text-sm sm:text-base bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-indigo-500"
                    >
                      <option value="reading">Reading</option>
                      <option value="video">Video</option>
                      <option value="exercise">Exercise</option>
                      <option value="quiz">Quiz</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Difficulty</label>
                    <select
                      value={editedContent.difficulty}
                      onChange={(e) => setEditedContent({ ...editedContent, difficulty: e.target.value })}
                      className="w-full px-3 py-2 text-sm sm:text-base bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-indigo-500"
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Duration (min)</label>
                    <input
                      type="number"
                      value={editedContent.duration}
                      onChange={(e) => setEditedContent({ ...editedContent, duration: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 text-sm sm:text-base bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="bg-slate-900 rounded-lg sm:rounded-xl p-4 sm:p-6 border border-slate-800">
              <h3 className="text-lg sm:text-xl font-bold mb-4">Preview</h3>
              <div 
                className="prose prose-invert prose-sm sm:prose-base max-w-none"
                dangerouslySetInnerHTML={{ __html: parsedData.preview }}
              />
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-end">
              <button
                onClick={() => setStep('upload')}
                className="px-6 py-3 text-sm sm:text-base bg-slate-700 rounded-lg hover:bg-slate-600 transition"
              >
                Back to Upload
              </button>
              <button
                onClick={handleConfirm}
                className="px-6 py-3 text-sm sm:text-base bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg hover:from-blue-700 hover:to-purple-700 transition flex items-center justify-center gap-2 active:scale-95"
              >
                <Check size={20} />
                <span>Confirm & Save</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Complete */}
        {step === 'complete' && (
          <div className="bg-slate-900 rounded-lg sm:rounded-xl p-8 sm:p-12 border border-slate-800 text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">Module Created!</h2>
            <p className="text-base sm:text-lg text-slate-400 mb-6">
              Your module has been successfully created and added to the path.
            </p>
            <p className="text-sm text-slate-500">Redirecting...</p>
          </div>
        )}
      </div>
    </div>
  )
}

function StepIndicator({ number, label, active, completed }: any) {
  return (
    <div className="flex flex-col items-center">
      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-sm sm:text-base font-bold transition-colors ${
        completed ? 'bg-green-600' : active ? 'bg-indigo-600' : 'bg-slate-700'
      }`}>
        {completed ? <Check size={20} /> : number}
      </div>
      <span className="text-xs sm:text-sm mt-2 hidden sm:block">{label}</span>
    </div>
  )
}
