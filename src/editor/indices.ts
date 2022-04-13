import produce from "immer"
import { HierarchicalParsedSteps } from "../util"

export type SelectionsMap = {
    [Path in string]?: {
        all: Array<Array<number>>
        selected?: Array<Array<number>>
        steps: HierarchicalParsedSteps
    }
}

export function hasSelected(
    selections: SelectionsMap[string]
): selections is SelectionsMap[string] & { selected: Array<Array<number>> } {
    return selections?.selected != null
}

/**
 * adds/removes an index to allIndices
 */
export function editIndex(
    selectionsMap: SelectionsMap,
    steps: HierarchicalParsedSteps,
    index: Array<number>,
    add: boolean
): SelectionsMap {
    const stepsId = steps.path.join(",")
    return produce(selectionsMap, (draft) => {
        let selections = draft[stepsId]

        if (!add) {
            const key = index.join(",")
            if (selections != null) {
                splice(selections.all, key, (value) => value.join(","))
            }
            if (selections != null && selections.selected != null) {
                splice(selections.selected, key, (value) => value.join(","))
                if (selections.selected.length === 0) {
                    selections.selected = undefined
                }
            }
            return
        }

        if (selections == null) {
            selections = {
                all: [],
                steps,
            }
            draft[stepsId] = selections
        }

        if (selections.selected != null && selections.all.length === selections.selected.length) {
            selections.selected.push(index)
        }
        
        selections.all.push(index)
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
    selectionsMap: SelectionsMap,
    steps: HierarchicalParsedSteps,
    index: Array<number> | undefined,
    type: "replace" | "toggle" | "add" | "remove"
): SelectionsMap {
    const stepsId = steps.path.join(",")
    return produce(type === "replace" ? unselectAll(selectionsMap) : selectionsMap, (draft) => {
        const selections = draft[stepsId]
        if (selections == null) {
            return
        }
        if (selections.selected == null) {
            if (type === "remove") {
                return
            }
            //can only happen for replace, add, toggle
            selections.selected = index == null ? selections.all : [index]
            return
        }

        //can only happen for toggle, add, remove

        if (index == null) {
            if (type === "toggle" || type === "remove") {
                delete draft[stepsId]
            } else {
                //add
                selections.selected = selections.all
            }
            return
        }

        const indexKey = index.join(",")
        const indexIndex = selections.selected.findIndex((i) => i.join(",") === indexKey)

        const shouldBeSelected = (type === "toggle" && indexIndex == -1) || type === "add" //else it is "remove" => false

        if (shouldBeSelected) {
            selections.selected.push(index)
        } else {
            selections.selected.splice(indexIndex, 1)
            if (selections.selected.length === 0) {
                selections.selected = undefined
            }
        }
    })
}

export function unselectAll(selectionsMap: SelectionsMap): SelectionsMap {
    return produce(selectionsMap, (draft) => {
        for (const value of Object.values(draft)) {
            if (value == null) {
                continue
            }
            value.selected = undefined
        }
    })
}
