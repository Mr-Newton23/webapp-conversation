'use client'
import { useCallback, useEffect, useRef, useState } from 'react'

// Voice in and out using what the browser already provides, so it needs no paid speech service.
// Speech recognition works in Chrome, Edge and Safari. Other browsers (Opera, Firefox) lack a working one.

const getRecognitionClass = () => {
  if (typeof window === 'undefined') { return null }
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null
}

const isOpera = () => typeof navigator !== 'undefined' && /\bOPR\/|\bOpera\b/.test(navigator.userAgent)

/** Turn a markdown answer into something worth reading aloud. */
export const toSpeakableText = (markdown: string) => {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\|.*\|\s*$/gm, ' ')
    .replace(/[*_~>#]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

interface IUseVoiceOptions {
  /** called with the finished sentence when the speaker stops */
  onFinalTranscript: (text: string) => void
  /** called while the speaker is still talking */
  onInterimTranscript?: (text: string) => void
  onError?: (message: string) => void
  lang?: string
}

export const useVoice = ({ onFinalTranscript, onInterimTranscript, onError, lang = 'en-AU' }: IUseVoiceOptions) => {
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [canListen, setCanListen] = useState(false)
  const [canSpeak, setCanSpeak] = useState(false)
  const recognitionRef = useRef<any>(null)
  // keep the latest callbacks without restarting recognition
  const callbacks = useRef({ onFinalTranscript, onInterimTranscript, onError })
  callbacks.current = { onFinalTranscript, onInterimTranscript, onError }

  useEffect(() => {
    setCanListen(!!getRecognitionClass() && !isOpera())
    setCanSpeak(typeof window !== 'undefined' && 'speechSynthesis' in window)
    return () => {
      try { recognitionRef.current?.abort() }
      catch { }
      try { window.speechSynthesis?.cancel() }
      catch { }
    }
  }, [])

  const stopSpeaking = useCallback(() => {
    try { window.speechSynthesis?.cancel() }
    catch { }
    setIsSpeaking(false)
  }, [])

  const stopListening = useCallback(() => {
    try { recognitionRef.current?.stop() }
    catch { }
  }, [])

  const startListening = useCallback(() => {
    const Recognition = getRecognitionClass()
    if (!Recognition || isOpera()) {
      callbacks.current.onError?.('Voice input is not available in this browser. Use Chrome or Safari, or type your message.')
      return
    }
    stopSpeaking()
    const recognition = new Recognition()
    recognition.lang = lang
    recognition.interimResults = true
    recognition.continuous = false
    recognition.maxAlternatives = 1
    let finalText = ''
    recognition.onresult = (event: any) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const piece = event.results[i][0].transcript
        if (event.results[i].isFinal) { finalText += piece }
        else { interim += piece }
      }
      callbacks.current.onInterimTranscript?.((finalText + interim).trim())
    }
    recognition.onerror = (event: any) => {
      const code = event?.error
      if (code === 'no-speech' || code === 'aborted') { return }
      const message = code === 'not-allowed' || code === 'service-not-allowed'
        ? 'Microphone access was blocked. Allow the microphone for this site, then try again.'
        : code === 'network'
          ? 'Voice input could not reach the speech service. Check your connection, or type your message.'
          : `Voice input stopped (${code || 'unknown error'}).`
      callbacks.current.onError?.(message)
    }
    recognition.onend = () => {
      setIsListening(false)
      recognitionRef.current = null
      const text = finalText.trim()
      if (text) { callbacks.current.onFinalTranscript(text) }
    }
    recognitionRef.current = recognition
    try {
      recognition.start()
      setIsListening(true)
    }
    catch {
      setIsListening(false)
      callbacks.current.onError?.('Voice input could not start. Try again.')
    }
  }, [lang, stopSpeaking])

  const speak = useCallback((text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) { return }
    const speakable = toSpeakableText(text)
    if (!speakable) { return }
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(speakable)
    utterance.lang = lang
    utterance.rate = 1.02
    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)
    window.speechSynthesis.speak(utterance)
  }, [lang])

  return { canListen, canSpeak, isListening, isSpeaking, startListening, stopListening, speak, stopSpeaking }
}

export default useVoice
