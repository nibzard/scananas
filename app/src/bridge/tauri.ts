export async function invoke<T = unknown>(cmd: string, args?: Record<string, any>): Promise<T> {
  const w = window as any
  if (w.__TAURI__ && typeof w.__TAURI__.invoke === 'function') {
    return w.__TAURI__.invoke(cmd, args)
  }
  throw new Error('Not running inside Tauri environment')
}

// Document operations
export async function openDocument(): Promise<any> {
  return invoke('open_document')
}

export async function openSpecificDocument(filePath: string): Promise<any> {
  return invoke('open_specific_document', { filePath })
}

export async function saveDocument(doc: any): Promise<string> {
  return invoke('save_document', { args: { doc } })
}

// Recent files operations
export async function getRecentFiles(): Promise<string[]> {
  return invoke('get_recent_files')
}

export async function clearRecentFiles(): Promise<void> {
  return invoke('clear_recent_files')
}

