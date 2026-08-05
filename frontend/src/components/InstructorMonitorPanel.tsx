import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
    X, ShieldAlert, UserX, Play, Pause, Users,
    AlertTriangle, Maximize, Eye, RefreshCw, WifiOff,
    ArrowLeftRight, ClipboardX
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
    fullscreen_exit: 'Fullscreen exit',
    tab_switch: 'Tab switch',
    copy_paste: 'Copy / paste',
};

const VIOLATION_ICONS: Record<string, React.FC<{ className?: string }>> = {
    fullscreen_exit: Maximize,
    tab_switch: ArrowLeftRight,
    copy_paste: ClipboardX,
};

const VIOLATION_COLORS: Record<string, string> = {
    fullscreen_exit: 'text-amber-300 bg-amber-500/10 border-amber-500/30',
    tab_switch: 'text-amber-300 bg-amber-500/10 border-amber-500/30',
    copy_paste: 'text-red-300 bg-red-500/10 border-red-500/30',
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

    // ── WebSocket connect (single source, with auto-reconnect + backoff) ────
    const reconnectAttempts = useRef(0);
    const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();
    const manuallyClosed = useRef(false);

    const connect = useCallback(() => {
        if (!joinCode) return;
        setStatus('connecting');

        const wsBase = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws';
        const ws = new WebSocket(`${wsBase}/quiz/${joinCode}/`);
        wsRef.current = ws;

        ws.onopen = () => {
            setStatus('connected');
            reconnectAttempts.current = 0; // reset backoff on a clean connect
            // Announce ourselves as instructor to join the alert group
            ws.send(JSON.stringify({ type: 'instructor_join', join_code: joinCode }));
        };

        ws.onmessage = (event) => {
            try { handleMessage(JSON.parse(event.data)); } catch (_) { }
        };

        ws.onerror = () => { /* the close handler drives reconnect */ };

        ws.onclose = () => {
            if (manuallyClosed.current) return;
            setStatus('disconnected');
            // Capped exponential backoff (1s → 10s), up to 6 automatic retries
            if (reconnectAttempts.current < 6) {
                const delay = Math.min(1000 * 2 ** reconnectAttempts.current, 10000);
                reconnectAttempts.current += 1;
                reconnectTimer.current = setTimeout(connect, delay);
            }
        };
    }, [joinCode]);

    useEffect(() => {
        manuallyClosed.current = false;
        connect();
        return () => {
            manuallyClosed.current = true;
            if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
            wsRef.current?.close();
        };
    }, [connect]);

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

            case 'instructor_registered': {
                setStatus('connected');
                break;
            }

            case 'instructor_participant_update': {
                // Rich participant data from DB — use this as the source of truth
                const list: ParticipantStatus[] = (data.participants || []).map((p: any) => ({
                    participantId: p.id || p.participant_id,
                    nickname: p.nickname || p.id,
                    score: p.total_score || 0,
                    violations: (p.fullscreen_violations || 0) + (p.tab_switch_count || 0) + (p.copy_paste_attempts || 0),
                    isFlagged: p.is_flagged || false,
                    isPaused: p.is_paused || false,
                    pauseReason: p.pause_reason || '',
                }));
                setParticipants(list);
                break;
            }

            case 'participant_update': {
                // Simple username list — only use if no rich data yet
                const rawList: string[] = data.data?.participants || data.participants || [];
                setParticipants(prev => {
                    if (prev.length > 0) return prev; // Already have rich data, skip
                    return rawList.map((name: string) => ({
                        participantId: name,
                        nickname: name,
                        score: 0,
                        violations: 0,
                        isFlagged: false,
                        isPaused: false,
                    }));
                });
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
        reconnectAttempts.current = 0;
        if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
        wsRef.current?.close();
        connect();
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────────────────────────

    const flaggedCount = participants.filter(p => p.isFlagged).length;
    const pausedCount = participants.filter(p => p.isPaused).length;
    // Sort a COPY — sorting `participants` directly would mutate state in render.
    // Flagged first, then by violation count, then by score.
    const sortedParticipants = useMemo(
        () => [...participants].sort((a, b) =>
            Number(b.isFlagged) - Number(a.isFlagged) ||
            b.violations - a.violations ||
            b.score - a.score,
        ),
        [participants],
    );

    const metrics = [
        { label: 'In session', value: participants.length, tone: 'text-white' },
        { label: 'Violations', value: violations.length, tone: 'text-amber-300' },
        { label: 'Flagged', value: flaggedCount, tone: 'text-red-300' },
        { label: 'Paused', value: pausedCount, tone: 'text-amber-300' },
    ];

    /* One row of the live feed. */
    const violationRow = (v: Violation) => {
        const VIcon = VIOLATION_ICONS[v.violationType] || AlertTriangle;
        return (
            <li key={v.id} className="flex items-start gap-2.5 px-4 py-2.5 transition-colors hover:bg-neutral-800/40">
                <span className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${VIOLATION_COLORS[v.violationType] || 'text-neutral-300 bg-neutral-800 border-neutral-700'}`}>
                    <VIcon className="h-3 w-3" />
                </span>
                <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-1.5">
                        <span className="truncate text-sm font-medium text-white">{v.nickname}</span>
                        <span className="shrink-0 text-[11px] tabular-nums text-neutral-600">{relativeTime(v.ts)}</span>
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
                        <span className="text-neutral-400">{VIOLATION_LABELS[v.violationType] || v.violationType}</span>
                        <span className="text-neutral-600">|</span>
                        <span className="tabular-nums text-neutral-500">{v.totalViolations} total</span>
                        {v.isFlagged && (
                            <span className="inline-flex items-center gap-1 rounded border border-red-500/30 bg-red-500/15 px-1.5 text-[10px] font-semibold uppercase tracking-wide text-red-300">
                                <UserX className="h-2.5 w-2.5" /> Flagged
                            </span>
                        )}
                    </span>
                </span>
            </li>
        );
    };

    /* One row of the roster. */
    const participantRow = (p: ParticipantStatus) => (
        <li
            key={p.participantId}
            className={`relative flex items-center gap-3 px-4 py-3 transition-colors hover:bg-neutral-800/40 ${p.isPaused ? 'bg-amber-500/[0.04]' : ''}`}
        >
            {/* A left edge rather than another badge: severity should be scannable
                down the column without reading every row. */}
            {(p.isFlagged || p.isPaused) && (
                <span className={`absolute inset-y-0 left-0 w-0.5 ${p.isFlagged ? 'bg-red-500' : 'bg-amber-500'}`} />
            )}

            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${p.isFlagged ? 'bg-red-500/15 text-red-300' : p.isPaused ? 'bg-amber-500/15 text-amber-300' : 'bg-neutral-800 text-neutral-300'}`}>
                {p.nickname.charAt(0).toUpperCase()}
            </span>

            <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate text-sm font-medium text-white">{p.nickname}</span>
                    {p.isFlagged && (
                        <span className="inline-flex items-center gap-1 rounded border border-red-500/30 bg-red-500/20 px-1.5 text-[10px] font-semibold uppercase tracking-wide text-red-300">
                            <UserX className="h-2.5 w-2.5" /> Flagged
                        </span>
                    )}
                    {p.isPaused && (
                        <span className="inline-flex items-center gap-1 rounded border border-amber-500/30 bg-amber-500/15 px-1.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
                            <Pause className="h-2.5 w-2.5" /> Paused
                        </span>
                    )}
                </span>
                <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
                    <span className="tabular-nums text-neutral-400">{p.score} pts</span>
                    {p.violations > 0 && (
                        <>
                            <span className="text-neutral-600">|</span>
                            <span className="tabular-nums text-amber-400">
                                {p.violations} violation{p.violations !== 1 ? 's' : ''}
                            </span>
                        </>
                    )}
                    {p.pauseReason && (
                        <>
                            <span className="text-neutral-600">|</span>
                            <span className="truncate text-neutral-500">{p.pauseReason}</span>
                        </>
                    )}
                </span>
            </span>

            {p.isPaused ? (
                <button
                    onClick={() => resumeParticipant(p)}
                    title="Resume participant"
                    className="flex h-11 shrink-0 items-center gap-1.5 rounded-lg bg-green-600/20 px-3 text-xs font-medium text-green-400 transition hover:bg-green-600 hover:text-white sm:h-9"
                >
                    <Play className="h-3.5 w-3.5" /> Resume
                </button>
            ) : (
                <button
                    onClick={() => pauseParticipant(p)}
                    title="Pause participant"
                    className="flex h-11 shrink-0 items-center gap-1.5 rounded-lg bg-amber-600/20 px-3 text-xs font-medium text-amber-400 transition hover:bg-amber-600 hover:text-white sm:h-9"
                >
                    <Pause className="h-3.5 w-3.5" /> Pause
                </button>
            )}
        </li>
    );

    const emptyState = (Icon: React.FC<{ className?: string }>, title: string, note: string) => (
        <div className="px-6 py-14 text-center text-neutral-500">
            <Icon className="mx-auto mb-3 h-9 w-9 opacity-25" />
            <p className="text-sm">{title}</p>
            <p className="mt-1 text-xs opacity-60">{note}</p>
        </div>
    );

    return (
        // z-50, the modal layer. This was z-[60] - the toast tier - so the monitor
        // sat above every dialog on the platform.
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
            <div
                className="relative flex h-[92dvh] w-full max-w-6xl flex-col overflow-hidden rounded-t-2xl
                    border border-neutral-800 bg-neutral-900 shadow-xl shadow-black/40
                    sm:h-[86dvh] sm:rounded-2xl"
                style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-500/60 to-transparent" />

                {/* Header: identity, live state and the numbers, on one band. */}
                <header className="shrink-0 border-b border-neutral-800 px-4 py-3 sm:px-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                            <span className="rounded-lg bg-purple-500/10 p-2 text-purple-400">
                                <ShieldAlert className="h-5 w-5" />
                            </span>
                            <div className="min-w-0">
                                <h3 className="truncate text-sm font-bold tracking-tight text-white">
                                    Live monitoring
                                </h3>
                                <p className="truncate text-xs text-neutral-400">
                                    {quizTitle} · <span className="font-mono">{joinCode}</span>
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {status === 'connected' ? (
                                <span className="flex items-center gap-1.5 rounded-lg border border-green-500/30 bg-green-500/10 px-2 py-1 text-xs text-green-400">
                                    <span className="h-1.5 w-1.5 rounded-full bg-green-400" /> Live
                                </span>
                            ) : status === 'connecting' ? (
                                <span className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs text-amber-400">
                                    <RefreshCw className="h-3 w-3 animate-spin" /> Connecting
                                </span>
                            ) : (
                                <button
                                    onClick={reconnect}
                                    className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs text-red-400 transition-colors hover:bg-red-500/20"
                                >
                                    <WifiOff className="h-3 w-3" /> Reconnect
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                aria-label="Close monitor"
                                className="flex h-11 w-11 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white sm:h-9 sm:w-9"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {/* Chips, not three stacked-icon cells: same numbers, a third of
                        the height, and room for a fourth. */}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                        {metrics.map(m => (
                            <span
                                key={m.label}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-800 bg-neutral-950 px-2.5 py-1.5 text-xs text-neutral-400"
                            >
                                {m.label}
                                <span className={`font-semibold tabular-nums ${m.tone}`}>{m.value}</span>
                            </span>
                        ))}
                    </div>
                </header>

                {/* Pane switch, phones only. From lg up both panes show side by
                    side, which is the point: a proctor needs the roster and the
                    activity at once, and tabs made that impossible. */}
                <div className="flex shrink-0 gap-1 border-b border-neutral-800 px-3 py-2 lg:hidden">
                    {([
                        ['participants', 'Students', participants.length],
                        ['violations', 'Activity', violations.length],
                    ] as const).map(([key, label, count]) => (
                        <button
                            key={key}
                            onClick={() => setTab(key)}
                            className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors ${tab === key ? 'bg-purple-600/20 text-purple-200' : 'text-neutral-400 hover:bg-neutral-800/70'}`}
                        >
                            {label}{count > 0 ? ` (${count})` : ''}
                        </button>
                    ))}
                </div>

                <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_24rem]">
                    {/* Roster */}
                    <section className={`min-h-0 flex-col overflow-hidden lg:flex ${tab === 'participants' ? 'flex' : 'hidden'}`}>
                        <h4 className="hidden shrink-0 items-center gap-2 border-b border-neutral-800 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 lg:flex">
                            <Users className="h-3.5 w-3.5" />
                            Students — flagged first
                        </h4>
                        <div className="min-h-0 flex-1 overflow-y-auto">
                            {participants.length === 0
                                ? emptyState(Users, 'Nobody has joined yet', 'Students appear as they enter the session')
                                : <ul className="divide-y divide-neutral-800">{sortedParticipants.map(participantRow)}</ul>}
                        </div>
                    </section>

                    {/* Live activity */}
                    <section className={`min-h-0 flex-col overflow-hidden border-neutral-800 lg:flex lg:border-l ${tab === 'violations' ? 'flex' : 'hidden'}`}>
                        <h4 className="hidden shrink-0 items-center gap-2 border-b border-neutral-800 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 lg:flex">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Activity — newest first
                        </h4>
                        <div className="min-h-0 flex-1 overflow-y-auto">
                            {violations.length === 0
                                ? emptyState(ShieldAlert, 'Nothing flagged yet', 'Violations arrive here as they happen')
                                : <ul className="divide-y divide-neutral-800">{violations.map(violationRow)}</ul>}
                        </div>
                    </section>
                </div>

                <footer className="flex shrink-0 items-center gap-2 border-t border-neutral-800 px-4 py-2.5">
                    <Eye className="h-3.5 w-3.5 text-neutral-600" />
                    <p className="text-xs text-neutral-600">
                        Live over WebSocket · pausing a student holds their questions until you resume
                    </p>
                </footer>
            </div>
        </div>
    );
};

export default InstructorMonitorPanel;
