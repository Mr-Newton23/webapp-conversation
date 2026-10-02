'use client'
import type { FC } from 'react'
import React, { useEffect, useRef, useState } from 'react'
import cn from 'classnames'
import { useTranslation } from 'react-i18next'
import Textarea from 'rc-textarea'
import Answer from './answer'
import Question from './question'
import type { FeedbackFunc } from './type'
import type { ChatItem, VisionFile, VisionSettings } from '@/types/app'
import { TransferMethod } from '@/types/app'
import {
  ArrowUpIcon,
  MicrophoneIcon,
  PaperClipIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  StopIcon,
} from '@heroicons/react/24/outline'
import Toast from '@/app/components/base/toast'
import AssistantMark from '@/app/components/assistant-mark'
import type { OrbState } from '@/app/components/assistant-mark'
import useVoice from '@/hooks/use-voice'
import { APP_INFO } from '@/config'
import ChatImageUploader from '@/app/components/base/image-uploader/chat-image-uploader'
import ImageList from '@/app/components/base/image-uploader/image-list'
import { useImageFiles } from '@/app/components/base/image-uploader/hooks'
import FileUploaderInAttachmentWrapper from '@/app/components/base/file-uploader-in-attachment'
import type { FileEntity, FileUpload } from '@/app/components/base/file-uploader-in-attachment/types'
import { getProcessedFiles } from '@/app/components/base/file-uploader-in-attachment/utils'

export interface IChatProps {
  chatList: ChatItem[]
  /**
   * Whether to display the editing area and rating status
   */
  feedbackDisabled?: boolean
  /**
   * Whether to display the input area
   */
  isHideSendInput?: boolean
  onFeedback?: FeedbackFunc
  checkCanSend?: () => boolean
  onSend?: (message: string, files: VisionFile[]) => void
  useCurrentUserAvatar?: boolean
  isResponding?: boolean
  controlClearQuery?: number
  visionConfig?: VisionSettings
  fileConfig?: FileUpload
}

// Shown under the orb on an empty conversation.
const STARTER_PROMPTS = [
  'What should I focus on this week?',
  'Where does the company stand right now?',
  'What is missing from my requirements?',
]

const SPEAK_REPLIES_KEY = 'assistant-speak-replies'

// An agent answer keeps its text in the thoughts, a plain answer in content.
const getAnswerText = (item?: ChatItem) => {
  if (!item) { return '' }
  const fromThoughts = (item.agent_thoughts || []).map(thought => thought.thought).filter(Boolean).join(' ')
  return fromThoughts || item.content || ''
}

const Chat: FC<IChatProps> = ({
  chatList,
  feedbackDisabled = false,
  isHideSendInput = false,
  onFeedback,
  checkCanSend,
  onSend = () => { },
  useCurrentUserAvatar,
  isResponding,
  controlClearQuery,
  visionConfig,
  fileConfig,
}) => {
  const { t } = useTranslation()
  const { notify } = Toast
  const isUseInputMethod = useRef(false)

  const [query, setQuery] = React.useState('')
  const queryRef = useRef('')

  const handleContentChange = (e: any) => {
    const value = e.target.value
    setQuery(value)
    queryRef.current = value
  }

  const logError = (message: string) => {
    notify({ type: 'error', message, duration: 3000 })
  }

  const valid = () => {
    const query = queryRef.current
    if (!query || query.trim() === '') {
      logError(t('app.errorMessage.valueOfVarRequired'))
      return false
    }
    return true
  }

  useEffect(() => {
    if (controlClearQuery) {
      setQuery('')
      queryRef.current = ''
    }
  }, [controlClearQuery])
  const {
    files,
    onUpload,
    onRemove,
    onReUpload,
    onImageLinkLoadError,
    onImageLinkLoadSuccess,
    onClear,
  } = useImageFiles()

  const [attachmentFiles, setAttachmentFiles] = React.useState<FileEntity[]>([])

  const handleSend = () => {
    if (!valid() || (checkCanSend && !checkCanSend())) { return }
    const hasPendingImageUploads = files.some(file => file.progress !== -1 && file.progress < 100)
    const hasPendingAttachmentUploads = attachmentFiles.some(file => file.progress !== -1 && file.progress < 100)
    if (hasPendingImageUploads || hasPendingAttachmentUploads) {
      logError(t('app.errorMessage.waitForFileUpload'))
      return
    }
    const imageFiles: VisionFile[] = files.filter(file => file.progress !== -1).map(fileItem => ({
      type: 'image',
      transfer_method: fileItem.type,
      url: fileItem.url,
      upload_file_id: fileItem.fileId,
    }))
    const docAndOtherFiles: VisionFile[] = getProcessedFiles(attachmentFiles)
    const combinedFiles: VisionFile[] = [...imageFiles, ...docAndOtherFiles]
    onSend(queryRef.current, combinedFiles)
    if (!files.find(item => item.type === TransferMethod.local_file && !item.fileId)) {
      if (files.length) { onClear() }
      if (!isResponding) {
        setQuery('')
        queryRef.current = ''
      }
    }
    if (!attachmentFiles.find(item => item.transferMethod === TransferMethod.local_file && !item.uploadedId)) { setAttachmentFiles([]) }
  }

  const handleKeyUp = (e: any) => {
    if (e.code === 'Enter') {
      e.preventDefault()
      // prevent send message when using input method enter
      if (!e.shiftKey && !isUseInputMethod.current) { handleSend() }
    }
  }

  const handleKeyDown = (e: any) => {
    isUseInputMethod.current = e.nativeEvent.isComposing
    if (e.code === 'Enter' && !e.shiftKey) {
      const result = query.replace(/\n$/, '')
      setQuery(result)
      queryRef.current = result
      e.preventDefault()
    }
  }

  const suggestionClick = (suggestion: string) => {
    setQuery(suggestion)
    queryRef.current = suggestion
    handleSend()
  }

  // ----- voice: speak a message in, and optionally have replies read out -----
  const [speakReplies, setSpeakReplies] = useState(false)
  // read the next reply aloud (set when a message is spoken, or when read-aloud is on)
  const speakNextReply = useRef(false)
  useEffect(() => {
    try { setSpeakReplies(localStorage.getItem(SPEAK_REPLIES_KEY) === '1') }
    catch { }
  }, [])

  const { canListen, canSpeak, isListening, isSpeaking, startListening, stopListening, speak, stopSpeaking } = useVoice({
    onInterimTranscript: (text) => {
      setQuery(text)
      queryRef.current = text
    },
    onFinalTranscript: (text) => {
      setQuery(text)
      queryRef.current = text
      speakNextReply.current = true
      handleSend()
    },
    onError: logError,
  })

  const toggleSpeakReplies = () => {
    const next = !speakReplies
    setSpeakReplies(next)
    if (!next) { stopSpeaking() }
    try { localStorage.setItem(SPEAK_REPLIES_KEY, next ? '1' : '0') }
    catch { }
  }

  const handleMicClick = () => {
    if (isListening) {
      stopListening()
      return
    }
    startListening()
  }

  // when a reply finishes, read it out if asked to
  const wasResponding = useRef(false)
  useEffect(() => {
    if (wasResponding.current && !isResponding) {
      const shouldSpeak = speakNextReply.current || speakReplies
      speakNextReply.current = false
      const lastItem = chatList[chatList.length - 1]
      if (shouldSpeak && lastItem?.isAnswer) { speak(getAnswerText(lastItem)) }
    }
    wasResponding.current = !!isResponding
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isResponding])

  const [isAttachOpen, setIsAttachOpen] = useState(false)
  const hasPendingText = query.trim().length > 0
  const orbState: OrbState = isListening ? 'listening' : isResponding ? 'thinking' : isSpeaking ? 'speaking' : 'idle'
  const isEmpty = chatList.length === 0

  return (
    <div className={cn(!feedbackDisabled && 'px-3.5', 'grow flex flex-col')}>
      {/* Empty conversation: the orb takes the middle of the screen */}
      {isEmpty && (
        <div className="flex flex-col items-center text-center pt-[9vh]">
          <AssistantMark state={orbState} size={176} />
          <div className="mt-6 text-2xl font-semibold tracking-wide text-gray-900">{APP_INFO.title}</div>
          <div className="mt-1 text-sm text-gray-500">
            {isListening ? 'Listening…' : 'Your advisor. Type or talk.'}
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-2 max-w-[560px]">
            {STARTER_PROMPTS.map(prompt => (
              <button
                key={prompt}
                type="button"
                onClick={() => suggestionClick(prompt)}
                className="px-3.5 py-2 rounded-full border border-gray-200 bg-gray-50 text-sm text-gray-700 hover:border-bronze-600 hover:text-bronze-300 transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chat List */}
      <div className="grow space-y-6 pb-6">
        {chatList.map((item) => {
          if (item.isAnswer) {
            const isLast = item.id === chatList[chatList.length - 1].id
            return <Answer
              key={item.id}
              item={item}
              feedbackDisabled={feedbackDisabled}
              onFeedback={onFeedback}
              isResponding={isResponding && isLast}
              isSpeaking={isSpeaking && isLast}
              suggestionClick={suggestionClick}
            />
          }
          return (
            <Question
              key={item.id}
              id={item.id}
              content={item.content}
              useCurrentUserAvatar={useCurrentUserAvatar}
              imgSrcs={(item.message_files && item.message_files?.length > 0) ? item.message_files.map(item => item.url) : []}
            />
          )
        })}
      </div>
      {
        !isHideSendInput && (
          <div className='sticky z-10 bottom-0 -mx-3.5 px-3.5 pt-6 pb-3 bg-gradient-to-t from-white via-white to-transparent'>
            {/* attachments open above the bar, so the typing area stays clear */}
            {fileConfig?.enabled && (isAttachOpen || attachmentFiles.length > 0) && (
              <div className="mb-2 p-2 rounded-xl border border-gray-200 bg-gray-50">
                <FileUploaderInAttachmentWrapper
                  fileConfig={fileConfig}
                  value={attachmentFiles}
                  onChange={setAttachmentFiles}
                />
              </div>
            )}
            {visionConfig?.enabled && files.length > 0 && (
              <div className="mb-2 p-2 rounded-xl border border-gray-200 bg-gray-50">
                <ImageList
                  list={files}
                  onRemove={onRemove}
                  onReUpload={onReUpload}
                  onImageLinkLoadSuccess={onImageLinkLoadSuccess}
                  onImageLinkLoadError={onImageLinkLoadError}
                />
              </div>
            )}
            <div className={cn(
              'flex items-end gap-1 p-1.5 rounded-2xl border bg-navy-700 transition-colors',
              isListening ? 'border-bronze-500 shadow-[0_0_0_3px_rgba(192,139,78,0.18)]' : 'border-gray-200 focus-within:border-bronze-600',
            )}>
              {fileConfig?.enabled && (
                <button
                  type="button"
                  title="Attach a file"
                  aria-label="Attach a file"
                  onClick={() => setIsAttachOpen(!isAttachOpen)}
                  className={cn('shrink-0 flex items-center justify-center w-9 h-9 rounded-xl hover:bg-gray-200 transition-colors', isAttachOpen ? 'text-bronze-400' : 'text-gray-500')}
                >
                  <PaperClipIcon className="w-5 h-5" />
                </button>
              )}
              {visionConfig?.enabled && (
                <div className="shrink-0 flex items-center justify-center w-9 h-9">
                  <ChatImageUploader
                    settings={visionConfig}
                    onUpload={onUpload}
                    disabled={files.length >= visionConfig.number_limits}
                  />
                </div>
              )}
              <div className="grow min-w-0 max-h-[150px] overflow-y-auto">
                <Textarea
                  className="block w-full px-2 py-2 leading-5 max-h-none text-base text-gray-900 placeholder-gray-400 bg-transparent outline-none appearance-none resize-none"
                  placeholder={isListening ? 'Listening…' : `Message ${APP_INFO.title}`}
                  value={query}
                  onChange={handleContentChange}
                  onKeyUp={handleKeyUp}
                  onKeyDown={handleKeyDown}
                  autoSize
                />
              </div>
              {canSpeak && (
                <button
                  type="button"
                  title={speakReplies ? 'Replies are read aloud. Click to turn off.' : 'Read replies aloud'}
                  aria-label={speakReplies ? 'Turn off read aloud' : 'Read replies aloud'}
                  aria-pressed={speakReplies}
                  onClick={toggleSpeakReplies}
                  className={cn('shrink-0 flex items-center justify-center w-9 h-9 rounded-xl hover:bg-gray-200 transition-colors', speakReplies ? 'text-bronze-400' : 'text-gray-500')}
                >
                  {speakReplies ? <SpeakerWaveIcon className="w-5 h-5" /> : <SpeakerXMarkIcon className="w-5 h-5" />}
                </button>
              )}
              <button
                type="button"
                title={!canListen ? 'Voice input needs Chrome or Safari' : isListening ? 'Stop listening' : 'Speak your message'}
                aria-label={isListening ? 'Stop listening' : 'Speak your message'}
                onClick={handleMicClick}
                className={cn(
                  'shrink-0 flex items-center justify-center w-9 h-9 rounded-xl transition-colors',
                  isListening ? 'bg-bronze-500 text-navy-950 animate-pulse' : 'hover:bg-gray-200',
                  !isListening && (canListen ? 'text-gray-600' : 'text-gray-400 opacity-60'),
                )}
              >
                {isListening ? <StopIcon className="w-5 h-5" /> : <MicrophoneIcon className="w-5 h-5" />}
              </button>
              <button
                type="button"
                title="Send (Enter). Shift + Enter for a new line."
                aria-label="Send message"
                onClick={handleSend}
                disabled={!hasPendingText}
                className={cn(
                  'shrink-0 flex items-center justify-center w-9 h-9 rounded-xl transition-colors',
                  hasPendingText ? 'bg-bronze-500 text-navy-950 hover:bg-bronze-400' : 'bg-gray-200 text-gray-400 cursor-default',
                )}
              >
                <ArrowUpIcon className="w-5 h-5" strokeWidth={2.2} />
              </button>
            </div>
            <div className="mt-1.5 text-center text-[11px] text-gray-400">
              {APP_INFO.title} can be wrong. Check important facts in Fibery.
            </div>
          </div>
        )
      }
    </div>
  )
}

export default React.memo(Chat)
