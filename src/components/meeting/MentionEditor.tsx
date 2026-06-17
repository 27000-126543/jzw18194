import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { User } from '../../../shared/types';
import { cn } from '@/lib/utils';
import Avatar from '@/components/common/Avatar';
import { parseActions } from '@/utils/mentionParser';

interface MentionEditorProps {
  value: string;
  onChange: (value: string) => void;
  users: User[];
  label?: string;
  placeholder?: string;
  rows?: number;
  className?: string;
  error?: string;
}

interface PopupState {
  type: 'mention' | 'action' | null;
  visible: boolean;
  search: string;
  startIndex: number;
  selectedIndex: number;
  top: number;
  left: number;
}

const MentionEditor: React.FC<MentionEditorProps> = ({
  value,
  onChange,
  users,
  label,
  placeholder,
  rows = 6,
  className,
  error,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [popup, setPopup] = useState<PopupState>({
    type: null,
    visible: false,
    search: '',
    startIndex: -1,
    selectedIndex: 0,
    top: 0,
    left: 0,
  });

  const filteredUsers = useMemo(() => {
    if (!popup.search) return users;
    const search = popup.search.toLowerCase();
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(search) ||
        u.email.toLowerCase().includes(search)
    );
  }, [users, popup.search]);

  const calculatePopupPosition = (textarea: HTMLTextAreaElement, cursorPos: number) => {
    const mirror = document.createElement('div');
    const style = window.getComputedStyle(textarea);
    mirror.style.cssText = `
      position: absolute;
      visibility: hidden;
      white-space: pre-wrap;
      word-wrap: break-word;
      overflow: hidden;
      font-family: ${style.fontFamily};
      font-size: ${style.fontSize};
      line-height: ${style.lineHeight};
      padding: ${style.padding};
      width: ${textarea.offsetWidth}px;
      min-height: ${textarea.offsetHeight}px;
    `;
    mirror.textContent = textarea.value.substring(0, cursorPos);
    const span = document.createElement('span');
    span.textContent = '\u200b';
    mirror.appendChild(span);
    document.body.appendChild(mirror);
    const rect = span.getBoundingClientRect();
    const textareaRect = textarea.getBoundingClientRect();
    document.body.removeChild(mirror);
    return {
      top: rect.bottom - textareaRect.top + textarea.scrollTop - textarea.scrollTop + 4,
      left: rect.left - textareaRect.left + textarea.scrollLeft,
    };
  };

  const checkTrigger = (text: string, cursorPos: number) => {
    let i = cursorPos - 1;
    while (i >= 0 && !/\s/.test(text[i]) && text[i] !== '\n') {
      i--;
    }
    const start = i + 1;
    const token = text.substring(start, cursorPos);

    if (token.startsWith('@')) {
      return { type: 'mention' as const, search: token.substring(1), startIndex: start };
    }
    if (token.startsWith('#')) {
      return { type: 'action' as const, search: token.substring(1), startIndex: start };
    }
    return null;
  };

  const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const cursorPos = textarea.selectionStart;
    const text = textarea.value;
    const trigger = checkTrigger(text, cursorPos);

    if (trigger && textareaRef.current) {
      const pos = calculatePopupPosition(textareaRef.current, cursorPos);
      setPopup({
        type: trigger.type,
        visible: true,
        search: trigger.search,
        startIndex: trigger.startIndex,
        selectedIndex: 0,
        top: pos.top,
        left: pos.left,
      });
    } else {
      setPopup((p) => ({ ...p, visible: false, type: null }));
    }

    onChange(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!popup.visible) return;

    if (popup.type === 'mention') {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setPopup((p) => ({
          ...p,
          selectedIndex: Math.min(p.selectedIndex + 1, filteredUsers.length - 1),
        }));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setPopup((p) => ({
          ...p,
          selectedIndex: Math.max(p.selectedIndex - 1, 0),
        }));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        insertMention(filteredUsers[popup.selectedIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setPopup((p) => ({ ...p, visible: false, type: null }));
      }
    } else if (popup.type === 'action') {
      if (e.key === 'Tab' || e.key === ' ') {
        e.preventDefault();
        insertActionTag();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setPopup((p) => ({ ...p, visible: false, type: null }));
      }
    }
  };

  const insertMention = (user: User | undefined) => {
    if (!user || popup.startIndex < 0 || !textareaRef.current) return;
    const textarea = textareaRef.current;
    const cursorPos = textarea.selectionStart;
    const before = value.substring(0, popup.startIndex);
    const after = value.substring(cursorPos);
    const inserted = `@${user.name} `;
    const newValue = before + inserted + after;
    onChange(newValue);
    setTimeout(() => {
      const newPos = before.length + inserted.length;
      textarea.focus();
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
    setPopup((p) => ({ ...p, visible: false, type: null }));
  };

  const insertActionTag = () => {
    if (popup.startIndex < 0 || !textareaRef.current) return;
    const textarea = textareaRef.current;
    const cursorPos = textarea.selectionStart;
    const before = value.substring(0, popup.startIndex);
    const after = value.substring(cursorPos);
    const inserted = '#Action ';
    const newValue = before + inserted + after;
    onChange(newValue);
    setTimeout(() => {
      const newPos = before.length + inserted.length;
      textarea.focus();
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
    setPopup((p) => ({ ...p, visible: false, type: null }));
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popup.visible) {
        const target = e.target as HTMLElement;
        if (!target.closest('.mention-popup') && !target.closest('.mention-textarea')) {
          setPopup((p) => ({ ...p, visible: false, type: null }));
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [popup.visible]);

  const parsedActions = useMemo(() => parseActions(value), [value]);

  const renderPreview = () => {
    if (!value) return null;

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    const sortedActions = [...parsedActions].sort((a, b) => a.start - b.start);
    const mentions: Array<{ start: number; end: number; name: string }> = [];
    const regex = /@([^\s@#]+)/g;
    let match;
    while ((match = regex.exec(value)) !== null) {
      mentions.push({
        start: match.index,
        end: match.index + match[0].length,
        name: match[1],
      });
    }

    const allMarkers = [
      ...sortedActions.map((a) => ({ ...a, kind: 'action' as const })),
      ...mentions.map((m) => ({ ...m, tempKey: `m_${m.start}`, kind: 'mention' as const, title: '', assigneeName: m.name })),
    ].sort((a, b) => a.start - b.start);

    for (const marker of allMarkers) {
      if (marker.start < lastIndex) continue;
      if (marker.start > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`} className="whitespace-pre-wrap">
            {value.slice(lastIndex, marker.start)}
          </span>
        );
      }
      if (marker.kind === 'action') {
        parts.push(
          <mark
            key={`action-${marker.tempKey}`}
            className="bg-amber-100 text-amber-800 px-1 rounded font-medium"
          >
            {value.slice(marker.start, marker.end)}
          </mark>
        );
      } else {
        parts.push(
          <span
            key={`mention-${marker.tempKey}`}
            className="bg-indigo-100 text-indigo-700 px-1 rounded font-medium"
          >
            {value.slice(marker.start, marker.end)}
          </span>
        );
      }
      lastIndex = marker.end;
    }

    if (lastIndex < value.length) {
      parts.push(
        <span key={`text-end`} className="whitespace-pre-wrap">
          {value.slice(lastIndex)}
        </span>
      );
    }

    return parts;
  };

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        <textarea
          ref={textareaRef}
          className={cn(
            'mention-textarea input-base resize-y min-h-[160px] font-mono text-sm leading-relaxed',
            error && 'border-rose-400 focus:ring-rose-400/50 focus:border-rose-400'
          )}
          value={value}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={rows}
        />

        {popup.visible && popup.type === 'mention' && filteredUsers.length > 0 && (
          <div
            className="mention-popup absolute z-50 w-64 max-h-60 overflow-y-auto bg-white rounded-lg shadow-xl border border-slate-200 py-1 scrollbar-thin"
            style={{ top: popup.top, left: popup.left }}
          >
            {filteredUsers.map((user, idx) => (
              <button
                key={user.id}
                type="button"
                className={cn(
                  'w-full px-3 py-2 flex items-center gap-3 text-left transition-colors',
                  idx === popup.selectedIndex ? 'bg-amber-50' : 'hover:bg-slate-50'
                )}
                onClick={() => insertMention(user)}
                onMouseEnter={() => setPopup((p) => ({ ...p, selectedIndex: idx }))}
              >
                <Avatar name={user.name} color={user.avatarColor} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-800 truncate">{user.name}</div>
                  <div className="text-xs text-slate-500 truncate">{user.email}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {popup.visible && popup.type === 'action' && (
          <div
            className="mention-popup absolute z-50 w-56 bg-white rounded-lg shadow-xl border border-slate-200 py-2 px-3"
            style={{ top: popup.top, left: popup.left }}
          >
            <div className="flex items-center gap-2 text-sm">
              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-mono text-xs">#Action</span>
              <span className="text-slate-600">按 Tab 或空格插入</span>
            </div>
          </div>
        )}
      </div>

      {value && (
        <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-100 text-sm text-slate-700 min-h-[40px]">
          {renderPreview()}
        </div>
      )}

      {error && <p className="mt-1 text-sm text-rose-600">{error}</p>}
    </div>
  );
};

export default MentionEditor;
