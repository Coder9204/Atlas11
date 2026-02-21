import React, { useState, useRef, useEffect } from 'react';
import { useAICoach } from '../contexts/AICoachContext';
import { theme } from '../lib/theme';

/**
 * AICoachPanel — Floating, collapsible AI coach panel for in-game use.
 *
 * Minimized: small floating button at bottom-right with speaking animation.
 * Expanded: slide-in panel with chat, voice controls, and hint button.
 */
export default function AICoachPanel() {
  const coach = useAICoach();
  const [expanded, setExpanded] = useState(false);
  const [unread, setUnread] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(0);

  // Don't render if API key not configured
  if (!coach || !coach.isAvailable) return null;

  // Track unread messages when minimized
  useEffect(() => {
    const count = coach.transcriptions.filter(t => t.role === 'atlas').length;
    if (!expanded && count > prevCountRef.current) {
      setUnread(prev => prev + (count - prevCountRef.current));
    }
    prevCountRef.current = count;
  }, [coach.transcriptions, expanded]);

  // Auto-scroll chat
  useEffect(() => {
    if (scrollRef.current && expanded) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [coach.transcriptions, expanded]);

  // Clear unread on expand
  const handleExpand = async () => {
    setExpanded(true);
    setUnread(0);
    if (!coach.isSessionActive && !coach.isConnecting) {
      await coach.startSession();
    }
  };

  const handleMinimize = () => setExpanded(false);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    coach.sendMessage(inputValue);
    setInputValue('');
  };

  // ---- Minimized button ----
  if (!expanded) {
    return (
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999 }}>
        <button
          onClick={handleExpand}
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: coach.isSpeaking
              ? `linear-gradient(135deg, ${theme.colors.accent}, ${theme.colors.accentAlt})`
              : theme.colors.bgElevated,
            border: `2px solid ${coach.isSpeaking ? theme.colors.accent : theme.colors.border}`,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: coach.isSpeaking
              ? `0 0 20px ${theme.colors.accent}44`
              : '0 4px 16px rgba(0,0,0,0.3)',
            transition: 'all 0.3s ease',
            position: 'relative',
          }}
          aria-label="Open AI Coach"
        >
          {/* Speaking pulse ring */}
          {coach.isSpeaking && (
            <div style={{
              position: 'absolute',
              inset: -6,
              borderRadius: '50%',
              border: `2px solid ${theme.colors.accent}`,
              opacity: 0.4,
              animation: 'coach-pulse 1.5s ease-in-out infinite',
            }} />
          )}
          {/* Icon */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={theme.colors.textPrimary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
          {/* Unread badge */}
          {unread > 0 && (
            <div style={{
              position: 'absolute',
              top: -4,
              right: -4,
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: theme.colors.error,
              color: '#fff',
              fontSize: 11,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: theme.fontFamily,
            }}>
              {unread > 9 ? '9+' : unread}
            </div>
          )}
        </button>
        {/* Pulse keyframe injection */}
        <style>{`
          @keyframes coach-pulse {
            0%, 100% { transform: scale(1); opacity: 0.4; }
            50% { transform: scale(1.2); opacity: 0; }
          }
        `}</style>
      </div>
    );
  }

  // ---- Expanded panel ----
  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      right: 0,
      width: 360,
      maxWidth: '100vw',
      height: '70vh',
      maxHeight: 600,
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      background: theme.colors.bgSecondary,
      borderLeft: `1px solid ${theme.colors.border}`,
      borderTop: `1px solid ${theme.colors.border}`,
      borderTopLeftRadius: 16,
      boxShadow: '0 -4px 32px rgba(0,0,0,0.4)',
      fontFamily: theme.fontFamily,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: `1px solid ${theme.colors.border}`,
        background: theme.colors.bgCard,
        borderTopLeftRadius: 16,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Status dot */}
          <div style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: coach.isSessionActive
              ? (coach.isSpeaking ? theme.colors.accent : theme.colors.success)
              : (coach.isConnecting ? theme.colors.warning : theme.colors.textMuted),
            animation: coach.isSpeaking || coach.isConnecting ? 'coach-pulse 1.5s ease-in-out infinite' : 'none',
          }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: theme.colors.textPrimary }}>
            AI Coach
          </span>
          {coach.currentGamePhase && (
            <span style={{
              fontSize: 11,
              color: theme.colors.textMuted,
              background: theme.colors.bgElevated,
              padding: '2px 8px',
              borderRadius: 8,
            }}>
              {coach.currentGamePhase}
            </span>
          )}
        </div>
        <button
          onClick={handleMinimize}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: theme.colors.textMuted,
            fontSize: 18,
            padding: 4,
            lineHeight: 1,
          }}
          aria-label="Minimize coach panel"
        >
          &times;
        </button>
      </div>

      {/* Chat area */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {coach.isConnecting && coach.transcriptions.length === 0 && (
          <div style={{ textAlign: 'center', color: theme.colors.textMuted, fontSize: 13, padding: 20 }}>
            Connecting to AI coach...
          </div>
        )}
        {!coach.isConnecting && coach.transcriptions.length === 0 && (
          <div style={{ textAlign: 'center', color: theme.colors.textMuted, fontSize: 13, padding: 20 }}>
            Ask the AI coach anything about this game, or click "Get Hint" for help.
          </div>
        )}
        {coach.transcriptions.map((turn, i) => (
          <div
            key={i}
            style={{
              alignSelf: turn.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
              padding: '8px 12px',
              borderRadius: 12,
              fontSize: 13,
              lineHeight: 1.5,
              color: turn.role === 'user' ? '#fff' : theme.colors.textPrimary,
              background: turn.role === 'user'
                ? theme.colors.accentAlt
                : theme.colors.bgElevated,
              opacity: turn.isStreaming ? 0.8 : 1,
              wordBreak: 'break-word',
            }}
          >
            {turn.text}
          </div>
        ))}
      </div>

      {/* Controls bar */}
      <div style={{
        padding: '10px 16px',
        borderTop: `1px solid ${theme.colors.border}`,
        background: theme.colors.bgCard,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        flexShrink: 0,
      }}>
        {/* Quick actions */}
        <div style={{ display: 'flex', gap: 6 }}>
          {/* Hint button */}
          <button
            onClick={() => coach.requestHint()}
            disabled={!coach.isSessionActive}
            style={{
              flex: 1,
              padding: '6px 10px',
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 8,
              border: `1px solid ${theme.colors.border}`,
              background: theme.colors.bgElevated,
              color: coach.isSessionActive ? theme.colors.warning : theme.colors.textMuted,
              cursor: coach.isSessionActive ? 'pointer' : 'default',
              fontFamily: theme.fontFamily,
            }}
          >
            Get Hint
          </button>
          {/* Voice toggle */}
          <button
            onClick={() => coach.toggleVoice()}
            style={{
              padding: '6px 10px',
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 8,
              border: `1px solid ${theme.colors.border}`,
              background: coach.isVoiceEnabled ? theme.colors.accent + '22' : theme.colors.bgElevated,
              color: coach.isVoiceEnabled ? theme.colors.accent : theme.colors.textMuted,
              cursor: 'pointer',
              fontFamily: theme.fontFamily,
            }}
            title={coach.isVoiceEnabled ? 'Mute voice' : 'Enable voice'}
          >
            {coach.isVoiceEnabled ? 'Voice On' : 'Voice Off'}
          </button>
          {/* Mic toggle */}
          <button
            onClick={() => coach.toggleRecording()}
            disabled={!coach.isSessionActive}
            style={{
              padding: '6px 10px',
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 8,
              border: `1px solid ${coach.isRecording ? theme.colors.error : theme.colors.border}`,
              background: coach.isRecording ? theme.colors.error + '22' : theme.colors.bgElevated,
              color: coach.isRecording ? theme.colors.error : theme.colors.textMuted,
              cursor: coach.isSessionActive ? 'pointer' : 'default',
              fontFamily: theme.fontFamily,
            }}
            title={coach.isRecording ? 'Stop mic' : 'Start mic'}
          >
            {coach.isRecording ? 'Mic On' : 'Mic Off'}
          </button>
        </div>
        {/* Text input */}
        <form onSubmit={handleSend} style={{ display: 'flex', gap: 6 }}>
          <input
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder="Ask the coach..."
            style={{
              flex: 1,
              padding: '8px 12px',
              fontSize: 13,
              borderRadius: 8,
              border: `1px solid ${theme.colors.border}`,
              background: theme.colors.bgPrimary,
              color: theme.colors.textPrimary,
              outline: 'none',
              fontFamily: theme.fontFamily,
            }}
          />
          <button
            type="submit"
            disabled={!inputValue.trim()}
            style={{
              padding: '8px 14px',
              fontSize: 13,
              fontWeight: 600,
              borderRadius: 8,
              border: 'none',
              background: inputValue.trim() ? theme.colors.accent : theme.colors.bgElevated,
              color: inputValue.trim() ? '#fff' : theme.colors.textMuted,
              cursor: inputValue.trim() ? 'pointer' : 'default',
              fontFamily: theme.fontFamily,
            }}
          >
            Send
          </button>
        </form>
      </div>

      {/* Keyframe for pulse animation */}
      <style>{`
        @keyframes coach-pulse {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.2); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
