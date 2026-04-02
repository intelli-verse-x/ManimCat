import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useModalTransition } from '../../hooks/useModalTransition';
import { useI18n } from '../../i18n';
import { CLOSED_IMAGE_CONTEXT_MENU, ImageContextMenu } from './context-menu';
import { copyImageAssetToClipboard, exportImageAsset, type ExportFormat } from './image-asset';
import { LightboxAnnotator } from './LightboxAnnotator';
import { COLOR_PRESETS, DEFAULT_COLOR, DEFAULT_WIDTH } from '../canvas/constants';

interface ImageLightboxProps {
  isOpen: boolean;
  activeImage?: string;
  activeIndex: number;
  total: number;
  zoom: number;
  editableFilename?: string;
  variant?: 'dark' | 'studio-light';
  minZoom?: number;
  maxZoom?: number;
  onZoomChange: (nextZoom: number) => void;
  onPrev?: () => void;
  onNext?: () => void;
  onClose: () => void;
  onCommitAnnotatedImage?: (attachment: { file: File; filename: string }) => Promise<void> | void;
}

export function ImageLightbox({
  isOpen,
  activeImage,
  activeIndex,
  total,
  zoom,
  editableFilename,
  variant = 'dark',
  minZoom = 0.5,
  maxZoom = 4,
  onZoomChange,
  onPrev,
  onNext,
  onClose,
  onCommitAnnotatedImage,
}: ImageLightboxProps) {
  const { t } = useI18n();
  const { shouldRender, isExiting } = useModalTransition(isOpen, 320);
  const shellRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const panPointerIdRef = useRef<number | null>(null);
  const panOriginRef = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);
  const [contextMenu, setContextMenu] = useState(CLOSED_IMAGE_CONTEXT_MENU);
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null);
  const [copyingFormat, setCopyingFormat] = useState<'png' | 'svg' | null>(null);
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [annotationTool, setAnnotationTool] = useState<'pen' | 'eraser' | 'pan'>('pen');
  const [annotationColor, setAnnotationColor] = useState(DEFAULT_COLOR);
  const [annotationStrokeWidth, setAnnotationStrokeWidth] = useState(DEFAULT_WIDTH);
  const [isBrushSettingsOpen, setIsBrushSettingsOpen] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const isStudioLight = variant === 'studio-light';

  useEffect(() => {
    if (!shouldRender) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setContextMenu(CLOSED_IMAGE_CONTEXT_MENU);
        setIsAnnotating(false);
        onClose();
      } else if (event.key === 'ArrowLeft') {
        if (isAnnotating) {
          return;
        }
        event.preventDefault();
        setContextMenu(CLOSED_IMAGE_CONTEXT_MENU);
        onPrev?.();
      } else if (event.key === 'ArrowRight') {
        if (isAnnotating) {
          return;
        }
        event.preventDefault();
        setContextMenu(CLOSED_IMAGE_CONTEXT_MENU);
        onNext?.();
      } else if (
        isStudioLight &&
        onCommitAnnotatedImage &&
        event.key === 'Shift' &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.repeat
      ) {
        const target = event.target as HTMLElement | null;
        if (
          target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          target instanceof HTMLSelectElement ||
          target?.isContentEditable
        ) {
          return;
        }
        event.preventDefault();
        setIsAnnotating((current) => !current);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isAnnotating, isStudioLight, onClose, onCommitAnnotatedImage, onNext, onPrev, shouldRender]);

  useEffect(() => {
    if (!shouldRender || typeof document === 'undefined') {
      return undefined;
    }

    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = 'hidden';

    return () => {
      body.style.overflow = previousOverflow;
    };
  }, [shouldRender]);

  useEffect(() => {
    if (!shouldRender) {
      setContextMenu(CLOSED_IMAGE_CONTEXT_MENU);
      setExportingFormat(null);
      setCopyingFormat(null);
      setIsAnnotating(false);
      setNaturalSize({ width: 0, height: 0 });
      setViewportSize({ width: 0, height: 0 });
      setAnnotationTool('pen');
      setAnnotationColor(DEFAULT_COLOR);
      setAnnotationStrokeWidth(DEFAULT_WIDTH);
      setIsBrushSettingsOpen(false);
      setIsPanning(false);
      setPanOffset({ x: 0, y: 0 });
      panPointerIdRef.current = null;
      panOriginRef.current = null;
    }
  }, [shouldRender]);

  useEffect(() => {
    if (!shouldRender) {
      return undefined;
    }

    const frame = window.requestAnimationFrame(() => {
      shellRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [shouldRender]);

  const handleStepZoom = (delta: number) => {
    const nextZoom = roundZoom(clampZoom(zoom + delta, minZoom, maxZoom));
    onZoomChange(nextZoom);
  };

  const handleStudioWheel = (event: WheelEvent) => {
    event.preventDefault();

    const nextZoom = roundZoom(clampZoom(zoom + (event.deltaY < 0 ? 0.12 : -0.12), minZoom, maxZoom));
    if (nextZoom === zoom) {
      return;
    }
    onZoomChange(nextZoom);
  };

  useEffect(() => {
    if (!shouldRender) {
      return undefined;
    }

    const viewport = viewportRef.current;
    if (!viewport || typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    const updateViewportSize = () => {
      const rect = viewport.getBoundingClientRect();
      setViewportSize({
        width: Math.max(0, rect.width),
        height: Math.max(0, rect.height),
      });
    };

    updateViewportSize();
    const observer = new ResizeObserver(() => updateViewportSize());
    observer.observe(viewport);
    window.addEventListener('resize', updateViewportSize);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateViewportSize);
    };
  }, [shouldRender]);

  useEffect(() => {
    if (!shouldRender) {
      return undefined;
    }

    const viewport = viewportRef.current;
    if (!viewport) {
      return undefined;
    }

    const handleNativeWheel = (event: WheelEvent) => {
      handleStudioWheel(event);
    };

    viewport.addEventListener('wheel', handleNativeWheel, { passive: false });

    return () => {
      viewport.removeEventListener('wheel', handleNativeWheel);
    };
  }, [handleStudioWheel, shouldRender, variant]);

  const handleContextMenu = (event: ReactMouseEvent<HTMLElement>) => {
    event.preventDefault();
    setContextMenu({
      open: true,
      x: event.clientX,
      y: event.clientY,
    });
  };

  const handleExport = async (format: ExportFormat) => {
    if (!activeImage || exportingFormat) {
      return;
    }

    setContextMenu(CLOSED_IMAGE_CONTEXT_MENU);
    setExportingFormat(format);
    try {
      await exportImageAsset({
        source: activeImage,
        format,
        index: activeIndex,
      });
    } catch (error) {
      console.error(`Failed to export ${format}`, error);
    } finally {
      setExportingFormat(null);
    }
  };

  const handleCopy = async (format: 'png' | 'svg') => {
    if (!activeImage || copyingFormat) {
      return;
    }

    setContextMenu(CLOSED_IMAGE_CONTEXT_MENU);
    setCopyingFormat(format);
    try {
      await copyImageAssetToClipboard({
        source: activeImage,
        format,
      });
    } catch (error) {
      console.error(`Failed to copy ${format}`, error);
    } finally {
      setCopyingFormat(null);
    }
  };

  const handlePanStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (isAnnotating && annotationTool !== 'pan') {
      return;
    }

    panPointerIdRef.current = event.pointerId;
    panOriginRef.current = {
      x: event.clientX,
      y: event.clientY,
      offsetX: panOffset.x,
      offsetY: panOffset.y,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
    setIsPanning(true);
  };

  const handlePanMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((isAnnotating && annotationTool !== 'pan') || panPointerIdRef.current !== event.pointerId || !panOriginRef.current) {
      return;
    }

    const deltaX = event.clientX - panOriginRef.current.x;
    const deltaY = event.clientY - panOriginRef.current.y;
    const maxOffsetX = studioFrameMetrics?.maxOffsetX ?? 0;
    const maxOffsetY = studioFrameMetrics?.maxOffsetY ?? 0;
    setPanOffset({
      x: clampPan(panOriginRef.current.offsetX + deltaX, maxOffsetX),
      y: clampPan(panOriginRef.current.offsetY + deltaY, maxOffsetY),
    });
  };

  const handlePanEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (panPointerIdRef.current !== event.pointerId) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    panPointerIdRef.current = null;
    panOriginRef.current = null;
    setIsPanning(false);
  };

  const studioFrameMetrics = useMemo(() => {
    if (!activeImage) {
      return undefined;
    }

    const width = naturalSize.width;
    const height = naturalSize.height;
    const availableWidth = Math.max(0, viewportSize.width - 48);
    const availableHeight = Math.max(0, viewportSize.height - 48);

    if (!width || !height || !availableWidth || !availableHeight) {
      return undefined;
    }

    const fitScale = Math.min(availableWidth / width, availableHeight / height);
    const appliedScale = Math.max(0.01, fitScale) * Math.max(zoom, 0.01);
    const renderedWidth = Math.max(1, Math.round(width * appliedScale));
    const renderedHeight = Math.max(1, Math.round(height * appliedScale));

    return {
      width: renderedWidth,
      height: renderedHeight,
      maxOffsetX: Math.max(0, (renderedWidth - availableWidth) / 2),
      maxOffsetY: Math.max(0, (renderedHeight - availableHeight) / 2),
    };
  }, [activeImage, naturalSize.height, naturalSize.width, viewportSize.height, viewportSize.width, zoom]);

  useEffect(() => {
    setPanOffset({ x: 0, y: 0 });
    panPointerIdRef.current = null;
    panOriginRef.current = null;
    setIsPanning(false);
  }, [activeImage]);

  useEffect(() => {
    if (!studioFrameMetrics) {
      return;
    }

    setPanOffset((current) => ({
      x: clampPan(current.x, studioFrameMetrics.maxOffsetX),
      y: clampPan(current.y, studioFrameMetrics.maxOffsetY),
    }));
  }, [studioFrameMetrics]);

  if (!shouldRender || !activeImage) {
    return null;
  }

  if (isStudioLight) {
    return createPortal(
      <>
        <div
          ref={shellRef}
          tabIndex={-1}
          className={`fixed inset-0 z-[180] overflow-hidden bg-white/30 text-text-primary backdrop-blur-2xl ${
            isExiting ? 'animate-fade-out-soft' : 'animate-fade-in-soft'
          }`}
        >
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.94),_rgba(255,255,255,0.5)_42%,_rgba(244,244,245,0.26)_100%)]" />
            <div className="absolute left-[-8%] top-[-10%] h-[38vh] w-[38vw] rounded-full bg-white/55 blur-[110px]" />
            <div className="absolute bottom-[-16%] right-[-6%] h-[42vh] w-[34vw] rounded-full bg-slate-200/45 blur-[120px]" />
          </div>

          <button
            type="button"
            aria-label={t('common.close')}
            onClick={onClose}
            className="absolute inset-0 h-full w-full cursor-default"
          />

          <button
            type="button"
            onClick={onClose}
            className="absolute right-6 top-5 z-20 text-[11px] font-medium uppercase tracking-[0.28em] text-text-secondary/55 transition hover:text-text-primary"
          >
            {t('common.close')}
          </button>

          <div
            ref={viewportRef}
            className="relative z-10 flex h-full w-full items-center justify-center overflow-hidden p-4 sm:p-6"
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                onClose();
              }
            }}
          >
            {onCommitAnnotatedImage && (
              <div className="pointer-events-none absolute bottom-5 left-6 z-30 flex max-w-[22rem] flex-col items-start gap-3 text-left">
                {isAnnotating ? (
                  <>
                    <div className="pointer-events-auto absolute bottom-[calc(100%+18px)] left-0 flex flex-col gap-3">
                      <div className="flex flex-col gap-3 rounded-[28px] border border-border/5 bg-white/72 p-2.5 shadow-2xl backdrop-blur-xl">
                        <ToolButton
                          active={annotationTool === 'pen'}
                          label={t('studio.plot.annotationPen')}
                          onClick={() => setAnnotationTool('pen')}
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
                          </svg>
                        </ToolButton>
                        <ToolButton
                          active={annotationTool === 'eraser'}
                          label={t('studio.plot.annotationEraser')}
                          onClick={() => setAnnotationTool('eraser')}
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M19 14a5 5 0 11-10 0 5 5 0 0110 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M19 14H9" />
                          </svg>
                        </ToolButton>
                        <ToolButton
                          active={annotationTool === 'pan'}
                          label={t('studio.plot.annotationPan')}
                          onClick={() => setAnnotationTool('pan')}
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.1} d="M8 11V6.5a1.5 1.5 0 013 0V10" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.1} d="M12 10V5.5a1.5 1.5 0 013 0V10" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.1} d="M16 10V7.5a1.5 1.5 0 013 0v5.2c0 3.5-2.1 6.3-5.8 7.3l-1.8.5c-1.7.5-3.6.1-5-1.2L4 16.9" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.1} d="M8 10.5V9a1.5 1.5 0 00-3 0v5" />
                          </svg>
                        </ToolButton>
                        <ToolButton
                          active={isBrushSettingsOpen}
                          label={t('canvas.tool.brushSettings')}
                          onClick={() => setIsBrushSettingsOpen((current) => !current)}
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M4 7h16M7 12h10M10 17h4" />
                          </svg>
                        </ToolButton>
                      </div>
                      {annotationTool === 'pen' && isBrushSettingsOpen && (
                        <div className="w-48 rounded-[28px] border border-border/5 bg-white/82 p-5 shadow-2xl backdrop-blur-xl animate-fade-in-soft">
                          <div className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-text-secondary/40">{t('canvas.color')}</div>
                          <div className="grid grid-cols-4 gap-2.5">
                            {COLOR_PRESETS.map((preset) => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => setAnnotationColor(preset)}
                                className={`h-6 w-6 rounded-full transition-all duration-300 ${
                                  annotationColor === preset ? 'ring-2 ring-offset-2 ring-accent scale-90' : 'hover:scale-110'
                                }`}
                                style={{ backgroundColor: preset }}
                                aria-label={preset}
                              />
                            ))}
                          </div>
                          <div className="mt-4 flex items-center gap-3">
                            <input
                              type="color"
                              value={annotationColor}
                              onChange={(event) => setAnnotationColor(event.target.value)}
                              className="h-8 w-12 cursor-pointer rounded-lg border-none bg-transparent"
                            />
                            <span className="font-mono text-[10px] uppercase tracking-tighter text-text-secondary/40">{annotationColor}</span>
                          </div>

                          <div className="mb-4 mt-8 text-[10px] font-bold uppercase tracking-[0.2em] text-text-secondary/40">{t('canvas.stroke')}</div>
                          <input
                            type="range"
                            min={2}
                            max={28}
                            value={annotationStrokeWidth}
                            onChange={(event) => setAnnotationStrokeWidth(Number(event.target.value))}
                            className="w-full accent-accent"
                          />
                          <div className="mt-3 flex items-center justify-between font-mono text-[9px] uppercase tracking-widest text-text-secondary/40">
                            <span>{t('canvas.strokeThin')}</span>
                            <span>{annotationStrokeWidth}px</span>
                            <span>{t('canvas.strokeThick')}</span>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="text-[11px] font-medium text-text-secondary/55">
                      {t('studio.plot.annotationHintEditing')}
                    </div>
                  </>
                ) : (
                  <div className="text-[11px] font-medium text-text-secondary/55">
                    {t('studio.plot.annotationHintIdle')}
                  </div>
                )}
              </div>
            )}
            <div
              className={`relative select-none ${
                !isAnnotating || annotationTool === 'pan'
                  ? (isPanning ? 'cursor-grabbing' : 'cursor-grab')
                  : ''
              }`}
              style={{
                width: studioFrameMetrics ? `${studioFrameMetrics.width}px` : undefined,
                height: studioFrameMetrics ? `${studioFrameMetrics.height}px` : undefined,
                transform: `translate3d(${studioFrameMetrics ? clampPan(panOffset.x, studioFrameMetrics.maxOffsetX) : 0}px, ${
                  studioFrameMetrics ? clampPan(panOffset.y, studioFrameMetrics.maxOffsetY) : 0
                }px, 0)`,
              }}
              onPointerDown={handlePanStart}
              onPointerMove={handlePanMove}
              onPointerUp={handlePanEnd}
              onPointerCancel={handlePanEnd}
              onClick={(event) => event.stopPropagation()}
              onContextMenu={isAnnotating ? (event) => event.preventDefault() : handleContextMenu}
            >
              <img
                ref={imageRef}
                src={activeImage}
                alt={t('image.lightboxAlt', { index: activeIndex + 1 })}
                className={`block max-w-none select-none drop-shadow-[0_30px_80px_rgba(148,163,184,0.28)] ${
                  isExiting ? 'animate-fade-out-soft' : 'animate-fade-in-soft'
                }`}
                crossOrigin="anonymous"
                draggable={false}
                style={{ width: '100%', height: '100%' }}
                onLoad={(event) => {
                  const target = event.currentTarget;
                  setNaturalSize({
                    width: Math.max(1, target.naturalWidth || target.width || 1),
                    height: Math.max(1, target.naturalHeight || target.height || 1),
                  });
                }}
              />
              {isAnnotating && onCommitAnnotatedImage ? (
                <LightboxAnnotator
                  imageKey={activeImage}
                  imageRef={imageRef}
                  editable={isAnnotating}
                  tool={annotationTool}
                  color={annotationColor}
                  strokeWidth={annotationStrokeWidth}
                  onCancelEdit={() => setIsAnnotating(false)}
                  onCommit={async (file) => {
                    const filename = buildAnnotatedFilename(editableFilename);
                    await onCommitAnnotatedImage({
                      file: new File([file], filename, { type: file.type || 'image/png' }),
                      filename,
                    });
                    setIsAnnotating(false);
                  }}
                />
              ) : null}
            </div>
          </div>
        </div>
        <ImageContextMenu
          state={contextMenu}
          variant={variant}
          title={t('image.exportMenuTitle')}
          items={[
            {
              key: 'copy-png',
              label: copyingFormat === 'png' ? t('image.copying') : t('image.copyPng'),
              busy: copyingFormat === 'png',
              onClick: () => void handleCopy('png'),
            },
            {
              key: 'copy-svg',
              label: copyingFormat === 'svg' ? t('image.copying') : t('image.copySvg'),
              busy: copyingFormat === 'svg',
              onClick: () => void handleCopy('svg'),
            },
            {
              key: 'export-png',
              label: exportingFormat === 'png' ? t('image.exporting') : t('image.exportPng'),
              busy: exportingFormat === 'png',
              onClick: () => void handleExport('png'),
            },
            {
              key: 'export-svg',
              label: exportingFormat === 'svg' ? t('image.exporting') : t('image.exportSvg'),
              busy: exportingFormat === 'svg',
              onClick: () => void handleExport('svg'),
            },
            {
              key: 'export-pdf',
              label: exportingFormat === 'pdf' ? t('image.exporting') : t('image.exportPdf'),
              busy: exportingFormat === 'pdf',
              onClick: () => void handleExport('pdf'),
            },
          ]}
          onClose={() => setContextMenu(CLOSED_IMAGE_CONTEXT_MENU)}
        />
      </>,
      document.body,
    );
  }

  return createPortal(
    <>
      <div
        ref={shellRef}
        tabIndex={-1}
        className="fixed inset-0 z-[180] flex flex-col bg-black/85 text-white/90 backdrop-blur-sm"
      >
        <button
          type="button"
          aria-label={t('common.close')}
          onClick={onClose}
          className="absolute inset-0 h-full w-full cursor-default"
        />
        <div className="relative z-10 flex items-center justify-between px-5 py-3 text-white/90">
          <div className="text-xs">
            {t('image.lightboxTitle', { current: activeIndex + 1, total })}
          </div>
          <div className="flex items-center gap-3">
            {onPrev ? (
              <button type="button" onClick={onPrev} className="rounded bg-white/15 px-2 py-1 text-xs hover:bg-white/25">
                ←
              </button>
            ) : null}
            {onNext ? (
              <button type="button" onClick={onNext} className="rounded bg-white/15 px-2 py-1 text-xs hover:bg-white/25">
                →
              </button>
            ) : null}
            <button type="button" onClick={() => handleStepZoom(-0.1)} className="rounded bg-white/15 px-2 py-1 text-xs hover:bg-white/25">
              -
            </button>
            <span className="text-xs tabular-nums">{Math.round(zoom * 100)}%</span>
            <button type="button" onClick={() => handleStepZoom(0.1)} className="rounded bg-white/15 px-2 py-1 text-xs hover:bg-white/25">
              +
            </button>
            <button type="button" onClick={onClose} className="rounded bg-white/15 px-2 py-1 text-xs hover:bg-white/25">
              {t('common.close')}
            </button>
          </div>
        </div>
        <div
          ref={viewportRef}
          className="relative z-10 flex flex-1 items-center justify-center overflow-auto px-6 pb-6"
        >
          <div
            className="flex h-full w-full items-center justify-center"
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                onClose();
              }
            }}
          >
          <img
            ref={imageRef}
            src={activeImage}
            alt={t('image.lightboxAlt', { index: activeIndex + 1 })}
            className="max-w-none"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
            onClick={(event) => event.stopPropagation()}
            onContextMenu={handleContextMenu}
          />
          </div>
        </div>
      </div>
      <ImageContextMenu
        state={contextMenu}
        variant={variant}
        title={t('image.exportMenuTitle')}
        items={[
          {
            key: 'copy-png',
            label: copyingFormat === 'png' ? t('image.copying') : t('image.copyPng'),
            busy: copyingFormat === 'png',
            onClick: () => void handleCopy('png'),
          },
          {
            key: 'copy-svg',
            label: copyingFormat === 'svg' ? t('image.copying') : t('image.copySvg'),
            busy: copyingFormat === 'svg',
            onClick: () => void handleCopy('svg'),
          },
          {
            key: 'export-png',
            label: exportingFormat === 'png' ? t('image.exporting') : t('image.exportPng'),
            busy: exportingFormat === 'png',
            onClick: () => void handleExport('png'),
          },
          {
            key: 'export-svg',
            label: exportingFormat === 'svg' ? t('image.exporting') : t('image.exportSvg'),
            busy: exportingFormat === 'svg',
            onClick: () => void handleExport('svg'),
          },
          {
            key: 'export-pdf',
            label: exportingFormat === 'pdf' ? t('image.exporting') : t('image.exportPdf'),
            busy: exportingFormat === 'pdf',
            onClick: () => void handleExport('pdf'),
          },
        ]}
        onClose={() => setContextMenu(CLOSED_IMAGE_CONTEXT_MENU)}
      />
    </>,
    document.body,
  );
}

function clampZoom(value: number, minZoom: number, maxZoom: number) {
  return Math.min(maxZoom, Math.max(minZoom, value));
}

function roundZoom(value: number) {
  return Math.round(value * 100) / 100;
}

function clampPan(value: number, maxOffset: number) {
  return Math.min(maxOffset, Math.max(-maxOffset, value));
}

function buildAnnotatedFilename(filename?: string) {
  const basename = filename?.trim().split(/[\\/]/).pop() || 'plot-preview.png';
  const normalized = basename.replace(/\.[a-z0-9]+$/i, '');
  return `${normalized}-annotated.png`;
}

function ToolButton({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-300 ${
        active
          ? 'bg-accent text-white shadow-lg shadow-accent/20'
          : 'bg-bg-primary/40 text-text-secondary hover:bg-bg-primary/70 hover:text-text-primary'
      }`}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}
