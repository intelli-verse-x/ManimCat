import type { StudioPermissionDecision, StudioPermissionRequest } from '../protocol/studio-agent-types'
import { translatePermissionDecision } from '../labels'
import { truncateStudioText } from '../theme'
import { useI18n } from '../../i18n'

interface StudioPermissionPanelProps {
  requests: StudioPermissionRequest[]
  replyingPermissionIds: Record<string, boolean>
  onReply: (requestId: string, reply: StudioPermissionDecision) => Promise<void> | void
}

const REPLIES: StudioPermissionDecision[] = ['once', 'always', 'reject']

export function StudioPermissionPanel({
  requests,
  replyingPermissionIds,
  onReply,
}: StudioPermissionPanelProps) {
  const { t } = useI18n()
  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.28em] text-text-secondary/45">{t('studio.permission.title')}</div>
          <div className="mt-1 text-sm text-text-secondary/60">{t('studio.permission.description')}</div>
        </div>
        <span className="rounded-full bg-bg-secondary/50 px-2.5 py-1 text-xs text-text-secondary/65">
          {t('studio.permission.pendingCount', { count: requests.length })}
        </span>
      </div>

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
        {requests.map((request, index) => {
          const replying = Boolean(replyingPermissionIds[request.id])
          return (
            <article
              key={request.id}
              className={`py-3 ${index < requests.length - 1 ? 'border-b border-border/8' : ''}`}
            >
              <div className="text-sm text-text-primary/84">{request.permission}</div>
              <div className="mt-1 text-xs text-text-secondary/55">
                {request.patterns.join(', ') || t('studio.permission.noPatternMatch')}
              </div>
              {request.metadata && (
                <div className="mt-1 text-[11px] text-text-secondary/45">
                  {truncateStudioText(JSON.stringify(request.metadata), 140)}
                </div>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                {REPLIES.map((decision) => (
                  <button
                    key={decision}
                    type="button"
                    disabled={replying}
                    onClick={() => void onReply(request.id, decision)}
                    className={`px-2.5 py-1 text-xs transition ${
                      decision === 'reject'
                        ? 'text-rose-500/70 hover:text-rose-500'
                        : 'text-text-secondary/60 hover:text-text-primary/80'
                    } disabled:cursor-not-allowed disabled:opacity-40`}
                  >
                    {translatePermissionDecision(decision, t)}
                  </button>
                ))}
              </div>
            </article>
          )
        })}
        {requests.length === 0 && <div className="text-sm text-text-secondary/55">{t('studio.permission.empty')}</div>}
      </div>
    </section>
  )
}
