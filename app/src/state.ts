import type { BoardDocument } from './model/types'
import { currentSchemaVersion } from './model/types'

export function makeEmptyDoc(): BoardDocument {
  return {
    schemaVersion: currentSchemaVersion,
    notes: [],
    connections: [],
    shapes: [],
    stacks: [],
    noteStyles: [],
  }
}

