import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type RefObject, type SyntheticEvent } from 'react'
import { debugImageLightbox } from './debug'

interface UseLightboxCameraInput {
  activeImage?: string
  zoom: number
  minZoom: number
  maxZoom: number
  shouldRender: boolean
  isAnnotating: boolean
  annotationTool: 'pen' | 'eraser' | 'pan'
  viewportRef: RefObject<HTMLDivElement | null>
  onZoomChange: (nextZoom: number) => void
}

export function useLightboxCamera({
  activeImage,
  zoom,
  minZoom,
  maxZoom,
  shouldRender,
  isAnnotating,
  annotationTool,
  viewportRef,
  onZoomChange,
}: UseLightboxCameraInput) {
  const panPointerIdRef = useRef<number | null>(null)
  const panOriginRef = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null)
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 })
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panState, setPanState] = useState<{ image?: string; x: number; y: number }>({ image: undefined, x: 0, y: 0 })
  const panOffset = panState.image === activeImage ? { x: panState.x, y: panState.y } : { x: 0, y: 0 }

  const handleStepZoom = (delta: number) => {
    const nextZoom = roundZoom(clampZoom(zoom + delta, minZoom, maxZoom))
    if (nextZoom === zoom) {
      return
    }

    debugImageLightbox('camera.step-zoom', { zoom, nextZoom, delta })
    onZoomChange(nextZoom)
  }

  const handleViewportWheel = useCallback((event: WheelEvent) => {
    event.preventDefault()

    const nextZoom = roundZoom(clampZoom(zoom + (event.deltaY < 0 ? 0.12 : -0.12), minZoom, maxZoom))
    if (nextZoom === zoom) {
      return
    }

    debugImageLightbox('camera.wheel-zoom', {
      zoom,
      nextZoom,
      deltaY: event.deltaY,
    })
    onZoomChange(nextZoom)
  }, [maxZoom, minZoom, onZoomChange, zoom])

  const handlePanStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (isAnnotating && annotationTool !== 'pan') {
      debugImageLightbox('camera.pan-blocked', {
        reason: 'annotation-tool',
        annotationTool,
      })
      return
    }

    event.preventDefault()
    panPointerIdRef.current = event.pointerId
    panOriginRef.current = {
      x: event.clientX,
      y: event.clientY,
      offsetX: panOffset.x,
      offsetY: panOffset.y,
    }

    event.currentTarget.setPointerCapture(event.pointerId)
    setIsPanning(true)
    debugImageLightbox('camera.pan-start', {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      panX: panOffset.x,
      panY: panOffset.y,
    })
  }

  const handlePanMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((isAnnotating && annotationTool !== 'pan') || panPointerIdRef.current !== event.pointerId || !panOriginRef.current) {
      return
    }

    event.preventDefault()
    const nextPanOffset = {
      x: panOriginRef.current.offsetX + (event.clientX - panOriginRef.current.x),
      y: panOriginRef.current.offsetY + (event.clientY - panOriginRef.current.y),
    }
    setPanState({
      image: activeImage,
      x: nextPanOffset.x,
      y: nextPanOffset.y,
    })
  }

  const handlePanEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (panPointerIdRef.current !== event.pointerId) {
      return
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    panPointerIdRef.current = null
    panOriginRef.current = null
    setIsPanning(false)
    debugImageLightbox('camera.pan-end', {
      pointerId: event.pointerId,
      panX: panOffset.x,
      panY: panOffset.y,
    })
  }

  useEffect(() => {
    let cancelled = false

    if (!activeImage || !looksLikeSvg(activeImage)) {
      return undefined
    }

    void readSvgIntrinsicSize(activeImage).then((svgSize) => {
      if (!svgSize || cancelled) {
        return
      }

      setNaturalSize((current) => {
        if (
          current.width === svgSize.width
          && current.height === svgSize.height
        ) {
          return current
        }

        debugImageLightbox('camera.svg-size-resolved', {
          activeImage,
          width: svgSize.width,
          height: svgSize.height,
        })
        return svgSize
      })
    }).catch((error) => {
      debugImageLightbox('camera.svg-size-failed', {
        activeImage,
        message: error instanceof Error ? error.message : String(error),
      })
    })

    return () => {
      cancelled = true
    }
  }, [activeImage])

  useEffect(() => {
    if (!shouldRender) {
      return undefined
    }

    const viewport = viewportRef.current
    if (!viewport || typeof ResizeObserver === 'undefined') {
      return undefined
    }

    const updateViewportSize = () => {
      const rect = viewport.getBoundingClientRect()
      const nextSize = {
        width: Math.max(0, rect.width),
        height: Math.max(0, rect.height),
      }
      setViewportSize(nextSize)
      debugImageLightbox('camera.viewport-resized', nextSize)
    }

    updateViewportSize()
    const observer = new ResizeObserver(() => updateViewportSize())
    observer.observe(viewport)
    window.addEventListener('resize', updateViewportSize)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateViewportSize)
    }
  }, [shouldRender, viewportRef])

  useEffect(() => {
    if (!shouldRender) {
      return undefined
    }

    const viewport = viewportRef.current
    if (!viewport) {
      return undefined
    }

    viewport.addEventListener('wheel', handleViewportWheel, { passive: false })

    return () => {
      viewport.removeEventListener('wheel', handleViewportWheel)
    }
  }, [handleViewportWheel, shouldRender, viewportRef])

  useEffect(() => {
    if (!isPanning) {
      return undefined
    }

    const handleWindowPointerMove = (event: PointerEvent) => {
      if ((isAnnotating && annotationTool !== 'pan') || panPointerIdRef.current !== event.pointerId || !panOriginRef.current) {
        return
      }

      event.preventDefault()
      const nextPanOffset = {
        x: panOriginRef.current.offsetX + (event.clientX - panOriginRef.current.x),
        y: panOriginRef.current.offsetY + (event.clientY - panOriginRef.current.y),
      }
      setPanState({
        image: activeImage,
        x: nextPanOffset.x,
        y: nextPanOffset.y,
      })
    }

    const handleWindowPointerEnd = (event: PointerEvent) => {
      if (panPointerIdRef.current !== event.pointerId) {
        return
      }

      panPointerIdRef.current = null
      panOriginRef.current = null
      setIsPanning(false)
      debugImageLightbox('camera.pan-end-window', {
        pointerId: event.pointerId,
        panX: panOffset.x,
        panY: panOffset.y,
      })
    }

    window.addEventListener('pointermove', handleWindowPointerMove, { passive: false })
    window.addEventListener('pointerup', handleWindowPointerEnd)
    window.addEventListener('pointercancel', handleWindowPointerEnd)

    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove)
      window.removeEventListener('pointerup', handleWindowPointerEnd)
      window.removeEventListener('pointercancel', handleWindowPointerEnd)
    }
  }, [activeImage, annotationTool, isAnnotating, isPanning, panOffset.x, panOffset.y])

  const stageMetrics = useMemo(() => {
    if (!activeImage) {
      return undefined
    }

    const width = naturalSize.width
    const height = naturalSize.height
    const availableWidth = Math.max(0, viewportSize.width - 48)
    const availableHeight = Math.max(0, viewportSize.height - 48)

    if (!width || !height || !availableWidth || !availableHeight) {
      return undefined
    }

    const fitScale = Math.min(availableWidth / width, availableHeight / height)
    const baseScale = Math.max(0.01, fitScale)
    const appliedScale = baseScale * Math.max(zoom, 0.01)
    return {
      width,
      height,
      appliedScale,
    }
  }, [activeImage, naturalSize.height, naturalSize.width, viewportSize.height, viewportSize.width, zoom])

  const handleImageLoad = (event: SyntheticEvent<HTMLImageElement>) => {
    const target = event.currentTarget
    const nextNaturalSize = {
      width: Math.max(1, target.naturalWidth || target.width || 1),
      height: Math.max(1, target.naturalHeight || target.height || 1),
    }
    setNaturalSize(nextNaturalSize)
    panPointerIdRef.current = null
    panOriginRef.current = null
    setIsPanning(false)
    setPanState({ image: activeImage, x: 0, y: 0 })
    debugImageLightbox('camera.image-loaded', {
      activeImage,
      ...nextNaturalSize,
    })
    debugImageLightbox('camera.reset-image', { activeImage })
  }

  const stageStyle: CSSProperties = {
    width: stageMetrics ? `${stageMetrics.width}px` : undefined,
    height: stageMetrics ? `${stageMetrics.height}px` : undefined,
    transform: `translate3d(${panOffset.x}px, ${panOffset.y}px, 0) scale(${stageMetrics?.appliedScale ?? Math.max(zoom, 0.01)})`,
    transformOrigin: 'center center',
    touchAction: 'none',
  }

  const imageStyle: CSSProperties = {
    width: '100%',
    height: 'auto',
    display: 'block',
  }

  return {
    handleImageLoad,
    handlePanEnd,
    handlePanMove,
    handlePanStart,
    handleStepZoom,
    imageStyle,
    isPanning,
    stageMetrics,
    stageStyle,
  }
}

function clampZoom(value: number, minZoom: number, maxZoom: number) {
  return Math.min(maxZoom, Math.max(minZoom, value))
}

function roundZoom(value: number) {
  return Math.round(value * 100) / 100
}

function looksLikeSvg(source: string) {
  return source.startsWith('data:image/svg+xml') || /\.svg(?:[?#]|$)/i.test(source)
}

async function readSvgIntrinsicSize(source: string) {
  try {
    const markup = source.startsWith('data:image/svg+xml')
      ? decodeSvgDataUrl(source)
      : await fetch(source).then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch SVG: ${response.status}`)
        }
        return response.text()
      })
    return parseSvgIntrinsicSize(markup)
  } catch {
    return undefined
  }
}

function decodeSvgDataUrl(source: string) {
  const commaIndex = source.indexOf(',')
  if (commaIndex < 0) {
    throw new Error('Invalid SVG data URL')
  }

  const metadata = source.slice(0, commaIndex)
  const payload = source.slice(commaIndex + 1)
  return metadata.includes(';base64')
    ? atob(payload)
    : decodeURIComponent(payload)
}

function parseSvgIntrinsicSize(markup: string) {
  if (typeof DOMParser === 'undefined') {
    return undefined
  }

  const document = new DOMParser().parseFromString(markup, 'image/svg+xml')
  const root = document.documentElement
  if (!root || root.nodeName.toLowerCase() !== 'svg') {
    return undefined
  }

  const width = parseSvgLength(root.getAttribute('width'))
  const height = parseSvgLength(root.getAttribute('height'))
  if (width && height) {
    return { width, height }
  }

  const viewBox = root.getAttribute('viewBox')?.trim()
  if (!viewBox) {
    return undefined
  }

  const parts = viewBox.split(/[\s,]+/).map(Number)
  if (parts.length !== 4 || parts.some((value) => !Number.isFinite(value))) {
    return undefined
  }

  const viewBoxWidth = Math.abs(parts[2])
  const viewBoxHeight = Math.abs(parts[3])
  if (!viewBoxWidth || !viewBoxHeight) {
    return undefined
  }

  return {
    width: viewBoxWidth,
    height: viewBoxHeight,
  }
}

function parseSvgLength(value: string | null) {
  if (!value) {
    return undefined
  }

  const match = value.trim().match(/^([0-9]*\.?[0-9]+)/)
  if (!match) {
    return undefined
  }

  const parsed = Number(match[1])
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}
