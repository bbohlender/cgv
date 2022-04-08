import type { HierarchicalParsedGrammarDefinition } from ".."
import type { Selections } from "."

export type EditorResult = {
    grammar: HierarchicalParsedGrammarDefinition
    selections: Selections
}

export * from "./selection"
export * from "./replace"
export * from "./insert"
export * from "./remove"
export * from "./noun"
export * from "./noun"
export * from "./default-step"
