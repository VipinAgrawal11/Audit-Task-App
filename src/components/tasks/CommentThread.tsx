import { useState } from 'react';
import { Send } from 'lucide-react';
import { useComments } from '@/hooks/useComments';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, Spinner } from '@/components/ui/Misc';
import { formatDateTime } from '@/lib/utils';

interface CommentThreadProps {
  taskId: string;
  /** Resolve a user id to a display name. */
  nameOf: (id: string) => string;
}

export function CommentThread({ taskId, nameOf }: CommentThreadProps) {
  const { profile } = useAuth();
  const { comments, loading, addComment } = useComments(taskId);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (!profile || !text.trim()) return;
    setSending(true);
    try {
      await addComment(profile.id, text);
      setText('');
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col">
      <h4 className="mb-2 text-sm font-semibold text-navy-700">Remarks</h4>

      <div className="mb-3 max-h-60 space-y-3 overflow-y-auto pr-1">
        {loading ? (
          <Spinner className="h-5 w-5" />
        ) : comments.length === 0 ? (
          <p className="text-sm text-navy-400">No remarks yet.</p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="flex gap-2.5">
              <Avatar name={nameOf(c.user_id)} size={30} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold text-navy-800">{nameOf(c.user_id)}</span>
                  <span className="text-[11px] text-navy-400">{formatDateTime(c.created_at)}</span>
                </div>
                <p className="whitespace-pre-wrap break-words text-sm text-navy-600">{c.comment}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex items-end gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSend();
          }}
          rows={2}
          placeholder="Add a remark… (Ctrl/Cmd+Enter to send)"
          className="input resize-none"
        />
        <button
          onClick={handleSend}
          disabled={sending || !text.trim()}
          className="btn-gold h-10 px-3"
          aria-label="Send remark"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
