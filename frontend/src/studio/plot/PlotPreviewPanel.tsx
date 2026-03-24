import type {
  StudioFileAttachment,
  StudioPermissionDecision,
  StudioPermissionRequest,
  StudioRun,
  StudioSession,
  StudioTask,
  StudioWork,
  StudioWorkResult,
} from '../protocol/studio-agent-types'
import { truncateStudioText } from '../theme'
import { useI18n } from '../../i18n'

interface PlotWorkListItem {
  work: StudioWork
  latestTask: StudioTask | null
  result: StudioWorkResult | null
}

interface PlotPreviewPanelProps {
  session: StudioSession | null
  works: PlotWorkListItem[]
  selectedWorkId: string | null
  work: StudioWork | null
  result: StudioWorkResult | null
  latestRun: StudioRun | null
  tasks: StudioTask[]
  requests: StudioPermissionRequest[]
  replyingPermissionIds: Record<string, boolean>
  latestAssistantText: string
  errorMessage?: string | null
  onSelectWork: (workId: string) => void
  onReply: (requestId: string, reply: StudioPermissionDecision) => Promise<void> | void
}

export function PlotPreviewPanel({
  session,
  works,
  selectedWorkId,
  result,
  onSelectWork,
}: PlotPreviewPanelProps) {
  const { t } = useI18n()
  const previewAttachment = result?.attachments?.find(isPreviewAttachment) ?? result?.attachments?.[0] ?? null
  const outputPath = formatOutputPath(previewAttachment, session, t('studio.plot.inlinePreview'), t('studio.plot.waitingOutputFile'))
  const stripItems = works.slice(0, 12)

  return (
    <section className="relative flex h-full min-h-0 flex-col overflow-hidden bg-bg-primary/40 backdrop-blur-sm">
      {/* 顶部路径栏 - 采用极致消隐设计 */}
      <div className="relative shrink-0 px-8 pb-3 pt-8">
        <div className="flex items-center justify-between">
          <div className="group flex items-center gap-3">
            <div className="h-1.5 w-1.5 rounded-full bg-accent-rgb/40" />
            <div className="min-w-0 font-mono text-[10px] uppercase tracking-[0.2em] text-text-secondary/40 transition-colors group-hover:text-text-secondary/70">
              {outputPath}
            </div>
          </div>
          <div className="flex items-center gap-4 font-mono text-[10px] tracking-widest text-text-secondary/30">
            <span>{t('studio.plot.ready')}</span>
            <span className="studio-cursor">_</span>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-6 pb-6 pt-2 sm:px-8 lg:px-10">
        {/* 画布主区域 - 对齐项目的大圆角与高级阴影 */}
        <div className="relative min-h-0 flex-1">
          <div className="flex h-full min-h-[360px] items-center justify-center sm:min-h-[460px] lg:min-h-[560px]">
            <PlotPreviewSurface attachment={previewAttachment} result={result} />
          </div>
        </div>

        {/* 底部条状预览 - 增加呼吸感 */}
        <div className="mt-8">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.4em] text-text-secondary/35">{t('studio.plot.history')}</div>
              <div className="h-px w-8 bg-border/10" />
              <span className="font-mono text-[10px] text-text-secondary/40">
                {works.length.toString().padStart(2, '0')}
              </span>
            </div>
          </div>

          <div className="mt-4 flex gap-4 overflow-x-auto pb-4 pt-1">
            {stripItems.map((entry, index) => {
              const selected = entry.work.id === selectedWorkId
              const thumbnail = entry.result?.attachments?.find(isImageAttachment) ?? null
              return (
                <button
                  key={entry.work.id}
                  type="button"
                  onClick={() => onSelectWork(entry.work.id)}
                  className={`group relative flex h-20 w-32 shrink-0 items-center justify-center overflow-hidden rounded-2xl transition-all duration-500 ${
                    selected
                      ? 'bg-bg-secondary/60 border border-accent-rgb/25 scale-[0.96] shadow-inner'
                      : 'bg-bg-secondary/30 border border-transparent hover:bg-bg-secondary/50 hover:scale-[0.98]'
                  }`}
                >
                  {thumbnail ? (
                    <img
                      src={thumbnail.path}
                      alt={thumbnail.name ?? entry.work.title}
                      className={`h-full w-full object-cover transition-transform duration-700 ${selected ? 'scale-100' : 'scale-110 opacity-60 group-hover:scale-100 group-hover:opacity-100'}`}
                    />
                  ) : (
                    <div className="font-mono text-[9px] tracking-tighter text-text-secondary/40">
                      PLOT_{String(index + 1).padStart(2, '0')}
                    </div>
                  )}
                  {selected && (
                    <div className="absolute inset-0 bg-accent-rgb/5 pointer-events-none" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

function PlotPreviewSurface({
  attachment,
  result,
}: {
  attachment: StudioFileAttachment | null | undefined
  result: StudioWorkResult | null
}) {
  const { t } = useI18n()
  if (attachment?.mimeType?.startsWith('image/') || isImagePath(attachment?.path)) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <img
          src={attachment?.path}
          alt={attachment?.name ?? t('studio.plot.previewAlt')}
          className="max-h-full max-w-full object-contain"
        />
      </div>
    )
  }

  if (result?.kind === 'failure-report') {
    return (
      <div className="flex flex-col items-center justify-center opacity-30">
        <div className="text-sm font-medium text-rose-600/70 uppercase tracking-widest">{t('studio.renderFailed')}</div>
      </div>
    )
  }

  // 没有任何产出时直接返回空，保持界面洁净
  return null
}

function isPreviewAttachment(attachment: { path: string; mimeType?: string } | undefined) {
  return isImageAttachment(attachment)
}

function formatOutputPath(
  attachment: StudioFileAttachment | null | undefined,
  session: StudioSession | null,
  inlinePreviewLabel: string,
  waitingOutputLabel: string,
) {
  if (attachment?.name) {
    return attachment.name
  }

  if (attachment?.path) {
    if (attachment.path.startsWith('data:')) {
      return inlinePreviewLabel
    }
    return truncateStudioText(attachment.path, 88)
  }

  return session?.directory ?? waitingOutputLabel
}

function isImageAttachment(attachment: { path: string; mimeType?: string } | undefined) {
  if (!attachment) {
    return false
  }

  return attachment.mimeType?.startsWith('image/') || isImagePath(attachment.path)
}

function isImagePath(path?: string) {
  return Boolean(path && /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(path))
}
