/**
 * Edit Path Modal
 * 
 * Modal for editing an existing career path
 */

import { X } from 'lucide-react'
import type { PathForm, CareerPath } from './types'

interface EditPathModalProps {
    isOpen: boolean
    editingPath: CareerPath | null
    pathForm: PathForm
    certificateFile: File | null
    onFormChange: (updates: Partial<PathForm>) => void
    onCertificateChange: (file: File | null) => void
    onSubmit: () => void
    onClose: () => void
}

export default function EditPathModal({
    isOpen,
    editingPath,
    pathForm,
    certificateFile,
    onFormChange,
    onCertificateChange,
    onSubmit,
    onClose
}: EditPathModalProps) {
    if (!isOpen || !editingPath) return null

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white">Edit Career Path</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Path Name</label>
                        <input
                            type="text"
                            value={pathForm.name}
                            onChange={(e) => onFormChange({ name: e.target.value })}
                            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                        <textarea
                            value={pathForm.description}
                            onChange={(e) => onFormChange({ description: e.target.value })}
                            rows={4}
                            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Program Type</label>
                            <select
                                value={pathForm.program_type}
                                onChange={(e) => onFormChange({ program_type: e.target.value })}
                                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                            >
                                <option value="bsit">BSIT</option>
                                <option value="bscs">BSCS</option>
                                <option value="general">General</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Difficulty Level</label>
                            <select
                                value={pathForm.difficulty_level}
                                onChange={(e) => onFormChange({ difficulty_level: e.target.value })}
                                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                            >
                                <option value="beginner">Beginner</option>
                                <option value="intermediate">Intermediate</option>
                                <option value="advanced">Advanced</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Duration (weeks)</label>
                            <input
                                type="number"
                                value={pathForm.estimated_duration}
                                onChange={(e) => onFormChange({ estimated_duration: parseInt(e.target.value) })}
                                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                                min="1"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Max Modules</label>
                            <input
                                type="number"
                                value={pathForm.max_modules}
                                onChange={(e) => onFormChange({ max_modules: parseInt(e.target.value) || 0 })}
                                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                                min="0"
                                placeholder="0 = unlimited"
                            />
                            <p className="text-xs text-slate-400 mt-1">0 = unlimited</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Points Reward</label>
                            <input
                                type="number"
                                value={pathForm.points_reward}
                                onChange={(e) => onFormChange({ points_reward: parseInt(e.target.value) })}
                                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                                min="1"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Certificate Template
                            <span className="text-xs text-slate-400 ml-2">- Awarded when all modules completed</span>
                        </label>
                        <input
                            type="file"
                            onChange={(e) => onCertificateChange(e.target.files?.[0] || null)}
                            accept=".pdf,.png,.jpg,.jpeg"
                            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                        />
                        {editingPath?.certificate_template && (
                            <p className="text-xs text-green-400 mt-1">Current: {editingPath.certificate_template.split('/').pop()}</p>
                        )}
                        {certificateFile && (
                            <p className="text-xs text-blue-400 mt-1">New file: {certificateFile.name}</p>
                        )}
                    </div>

                    <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 text-slate-300">
                            <input
                                type="checkbox"
                                checked={pathForm.is_active}
                                onChange={(e) => onFormChange({ is_active: e.target.checked })}
                                className="rounded bg-slate-700 border-slate-600 text-purple-600"
                            />
                            Active
                        </label>

                        <label className="flex items-center gap-2 text-slate-300">
                            <input
                                type="checkbox"
                                checked={pathForm.is_featured}
                                onChange={(e) => onFormChange({ is_featured: e.target.checked })}
                                className="rounded bg-slate-700 border-slate-600 text-purple-600"
                            />
                            Featured
                        </label>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="submit"
                            className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium"
                        >
                            Update Path
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
