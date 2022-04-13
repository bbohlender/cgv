import produce from "immer"
import { HierarchicalParsedSteps } from "../util";

export type IndicesMap = { [Path in string]?: Array<Array<number>> }

/**
 * adds/removes an index to allIndices
 */
export function editIndex(
    indicesMap: IndicesMap,
    selectionsMap: IndicesMap,
    steps: HierarchicalParsedSteps,
    index: Array<number>,
    add: boolean
): { selectionsMap: IndicesMap; indicesMap: IndicesMap } {
    const stepsId = steps.path.join(",")
    return produce({ selectionsMap, indicesMap }, ({ selectionsMap: selectionDraft, indicesMap: indicesDraft }) => {
        let indices = indicesDraft[stepsId]
        let selections = selectionDraft[stepsId]

        if (!add) {
            const key = index.join(",")
            if (indices != null) {
                splice(indices, key, (value) => value.join(","))
            }
            if (selections != null) {
                splice(selections, key, (value) => value.join(","))
                if(selections.length === 0) {
                    delete selectionDraft[stepsId]
                }
            }
            return
        }

        if (indices == null) {
            indices = []
            indicesDraft[stepsId] = indices
        }
        indices.push(index)

        if (selections != null && indices.length === selections.length) {
            selections.push(index)
        }
    })
}

function splice<T, K>(array: Array<T>, value: K, transform: (value: T) => K) {
    const index = array.findIndex((val) => transform(val) === value)
    if (index === -1) {
        return
    }
    array.splice(index, 1)
}

export function editSelection(
    indicesMap: IndicesMap,
    selectionsMap: IndicesMap,
    steps: HierarchicalParsedSteps,
    index: Array<number> | undefined,
    type: "replace" | "toggle" | "add" | "remove"
): IndicesMap {
    const stepsId = steps.path.join(",")
    return produce(type === "replace" ? {} : selectionsMap, (draft) => {
        let selections = type === "replace" ? undefined : draft[stepsId]
        if (selections == null) {
            if (type === "remove") {
                return
            }
            //can only happen for replace, add, toggle
            draft[stepsId] = index == null ? indicesMap[stepsId] ?? [] : [index]
            return
        }

        //can only happen for toggle, add, remove

        if (index == null) {
            if (type === "toggle" || type === "remove") {
                delete draft[stepsId]
            } else {
                //add
                draft[stepsId] = indicesMap[stepsId] ?? []
            }
            return
        }

        const indexKey = index.join(",")
        const indexIndex = selections.findIndex((i) => i.join(",") === indexKey)

        const shouldBeSelected = (type === "toggle" && indexIndex == -1) || type === "add" //else it is "remove" => false

        if (shouldBeSelected) {
            selections.push(index)
        } else {
            selections.splice(indexIndex, 1)
        }
    })
}
