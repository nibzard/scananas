import React, { useState, useEffect, useRef } from 'react'
import { Note, Connection } from '../model/types'
import { SearchResult, performSearch, getNextResult } from '../utils/search'

interface IncrementalSearchProps {
  notes: Note[]
  connections: Connection[]
  isActive: boolean
  onActivate: () => void
  onDeactivate: () => void
  onResultSelect: (result: SearchResult) => void
  onResultHighlight: (result: SearchResult | null) => void
}

export function IncrementalSearch({
  notes,
  connections,
  isActive,
  onActivate,
  onDeactivate,
  onResultSelect,
  onResultHighlight
}: IncrementalSearchProps) {
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const searchOverlayRef = useRef<HTMLDivElement>(null)

  // Reset state when search becomes active/inactive
  useEffect(() => {
    if (!isActive) {
      setQuery('')
      setSearchResults([])
      setSelectedIndex(-1)
      onResultHighlight(null)
    }
  }, [isActive, onResultHighlight])

  // Update search results as user types
  useEffect(() => {
    if (query.trim()) {
      const results = performSearch(notes, connections, query)
      setSearchResults(results)
      setSelectedIndex(results.length > 0 ? 0 : -1)
      if (results.length > 0) {
        onResultHighlight(results[0])
      } else {
        onResultHighlight(null)
      }
    } else {
      setSearchResults([])
      setSelectedIndex(-1)
      onResultHighlight(null)
    }
  }, [query, notes, connections, onResultHighlight])

  // Handle keyboard navigation
  useEffect(() => {
    if (!isActive) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          e.preventDefault()
          onDeactivate()
          break
        case 'ArrowDown':
          e.preventDefault()
          if (searchResults.length > 0) {
            const next = getNextResult(searchResults, selectedIndex, 'next')
            setSelectedIndex(next.index)
            onResultHighlight(next.result!)
          }
          break
        case 'ArrowUp':
          e.preventDefault()
          if (searchResults.length > 0) {
            const prev = getNextResult(searchResults, selectedIndex, 'previous')
            setSelectedIndex(prev.index)
            onResultHighlight(prev.result!)
          }
          break
        case 'Enter':
          e.preventDefault()
          if (selectedIndex >= 0 && searchResults.length > 0) {
            onResultSelect(searchResults[selectedIndex])
            onDeactivate()
          }
          break
        case 'Backspace':
          if (query.length === 0) {
            // If no query, backspace deactivates search
            e.preventDefault()
            onDeactivate()
          }
          break
      }
    }

    // Handle typing for search query
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isActive) return

      // Ignore special keys and navigation
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (['Escape', 'Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) return

      // Allow typing characters for search
      if (e.key.length === 1) {
        setQuery(prev => prev + e.key)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keypress', handleKeyPress)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keypress', handleKeyPress)
    }
  }, [isActive, query, searchResults, selectedIndex, onDeactivate, onResultSelect, onResultHighlight])

  // Handle backspace for query editing
  const handleBackspace = () => {
    setQuery(prev => prev.slice(0, -1))
  }

  if (!isActive) return null

  return (
    <div
      ref={searchOverlayRef}
      style={{
        position: 'fixed',
        top: 80,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(42, 42, 42, 0.95)',
        border: '1px solid #444',
        borderRadius: '8px',
        padding: '12px 16px',
        minWidth: '400px',
        maxWidth: '600px',
        zIndex: 1000,
        backdropFilter: 'blur(8px)',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)'
      }}
    >
      {/* Search Input Display */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ color: '#4aa3ff', fontSize: '16px', fontWeight: 'bold' }}>🔍</span>
        <div
          style={{
            flex: 1,
            color: '#fff',
            fontSize: '16px',
            fontFamily: 'monospace',
            minWidth: 0,
            outline: 'none'
          }}
        >
          {query || <span style={{ color: '#999' }}>Type to search...</span>}
          <span style={{
            display: 'inline-block',
            width: '2px',
            height: '18px',
            background: '#4aa3ff',
            marginLeft: '2px',
            animation: 'blink 1s infinite'
          }} />
        </div>
        {query && (
          <button
            onClick={handleBackspace}
            style={{
              background: 'none',
              border: 'none',
              color: '#999',
              fontSize: '16px',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Backspace"
          >
            ⌫
          </button>
        )}
      </div>

      {/* Results Counter */}
      {searchResults.length > 0 && (
        <div style={{
          marginTop: '8px',
          fontSize: '12px',
          color: '#999',
          textAlign: 'center'
        }}>
          {selectedIndex + 1} of {searchResults.length} results
          {searchResults[selectedIndex]?.type === 'note' ? ' • Note' : ' • Connection'}
        </div>
      )}

      {/* Current Result Preview */}
      {selectedIndex >= 0 && searchResults[selectedIndex] && (
        <div style={{
          marginTop: '8px',
          padding: '8px',
          background: 'rgba(26, 26, 26, 0.8)',
          borderRadius: '4px',
          border: '1px solid #333'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px'
          }}>
            <div
              style={{
                padding: '2px 6px',
                background: searchResults[selectedIndex].type === 'note' ? '#4a9eff' : '#ff9f4a',
                borderRadius: '3px',
                fontSize: '10px',
                fontWeight: 'bold',
                color: '#fff',
                flexShrink: 0
              }}
            >
              {searchResults[selectedIndex].type.toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                color: '#fff',
                fontSize: '13px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {searchResults[selectedIndex].context &&
                 searchResults[selectedIndex].matchStart !== undefined &&
                 searchResults[selectedIndex].matchEnd !== undefined ? (
                  <>
                    {searchResults[selectedIndex].context!.substring(0, searchResults[selectedIndex].matchStart!)}
                    <mark
                      style={{
                        background: '#ffeb3b',
                        color: '#000',
                        padding: '0',
                        fontWeight: 'bold'
                      }}
                    >
                      {searchResults[selectedIndex].context!.substring(
                        searchResults[selectedIndex].matchStart!,
                        searchResults[selectedIndex].matchEnd!
                      )}
                    </mark>
                    {searchResults[selectedIndex].context!.substring(searchResults[selectedIndex].matchEnd!)}
                  </>
                ) : (
                  searchResults[selectedIndex].text
                )}
              </div>
              {searchResults[selectedIndex].position && (
                <div style={{
                  color: '#999',
                  fontSize: '11px',
                  marginTop: '2px'
                }}>
                  Position: ({Math.round(searchResults[selectedIndex].position!.x)}, {Math.round(searchResults[selectedIndex].position!.y)})
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div style={{
        marginTop: '8px',
        fontSize: '11px',
        color: '#666',
        textAlign: 'center'
      }}>
        Type to search • ↑↓ to navigate • Enter to select • Esc to exit • ⌫ to delete
      </div>

      {/* Add blinking cursor animation */}
      <style>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}