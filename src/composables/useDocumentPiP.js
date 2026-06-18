import { ref, shallowRef } from 'vue'

export function useDocumentPiP() {
  const isOpen = ref(false)
  const pipWindow = shallowRef(null)
  const error = ref(null)
  const isSupported = 'documentPictureInPicture' in window

  async function open(width = 320, height = 180) {
    if (!isSupported) {
      error.value = 'Document Picture-in-Picture is not supported in this browser.'
      return null
    }
    error.value = null
    try {
      const win = await window.documentPictureInPicture.requestWindow({ width, height })

      // Mirror styles from main document
      Array.from(document.styleSheets).forEach(sheet => {
        try {
          const cssRules = Array.from(sheet.cssRules).map(r => r.cssText).join('')
          const style = win.document.createElement('style')
          style.textContent = cssRules
          win.document.head.appendChild(style)
        } catch (_e) {
          // cross-origin sheets are not accessible
        }
      })

      win.addEventListener('pagehide', () => {
        isOpen.value = false
        pipWindow.value = null
      })

      pipWindow.value = win
      isOpen.value = true
      return win
    } catch (e) {
      error.value = e.message
      return null
    }
  }

  function close() {
    pipWindow.value?.close()
    pipWindow.value = null
    isOpen.value = false
  }

  return { isOpen, pipWindow, error, isSupported, open, close }
}
