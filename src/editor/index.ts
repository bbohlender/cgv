import type { HierarchicalParsedGrammarDefinition } from ".."
import { IndicesMap } from "./indices"

export type EditorState = {
    grammar: HierarchicalParsedGrammarDefinition
    selectionsMap: IndicesMap
}

export * from "./indices"
export * from "./selection"
export * from "./replace"
export * from "./insert"
export * from "./remove"
export * from "./noun"
export * from "./noun"
export * from "./default-step"
