import { ParsedSteps, HierarchicalParsedGrammarDefinition } from ".."
import type { Selections } from "."
import { translateSelections } from "./selection"
import { produce } from "immer"
import { getAtPath, setAtPath } from "../util"

export function replace(
    selections: Selections,
    step: ParsedSteps | ((selected: ParsedSteps) => ParsedSteps),
    grammar: HierarchicalParsedGrammarDefinition
): { grammar: HierarchicalParsedGrammarDefinition; selections: Selections } {
    const replaces = translateSelections(selections, step, grammar)
    const result = produce(grammar, (draft) => {
        for (const { path, replaceWith } of replaces) {
            setAtPath(draft, path, replaceWith)
        }
    })
    return {
        grammar: result,
        selections: selections
            .filter(({ path }) => getAtPath(result, path) == null)
            .map(({ path }) => ({ path, index: undefined })),
    }
}
