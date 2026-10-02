import type { FC } from 'react'
import React from 'react'
import {
  Bars3Icon,
  PencilSquareIcon,
} from '@heroicons/react/24/solid'
import AssistantMark from '@/app/components/assistant-mark'
import { APP_INFO } from '@/config'
export interface IHeaderProps {
  title: string
  isMobile?: boolean
  onShowSideBar?: () => void
  onCreateNewChat?: () => void
  /** desktop only: whether the conversation list is hidden */
  isSidebarCollapsed?: boolean
  onToggleSidebar?: () => void
}
const Header: FC<IHeaderProps> = ({
  title,
  isMobile,
  onShowSideBar,
  onCreateNewChat,
  isSidebarCollapsed,
  onToggleSidebar,
}) => {
  return (
    <div className="shrink-0 flex items-center justify-between h-12 px-3 bg-navy-950 border-b border-gray-200">
      {isMobile
        ? (
          <div
            className='flex items-center justify-center h-8 w-8 cursor-pointer'
            onClick={() => onShowSideBar?.()}
          >
            <Bars3Icon className="h-4 w-4 text-gray-500" />
          </div>
        )
        : (
          <div className="flex items-center gap-1 w-24">
            <button
              type="button"
              title={isSidebarCollapsed ? 'Show conversations' : 'Hide conversations'}
              aria-label={isSidebarCollapsed ? 'Show conversations' : 'Hide conversations'}
              aria-expanded={!isSidebarCollapsed}
              onClick={() => onToggleSidebar?.()}
              className="flex items-center justify-center h-8 w-8 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-200 transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <rect x="2.75" y="3.75" width="14.5" height="12.5" rx="2.25" />
                <path d="M7.5 3.75v12.5" />
              </svg>
            </button>
            <button
              type="button"
              title="New chat"
              aria-label="New chat"
              onClick={() => onCreateNewChat?.()}
              className="flex items-center justify-center h-8 w-8 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-200 transition-colors"
            >
              <PencilSquareIcon className="h-4 w-4" />
            </button>
          </div>
        )}
      <div className='flex items-center space-x-2.5'>
        <AssistantMark size={22} />
        <div className="text-sm text-gray-900 font-semibold tracking-wide">{title}</div>
        {APP_INFO.copyright && (
          <div className="text-xs text-bronze-500 uppercase tracking-[0.18em]">{APP_INFO.copyright}</div>
        )}
      </div>
      {isMobile
        ? (
          <div className='flex items-center justify-center h-8 w-8 cursor-pointer' onClick={() => onCreateNewChat?.()} >
            <PencilSquareIcon className="h-4 w-4 text-gray-500" />
          </div>)
        : <div className="w-24"></div>}
    </div>
  )
}

export default React.memo(Header)
