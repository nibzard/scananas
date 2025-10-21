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

// Autosave operations
export async function autosaveDocument(doc: any, filePath: string): Promise<any> {
  return invoke('autosave_document', { args: { doc, file_path: filePath } })
}

export async function setDocumentDirty(isDirty: boolean): Promise<void> {
  return invoke('set_document_dirty', { isDirty })
}

export async function setCurrentDocumentPath(filePath: string): Promise<void> {
  return invoke('set_current_document_path', { filePath })
}

export async function getAutosaveStatus(): Promise<any> {
  return invoke('get_autosave_status')
}

export async function checkRecoveryFiles(): Promise<any[]> {
  return invoke('check_recovery_files')
}

export async function recoverFromAutosave(recoveryPath: string): Promise<any> {
  return invoke('recover_from_autosave', { recoveryPath })
}

// Export operations
export async function exportDocumentAsText(doc: any, format: string, ordering?: string): Promise<string> {
  return invoke('export_document_as_text', { args: { doc, format, ordering } })
}

export async function exportDocumentAsPNG(scale: number): Promise<string> {
  return invoke('export_document_as_png', { scale })
}

export async function savePngToFile(filePath: string, pngData: Uint8Array): Promise<void> {
  return invoke('save_png_to_file', { filePath, pngData })
}

