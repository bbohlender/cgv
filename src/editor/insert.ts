import produce from "immer"
import { PatternSelector, EditorState, PatternType } from "."
import {
    getAtPath,
    HierarchicalInfo,
    setAtPath,
    translatePath,
    ParsedSteps,
    HierarchicalParsedGrammarDefinition,
    HierarchicalPath,
    getMatchingCondition,
} from ".."
import { computeDependencies, HierarchicalParsedSteps, toHierarchical, toHierarchicalSteps } from "../util"
import { getSelectedStepsUpwardsPaths } from "./replace"
import { getSelectedStepsPath, ValueMap, SelectionsList } from "./selection"

export async function insert<T, A>(
    valueMap: ValueMap<T, A>,
    selectionsList: SelectionsList<T, A>,
    patterns: Array<PatternType<T, A>>,
    selectCondition: PatternSelector,
    position: "before" | "after" | "parallel",
    stepGenerator: (path: HierarchicalPath) => ParsedSteps,
    grammar: HierarchicalParsedGrammarDefinition
): Promise<EditorState> {
    const partial = await produce(
        { grammar, selectionsList: [] as SelectionsList },
        async ({ grammar: draft, selectionsList: newSelections }) => {
            const type = position === "parallel" ? "parallel" : "sequential"
            for (const { values, steps, generatePatternCondition } of selectionsList) {
                const paths =
                    position === "after" ? [getSelectedStepsPath(steps)] : getSelectedStepsUpwardsPaths(steps, grammar)
                for (const path of paths) {
                    const joinedPath = path.join(",")
                    const all = valueMap[joinedPath] ?? []

                    if (all.length > 0 && values.length === 0) {
                        return
                    }

                    const translatedPath = translatePath<HierarchicalInfo>(draft, path)
                    if (translatedPath == null) {
                        continue
                    }

                    const newSteps = stepGenerator(path)
                    const oldSteps: ParsedSteps = type === "parallel" ? { type: "null" } : { type: "this" }
                    const selector = position === "parallel" ? "before" : position
                    const generatedCondition =
                        generatePatternCondition ??
                        (
                            await getMatchingCondition(
                                all.map((value) => value[selector]),
                                values.map((value) => value[selector]),
                                patterns,
                                selectCondition
                            )
                        ).generateStep

                    const translatedSteps: ParsedSteps =
                        generatedCondition == null
                            ? newSteps
                            : { type: "if", children: [generatedCondition(), newSteps, oldSteps] }

                    const current = getAtPath(translatedPath, path.length - 1)
                    const parent: ParsedSteps | undefined =
                        path.length > 1 ? getAtPath(translatedPath, path.length - 2) : undefined
                    if (parent?.type === type) {
                        let index = path[path.length - 1] as number
                        if (position !== "before") {
                            index += 1
                        }
                        parent.children.splice(index, 0, translatedSteps)
                        toHierarchicalSteps(parent, ...(path.slice(0, -1) as HierarchicalPath))
                    } else {
                        setAtPath(path, translatedPath, path.length - 1, {
                            type,
                            children: position === "before" ? [translatedSteps, current] : [current, translatedSteps],
                        })
                    }

                    const resultSteps = newSteps as HierarchicalParsedSteps

                    newSelections.push({
                        steps: resultSteps,
                        values: [],
                    })
                }
            }
        }
    )
    return {
        ...partial,
        hovered: undefined,
        dependencyMap: computeDependencies(partial.grammar),
    }
}
