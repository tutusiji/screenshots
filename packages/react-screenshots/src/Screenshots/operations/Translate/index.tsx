import React, { ReactElement, useCallback } from 'react'
import useCursor from '../../hooks/useCursor'
import useHistory from '../../hooks/useHistory'
import useLang from '../../hooks/useLang'
import useOperation from '../../hooks/useOperation'
import ScreenshotsButton from '../../ScreenshotsButton'
import { HistoryItemType } from '../../types'

export default function Translate (): ReactElement {
  const lang = useLang()
  const [history, historyDispatcher] = useHistory()
  const [operation, operationDispatcher] = useOperation()
  const [, cursorDispatcher] = useCursor()

  const checked = operation === 'Translate'

  const selectTranslate = useCallback(() => {
    operationDispatcher.set('Translate')
    cursorDispatcher.set('default')
  }, [operationDispatcher, cursorDispatcher])

  const onSelectTranslate = useCallback(() => {
    if (checked) {
      return
    }
    selectTranslate()
    historyDispatcher.clearSelect()

    // 在这里实现翻译功能
    // 1. 获取当前选中区域的图像
    // 2. 调用翻译API进行翻译
    // 3. 显示翻译结果
    const selectedItem = history.stack.find(item =>
      item.type === HistoryItemType.Source && 'isSelected' in item && item.isSelected
    )

    if (selectedItem) {
      // 这里只是一个示例，实际实现需要根据具体的翻译API进行
      console.log('翻译选中区域', selectedItem)
      // 实际项目中，这里应该调用翻译API，并显示结果
      alert('翻译功能已触发，实际项目中这里会调用翻译API')
    } else {
      alert('请先选择一个区域进行翻译')
    }
  }, [checked, selectTranslate, historyDispatcher, history.stack])

  return (
    <ScreenshotsButton
      title={lang.operation_translate_title}
      icon='icon-translate'
      checked={checked}
      onClick={onSelectTranslate}
    />
  )
}
