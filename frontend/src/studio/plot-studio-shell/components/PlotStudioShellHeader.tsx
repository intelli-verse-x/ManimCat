import ManimCatLogo from '../../../components/ManimCatLogo'
import { useI18n } from '../../../i18n'

interface PlotStudioShellHeaderProps {
  directory: string | null | undefined
  onExitClick: () => void
}

export function PlotStudioShellHeader({ directory, onExitClick }: PlotStudioShellHeaderProps) {
  const { t } = useI18n()

  return (
    <header className="mb-10 flex shrink-0 items-center justify-between gap-6 md:mb-12">
      <div className="flex min-w-0 items-center gap-4 sm:gap-6">
        <ManimCatLogo className="h-8 w-8 shrink-0 opacity-80 mix-blend-multiply dark:mix-blend-normal sm:h-9 sm:w-9" />
        <div className="flex min-w-0 items-baseline gap-4 sm:gap-6">
          <span className="truncate text-lg font-light tracking-[0.22em] sm:text-xl sm:tracking-[0.28em]">MANIMCAT</span>
          <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.36em] opacity-35 sm:text-[11px]">{directory ?? 'workspace'}</span>
        </div>
      </div>
      <button
        onClick={onExitClick}
        className="shrink-0 font-mono text-[10px] uppercase tracking-[0.4em] opacity-35 transition-opacity hover:opacity-100"
      >
        {t('studio.exitAction')}
      </button>
    </header>
  )
}
