import { useEffect, useRef } from 'react'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  height?: string
}

export default function RichTextEditor({ value, onChange, placeholder, height = '300px' }: RichTextEditorProps) {
  const quillRef = useRef<ReactQuill>(null)
  
  // Debug: Log when value changes
  useEffect(() => {
    console.log('RichTextEditor value updated:', {
      length: value?.length,
      preview: value?.substring(0, 50)
    })
  }, [value])

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }, { 'list': 'check' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'align': [] }],
      ['blockquote', 'code-block'],
      ['link', 'image', 'video'],
      ['clean']
    ],
    clipboard: {
      matchVisual: false
    }
  }

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet', 'check',
    'indent',
    'color', 'background',
    'align',
    'blockquote', 'code-block',
    'link', 'image', 'video'
  ]

  return (
    <div className="rich-text-editor">
      <style>{`
        .rich-text-editor .quill {
          background: #1e293b;
          border-radius: 8px;
          overflow: hidden;
        }
        .rich-text-editor .ql-toolbar {
          background: #0f172a;
          border: 1px solid #334155 !important;
          border-radius: 8px 8px 0 0;
          padding: 12px;
        }
        .rich-text-editor .ql-container {
          border: 1px solid #334155 !important;
          border-top: none !important;
          border-radius: 0 0 8px 8px;
          height: ${height};
          font-size: 16px;
        }
        .rich-text-editor .ql-editor {
          color: #e2e8f0;
          min-height: ${height};
        }
        .rich-text-editor .ql-editor.ql-blank::before {
          color: #64748b;
          font-style: normal;
        }
        .rich-text-editor .ql-toolbar button {
          color: #94a3b8;
        }
        .rich-text-editor .ql-toolbar button:hover {
          color: #3b82f6;
        }
        .rich-text-editor .ql-toolbar button.ql-active {
          color: #3b82f6;
        }
        .rich-text-editor .ql-stroke {
          stroke: #94a3b8;
        }
        .rich-text-editor .ql-toolbar button:hover .ql-stroke {
          stroke: #3b82f6;
        }
        .rich-text-editor .ql-toolbar button.ql-active .ql-stroke {
          stroke: #3b82f6;
        }
        .rich-text-editor .ql-fill {
          fill: #94a3b8;
        }
        .rich-text-editor .ql-toolbar button:hover .ql-fill {
          fill: #3b82f6;
        }
        .rich-text-editor .ql-toolbar button.ql-active .ql-fill {
          fill: #3b82f6;
        }
        .rich-text-editor .ql-picker-label {
          color: #94a3b8;
        }
        .rich-text-editor .ql-picker-label:hover {
          color: #3b82f6;
        }
        .rich-text-editor .ql-picker-options {
          background: #1e293b;
          border: 1px solid #334155;
        }
        .rich-text-editor .ql-picker-item {
          color: #e2e8f0;
        }
        .rich-text-editor .ql-picker-item:hover {
          color: #3b82f6;
        }
      `}</style>
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder || 'Start writing your content...'}
      />
    </div>
  )
}
