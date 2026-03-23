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
  const previewAttachment = result?.attachments?.find(isPreviewAttachment) ?? result?.attachments?.[0] ?? null
  const outputPath = formatOutputPath(previewAttachment, session)
  const stripItems = works.slice(0, 8)

  return (
    <section className="relative flex h-full min-h-0 flex-col overflow-hidden bg-transparent">
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0 px-6 pb-2 pt-6 sm:px-8 lg:px-10">
          <div className="min-w-0 truncate font-mono text-xs text-text-secondary/58">
            {outputPath}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-5 pb-5 pt-4 sm:px-8 lg:px-10">
          <div className="min-h-0 flex-1">
            <div className="flex h-full min-h-[360px] items-center justify-center bg-transparent sm:min-h-[460px] lg:min-h-[560px]">
              <PlotPreviewSurface attachment={previewAttachment} result={result} />
            </div>
          </div>

          <div className="mt-5 px-2 py-3 sm:px-0">
            <div className="flex items-center gap-3 text-[11px] text-text-secondary/55">
              <div className="font-medium tracking-[0.18em]">预览区域</div>
              <span className="rounded-full bg-bg-secondary/70 px-2.5 py-1 text-[11px]">
                {works.length}
              </span>
            </div>

            <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
              {stripItems.map((entry, index) => {
                const selected = entry.work.id === selectedWorkId
                const thumbnail = entry.result?.attachments?.find(isImageAttachment) ?? null
                return (
                  <button
                    key={entry.work.id}
                    type="button"
                    onClick={() => onSelectWork(entry.work.id)}
                    className={`flex h-16 min-w-[5rem] shrink-0 items-center justify-center overflow-hidden rounded-[1rem] bg-white transition ${
                      selected
                        ? 'shadow-[0_0_0_2px_rgba(var(--accent-rgb),0.22),0_12px_24px_rgba(15,23,42,0.08)]'
                        : 'shadow-[0_6px_18px_rgba(15,23,42,0.06)] hover:-translate-y-1'
                    }`}
                    title={entry.work.title}
                  >
                    {thumbnail ? (
                      <img
                        src={thumbnail.path}
                        alt={thumbnail.name ?? entry.work.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="px-3 text-center text-[10px] leading-4 text-text-secondary/45">
                        IMG {String(index + 1).padStart(2, '0')}
                      </div>
                    )}
                  </button>
                )
              })}

              {stripItems.length === 0 && (
                <div className="flex h-16 min-w-[10rem] items-center rounded-[1rem] bg-white px-4 text-sm text-text-secondary/55 shadow-[0_6px_18px_rgba(15,23,42,0.06)]">
                  暂无产出
                </div>
              )}
            </div>
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
  if (attachment?.mimeType?.startsWith('image/') || isImagePath(attachment?.path)) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-[0.9rem] bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] sm:p-6">
        <img
          src={attachment?.path}
          alt={attachment?.name ?? 'plot preview'}
          className="max-h-full max-w-full rounded-[0.7rem] object-contain shadow-[0_20px_60px_rgba(15,23,42,0.14)]"
        />
      </div>
    )
  }

  if (result?.kind === 'failure-report') {
    return (
      <div className="flex h-full items-center justify-center px-10 text-center text-sm leading-7 text-rose-600/80">
        Plot 渲染失败。请重新生成。
      </div>
    )
  }

  return (
    <div className="flex h-full w-full items-center justify-center rounded-[0.9rem] bg-white px-10 text-center text-sm leading-7 text-text-secondary/55 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
      Matplotlib Plot Preview
    </div>
  )
}

function isPreviewAttachment(attachment: { path: string; mimeType?: string } | undefined) {
  return isImageAttachment(attachment)
}

function formatOutputPath(
  attachment: StudioFileAttachment | null | undefined,
  session: StudioSession | null,
) {
  if (attachment?.name) {
    return attachment.name
  }

  if (attachment?.path) {
    if (attachment.path.startsWith('data:')) {
      return 'inline-preview.png'
    }
    return truncateStudioText(attachment.path, 88)
  }

  return session?.directory ?? '等待输出文件'
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
