/**
 * Delete User Modal
 * 
 * Confirmation modal for deleting a user
 */

import { Trash2 } from 'lucide-react'
import type { DeleteModalState } from './types'

interface DeleteUserModalProps {
    deleteModal: DeleteModalState
    isDeleting: boolean
    onClose: () => void
    onConfirm: () => void
}

export default function DeleteUserModal({
    deleteModal,
    isDeleting,
    onClose,
    onConfirm
}: DeleteUserModalProps) {
    if (!deleteModal.isOpen) return null

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <div
                className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Icon & Title - Centered */}
                <div className="pt-8 pb-4 px-6 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-red-500/10 rounded-full flex items-center justify-center">
                        <Trash2 className="w-8 h-8 text-red-500" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-1">Delete User?</h3>
                    <p className="text-slate-400 text-sm">
                        This will permanently remove <span className="text-white font-medium">{deleteModal.username}</span>
                    </p>
                </div>

                {/* Buttons */}
                <div className="p-4 bg-slate-800/50 flex gap-3">
                    <button
                        onClick={onClose}
                        disabled={isDeleting}
                        className="flex-1 px-4 py-3 bg-slate-700/50 hover:bg-slate-700 disabled:opacity-50 text-slate-300 hover:text-white rounded-xl transition-all font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-500 disabled:bg-red-800 text-white rounded-xl transition-all font-medium flex items-center justify-center gap-2"
                    >
                        {isDeleting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Deleting...</span>
                            </>
                        ) : (
                            <span>Delete</span>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
