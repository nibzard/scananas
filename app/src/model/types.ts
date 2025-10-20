export type ID = string

export interface Point { x: number; y: number }
export interface Size { w: number; h: number }
export interface Rect extends Point, Size {}

export interface NoteStyle {
  id: ID
  textStyle: {
    font: string
    size: number
    weight?: number
    italic?: boolean
    underline?: boolean
    strike?: boolean
    color?: string
    align?: 'left' | 'center' | 'right'
  }
  fill?: string
  border?: { color?: string; width?: number; style?: 'solid' | 'dotted' }
  cornerRadius?: number
  shadow?: boolean
}

export interface DocumentStyle {
  background?: { color?: string; textureId?: ID }
  defaultNoteStyleId?: ID
  defaultShapeStyleId?: ID
  grid?: { visible: boolean; snap: boolean; size: number }
}

export interface EmbeddedImage {
  id: ID
  mime: string
  width: number
  height: number
  dataBase64?: string
  path?: string
}

export interface ConnectionStyle {
  kind?: 'dotted' | 'solid'
  arrows?: 'none' | 'src' | 'dst' | 'both'
  color?: string
  width?: number
}

export interface Connection {
  id: ID
  srcNoteId: ID
  dstNoteId: ID
  style?: ConnectionStyle
  label?: string
  bendPoints?: Point[]
}

export interface BackgroundShape {
  id: ID
  frame: Rect
  radius?: number
  magnetic?: boolean
  styleId?: ID
  label?: string
}

export interface Stack {
  id: ID
  noteIds: ID[]
  orientation?: 'vertical'
  spacing?: number
  indentLevels?: Record<ID, number>
  alignedWidth?: number
}

export interface Note {
  id: ID
  text: string
  richAttrs?: Record<string, unknown>
  frame: Rect
  styleId?: ID
  faded?: boolean
  stackId?: ID
  links?: string[]
  images?: ID[]
  connections?: ID[]
}

export interface BoardDocument {
  schemaVersion: number
  notes: Note[]
  connections: Connection[]
  shapes: BackgroundShape[]
  stacks: Stack[]
  noteStyles: NoteStyle[]
  documentStyle?: DocumentStyle
  images?: EmbeddedImage[]
}

export const currentSchemaVersion = 1

