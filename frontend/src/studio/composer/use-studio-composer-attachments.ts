import { useCallback, useRef, useState } from 'react'
import { useI18n } from '../../i18n'
import { uploadReferenceImage } from '../../lib/api'
import type { ReferenceImage } from '../../types/api'
import { MAX_IMAGE_SIZE, MAX_IMAGES } from '../../components/input-form/constants'
import { createComposerImageAttachment, extractNameFromUrl } from './attachments'
import type { StudioComposerAttachment } from './types'

interface UseStudioComposerAttachmentsResult {
  attachments: StudioComposerAttachment[]
  attachmentError: string | null
  fileInputRef: React.RefObject<HTMLInputElement | null>
  addImageFiles: (files: FileList | File[]) => Promise<StudioComposerAttachment[]>
  appendReferenceImages: (images: ReferenceImage[]) => StudioComposerAttachment[]
  appendUploadedAttachment: (attachment: StudioComposerAttachment) => void
  removeAttachment: (attachmentId: string) => void
  retainAttachments: (nextAttachments: StudioComposerAttachment[]) => void
  clearAttachments: () => void
}

export function useStudioComposerAttachments(): UseStudioComposerAttachmentsResult {
  const { t } = useI18n()
  const [attachments, setAttachments] = useState<StudioComposerAttachment[]>([])
  const [attachmentError, setAttachmentError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const appendUploadedAttachment = useCallback((attachment: StudioComposerAttachment) => {
    setAttachments((current) => appendWithinLimit(current, [attachment]))
    setAttachmentError(null)
  }, [])

  const addImageFiles = useCallback(async (files: FileList | File[]) => {
    setAttachmentError(null)
    const fileArray = Array.from(files).filter((file) => file.type.startsWith('image/'))

    if (fileArray.length === 0) {
      setAttachmentError(t('reference.invalidFile'))
      return []
    }

    const remaining = MAX_IMAGES - attachments.length
    if (remaining <= 0) {
      setAttachmentError(t('reference.limit', { count: MAX_IMAGES }))
      return []
    }

    const toAdd = fileArray.slice(0, remaining)

    try {
      for (const file of toAdd) {
        if (file.size > MAX_IMAGE_SIZE) {
          throw new Error(t('reference.maxSize', { size: MAX_IMAGE_SIZE / 1024 / 1024 }))
        }
      }

      const uploadedAttachments = await Promise.all(
        toAdd.map(async (file) => {
          const uploaded = await uploadReferenceImage(file)
          return createComposerImageAttachment({
            url: uploaded.url,
            name: file.name,
            mimeType: uploaded.mimeType,
            detail: 'low',
          })
        }),
      )

      setAttachments((current) => appendWithinLimit(current, uploadedAttachments))
      return uploadedAttachments
    } catch (error) {
      setAttachmentError(error instanceof Error ? error.message : t('reference.processFailed'))
      return []
    }
  }, [attachments.length, t])

  const appendReferenceImages = useCallback((images: ReferenceImage[]) => {
    if (images.length === 0) {
      return []
    }

    const nextAttachments = images.map((image) => createComposerImageAttachment({
      url: image.url,
      name: extractNameFromUrl(image.url),
      detail: image.detail,
    }))
    setAttachments((current) => appendWithinLimit(current, nextAttachments))
    setAttachmentError(null)
    return nextAttachments
  }, [])

  const removeAttachment = useCallback((attachmentId: string) => {
    setAttachments((current) => current.filter((attachment) => attachment.id !== attachmentId))
    setAttachmentError(null)
  }, [])

  const retainAttachments = useCallback((nextAttachments: StudioComposerAttachment[]) => {
    setAttachments(nextAttachments)
    setAttachmentError(null)
  }, [])

  const clearAttachments = useCallback(() => {
    setAttachments([])
    setAttachmentError(null)
  }, [])

  return {
    attachments,
    attachmentError,
    fileInputRef,
    addImageFiles,
    appendReferenceImages,
    appendUploadedAttachment,
    removeAttachment,
    retainAttachments,
    clearAttachments,
  }
}

function appendWithinLimit(
  current: StudioComposerAttachment[],
  incoming: StudioComposerAttachment[],
): StudioComposerAttachment[] {
  if (incoming.length === 0) {
    return current
  }

  return [...current, ...incoming].slice(0, MAX_IMAGES)
}
