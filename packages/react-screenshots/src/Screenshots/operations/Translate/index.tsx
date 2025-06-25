import React, { ReactElement, useCallback, useState } from 'react'
import useCursor from '../../hooks/useCursor'
import useHistory from '../../hooks/useHistory'
import useLang from '../../hooks/useLang'
import useOperation from '../../hooks/useOperation'
import ScreenshotsButton from '../../ScreenshotsButton'
import { HistoryItemType } from '../../types'
import TranslateModal from '../../components/TranslateModal'
import { blobToUrl, recognizeText, revokeUrl, translateText } from '../../services/api'
import composeImage from '../../composeImage'

export default function Translate (): ReactElement {
  const lang = useLang()
  const [history, historyDispatcher] = useHistory()
  const [operation, operationDispatcher] = useOperation()
  const [, cursorDispatcher] = useCursor()
  const [modalVisible, setModalVisible] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined)
  const [originalText, setOriginalText] = useState('')
  const [translatedText, setTranslatedText] = useState('')
  const [loading, setLoading] = useState(false)

  const checked = operation === 'Translate'

  const selectTranslate = useCallback(() => {
    operationDispatcher.set('Translate')
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

  const onSelectTranslate = useCallback(() => {
    if (checked) {
      return
    }
    selectTranslate()

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
        setOriginalText('')
        setTranslatedText('')

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

          // 调用OCR API识别文字
          return recognizeText(url).then(text => {
            setOriginalText(text)
            // 调用翻译API
            return translateText(text)
          })
        }).then(text => {
          setTranslatedText(text)
          setLoading(false)
        }).catch(error => {
          console.error('翻译失败', error)
          setTranslatedText('翻译失败，请重试')
          setLoading(false)
        })
      }

      // 清除选中状态（在获取选中区域并处理后）
      historyDispatcher.clearSelect()
    } else {
      alert('请先选择一个区域进行翻译')
    }
  }, [checked, selectTranslate, historyDispatcher, history])

  return (
    <>
      <ScreenshotsButton
        title={lang.operation_translate_title}
        icon='icon-translate'
        checked={checked}
        onClick={onSelectTranslate}
      />
      <TranslateModal
        visible={modalVisible}
        onClose={closeModal}
        imageUrl={imageUrl}
        originalText={originalText}
        translatedText={translatedText}
      />
    </>
  )
}
