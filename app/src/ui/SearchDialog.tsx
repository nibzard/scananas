import React, { useState, useEffect, useRef } from 'react'
import { Note, Connection } from '../model/types'
import { SearchResult, performSearch, getNextResult, filterResultsByType } from '../utils/search'

interface SearchDialogProps {
  isVisible: boolean
  onClose: () => void
  notes: Note[]
  connections: Connection[]
  onResultSelect: (result: SearchResult) => void
  onMultiSelect: (resultIds: string[]) => void
}

export function SearchDialog({
  isVisible,
  onClose,
  notes,
  connections,
  onResultSelect,
  onMultiSelect
}: SearchDialogProps) {
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [filterType, setFilterType] = useState<'note' | 'connection' | 'all'>('all')
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input when dialog opens
  useEffect(() => {
    if (isVisible && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isVisible])

  // Update search results when query or filter changes
  useEffect(() => {
    if (query.trim()) {
      const results = performSearch(notes, connections, query)
      const filteredResults = filterResultsByType(results, filterType)
      setSearchResults(filteredResults)
      setSelectedIndex(0) // Reset selection when results change
    } else {
      setSearchResults([])
      setSelectedIndex(0)
    }
  }, [query, filterType, notes, connections])

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':
        e.preventDefault()
        onClose()
        break
      case 'ArrowDown':
        e.preventDefault()
        if (searchResults.length > 0) {
          const next = getNextResult(searchResults, selectedIndex, 'next')
          setSelectedIndex(next.index)
          onResultSelect(next.result!)
        }
        break
      case 'ArrowUp':
        e.preventDefault()
        if (searchResults.length > 0) {
          const prev = getNextResult(searchResults, selectedIndex, 'previous')
          setSelectedIndex(prev.index)
          onResultSelect(prev.result!)
        }
        break
      case 'Enter':
        e.preventDefault()
        if (e.shiftKey && searchResults.length > 0) {
          // Shift+Enter: Select all results
          e.preventDefault()
          const allIds = searchResults.map(r => r.id)
          onMultiSelect(allIds)
        } else if (searchResults.length > 0) {
          // Enter: Select current result and close
          onResultSelect(searchResults[selectedIndex])
          onClose()
        }
        break
    }
  }

  if (!isVisible) {
    return null
  }

  const currentResult = searchResults[selectedIndex]

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(4px)'
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#2a2a2a',
          border: '1px solid #444',
          borderRadius: '8px',
          padding: '20px',
          minWidth: '500px',
          maxWidth: '700px',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, color: '#fff', fontSize: '18px' }}>Search</h3>
          <button
            onClick={onClose}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              color: '#999',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            ×
          </button>
        </div>

        {/* Search Input */}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search notes and connections..."
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '16px',
            background: '#1a1a1a',
            border: '1px solid #444',
            borderRadius: '4px',
            color: '#fff',
            marginBottom: '12px'
          }}
        />

        {/* Filter Buttons */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button
            onClick={() => setFilterType('all')}
            style={{
              padding: '6px 12px',
              background: filterType === 'all' ? '#4aa3ff' : '#333',
              border: '1px solid #444',
              borderRadius: '4px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            All ({searchResults.length})
          </button>
          <button
            onClick={() => setFilterType('note')}
            style={{
              padding: '6px 12px',
              background: filterType === 'note' ? '#4aa3ff' : '#333',
              border: '1px solid #444',
              borderRadius: '4px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Notes ({filterResultsByType(searchResults, 'note').length})
          </button>
          <button
            onClick={() => setFilterType('connection')}
            style={{
              padding: '6px 12px',
              background: filterType === 'connection' ? '#4aa3ff' : '#333',
              border: '1px solid #444',
              borderRadius: '4px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Connections ({filterResultsByType(searchResults, 'connection').length})
          </button>
        </div>

        {/* Results */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            border: '1px solid #333',
            borderRadius: '4px',
            background: '#1a1a1a'
          }}
        >
          {searchResults.length === 0 ? (
            <div
              style={{
                padding: '20px',
                textAlign: 'center',
                color: '#666',
                fontSize: '14px'
              }}
            >
              {query.trim() ? 'No results found' : 'Type to search...'}
            </div>
          ) : (
            <div>
              {searchResults.map((result, index) => (
                <div
                  key={`${result.type}-${result.id}`}
                  onClick={() => {
                    setSelectedIndex(index)
                    onResultSelect(result)
                  }}
                  style={{
                    padding: '12px',
                    borderBottom: '1px solid #333',
                    cursor: 'pointer',
                    background: index === selectedIndex ? '#2a4a66' : 'transparent',
                    transition: 'background 0.15s ease'
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                    <div
                      style={{
                        padding: '2px 8px',
                        background: result.type === 'note' ? '#4a9eff' : '#ff9f4a',
                        borderRadius: '3px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        color: '#fff',
                        marginRight: '8px',
                        marginTop: '2px',
                        flexShrink: 0
                      }}
                    >
                      {result.type.toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          color: '#fff',
                          fontSize: '14px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          marginBottom: '4px'
                        }}
                      >
                        {result.context && result.matchStart !== undefined && result.matchEnd !== undefined ? (
                          <>
                            {result.context.substring(0, result.matchStart)}
                            <mark
                              style={{
                                background: '#ffeb3b',
                                color: '#000',
                                padding: '0',
                                fontWeight: 'bold'
                              }}
                            >
                              {result.context.substring(result.matchStart, result.matchEnd)}
                            </mark>
                            {result.context.substring(result.matchEnd)}
                          </>
                        ) : (
                          result.text
                        )}
                      </div>
                      {result.position && (
                        <div
                          style={{
                            color: '#999',
                            fontSize: '12px'
                          }}
                        >
                          Position: ({Math.round(result.position.x)}, {Math.round(result.position.y)})
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '12px',
          fontSize: '12px',
          color: '#999'
        }}>
          <div>
            {searchResults.length > 0 && (
              <span>{selectedIndex + 1} of {searchResults.length} results</span>
            )}
          </div>
          <div>
            ↑↓ Navigate • Enter to select • Shift+Enter to select all • Esc to close
          </div>
        </div>
      </div>
    </div>
  )
}