/**
 * 模拟API服务
 */

// 模拟OCR识别
export const recognizeText = (imageUrl: string): Promise<string> => {
  return new Promise((resolve) => {
    // 模拟API延迟
    setTimeout(() => {
      // 根据不同的图片返回不同的识别结果
      // 实际项目中，这里应该调用真实的OCR API
      const text = '这是一段模拟的OCR识别文本。\n这是第二行文本。\n这是第三行文本，包含一些数字123和特殊字符@#$。'
      resolve(text)
    }, 1000)
  })
}

// 模拟翻译
export const translateText = (text: string, targetLang = 'en'): Promise<string> => {
  return new Promise((resolve) => {
    // 模拟API延迟
    setTimeout(() => {
      // 根据不同的文本返回不同的翻译结果
      // 实际项目中，这里应该调用真实的翻译API
      const translatedText = 'This is a simulated OCR recognized text.\nThis is the second line of text.\nThis is the third line of text, containing some numbers 123 and special characters @#$.'
      resolve(translatedText)
    }, 1500)
  })
}

// 将图像数据转换为URL
export const blobToUrl = (blob: Blob): string => {
  return URL.createObjectURL(blob)
}

// 清理URL
export const revokeUrl = (url: string): void => {
  URL.revokeObjectURL(url)
}
