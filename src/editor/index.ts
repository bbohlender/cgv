import type { HierarchicalParsedGrammarDefinition } from ".."
import { SelectionState } from "./selection"

export type EditorState = {
    grammar: HierarchicalParsedGrammarDefinition
} & SelectionState

export * from "./pattern"
export * from "./replace"
export * from "./insert"
export * from "./remove"
export * from "./noun"
export * from "./noun"
export * from "./default-step"
export * from "./selection"
