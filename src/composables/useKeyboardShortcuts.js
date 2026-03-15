import { onMounted, onUnmounted } from 'vue'

export const useKeyboardShortcuts = (options = {}) => {
  const {
    onTogglePause = null,
    onSkip = null,
    onCancel = null,
    isModalOpen = () => false,
    isIdle = () => true
  } = options

  const isInputFocused = () => {
    const el = document.activeElement
    return el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA' || el?.isContentEditable
  }

  const handleKeydown = (e) => {
    if (isInputFocused()) return
    if (isModalOpen()) return

    if (e.code === 'Space') {
      e.preventDefault()
      onTogglePause?.()
      return
    }

    if (e.key === 's' || e.key === 'S') {
      if (!isIdle()) {
        e.preventDefault()
        onSkip?.()
      }
      return
    }

    if (e.key === 'c' || e.key === 'C') {
      if (!isIdle()) {
        e.preventDefault()
        onCancel?.()
      }
    }
  }

  onMounted(() => {
    document.addEventListener('keydown', handleKeydown)
  })

  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown)
  })

  return {}
}
