export async function invoke<T = unknown>(cmd: string, args?: Record<string, any>): Promise<T> {
  const w = window as any
  if (w.__TAURI__ && typeof w.__TAURI__.invoke === 'function') {
    return w.__TAURI__.invoke(cmd, args)
  }
  throw new Error('Not running inside Tauri environment')
}

