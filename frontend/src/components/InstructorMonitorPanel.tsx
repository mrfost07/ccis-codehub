import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
    X, ShieldAlert, UserX, Play, Pause, Users,
    AlertTriangle, Maximize, Eye, RefreshCw, Wifi, WifiOff
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Violation {
    id: string;
    participantId: string;
    nickname: string;
    violationType: 'fullscreen_exit' | 'tab_switch' | 'copy_paste';
    totalViolations: number;
    isFlagged: boolean;
    ts: Date;
}

interface ParticipantStatus {
    participantId: string;
    nickname: string;
    score: number;
    violations: number;
    isFlagged: boolean;
    isPaused: boolean;
    pauseReason?: string;
}

interface InstructorMonitorPanelProps {
    joinCode: string;
    quizTitle: string;
    onClose: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const VIOLATION_LABELS: Record<string, string> = {
    fullscreen_exit: '🖥️ Fullscreen exit',
    tab_switch: '🔀 Tab switch',
    copy_paste: '📋 Copy/paste',
};

const VIOLATION_COLORS: Record<string, string> = {
    fullscreen_exit: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    tab_switch: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
    copy_paste: 'text-red-400 bg-red-500/10 border-red-500/30',
};

function relativeTime(date: Date): string {
    const secs = Math.round((Date.now() - date.getTime()) / 1000);
    if (secs < 60) return `${secs}s ago`;
    return `${Math.floor(secs / 60)}m ago`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

const InstructorMonitorPanel: React.FC<InstructorMonitorPanelProps> = ({ joinCode, quizTitle, onClose }) => {
    const wsRef = useRef<WebSocket | null>(null);
    const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
    const [violations, setViolations] = useState<Violation[]>([]);
    const [participants, setParticipants] = useState<ParticipantStatus[]>([]);
    const [tab, setTab] = useState<'violations' | 'participants'>('violations');
    const [tickCounter, setTickCounter] = useState(0);

    // Relative time refresh
    useEffect(() => {
        const t = setInterval(() => setTickCounter(c => c + 1), 10000);
        return () => clearInterval(t);
    }, []);

    // ── WebSocket connect ──────────────────────────────────────────────────
    useEffect(() => {
        if (!joinCode) return;

        const wsBase = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws';
        const ws = new WebSocket(`${wsBase}/quiz/${joinCode}/`);
        wsRef.current = ws;

        ws.onopen = () => {
            setStatus('connected');
            // Announce ourselves as instructor to join the alert group
            ws.send(JSON.stringify({ type: 'instructor_join', join_code: joinCode }));
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                handleMessage(data);
            } catch (_) { }
        };

        ws.onerror = () => setStatus('disconnected');
        ws.onclose = () => setStatus('disconnected');

        return () => ws.close();
    }, [joinCode]);

    const handleMessage = (data: any) => {
        switch (data.type) {
            case 'violation_alert': {
                const v: Violation = {
                    id: `${data.participant_id}-${Date.now()}`,
                    participantId: data.participant_id,
                    nickname: data.nickname || data.participant_id,
                    violationType: data.violation_type,
                    totalViolations: data.total_violations,
                    isFlagged: data.is_flagged,
                    ts: new Date(),
                };
                setViolations(prev => [v, ...prev].slice(0, 50));
                // Update participant status if it's already tracked
                setParticipants(prev => prev.map(p =>
                    p.participantId === data.participant_id
                        ? { ...p, violations: data.total_violations, isFlagged: data.is_flagged }
                        : p
                ));
                break;
            }

            case 'participant_update': {
                const list: ParticipantStatus[] = (data.data?.participants || []).map((p: any) => ({
                    participantId: p.id || p.participant_id,
                    nickname: p.nickname,
                    score: p.total_score || 0,
                    violations: (p.fullscreen_violations || 0) + (p.tab_switch_count || 0) + (p.copy_paste_attempts || 0),
                    isFlagged: p.is_flagged || false,
                    isPaused: p.is_paused || false,
                    pauseReason: p.pause_reason || '',
                }));
                setParticipants(list);
                break;
            }

            case 'participant_paused':
            case 'participant_resumed': {
                setParticipants(prev => prev.map(p =>
                    p.participantId === data.participant_id
                        ? { ...p, isPaused: data.type === 'participant_paused', pauseReason: data.reason || '' }
                        : p
                ));
                break;
            }
        }
    };

    const sendAction = useCallback((type: string, participantId: string, extra?: object) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type, participant_id: participantId, ...extra }));
        }
    }, []);

    const pauseParticipant = (p: ParticipantStatus) => {
        sendAction('pause_participant', p.participantId, { reason: 'Manual pause by instructor' });
        toast(`Pausing ${p.nickname}...`);
    };

    const resumeParticipant = (p: ParticipantStatus) => {
        sendAction('resume_participant', p.participantId);
        toast.success(`Resumed ${p.nickname}`);
    };

    const reconnect = () => {
        wsRef.current?.close();
        setStatus('connecting');
        // Re-mount by toggling state — simple approach: close + reopen
        const wsBase = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws';
        const ws = new WebSocket(`${wsBase}/quiz/${joinCode}/`);
        wsRef.current = ws;
        ws.onopen = () => {
            setStatus('connected');
            ws.send(JSON.stringify({ type: 'instructor_join', join_code: joinCode }));
        };
        ws.onmessage = (e) => { try { handleMessage(JSON.parse(e.data)); } catch (_) { } };
        ws.onerror = () => setStatus('disconnected');
        ws.onclose = () => setStatus('disconnected');
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────────────────────────

    const flaggedCount = participants.filter(p => p.isFlagged).length;
    const pausedCount = participants.filter(p => p.isPaused).length;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">

                {/* ── Header ───────────────────────────────────────────── */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-gradient-to-r from-slate-800 to-slate-900 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <ShieldAlert className="w-5 h-5 text-orange-400" />
                        <div>
                            <h3 className="font-bold text-white text-sm">Live Monitoring</h3>
                            <p className="text-xs text-slate-400">{quizTitle} · <span className="font-mono">{joinCode}</span></p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Connection status */}
                        {status === 'connected'
                            ? <span className="flex items-center gap-1 text-xs text-green-400"><Wifi className="w-3.5 h-3.5" /> Live</span>
                            : status === 'connecting'
                                ? <span className="flex items-center gap-1 text-xs text-amber-400"><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Connecting</span>
                                : (
                                    <button onClick={reconnect} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300">
                                        <WifiOff className="w-3.5 h-3.5" /> Reconnect
                                    </button>
                                )
                        }
                        <button onClick={onClose} className="ml-2 p-1.5 hover:bg-slate-700 rounded-lg transition text-slate-400 hover:text-white">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* ── Stats Bar ────────────────────────────────────────── */}
                <div className="grid grid-cols-3 border-b border-slate-800 flex-shrink-0">
                    <div className="flex flex-col items-center py-3">
                        <Users className="w-4 h-4 text-slate-400 mb-0.5" />
                        <span className="text-lg font-bold text-white">{participants.length}</span>
                        <span className="text-xs text-slate-500">Participants</span>
                    </div>
                    <div className="flex flex-col items-center py-3 border-x border-slate-800">
                        <AlertTriangle className="w-4 h-4 text-amber-400 mb-0.5" />
                        <span className="text-lg font-bold text-amber-400">{violations.length}</span>
                        <span className="text-xs text-slate-500">Violations</span>
                    </div>
                    <div className="flex flex-col items-center py-3">
                        <UserX className="w-4 h-4 text-red-400 mb-0.5" />
                        <span className="text-lg font-bold text-red-400">{flaggedCount}</span>
                        <span className="text-xs text-slate-500">Flagged</span>
                    </div>
                </div>

                {/* ── Tabs ─────────────────────────────────────────────── */}
                <div className="flex border-b border-slate-800 flex-shrink-0">
                    <button
                        onClick={() => setTab('violations')}
                        className={`flex-1 py-2.5 text-sm font-medium transition ${tab === 'violations' ? 'text-orange-400 border-b-2 border-orange-500 bg-slate-800/30' : 'text-slate-400 hover:text-white'}`}
                    >
                        Violations {violations.length > 0 && <span className="ml-1 px-1.5 py-0.5 bg-orange-500/20 text-orange-400 rounded text-xs">{violations.length}</span>}
                    </button>
                    <button
                        onClick={() => setTab('participants')}
                        className={`flex-1 py-2.5 text-sm font-medium transition ${tab === 'participants' ? 'text-orange-400 border-b-2 border-orange-500 bg-slate-800/30' : 'text-slate-400 hover:text-white'}`}
                    >
                        Participants
                        {pausedCount > 0 && <span className="ml-1 px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded text-xs">{pausedCount} paused</span>}
                    </button>
                </div>

                {/* ── Content ───────────────────────────────────────────── */}
                <div className="flex-1 overflow-y-auto">

                    {/* ── Violations Tab ─────────────────────────────────── */}
                    {tab === 'violations' && (
                        <div className="divide-y divide-slate-800">
                            {violations.length === 0 ? (
                                <div className="text-center py-16 text-slate-500">
                                    <ShieldAlert className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                    <p className="text-sm">No violations yet</p>
                                    <p className="text-xs mt-1 opacity-60">Violations will appear here in real-time</p>
                                </div>
                            ) : (
                                violations.map(v => (
                                    <div key={v.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-800/30 transition">
                                        <div className={`px-2 py-0.5 rounded border text-xs font-medium ${VIOLATION_COLORS[v.violationType] || 'text-slate-400 bg-slate-700/50 border-slate-600'}`}>
                                            {VIOLATION_LABELS[v.violationType] || v.violationType}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <span className="text-white text-sm font-medium truncate block">{v.nickname}</span>
                                            <span className="text-slate-500 text-xs">
                                                {v.totalViolations} total violation{v.totalViolations !== 1 ? 's' : ''}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            {v.isFlagged && (
                                                <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-xs rounded border border-red-500/30 flex items-center gap-1">
                                                    <UserX className="w-3 h-3" /> Flagged
                                                </span>
                                            )}
                                            <span className="text-xs text-slate-600">{relativeTime(v.ts)}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* ── Participants Tab ───────────────────────────────── */}
                    {tab === 'participants' && (
                        <div className="divide-y divide-slate-800">
                            {participants.length === 0 ? (
                                <div className="text-center py-16 text-slate-500">
                                    <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                    <p className="text-sm">No participants yet</p>
                                </div>
                            ) : (
                                participants
                                    .sort((a, b) => b.violations - a.violations)
                                    .map(p => (
                                        <div key={p.participantId} className={`flex items-center gap-3 px-5 py-3 hover:bg-slate-800/30 transition ${p.isPaused ? 'bg-amber-900/10' : ''}`}>
                                            {/* Avatar / status dot */}
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${p.isFlagged ? 'bg-red-800 text-red-200' : p.isPaused ? 'bg-amber-800 text-amber-200' : 'bg-slate-700 text-slate-300'}`}>
                                                {p.nickname.charAt(0).toUpperCase()}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-white text-sm font-medium truncate">{p.nickname}</span>
                                                    {p.isFlagged && (
                                                        <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-xs rounded border border-red-500/30 flex items-center gap-1">
                                                            <UserX className="w-2.5 h-2.5" /> Flagged
                                                        </span>
                                                    )}
                                                    {p.isPaused && (
                                                        <span className="px-1.5 py-0.5 bg-amber-500/15 text-amber-400 text-xs rounded border border-amber-500/30 flex items-center gap-1">
                                                            <Pause className="w-2.5 h-2.5" /> Paused
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 mt-0.5">
                                                    <span className="text-slate-400 text-xs">Score: {p.score}</span>
                                                    {p.violations > 0 && (
                                                        <span className="text-amber-400 text-xs">{p.violations} violation{p.violations !== 1 ? 's' : ''}</span>
                                                    )}
                                                    {p.pauseReason && (
                                                        <span className="text-slate-500 text-xs truncate max-w-[160px]">{p.pauseReason}</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Controls */}
                                            <div className="flex gap-1.5 flex-shrink-0">
                                                {p.isPaused ? (
                                                    <button
                                                        onClick={() => resumeParticipant(p)}
                                                        className="flex items-center gap-1 px-2.5 py-1.5 bg-green-600/20 hover:bg-green-600 text-green-400 hover:text-white rounded-lg text-xs transition font-medium"
                                                        title="Resume participant"
                                                    >
                                                        <Play className="w-3 h-3" /> Resume
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => pauseParticipant(p)}
                                                        className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-600/20 hover:bg-amber-600 text-amber-400 hover:text-white rounded-lg text-xs transition font-medium"
                                                        title="Pause participant"
                                                    >
                                                        <Pause className="w-3 h-3" /> Pause
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))
                            )}
                        </div>
                    )}
                </div>

                {/* ── Footer hint ──────────────────────────────────────── */}
                <div className="border-t border-slate-800 px-5 py-2.5 flex-shrink-0 flex items-center gap-2">
                    <Eye className="w-3.5 h-3.5 text-slate-600" />
                    <p className="text-xs text-slate-600">Updates are live via WebSocket · Sorted by violations</p>
                </div>
            </div>
        </div>
    );
};

export default InstructorMonitorPanel;
