import React, { ReactElement, useCallback, useState } from 'react'
import useCursor from '../../hooks/useCursor'
import useHistory from '../../hooks/useHistory'
import useLang from '../../hooks/useLang'
import useOperation from '../../hooks/useOperation'
import ScreenshotsButton from '../../ScreenshotsButton'
import { HistoryItemType } from '../../types'
import OCRModal from '../../components/OCRModal'
import { blobToUrl, recognizeText, revokeUrl } from '../../services/api'
import composeImage from '../../composeImage'

export default function OCR (): ReactElement {
  const lang = useLang()
  const [history, historyDispatcher] = useHistory()
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

    // 获取当前选中区域的图像
    const selectedItem = history.stack.find(item =>
      item.type === HistoryItemType.Source && 'isSelected' in item && item.isSelected
    )

    if (selectedItem) {
      // 获取选中区域的图像
      const bounds = selectedItem.data
      const image = document.querySelector('.screenshots')?.querySelector('img')

      if (image && bounds) {
        setLoading(true)
        setModalVisible(true)
        setRecognizedText('')

        // 合成图像
        composeImage({
          image: image as HTMLImageElement,
          width: image.width,
          height: image.height,
          history,
          bounds
        }).then(blob => {
          // 将Blob转换为URL
          const url = blobToUrl(blob)
          setImageUrl(url)

          // 调用OCR API
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
      
      // 清除选中状态（在获取选中区域并处理后）
      historyDispatcher.clearSelect()
    } else {
      alert('请先选择一个区域进行文字识别')
    }
  }, [checked, selectOCR, historyDispatcher, history])

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
