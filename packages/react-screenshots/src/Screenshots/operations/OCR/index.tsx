import React, { ReactElement, useCallback, useState, useEffect } from 'react'
import useCursor from '../../hooks/useCursor'
import useLang from '../../hooks/useLang'
import useOperation from '../../hooks/useOperation'
import ScreenshotsButton from '../../ScreenshotsButton'
import OCRModal from '../../components/OCRModal'
import { blobToUrl, recognizeText, revokeUrl } from '../../services/api'
import composeImage from '../../composeImage'
import useStore from '../../hooks/useStore'
import useCanvasContextRef from '../../hooks/useCanvasContextRef'
import useCall from '../../hooks/useCall'
import useReset from '../../hooks/useReset'

export default function OCR (): ReactElement {
  const lang = useLang()
  const { image, width, height } = useStore()
  const canvasContextRef = useCanvasContextRef()
  const call = useCall()
  const reset = useReset()
  const [operation, operationDispatcher] = useOperation()
  const [, cursorDispatcher] = useCursor()
  const [modalVisible, setModalVisible] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined)
  const [recognizedText, setRecognizedText] = useState('')
  const [loading, setLoading] = useState(false)

  const checked = operation === 'OCR'

  const selectOCR = useCallback(() => {
    operationDispatcher.set('OCR')
    cursorDispatcher.set('default')
  }, [operationDispatcher, cursorDispatcher])

  const closeModal = useCallback(() => {
    setModalVisible(false)
    // 清理URL
    if (imageUrl) {
      revokeUrl(imageUrl)
      setImageUrl(undefined)
    }
  }, [imageUrl])

  const onSelectOCR = useCallback(() => {
    if (checked) {
      return
    }
    selectOCR()
    
    // 直接合成截图并弹出OCR弹窗
    if (canvasContextRef.current && image && width && height) {
      // 使用整个图片作为截图区域
      const bounds = { x: 0, y: 0, width, height }
      
      // 立即关闭截图操作
      reset()
      // 设置加载状态并弹出弹窗
      setLoading(true)
      setModalVisible(true)
      setRecognizedText('')
      
      // 合成截图
      composeImage({
        image,
        width,
        height,
        bounds
      }).then(blob => {
        const url = blobToUrl(blob)
        setImageUrl(url)
        return recognizeText(url)
      }).then(text => {
        setRecognizedText(text)
        setLoading(false)
      }).catch(error => {
        console.error('OCR识别失败', error)
        setRecognizedText('OCR识别失败，请重试')
        setLoading(false)
      })
    }
  }, [checked, selectOCR, canvasContextRef, image, width, height, reset])

  return (
    <>
      <ScreenshotsButton
        title={lang.operation_ocr_title}
        icon='icon-ocr'
        checked={checked}
        onClick={onSelectOCR}
      />
      <OCRModal
        visible={modalVisible}
        onClose={closeModal}
        imageUrl={imageUrl}
        recognizedText={recognizedText}
        loading={loading}
      />
    </>
  )
}
