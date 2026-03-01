import React from 'react';
import { AlertTriangle, Shield, X } from 'lucide-react';

interface ViolationWarningModalProps {
    isOpen: boolean;
    onClose: () => void;
    violationType: 'fullscreen_exit' | 'tab_switch' | 'copy_paste';
    totalViolations: number;
    maxViolations: number;
    penaltyPoints: number;
    isFlagged: boolean;
}

const ViolationWarningModal: React.FC<ViolationWarningModalProps> = ({
    isOpen,
    onClose,
    violationType,
    totalViolations,
    maxViolations,
    penaltyPoints,
    isFlagged
}) => {
    if (!isOpen) return null;

    const getViolationMessage = () => {
        switch (violationType) {
            case 'fullscreen_exit':
                return 'You exited fullscreen mode.';
            case 'tab_switch':
                return 'You switched to another tab or window.';
            case 'copy_paste':
                return 'Copy/paste attempt detected.';
            default:
                return 'A violation was detected.';
        }
    };

    const isNearLimit = maxViolations > 0 && totalViolations >= maxViolations - 1;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in">
            <div className="bg-slate-900 border border-red-500/30 rounded-2xl w-full max-w-md mx-4 shadow-2xl shadow-red-900/20 overflow-hidden">
                {/* Red gradient header */}
                <div className="bg-gradient-to-r from-red-600 to-red-800 px-6 py-4 flex items-center gap-3">
                    <AlertTriangle className="w-6 h-6 text-white" />
                    <h3 className="text-lg font-bold text-white">
                        {isFlagged ? 'Account Flagged' : 'Warning'}
                    </h3>
                </div>

                <div className="p-6 space-y-4">
                    {/* Violation Message */}
                    <p className="text-white text-center">{getViolationMessage()}</p>

                    {/* Violation Counter */}
                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <Shield className="w-5 h-5 text-red-400" />
                            <span className="text-sm text-slate-400">Violations</span>
                        </div>
                        <div className="flex items-baseline justify-center gap-1">
                            <span className={`text-3xl font-bold ${isNearLimit || isFlagged ? 'text-red-400' : 'text-amber-400'}`}>
                                {totalViolations}
                            </span>
                            {maxViolations > 0 && (
                                <span className="text-slate-500 text-lg">/ {maxViolations}</span>
                            )}
                        </div>
                    </div>

                    {/* Penalty Info */}
                    {penaltyPoints > 0 && (
                        <p className="text-red-400 text-sm text-center">
                            <span className="font-semibold">-{penaltyPoints} points</span> penalty applied
                        </p>
                    )}

                    {/* Flagged Warning */}
                    {isFlagged && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-center">
                            <p className="text-red-400 text-sm font-medium">
                                Your session has been flagged for review by the instructor.
                            </p>
                        </div>
                    )}

                    {/* Near limit warning */}
                    {!isFlagged && isNearLimit && (
                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-center">
                            <p className="text-amber-400 text-sm font-medium">
                                ⚠ You are close to the maximum violation limit!
                            </p>
                        </div>
                    )}

                    {/* Dismiss */}
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition text-sm"
                    >
                        I Understand — Continue Quiz
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ViolationWarningModal;
