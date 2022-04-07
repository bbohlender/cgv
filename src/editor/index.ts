import type { HierarchicalParsedGrammarDefinition } from ".."
import type { Selections } from "."

export type EditorResult = {
    grammar: HierarchicalParsedGrammarDefinition
    selections: Selections
}

export * from "./selection"
export * from "./replace"
export * from "./remove"
export * from "./noun"
export * from "./insert"
export * from "./noun"
export * from "./default-step"
