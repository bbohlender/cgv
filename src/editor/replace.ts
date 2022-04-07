import { HierarchicalPath, ParsedSteps, HierarchicalParsedGrammarDefinition, getAtPath, setAtPath } from ".."
import type { EditorResult, Selections } from "."
import { getPathFromSelection, translateSelections } from "."
import { produce } from "immer"

export function replace(
    selections: Selections,
    replaceWith: (path: HierarchicalPath) => ParsedSteps,
    grammar: HierarchicalParsedGrammarDefinition
): EditorResult {
    const replaces = translateSelections(selections, replaceWith, (path) => getAtPath(grammar, path))
    const result = produce(grammar, (draft) => {
        for (const { path, steps } of replaces) {
            setAtPath(draft, path, steps)
        }
    })
    return {
        grammar: result,
        selections: selections
            .filter((selection) => getAtPath(result, getPathFromSelection(selection)) == null)
            .map(({ path }) => ({ path, indices: undefined })),
    }
}
