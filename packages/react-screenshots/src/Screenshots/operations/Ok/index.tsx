import React, { ReactElement, useCallback } from 'react'
import useStore from '../../hooks/useStore'
import useCall from '../../hooks/useCall'
import useCanvasContextRef from '../../hooks/useCanvasContextRef'
import useHistory from '../../hooks/useHistory'
import useReset from '../../hooks/useReset'
import ScreenshotsButton from '../../ScreenshotsButton'
import composeImage from '../../composeImage'

export default function Ok (): ReactElement {
  const { image, width, height, history, bounds, lang } = useStore()
  const canvasContextRef = useCanvasContextRef()
  const [, historyDispatcher] = useHistory()
  const call = useCall()
  const reset = useReset()

  const onClick = useCallback(() => {
    historyDispatcher.clearSelect()
    setTimeout(() => {
      if (!canvasContextRef.current || !image || !bounds) {
        return
      }
      
      // 触发自定义事件，通知OCR组件处理识别
      const customEvent = new CustomEvent('screenshots-ok-clicked', {
        detail: { bounds }
      })
      window.dispatchEvent(customEvent)
      
      composeImage({
        image,
        width,
        height,
        history,
        bounds
      }).then(blob => {
        call('onOk', blob, bounds)
        // 不在这里 reset，由 OCR 组件统一处理截图关闭和弹窗显示
      })
    })
  }, [canvasContextRef, historyDispatcher, image, width, height, history, bounds, call, reset])

  return <ScreenshotsButton title={lang.operation_ok_title} icon='icon-ok' onClick={onClick} />
}
