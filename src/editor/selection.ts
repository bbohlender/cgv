import produce, { freeze } from "immer"
import { Value } from "../interpreter"
import { ParsedSteps } from "../parser"
import {
    filterNull,
    getAtPath,
    getIndexRelation,
    HierarchicalParsedGrammarDefinition,
    HierarchicalParsedSteps,
    HierarchicalPath,
    HierarchicalRelation,
    translatePath,
} from "../util"
import { findSymbolsWithIdentifier } from "./noun"
import { getContainingCondition, PatternSelector, PatternType } from "./pattern"

export type ValueMap<T = any> = { [Path in string]?: Array<FullValue<T>> }
export type FullValue<T = any> = { after: Value<T>; before: Value<T> }
export type SelectionsList<T = any> = Array<Selections<T>>
export type Selections<T = any> = {
    steps: SelectedSteps
    values: Array<FullValue<T>>
    generatePatternCondition?: () => ParsedSteps
}
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

export type SelectionState<T = any> = {
    selectionsList: SelectionsList<T>
    hovered: SelectionsList<T>[number] | undefined
}

/*
export function editSelectionRelated<T, A>(
    valueMap: ValueMap<T, A>,
    selectionsList: SelectionsList<T, A>,
    targetSelectionsList: SelectionsList<T, A>,
    filter: ((index: FullValue<T, A>) => boolean) | undefined,
    grammar: HierarchicalParsedGrammarDefinition,
    relation: "predecessor" | "successor",
    type: "replace" | "add",
    shouldIncludeChildren: (steps: SelectedSteps) => boolean
): SelectionsList<T, A> {
    return produce(selectionsList, (selectionsDraft) => {
        for (const { steps, indices } of targetSelectionsList) {
            if (type === "replace") {
                editSelectionOnDraft(valueMap, selectionsDraft, steps, indices, "remove")
            }
            const parents = getIndirectParentsSteps(steps, grammar)
            const related =
                relation === "predecessor"
                    ? getPredecessorSelections(valueMap, parents, steps, indices, filter)
                    : getSuccessorSelections(
                          valueMap,
                          parents,
                          steps,
                          indices,
                          grammar,
                          filter,
                          shouldIncludeChildren(steps)
                      )

            for (const { steps: value, indices } of related) {
                editSelectionOnDraft(valueMap, selectionsDraft, value, indices, "add")
            }
        }
    })
}*/

export function getRelatedSelections<T>(
    valueMap: ValueMap<T>,
    relatedStepsList: Array<SelectedSteps>,
    values: Array<FullValue<T>>,
    valueIsRelated: (current: FullValue<T>, next: FullValue<T>) => boolean,
    filter: ((value: FullValue<T>) => boolean) | undefined
): SelectionsList<T> {
    return relatedStepsList
        .map<Selections | undefined>((relatedSteps) => {
            const path = getSelectedStepsJoinedPath(relatedSteps)
            const exisitingValues = valueMap[path] ?? []
            const forwardValues = exisitingValues.filter(
                (existingValues) =>
                    values.find(
                        (index) => valueIsRelated(index, existingValues) && (filter == null || filter(existingValues))
                    ) != null
            )
            if (forwardValues.length === 0 && exisitingValues.length > 0) {
                return undefined
            }
            return { steps: relatedSteps, values: forwardValues, generatePatternCondition: undefined }
        })
        .filter(filterNull)
}

/*
export function getPredecessorSelections<T, A>(
    indicesMap: ValueMap<T, A>,
    parents: Array<SelectedSteps>,
    steps: SelectedSteps,
    indices: Array<FullValue<T, A>>,
    filter: ((index: FullValue<T, A>) => boolean) | undefined
): SelectionsList<T, A> {
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
    indicesMap: ValueMap,
    parents: Array<SelectedSteps>,
    steps: SelectedSteps,
    indices: Array<FullValue>,
    grammar: HierarchicalParsedGrammarDefinition,
    filter: ((index: FullValue) => boolean) | undefined,
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
                ? [getNounStep(steps, grammar)!]
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
*/

export function getIndirectParentsSteps(
    steps: SelectedSteps,
    grammar: HierarchicalParsedGrammarDefinition
): Array<SelectedSteps> {
    if (typeof steps === "string") {
        const parents: Array<HierarchicalParsedSteps> = []
        for (const { step: root } of grammar) {
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
/*

function getHorizontalSelections(
    indicesMap: ValueMap,
    parents: Array<SelectedSteps>,
    steps: SelectedSteps,
    indices: Array<FullValue>,
    horizontalOffset: number,
    isHorizontalIndex: (current: FullValue, next: FullValue) => boolean,
    filter: ((index: FullValue) => boolean) | undefined
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
}*/

export async function autoSelectPattern<T>(
    selectionsList: SelectionsList,
    indicesMap: ValueMap,
    selections: Selections,
    patternTypes: Array<PatternType<T>>,
    selectPattern: PatternSelector
): Promise<SelectionsList> {
    const path = getSelectedStepsJoinedPath(selections.steps)
    const all = indicesMap[path] ?? []
    if (all.length === 0) {
        return selectionsList
    }
    const pattern = await getContainingCondition(
        all.map(({ after }) => after),
        selections.values.map(({ after }) => after),
        patternTypes,
        selectPattern
    )
    return freeze(
        selectionsList.map((s) =>
            s === selections
                ? {
                      ...selections,
                      generatePatternCondition: pattern.generateStep,
                      values: all.filter(({ after }) => pattern.isSelected(after)),
                  }
                : s
        )
    )
}

function editSelectionOnDraft(
    indicesMap: ValueMap,
    selectionsList: SelectionsList,
    steps: SelectedSteps,
    values: Array<FullValue> | undefined,
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
            values: values == null ? all : values,
        })
        return
    }

    const selections = selectionsList[selectionsIndex]

    selections.generatePatternCondition = undefined

    if (values == null) {
        if (type === "toggle" || type === "remove") {
            selectionsList.splice(selectionsIndex, 1)
        } else {
            //add
            selections.values = all
        }
        return
    }

    for (const value of values) {
        const valueIndex = selections.values.findIndex(
            (selectedValue) =>
                getIndexRelation(selectedValue.after.index, value.after.index) === HierarchicalRelation.Equal
        )

        if (valueIndex === -1 && (type === "toggle" || type === "add")) {
            selections.values.push(value)
        }
        if (valueIndex !== -1 && (type === "toggle" || type === "remove")) {
            selections.values.splice(valueIndex, 1)
        }
    }

    if (selections.values.length === 0) {
        selectionsList.splice(selectionsIndex, 1)
    }
}

export function editSelection(
    valueMap: ValueMap,
    selectionsList: SelectionsList,
    targetSelectionsList: Array<{
        steps: HierarchicalParsedSteps | string
        values: Array<FullValue> | undefined
    }>,
    type: "replace" | "toggle" | "add" | "remove"
): SelectionsList {
    return produce(type === "replace" ? [] : selectionsList, (selectionsDraft) => {
        for (const { steps, values: indices } of targetSelectionsList) {
            editSelectionOnDraft(valueMap, selectionsDraft, steps, indices, type === "replace" ? "add" : type)
        }
    })
}

export function editIndices(
    valueMap: ValueMap,
    selectionsList: SelectionsList,
    hovered: Selections | undefined,
    values: Array<{
        steps: HierarchicalParsedSteps
        value: FullValue
    }>,
    add: boolean
): SelectionState {
    return produce({ hovered, valueMap, selectionsList }, (draft) => {
        for (const { value, steps } of values) {
            const { valueMap: valueDraft, selectionsList: selectionsDraft, hovered: hoveredDraft } = draft

            const path = steps.path.join(",")
            const selectionsIndex = selectionsList.findIndex(
                (selections) => getSelectedStepsJoinedPath(selections.steps) === path
            )
            const selections = selectionsDraft[selectionsIndex]
            let all = valueDraft[path]

            if (!add) {
                if (all == null) {
                    return
                }

                const allValueIndex = all.findIndex(
                    (allValue) =>
                        getIndexRelation(allValue.after.index, value.after.index) === HierarchicalRelation.Equal
                )
                all.splice(allValueIndex, 1)
                if (selections != null) {
                    const valueIndex = selections.values.findIndex(
                        (selectedValue) =>
                            getIndexRelation(selectedValue.after.index, value.after.index) ===
                            HierarchicalRelation.Equal
                    )
                    selections.values.splice(valueIndex, 1)
                    if (selections.values.length === 0) {
                        selectionsDraft.splice(selectionsIndex, 1)
                    }
                }
                if (hovered?.steps === steps && hoveredDraft != null) {
                    const valueIndex = hoveredDraft.values.findIndex(
                        (hoveredValue) =>
                            getIndexRelation(hoveredValue.after.index, value.after.index) === HierarchicalRelation.Equal
                    )
                    hoveredDraft.values.splice(valueIndex, 1)
                    if (hoveredDraft.values.length === 0) {
                        draft.hovered = undefined
                    }
                }
            }

            if (all == null) {
                all = []
                valueDraft[path] = all
            }

            if (selections != null && all.length === selections.values.length) {
                selections.values.push(value)
            }

            all.push(value)
        }
    })
}
