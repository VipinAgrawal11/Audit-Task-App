import { useState } from 'react';
import { STATUS_ORDER, STATUS_LABELS, ON_HOLD_REASONS, type TaskStatus } from '@/types';
import { cn } from '@/lib/utils';
import { STATUS_STYLES } from '@/lib/utils';

interface StatusControlProps {
  current: TaskStatus;
  currentDelayReason: string | null;
  onChange: (status: TaskStatus, delayReason: string | null) => Promise<void>;
}

/**
 * Status switcher. Choosing "On Hold" reveals a required reason picker
 * (with a free-text field when "Other" is selected).
 */
export function StatusControl({ current, currentDelayReason, onChange }: StatusControlProps) {
  const [pendingHold, setPendingHold] = useState(false);
  const [reason, setReason] = useState<string>(currentDelayReason ?? ON_HOLD_REASONS[0]);
  const [otherText, setOtherText] = useState('');
  const [busy, setBusy] = useState(false);

  async function apply(status: TaskStatus, delayReason: string | null) {
    setBusy(true);
    try {
      await onChange(status, delayReason);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(false);
      setPendingHold(false);
    }
  }

  function handleSelect(status: TaskStatus) {
    if (status === current) return;
    if (status === 'ON_HOLD') {
      setPendingHold(true);
      return;
    }
    apply(status, null);
  }

  function confirmHold() {
    const finalReason = reason === 'Other' ? otherText.trim() : reason;
    if (!finalReason) {
      alert('Please provide a reason.');
      return;
    }
    apply('ON_HOLD', finalReason);
  }

  return (
    <div>
      <p className="label">Status</p>
      <div className="flex flex-wrap gap-2">
        {STATUS_ORDER.map((s) => (
          <button
            key={s}
            disabled={busy}
            onClick={() => handleSelect(s)}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-semibold transition',
              s === current
                ? STATUS_STYLES[s] + ' ring-2 ring-offset-1 ring-navy-300'
                : 'bg-navy-50 text-navy-500 hover:bg-navy-100',
            )}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {pendingHold && (
        <div className="mt-3 rounded-lg border border-orange-200 bg-orange-50 p-3">
          <p className="label text-orange-800">Reason for putting on hold</p>
          <select className="input" value={reason} onChange={(e) => setReason(e.target.value)}>
            {ON_HOLD_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          {reason === 'Other' && (
            <input
              className="input mt-2"
              placeholder="Describe the reason…"
              value={otherText}
              onChange={(e) => setOtherText(e.target.value)}
            />
          )}
          <div className="mt-3 flex justify-end gap-2">
            <button className="btn-ghost" onClick={() => setPendingHold(false)} disabled={busy}>
              Cancel
            </button>
            <button className="btn-gold" onClick={confirmHold} disabled={busy}>
              Confirm Hold
            </button>
          </div>
        </div>
      )}

      {current === 'ON_HOLD' && currentDelayReason && !pendingHold && (
        <p className="mt-2 text-xs text-orange-700">
          On hold — <span className="font-semibold">{currentDelayReason}</span>
        </p>
      )}
    </div>
  );
}
