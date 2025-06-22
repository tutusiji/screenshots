import React, { ReactElement, useCallback } from 'react'
import Modal from '../Modal'
import './index.less'

export interface OCRModalProps {
  visible: boolean
  onClose: () => void
  imageUrl?: string
  recognizedText?: string
  loading?: boolean
}

export default function OCRModal ({
  visible,
  onClose,
  imageUrl,
  recognizedText = '',
  loading = false
}: OCRModalProps): ReactElement {
  const copyText = useCallback(() => {
    navigator.clipboard.writeText(recognizedText).then(() => {
      // 可以添加复制成功的提示
      console.log('复制成功')
    })
  }, [recognizedText])

  return (
    <Modal visible={visible} onClose={onClose} width={800} className='ocr-modal'>
      <div className='ocr-modal-container'>
        <div className='ocr-modal-image'>
          {imageUrl
            ? (
              <img src={imageUrl} alt='截图区域' />
              )
            : (
              <div className='ocr-modal-image-placeholder'>无图片</div>
              )}
        </div>
        <div className='ocr-modal-content'>
          <div className='ocr-modal-section'>
            <div className='ocr-modal-section-header'>
              <span>识别结果</span>
              <button className='ocr-modal-copy-btn' onClick={copyText}>
                复制
              </button>
            </div>
            <div className='ocr-modal-text-area'>
              {loading
                ? (
                  <div className='ocr-modal-loading'>识别中...</div>
                  )
                : (
                  <div className='ocr-modal-text'>{recognizedText}</div>
                  )}
            </div>
          </div>
        </div>
      </div>
      <div className='ocr-modal-footer'>
        <button className='ocr-modal-close-btn' onClick={onClose}>
          关闭
        </button>
      </div>
    </Modal>
  )
}
