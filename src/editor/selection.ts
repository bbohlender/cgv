import produce from "immer"
import {
    getAtPath,
    HierarchicalParsedGrammarDefinition,
    HierarchicalParsedSteps,
    HierarchicalPath,
    translatePath,
} from "../util"
import { findSymbolsWithIdentifier } from "./noun"

export type IndicesMap = { [Path in string]?: Array<FullIndex> }
export type FullIndex = { after: string; before: string }
export type SelectionsList = Array<Selections>
export type Selections = { steps: SelectedSteps; indices: Array<FullIndex> }
export type SelectedSteps = HierarchicalParsedSteps | string

export function getSelectedStepsJoinedPath(steps: SelectedSteps): string {
    return typeof steps === "string" ? steps : steps.path.join(",")
}

export function getSelectedStepsPath(steps: SelectedSteps): HierarchicalPath {
    return typeof steps === "string" ? [steps] : steps.path
}

export function compareSelectedStepsPath(s1: SelectedSteps, s2: SelectedSteps, s2PathJoined?: string): boolean {
    if (typeof s1 === "string") {
        return typeof s2 === "string" && s1 === s2
    }
    return getSelectedStepsJoinedPath(s1) === (s2PathJoined ?? getSelectedStepsJoinedPath(s2))
}

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
    shouldIncludeChildren: (steps: SelectedSteps) => boolean
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

            for (const { steps: value, indices } of related) {
                editSelectionOnDraft(indicesMap, selectionsDraft, value, indices, "add")
            }
        }
    })
}

export function getRelatedSelections(
    indicesMap: IndicesMap,
    relatedStepsList: Array<SelectedSteps>,
    indices: Array<FullIndex>,
    indexIsRelated: (current: FullIndex, next: FullIndex) => boolean,
    filter: ((index: FullIndex) => boolean) | undefined
): SelectionState["selectionsList"] {
    return relatedStepsList
        .map((relatedSteps) => {
            const path = getSelectedStepsJoinedPath(relatedSteps)
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
    parents: Array<SelectedSteps>,
    steps: SelectedSteps,
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
        const upwardSelections = getRelatedSelections(
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
    parents: Array<SelectedSteps>,
    steps: SelectedSteps,
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
            typeof steps === "string"
                ? [grammar[steps]]
                : steps.type === "symbol"
                ? [steps.identifier]
                : steps.type === "sequential"
                ? [steps.children[0]]
                : steps.children ?? []

        if (children.length > 0) {
            selections.push(
                ...getRelatedSelections(
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
    steps: SelectedSteps,
    grammar: HierarchicalParsedGrammarDefinition
): Array<SelectedSteps> {
    if (typeof steps === "string") {
        const parents: Array<HierarchicalParsedSteps> = []
        for (const root of Object.values(grammar)) {
            findSymbolsWithIdentifier(root, steps, (steps) => parents.push(steps))
        }

        return parents
    }
    if (steps.path.length > 1) {
        const translatedPath = translatePath(grammar, steps.path)
        if (translatedPath == null) {
            return []
        }
        return [getAtPath(translatedPath, steps.path.length - 2)]
    }

    return [steps.path[0]]
}

function getHorizontalSelections(
    indicesMap: IndicesMap,
    parents: Array<SelectedSteps>,
    steps: SelectedSteps,
    indices: Array<FullIndex>,
    horizontalOffset: number,
    isHorizontalIndex: (current: FullIndex, next: FullIndex) => boolean,
    filter: ((index: FullIndex) => boolean) | undefined
): SelectionsList {
    if (typeof steps === "string") {
        return []
    }
    if (steps.path.length <= 1 || typeof parents[0] == "string" || parents[0].type != "sequential") {
        return []
    }
    const nextIndex = (steps.path[steps.path.length - 1] as number) + horizontalOffset

    if (nextIndex < 0 || parents[0].children.length <= nextIndex) {
        return []
    }

    const horizontalSteps = parents[0].children[nextIndex]
    return getRelatedSelections(indicesMap, [horizontalSteps], indices, isHorizontalIndex, filter)
}

function editSelectionOnDraft(
    indicesMap: IndicesMap,
    selectionsList: SelectionsList,
    steps: SelectedSteps,
    indices: Array<FullIndex> | undefined,
    type: "toggle" | "add" | "remove"
): void {
    const path = getSelectedStepsJoinedPath(steps)
    const selectionsIndex = selectionsList.findIndex((selections) =>
        compareSelectedStepsPath(selections.steps, steps, path)
    )
    const all = indicesMap[path] ?? []

    if (selectionsIndex === -1) {
        if (type === "remove") {
            return
        }
        //can only happen for replace, add, toggle
        selectionsList.push({
            steps: steps,
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
    targetSelectionsList: Array<{ steps: HierarchicalParsedSteps | string; indices: Array<FullIndex> | undefined }>,
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
    hovered: Selections | undefined,
    indices: Array<{
        steps: HierarchicalParsedSteps
        index: FullIndex
    }>,
    add: boolean
): SelectionState {
    return produce({ hovered, indicesMap, selectionsList }, (draft) => {
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
