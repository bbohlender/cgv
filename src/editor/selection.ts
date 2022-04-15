import produce from "immer"
import { HierarchicalParsedSteps } from "../util"

export type IndicesMap = { [Path in string]?: Array<string> }
export type SelectionsList = Array<{ steps: HierarchicalParsedSteps; indices: Array<string> }>

export type SelectionState = {
    indicesMap: IndicesMap
    selectionsList: SelectionsList
}

/**
 * adds/removes an index to allIndices
 */
export function editIndex(
    indicesMap: IndicesMap,
    selectionsList: SelectionsList,
    steps: HierarchicalParsedSteps,
    index: string,
    add: boolean
): SelectionState {
    const selectionsIndex = selectionsList.findIndex((selections) => selections.steps === steps)
    const path = steps.path.join(",")
    return produce({ indicesMap, selectionsList }, ({ indicesMap: indicesDraft, selectionsList: selectionsDraft }) => {
        let selections = selectionsDraft[selectionsIndex]
        let all = indicesDraft[path]

        if (!add) {
            if (all == null) {
                return
            }
            const indexIndex = all.findIndex((indexInAll) => index === indexInAll)
            all.splice(indexIndex, 1)
            if (selections != null) {
                const indexIndex = selections.indices.findIndex((selectedIndex) => index === selectedIndex)
                selections.indices.splice(indexIndex, 1)
                if (selections.indices.length === 0) {
                    selectionsDraft.splice(selectionsIndex, 1)
                }
            }
            return
        }

        if (all == null) {
            all = []
            indicesDraft[path] = all
        }

        if (selections != null && all.length === selections.indices.length) {
            selections.indices.push(index)
        }

        all.push(index)
    })
}

export function editSelection(
    indicesMap: IndicesMap,
    selectionsList: SelectionsList,
    steps: HierarchicalParsedSteps,
    index: string | undefined,
    type: "replace" | "toggle" | "add" | "remove"
): SelectionsList {
    const selectionsIndex =
        type === "replace" ? -1 : selectionsList.findIndex((selections) => selections.steps === steps)
    const path = steps.path.join(",")
    const all = indicesMap[path] ?? []

    return produce(type === "replace" ? [] : selectionsList, (selectionsDraft) => {
        if (selectionsIndex === -1) {
            if (type === "remove") {
                return
            }
            //can only happen for replace, add, toggle
            selectionsDraft.push({
                steps,
                indices: index == null ? all : [index],
            })
            return
        }

        const selections = selectionsDraft[selectionsIndex]

        if (index == null) {
            if (type === "toggle" || type === "remove") {
                selectionsDraft.splice(selectionsIndex, 1)
            } else {
                //add
                selections.indices = all
            }
            return
        }

        const indexIndex = selections.indices.findIndex((selectedIndex) => selectedIndex === index)

        const shouldBeSelected = (type === "toggle" && indexIndex == -1) || type === "add" //else it is "remove" => false

        if (shouldBeSelected) {
            selections.indices.push(index)
        } else {
            selections.indices.splice(indexIndex, 1)
            if (selections.indices.length === 0) {
                selectionsDraft.splice(selectionsIndex, 1)
            }
        }
    })
}
