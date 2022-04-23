import produce from "immer"
import { ParsedSteps } from "../parser"
import { getAtPath, HierarchicalParsedGrammarDefinition, HierarchicalParsedSteps, translatePath } from "../util"
import { findSymbolsWithIdentifier } from "./noun"

export type IndicesMap = { [Path in string]?: Array<FullIndex> }
export type FullIndex = { after: string; before: string }
export type SelectionsList = Array<{ steps: HierarchicalParsedSteps; indices: Array<FullIndex> }>

export type SelectionState = {
    indicesMap: IndicesMap
    selectionsList: SelectionsList
    hovered: SelectionsList[number] | undefined
}

export function editSelectionRelated(
    indicesMap: IndicesMap,
    selectionsList: SelectionsList,
    targetSelectionsList: SelectionsList,
    filter: ((index: FullIndex) => boolean) | undefined,
    grammar: HierarchicalParsedGrammarDefinition,
    relation: "predecessor" | "successor",
    type: "replace" | "add",
    shouldIncludeChildren: (steps: HierarchicalParsedSteps) => boolean
): SelectionsList {
    return produce(selectionsList, (selectionsDraft) => {
        for (const { steps, indices } of targetSelectionsList) {
            if (type === "replace") {
                editSelectionOnDraft(indicesMap, selectionsDraft, steps, indices, "remove")
            }
            const parents = getIndirectParentsSteps(steps, grammar)
            const related =
                relation === "predecessor"
                    ? getPredecessorSelections(indicesMap, parents, steps, indices, filter)
                    : getSuccessorSelections(
                          indicesMap,
                          parents,
                          steps,
                          indices,
                          grammar,
                          filter,
                          shouldIncludeChildren(steps)
                      )

            for (const { steps, indices } of related) {
                editSelectionOnDraft(indicesMap, selectionsDraft, steps, indices, "add")
            }
        }
    })
}

export function getPositionedSelections(
    indicesMap: IndicesMap,
    relatedStepsList: Array<HierarchicalParsedSteps>,
    indices: Array<FullIndex>,
    indexIsRelated: (current: FullIndex, next: FullIndex) => boolean,
    filter: ((index: FullIndex) => boolean) | undefined
): SelectionsList {
    return relatedStepsList
        .map((relatedSteps) => {
            const path = relatedSteps.path.join(",")
            const existingIndices = indicesMap[path]
            if (existingIndices == null) {
                return undefined
            }
            const forwardIndices = existingIndices.filter(
                (existingIndex) =>
                    indices.find(
                        (index) => indexIsRelated(index, existingIndex) && (filter == null || filter(existingIndex))
                    ) != null
            )
            return { steps: relatedSteps, indices: forwardIndices }
        })
        .filter(filterNullAndEmpty)
}

function filterNullAndEmpty<T extends { indices: Array<any> }>(value: T | undefined): value is T {
    return value != null && value.indices.length > 0
}

export function getPredecessorSelections(
    indicesMap: IndicesMap,
    parents: Array<HierarchicalParsedSteps>,
    steps: HierarchicalParsedSteps,
    indices: Array<FullIndex>,
    filter: ((index: FullIndex) => boolean) | undefined
): SelectionsList {
    const backwardSelections = getHorizontalSelections(
        indicesMap,
        parents,
        steps,
        indices,
        -1,
        (current, next) => current.before === next.after,
        filter
    )

    if (backwardSelections.length > 0) {
        return backwardSelections
    }

    if (parents.length > 0) {
        //upward
        const upwardSelections = getPositionedSelections(
            indicesMap,
            parents,
            indices,
            (current, next) => current.before.startsWith(next.before),
            filter
        )
        return upwardSelections
    }

    return []
}

export function getSuccessorSelections(
    indicesMap: IndicesMap,
    parents: Array<HierarchicalParsedSteps>,
    steps: HierarchicalParsedSteps,
    indices: Array<FullIndex>,
    grammar: HierarchicalParsedGrammarDefinition,
    filter: ((index: FullIndex) => boolean) | undefined,
    includeChildren: boolean
): SelectionsList {
    const selections = getHorizontalSelections(
        indicesMap,
        parents,
        steps,
        indices,
        1,
        (current, next) => current.after === next.before,
        filter
    )

    if (includeChildren) {
        const children =
            steps.type === "symbol"
                ? [grammar[steps.identifier]]
                : steps.type === "sequential"
                ? [steps.children[0]]
                : steps.children ?? []

        if (children.length > 0) {
            selections.push(
                ...getPositionedSelections(
                    indicesMap,
                    children,
                    indices,
                    (current, next) => next.before.startsWith(current.before),
                    filter
                )
            )
        }
    }
    return selections
}

export function getIndirectParentsSteps(
    steps: HierarchicalParsedSteps,
    grammar: HierarchicalParsedGrammarDefinition
): Array<HierarchicalParsedSteps> {
    if (steps.path.length > 1) {
        const translatedPath = translatePath(grammar, steps.path)
        if (translatedPath == null) {
            return []
        }
        return [getAtPath(translatedPath, steps.path.length - 2)]
    }

    const parents: Array<HierarchicalParsedSteps> = []
    for (const root of Object.values(grammar)) {
        findSymbolsWithIdentifier(root, steps.path[0], (steps) => parents.push(steps))
    }

    return parents
}

function getHorizontalSelections(
    indicesMap: IndicesMap,
    parents: Array<HierarchicalParsedSteps>,
    steps: HierarchicalParsedSteps,
    indices: Array<FullIndex>,
    horizontalOffset: number,
    isHorizontalIndex: (current: FullIndex, next: FullIndex) => boolean,
    filter: ((index: FullIndex) => boolean) | undefined
): SelectionsList {
    if (steps.path.length <= 1 || parents[0].type != "sequential") {
        return []
    }
    const nextIndex = (steps.path[steps.path.length - 1] as number) + horizontalOffset

    if (nextIndex < 0 || parents[0].children.length <= nextIndex) {
        return []
    }

    const horizontalSteps = parents[0].children[nextIndex]
    return getPositionedSelections(indicesMap, [horizontalSteps], indices, isHorizontalIndex, filter)
}

function editSelectionOnDraft(
    indicesMap: IndicesMap,
    selectionsList: SelectionsList,
    steps: HierarchicalParsedSteps,
    indices: Array<FullIndex> | undefined,
    type: "toggle" | "add" | "remove"
): void {
    const path = steps.path.join(",")
    const selectionsIndex = selectionsList.findIndex((selections) => selections.steps.path.join(",") === path)
    const all = indicesMap[path] ?? []

    if (selectionsIndex === -1) {
        if (type === "remove") {
            return
        }
        //can only happen for replace, add, toggle
        selectionsList.push({
            steps,
            indices: indices == null ? all : indices,
        })
        return
    }

    const selections = selectionsList[selectionsIndex]

    if (indices == null) {
        if (type === "toggle" || type === "remove") {
            selectionsList.splice(selectionsIndex, 1)
        } else {
            //add
            selections.indices = all
        }
        return
    }

    for (const index of indices) {
        const indexIndex = selections.indices.findIndex((selectedIndex) => selectedIndex.after === index.after)

        if (indexIndex === -1 && (type === "toggle" || type === "add")) {
            selections.indices.push(index)
        }
        if (indexIndex !== -1 && (type === "toggle" || type === "remove")) {
            selections.indices.splice(indexIndex, 1)
        }
    }

    if (selections.indices.length === 0) {
        selectionsList.splice(selectionsIndex, 1)
    }
}

export function editSelection(
    indicesMap: IndicesMap,
    selectionsList: SelectionsList,
    targetSelectionsList: Array<{ steps: HierarchicalParsedSteps; indices: Array<FullIndex> | undefined }>,
    type: "replace" | "toggle" | "add" | "remove"
): SelectionsList {
    return produce(type === "replace" ? [] : selectionsList, (selectionsDraft) => {
        for (const { steps, indices } of targetSelectionsList) {
            editSelectionOnDraft(indicesMap, selectionsDraft, steps, indices, type === "replace" ? "add" : type)
        }
    })
}

export function editIndices(
    indicesMap: IndicesMap,
    selectionsList: SelectionsList,
    hovered: SelectionState["hovered"],
    indices: Array<{
        steps: HierarchicalParsedSteps
        index: FullIndex
    }>,
    add: boolean
) {
    return produce<SelectionState>({ hovered, indicesMap, selectionsList }, (draft) => {
        for (const { index, steps } of indices) {
            const { indicesMap: indicesDraft, selectionsList: selectionsDraft, hovered: hoveredDraft } = draft

            const selectionsIndex = selectionsList.findIndex((selections) => selections.steps === steps)
            const selections = selectionsDraft[selectionsIndex]
            const path = steps.path.join(",")
            let all = indicesDraft[path]

            if (!add) {
                if (all == null) {
                    return
                }

                const indexIndex = all.findIndex((allIndex) => allIndex.after === index.after)
                all.splice(indexIndex, 1)
                if (selections != null) {
                    const indexIndex = selections.indices.findIndex(
                        (selectedIndex) => selectedIndex.after === index.after
                    )
                    selections.indices.splice(indexIndex, 1)
                    if (selections.indices.length === 0) {
                        selectionsDraft.splice(selectionsIndex, 1)
                    }
                }
                if (hovered?.steps === steps && hoveredDraft != null) {
                    const indexIndex = hoveredDraft.indices.findIndex(
                        (hoveredIndex) => hoveredIndex.after === index.after
                    )
                    hoveredDraft.indices.splice(indexIndex, 1)
                    if (hoveredDraft.indices.length === 0) {
                        draft.hovered = undefined
                    }
                }
            }

            if (all == null) {
                all = []
                indicesDraft[path] = all
            }

            if (selections != null && all.length === selections.indices.length) {
                selections.indices.push(index)
            }

            all.push(index)
        }
    })
}
