import {
    HierarchicalParsedSteps,
    HierarchicalParsedGrammarDefinition,
    replace,
    Operations,
    ParsedSteps,
    parse,
    serializeString,
    ParsedGrammarDefinition,
    toHierarchical,
    toHierarchicalSteps,
    insert,
    removeStep,
    removeValue,
    editSelection,
    editIndices,
    EditorState,
    editSelectionRelated,
    FullIndex,
    SelectionsList,
    getRelatedSelections,
    compareSelectedStepsPath,
    SelectedSteps,
    getSelectedStepsJoinedPath,
} from "cgv"
import { Draft } from "immer"
import create, { GetState, SetState } from "zustand"
import { combine, subscribeWithSelector } from "zustand/middleware"
import { operationGuiMap } from "./domains/shape"
import { UseBaseStore } from "./global"
import { childrenSelectable } from "./gui"

export type BaseState = (CombineEmpty<GuiState, TuiState> | CombineEmpty<TuiState, GuiState>) & {
    interpretationDelay: number
}

export type CombineEmpty<T, K> = T & {
    [Key in Exclude<keyof K, keyof T>]?: undefined
}

export type GuiState = {
    type: "gui"
    grammar: HierarchicalParsedGrammarDefinition
    requested: { type: string; fulfill: (value: any) => void } | undefined
    shift: boolean
    control: boolean
} & EditorState

export type TuiState =
    | CombineEmpty<TuiCorrectState, TuiIncorrectState>
    | CombineEmpty<TuiIncorrectState, TuiCorrectState>

export type TuiCorrectState = {
    type: "tui"
    text: string
    correct: true
    grammar: ParsedGrammarDefinition
}

export type TuiIncorrectState = {
    type: "tui"
    text: string
    correct: false
    error: string
}

export function createBaseState(operations: Operations<any, any>) {
    return create(
        subscribeWithSelector(combine(createBaseStateInitial(), createBaseStateFunctions.bind(null, operations)))
    ) as UseBaseStore
}

function createBaseStateInitial(): BaseState {
    return {
        type: "gui",
        indicesMap: {},
        selectionsList: [],
        hovered: undefined,
        grammar: toHierarchical({
            Start: { type: "this" },
        }),
        interpretationDelay: 0,
        requested: undefined,
        shift: false,
        control: false,
    }
}

function createBaseStateFunctions(
    operations: Operations<any, any>,
    set: SetState<BaseState>,
    get: GetState<BaseState>
) {
    return {
        setText: (text: string) => {
            const state = get()
            if (state.type != "tui") {
                return
            }
            try {
                const grammar = parse(text)
                set({ text, correct: true, grammar })
            } catch (error: any) {
                set({ text, correct: false, error: error.message })
            }
        },
        setType: (type: "gui" | "tui") => {
            const state = get()
            if (state.type === type) {
                return
            }
            if (state.type === "tui" && state.correct) {
                set({
                    type: "gui",
                    grammar: toHierarchical(state.grammar),
                    indicesMap: {},
                    selectionsList: [],
                    hovered: undefined,
                    requested: undefined,
                    shift: false,
                })
                return
            }
            if (state.type === "gui") {
                set({
                    type: "tui",
                    grammar: state.grammar,
                    text: serializeString(state.grammar),
                    correct: true,
                })
                return
            }
        },
        onStartHover: (steps: SelectedSteps, indices: Array<FullIndex> | undefined) => {
            const state = get()
            if (state.type != "gui") {
                return
            }
            indices = indices ?? state.indicesMap[getSelectedStepsJoinedPath(steps)] ?? []
            /*if (state.hovered?.steps === steps && shallowEqual(state.hovered.indices, indices)) {
                return
            }*/
            console.log("on start hover")
            set({
                hovered: {
                    steps,
                    indices,
                },
            })
        },
        onEndHover: (steps: SelectedSteps | string) => {
            const state = get()
            if (state.type != "gui" || state.hovered?.steps != steps) {
                return
            }
            set({
                ...state,
                hovered: undefined,
            })
        },
        editIndices: (
            indices: Array<{
                steps: HierarchicalParsedSteps
                index: FullIndex
            }>,
            add: boolean
        ) => {
            const state = get()
            if (state.type != "gui") {
                return
            }
            set(editIndices(state.indicesMap, state.selectionsList, state.hovered, indices, add))
        },
        select: (steps: SelectedSteps, index?: FullIndex, type?: "replace" | "add" | "remove" | "toggle") => {
            const state = get()
            if (state.type != "gui") {
                return
            }
            type = type ?? (state.shift ? "add" : "replace")
            set({
                selectionsList: editSelection(
                    state.indicesMap,
                    state.selectionsList,
                    [{ steps, indices: index == null ? undefined : [index] }],
                    type
                ),
            })
        },
        selectResult: (clickedSteps: HierarchicalParsedSteps, clickedIndex: FullIndex) => {
            const state = get()
            if (state.type != "gui") {
                return
            }
            const predecessorSelectionsList = state.selectionsList
                .map((selections) => ({
                    ...selections,
                    indices: selections.indices.filter(
                        (selectedIndex) =>
                            clickedIndex.before.startsWith(selectedIndex.before) &&
                            clickedIndex.after.startsWith(selectedIndex.after)
                    ),
                }))
                .filter((selections) => selections.indices.length > 0)

            if (!state.shift && state.control && predecessorSelectionsList.length > 0) {
                //no multi-select and already selected
                set({
                    selectionsList: editSelectionRelated(
                        state.indicesMap,
                        state.selectionsList,
                        predecessorSelectionsList,
                        (potentialIndex) =>
                            clickedIndex.before.startsWith(potentialIndex.before) &&
                            clickedIndex.after.startsWith(potentialIndex.after),
                        state.grammar,
                        "predecessor",
                        "replace",
                        (steps) => childrenSelectable(operationGuiMap, steps)
                    ),
                })
                return
            }

            set({
                selectionsList: editSelection(
                    state.indicesMap,
                    state.selectionsList,
                    state.shift && predecessorSelectionsList.length > 0
                        ? predecessorSelectionsList
                        : [{ steps: clickedSteps, indices: [clickedIndex] }],
                    state.shift ? (predecessorSelectionsList.length > 0 ? "remove" : "add") : "replace"
                ),
            })
        },
        selectChildren: (steps: SelectedSteps, indices: Array<FullIndex>, child: HierarchicalParsedSteps) => {
            const state = get()
            if (state.type != "gui") {
                return
            }
            set({
                selectionsList: editSelection(
                    state.indicesMap,
                    editSelection(state.indicesMap, state.selectionsList, [{ steps, indices }], "remove"),
                    getRelatedSelections(
                        state.indicesMap,
                        [child],
                        indices,
                        (current, next) => next.before.startsWith(current.before),
                        undefined
                    ),
                    "add"
                ),
            })
        },
        selectRelated: (currentSelections: SelectionsList[number], relatedSelections: SelectionsList[number]) => {
            const state = get()
            if (state.type != "gui") {
                return
            }
            set({
                selectionsList: editSelection(
                    state.indicesMap,
                    editSelection(state.indicesMap, state.selectionsList, [currentSelections], "remove"),
                    [relatedSelections],
                    "add"
                ),
            })
        },
        unselectAll: () => {
            const state = get()
            if (state.type != "gui") {
                return
            }
            set({ selectionsList: [] })
        },
        escape: () => {
            const state = get()
            if (state.type != "gui") {
                return
            }
            if (state.requested != null) {
                set({ requested: undefined })
                return
            }
            set({ selectionsList: [] })
        },
        request: (type: string, fulfill: (value: any) => void) => {
            const state = get()
            if (state.type != "gui") {
                return
            }
            set({
                requested: {
                    type,
                    fulfill: (value) => {
                        fulfill(value)
                        const state = get()
                        if (state.type === "gui" && state.requested != null) {
                            set({ ...state, requested: undefined })
                        }
                    },
                },
            })
        },
        cancelRequest: () => {
            const state = get()
            if (state.type != "gui") {
                return
            }
            set({ requested: undefined })
        },
        createNoun: (name: string) => {
            const state = get()
            if (state.type != "gui") {
                return
            }
            set({
                grammar: { ...state.grammar, [name]: toHierarchicalSteps({ type: "this" }, name) },
            })
        },
        insert: (type: "before" | "after" | "parallel", stepGenerator: () => ParsedSteps) => {
            const state = get()
            if (state.type != "gui") {
                return
            }

            set(insert(state.indicesMap, state.selectionsList, type, stepGenerator, state.grammar))
        },
        removeStep: () => {
            const state = get()
            if (state.type != "gui") {
                return
            }
            set(removeStep(state.indicesMap, state.selectionsList, operations, state.grammar))
        },
        removeValue: () => {
            const state = get()
            if (state.type != "gui") {
                return
            }
            set(removeValue(state.indicesMap, state.selectionsList, state.grammar))
        },
        rename: (name: string) => {
            /*const state = get()
            if (state.type != "gui" || state.selections.length <= 0) {
                return
            }
            if (state.selections.length > 1) {
                return
            }
            const selection = state.selections[0]
            if (Array.isArray(selection.path) && selection.path.length > 1) {
                return
            }

            set(renameNoun(Array.isArray(selection.path) ? selection.path[0] : selection.path, name, state.grammar))*/
        },
        replace: <Type extends ParsedSteps["type"]>(
            replaceWith: (steps: Draft<ParsedSteps & { type: Type }>) => Draft<ParsedSteps> | void,
            steps?: SelectedSteps
        ) => {
            const state = get()
            if (state.type != "gui") {
                return
            }
            const joinedPath = steps != null ? getSelectedStepsJoinedPath(steps) : undefined
            set(
                replace(
                    state.indicesMap,
                    steps == null
                        ? state.selectionsList
                        : state.selectionsList.filter((selections) =>
                              compareSelectedStepsPath(selections.steps, steps, joinedPath)
                          ),
                    replaceWith as any,
                    state.grammar
                )
            )
        },
        setShift: (shift: boolean) => {
            const state = get()
            if (state.type != "gui") {
                return
            }
            set({ shift })
        },
        setControl: (control: boolean) => {
            const state = get()
            if (state.type != "gui") {
                return
            }
            set({ control })
        },
        setInterpretationDelay: (interpretationDelay: number) => {
            set({ interpretationDelay })
        },
    }
}

export type BaseStateFunctions = ReturnType<typeof createBaseStateFunctions>

export type BaseStore = BaseState & BaseStateFunctions
