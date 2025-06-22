import React, { ReactElement, useCallback } from 'react'
import useCursor from '../../hooks/useCursor'
import useHistory from '../../hooks/useHistory'
import useLang from '../../hooks/useLang'
import useOperation from '../../hooks/useOperation'
import ScreenshotsButton from '../../ScreenshotsButton'
import { HistoryItemType } from '../../types'

export default function OCR (): ReactElement {
  const lang = useLang()
  const [history, historyDispatcher] = useHistory()
  const [operation, operationDispatcher] = useOperation()
  const [, cursorDispatcher] = useCursor()

  const checked = operation === 'OCR'

  const selectOCR = useCallback(() => {
    operationDispatcher.set('OCR')
    cursorDispatcher.set('default')
  }, [operationDispatcher, cursorDispatcher])

  const onSelectOCR = useCallback(() => {
    if (checked) {
      return
    }
    selectOCR()
    historyDispatcher.clearSelect()

    // 在这里实现文字识别功能
    // 1. 获取当前选中区域的图像
    // 2. 调用OCR API进行文字识别
    // 3. 显示识别结果
    const selectedItem = history.stack.find(item =>
      item.type === HistoryItemType.Source && 'isSelected' in item && item.isSelected
    )

    if (selectedItem) {
      // 这里只是一个示例，实际实现需要根据具体的OCR API进行
      console.log('识别选中区域文字', selectedItem)
      // 实际项目中，这里应该调用OCR API，并显示结果
      alert('文字识别功能已触发，实际项目中这里会调用OCR API')
    } else {
      alert('请先选择一个区域进行文字识别')
    }
  }, [checked, selectOCR, historyDispatcher, history.stack])

  return (
    <ScreenshotsButton
      title={lang.operation_ocr_title}
      icon='icon-ocr'
      checked={checked}
      onClick={onSelectOCR}
    />
  )
}
