import produce from "immer"
import { ParsedSteps } from "../parser"
import {
    filterNull,
    getAtPath,
    HierarchicalParsedGrammarDefinition,
    HierarchicalParsedSteps,
    HierarchicalPath,
    translatePath,
} from "../util"
import { findSymbolsWithIdentifier } from "./noun"

export type IndicesMap = { [Path in string]?: Array<string> }
export type SelectionsList = Array<{ steps: HierarchicalParsedSteps; indices: Array<string> }>

export type SelectionState = {
    indicesMap: IndicesMap
    selectionsList: SelectionsList
    hovered: SelectionsList[number] | undefined
}

const removeLastIndexRegex = /^(.+),\d+$/

function indexIsPredecessorOrEqual(from: string, to: string) {
    return indexIsSucccessorOrEqual(to, from)
}

function indexIsSucccessorOrEqual(from: string, to: string) {
    if (from === to) {
        return true
    }
    if (from.length === 0) {
        //"0" is successor of ""
        return !to.includes(",")
    }
    const match = removeLastIndexRegex.exec(to)
    if (match == null) {
        return false
    }
    return match[1] === from
}

export function getParent(
    steps: HierarchicalParsedSteps,
    grammar: HierarchicalParsedGrammarDefinition
): HierarchicalParsedSteps | undefined {
    if (steps.path.length <= 1) {
        return undefined
    }
    const translatedPath = translatePath(grammar, steps.path)
    if (translatedPath == null) {
        throw new Error(`invalid path "${steps.path.join(",")}"`)
    }
    return getAtPath(translatedPath, steps.path.length - 2)
}

export function editSelectionRelated(
    indicesMap: IndicesMap,
    selectionsList: SelectionsList,
    targetSelectionsList: SelectionsList,
    grammar: HierarchicalParsedGrammarDefinition,
    relation: "predecessor" | "successor",
    type: "replace" | "add"
): SelectionsList {
    return produce(selectionsList, (selectionsDraft) => {
        for (const { steps, indices } of targetSelectionsList) {
            if (type === "replace") {
                editSelectionOnDraft(indicesMap, selectionsDraft, steps, indices, "remove")
            }
            const parent = getParent(steps, grammar)
            const related = getRelatedSelections(indicesMap, steps, parent, indices, grammar, relation)
            for (const { steps, indices } of related) {
                editSelectionOnDraft(indicesMap, selectionsDraft, steps, indices, "add")
            }
        }
    })
}

/**
 * @returns undefined or an array possible related steps (undefined means all steps are possibly related)
 */
function getRelatedSteps(
    steps: HierarchicalParsedSteps,
    parent: HierarchicalParsedSteps | undefined,
    grammar: HierarchicalParsedGrammarDefinition,
    relation: "predecessor" | "successor"
): Array<HierarchicalParsedSteps> {
    const lastPathEntry = steps.path[steps.path.length - 1]

    //forward/backward
    const nextEntry = (lastPathEntry as number) + (relation === "successor" ? 1 : -1)
    if (parent?.type === "sequential" && 0 <= nextEntry && nextEntry < parent.children.length) {
        return [parent.children[nextEntry]]
    }

    const result: Array<HierarchicalParsedSteps> = []

    //up
    if (parent == null) {
        for (const root of Object.values(grammar)) {
            findSymbolsWithIdentifier(root, lastPathEntry as string, (steps) => result.push(steps))
        }
    } else {
        result.push(parent)
    }

    //down
    if (relation === "successor") {
        if (steps.type === "symbol") {
            result.push(grammar[steps.identifier])
        } else if (steps.type === "sequential") {
            result.push(steps.children[0])
        } else if (steps.children != null) {
            result.push(...steps.children)
        }
    }

    return result
}

//TODO: consider beforeIndex and afterIndex
export function getRelatedSelections(
    indicesMap: IndicesMap,
    steps: HierarchicalParsedSteps,
    parent: HierarchicalParsedSteps | undefined,
    indices: Array<string>,
    grammar: HierarchicalParsedGrammarDefinition,
    relation: "predecessor" | "successor"
): SelectionsList {
    const relatedSteps = getRelatedSteps(steps, parent, grammar, relation)
    const indicesAreRelated = relation === "predecessor" ? indexIsPredecessorOrEqual : indexIsSucccessorOrEqual
    const relatedStepsPaths = relatedSteps.map((steps) => steps.path.join(","))
    const relatedIndicesMap = Object.entries(indicesMap)
        .filter(([path]) => relatedStepsPaths.includes(path))
        .map<[string, Array<string> | undefined]>(([path, indicesFromMap]) => [
            path,
            indicesFromMap?.filter(
                (indexFromMap) => indices.find((index) => indicesAreRelated(index, indexFromMap)) != null
            ),
        ])
        .filter(filterNullAndEmpty)
    return relatedIndicesMap
        .map(([joinedPath, indices]) => {
            const splittedPath = joinedPath.split(",")
            const path: HierarchicalPath = [splittedPath[0], ...splittedPath.slice(1).map((value) => parseInt(value))]
            const translatedPath = translatePath(grammar, path)
            if (translatedPath == null) {
                return undefined
            }
            return {
                steps: getAtPath(translatedPath, path.length - 1),
                indices,
            }
        })
        .filter(filterNull)
}

function filterNullAndEmpty(value: [string, Array<string> | undefined]): value is [string, Array<string>] {
    return value[1] != null && value[1].length > 0
}

function editSelectionOnDraft(
    indicesMap: IndicesMap,
    selectionsList: SelectionsList,
    steps: HierarchicalParsedSteps,
    indices: Array<string> | undefined,
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
        const indexIndex = selections.indices.indexOf(index)

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
    targetSelectionsList: Array<{ steps: HierarchicalParsedSteps; indices: Array<string> | undefined }>,
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
        index: string
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

                const indexIndex = all.indexOf(index)
                all.splice(indexIndex, 1)
                if (selections != null) {
                    const indexIndex = selections.indices.indexOf(index)
                    selections.indices.splice(indexIndex, 1)
                    if (selections.indices.length === 0) {
                        selectionsDraft.splice(selectionsIndex, 1)
                    }
                }
                if (hovered?.steps === steps && hoveredDraft != null) {
                    const indexIndex = hoveredDraft.indices.indexOf(index)
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

            if (hoveredDraft != null && all.length === hoveredDraft.indices.length) {
                hoveredDraft.indices.push(index)
            }

            all.push(index)
        }
    })
}
