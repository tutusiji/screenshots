import React, { ReactElement, ReactNode, useCallback, useEffect } from 'react'
import './index.less'

export interface ModalProps {
  visible: boolean
  onClose?: () => void
  title?: string
  children: ReactNode
  width?: number | string
  className?: string
}

export default function Modal ({
  visible,
  onClose,
  title,
  children,
  width = 600,
  className = ''
}: ModalProps): ReactElement | null {
  const handleMaskClick = useCallback(() => {
    onClose && onClose()
  }, [onClose])

  const handleModalClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
  }, [])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose && onClose()
      }
    },
    [onClose]
  )

  useEffect(() => {
    if (visible) {
      document.addEventListener('keydown', handleKeyDown)
    } else {
      document.removeEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [visible, handleKeyDown])

  if (!visible) {
    return null
  }

  return (
    <div className='screenshots-modal-mask' onClick={handleMaskClick}>
      <div
        className={`screenshots-modal ${className}`}
        style={{ width }}
        onClick={handleModalClick}
      >
        {title && <div className='screenshots-modal-header'>{title}</div>}
        <div className='screenshots-modal-content'>{children}</div>
      </div>
    </div>
  )
}
