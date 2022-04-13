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
    Selections,
    insert,
    removeStep,
    removeValue,
    HierarchicalPath,
    AbstractParsedSteps,
    toggleSelection,
    setSelection,
    setSelectionIndex,
} from "cgv"
import produce, { Draft } from "immer"
import create, { GetState, SetState } from "zustand"
import { combine, subscribeWithSelector } from "zustand/middleware"
import { UseBaseStore } from "./global"

export type BaseState = CombineEmpty<GuiState, TuiState> | CombineEmpty<TuiState, GuiState>

export type CombineEmpty<T, K> = T & {
    [Key in Exclude<keyof K, keyof T>]?: undefined
}

export type GuiState = {
    type: "gui"
    selections: Selections
    hovered: Array<HierarchicalParsedSteps | string>
    grammar: HierarchicalParsedGrammarDefinition
    requested: { type: string; fulfill: (value: any) => void } | undefined
}

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
        selections: [],
        hovered: [],
        grammar: toHierarchical({
            Start: { type: "this" },
        }),
        requested: undefined,
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
                    hovered: [],
                    requested: undefined,
                    selections: [],
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
        onStartHover: (step: HierarchicalParsedSteps | string) => {
            const state = get()
            if (state.type != "gui") {
                return
            }
            if (!state.hovered.includes(step)) {
                set({ hovered: [...state.hovered, step] })
            }
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
            if (state.selections.length > 0) {
                set({ selections: [] })
                return
            }
        },
        onEndHover: (step: HierarchicalParsedSteps | string) => {
            const state = get()
            if (state.type != "gui") {
                return
            }
            set({ ...state, hovered: state.hovered.filter((hoveredStep) => hoveredStep != step) })
        },
        select: (
            steps: HierarchicalParsedSteps,
            index: Array<number> | undefined,
            allIndices: Array<Array<number>> | undefined,
            shiftDown: boolean
        ) => {
            const state = get()
            if (state.type != "gui") {
                return
            }
            const selections = shiftDown
                ? toggleSelection(state.selections, steps, index, allIndices)
                : setSelection(steps, index, allIndices, true, true)
            set({
                selections,
            })
        },
        //TODO: unify all these select actions
        unselect: () => {
            set({ selections: [] })
        },
        selectSelection: (selectionIndex: number) => {
            const state = get()
            if (state.type != "gui") {
                return
            }
            const selections = setSelection(state.selections[selectionIndex].steps, undefined, undefined, true, false)
            set({
                selections,
            })
        },
        selectIndex: (selectionIndex: number, index: Array<number>, selected: boolean) => {
            const state = get()
            if (state.type != "gui") {
                return
            }
            const selections = setSelectionIndex(state.selections, selectionIndex, index, selected)
            set({
                selections,
            })
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
            if (state.type != "gui" || state.selections.length <= 0) {
                return
            }

            set(insert(type, state.selections, stepGenerator, state.grammar))
        },
        removeStep: () => {
            const state = get()
            if (state.type != "gui" || state.selections.length <= 0) {
                return
            }
            set(removeStep(state.selections, operations, state.grammar))
        },
        removeValue: () => {
            const state = get()
            if (state.type != "gui" || state.selections.length <= 0) {
                return
            }
            set(removeValue(state.selections, state.grammar))
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
            replaceWith: (steps: Draft<ParsedSteps & { type: Type }>) => Draft<ParsedSteps> | void
        ) => {
            const state = get()
            if (state.type != "gui") {
                return
            }
            if (state.selections.length <= 0) {
                return
            }
            set(replace(state.selections, replaceWith as any, state.grammar))
        },
    }
}

export type BaseStateFunctions = ReturnType<typeof createBaseStateFunctions>

export type BaseStore = BaseState & BaseStateFunctions
