import type { HierarchicalParsedGrammarDefinition } from ".."
import { SelectionsMap } from "./indices"

export type EditorState = {
    grammar: HierarchicalParsedGrammarDefinition
    selectionsMap: SelectionsMap
}

export * from "./indices"
export * from "./selection"
export * from "./replace"
export * from "./insert"
export * from "./remove"
export * from "./noun"
export * from "./noun"
export * from "./default-step"
