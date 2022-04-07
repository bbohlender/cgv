import { Selections, replace } from "."
import {
    ParsedSteps,
    AbstractParsedSequantial,
    AbstractParsedParallel,
    HierarchicalParsedGrammarDefinition,
    HierarchicalInfo,
} from ".."

export function add(
    position: "before" | "after" | "parallel",
    selections: Selections,
    step: ParsedSteps,
    grammar: HierarchicalParsedGrammarDefinition
): Selections {
    const type = position === "parallel" ? "parallel" : "sequential"
    const newSelections = replace(
        selections,
        (at) => ({
            type,
            children: position === "before" ? [step, at] : [at, step],
        }),
        grammar
    ) as Array<{
        steps: AbstractParsedSequantial<HierarchicalInfo> | AbstractParsedParallel<HierarchicalInfo>
        index: Array<number> | undefined
    }>
    return newSelections.map(({ index, steps }) => ({
        steps: steps.children[position === "before" ? 0 : 1],
        index,
    }))
    //TODO: assure that this is simplified (nested parallel/sequential)
}
