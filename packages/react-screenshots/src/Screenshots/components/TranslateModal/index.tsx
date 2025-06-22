import React, { ReactElement, useCallback, useState } from 'react'
import Modal from '../Modal'
import './index.less'

export interface TranslateModalProps {
  visible: boolean
  onClose: () => void
  imageUrl?: string
  originalText?: string
  translatedText?: string
}

export default function TranslateModal ({
  visible,
  onClose,
  imageUrl,
  originalText = '',
  translatedText = ''
}: TranslateModalProps): ReactElement {
  const [loading, setLoading] = useState(false)

  const copyText = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // 可以添加复制成功的提示
      console.log('复制成功')
    })
  }, [])

  const copyOriginalText = useCallback(() => {
    copyText(originalText)
  }, [copyText, originalText])

  const copyTranslatedText = useCallback(() => {
    copyText(translatedText)
  }, [copyText, translatedText])

  return (
    <Modal visible={visible} onClose={onClose} width={800} className='translate-modal'>
      <div className='translate-modal-container'>
        <div className='translate-modal-image'>
          {imageUrl
            ? (
              <img src={imageUrl} alt='截图区域' />
              )
            : (
              <div className='translate-modal-image-placeholder'>无图片</div>
              )}
        </div>
        <div className='translate-modal-content'>
          <div className='translate-modal-section'>
            <div className='translate-modal-section-header'>
              <span>原文</span>
              <button className='translate-modal-copy-btn' onClick={copyOriginalText}>
                复制
              </button>
            </div>
            <div className='translate-modal-text-area'>
              {loading
                ? (
                  <div className='translate-modal-loading'>识别中...</div>
                  )
                : (
                  <div className='translate-modal-text'>{originalText}</div>
                  )}
            </div>
          </div>
          <div className='translate-modal-section'>
            <div className='translate-modal-section-header'>
              <span>译文</span>
              <button className='translate-modal-copy-btn' onClick={copyTranslatedText}>
                复制
              </button>
            </div>
            <div className='translate-modal-text-area'>
              {loading
                ? (
                  <div className='translate-modal-loading'>翻译中...</div>
                  )
                : (
                  <div className='translate-modal-text'>{translatedText}</div>
                  )}
            </div>
          </div>
        </div>
      </div>
      <div className='translate-modal-footer'>
        <button className='translate-modal-close-btn' onClick={onClose}>
          关闭
        </button>
      </div>
    </Modal>
  )
}
