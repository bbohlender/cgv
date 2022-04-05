import {
    HierarchicalParsedSteps,
    HierarchicalParsedGrammarDefinition,
    replace,
    remove,
    rename,
    Operations,
    ParsedSteps,
    parse,
    toHierachical,
    serializeString,
    ParsedGrammarDefinition,
    add,
    toHierachicalSteps,
} from "cgv"
import create, { GetState, SetState } from "zustand"
import { combine } from "zustand/middleware"
import { UseBaseStore } from "./global"

export type BaseState = CombineEmpty<GuiState, TuiState> | CombineEmpty<TuiState, GuiState>

export type CombineEmpty<T, K> = T & {
    [Key in Exclude<keyof K, keyof T>]?: undefined
}

export type GuiState = {
    type: "gui"
    selected: HierarchicalParsedSteps | string | undefined
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
    return create(combine(createBaseStateInitial(), createBaseStateFunctions.bind(null, operations))) as UseBaseStore
}

function createBaseStateInitial(): BaseState {
    return {
        type: "gui",
        selected: undefined,
        hovered: [],
        grammar: toHierachical({
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
                    grammar: toHierachical(state.grammar),
                    hovered: [],
                    requested: undefined,
                    selected: undefined,
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
            if (state.selected != null) {
                set({ selected: undefined })
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
        select: (selected: HierarchicalParsedSteps | string | undefined) => {
            const state = get()
            if (state.type != "gui") {
                return
            }
            set({ selected })
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
                grammar: { ...state.grammar, [name]: toHierachicalSteps({ type: "this" }, name) },
            })
        },
        add: (type: "before" | "after" | "parallel", step: ParsedSteps) => {
            const state = get()
            if (state.type != "gui" || typeof state.selected != "object") {
                return
            }

            const selected = add(type, state.selected, step, state.grammar)

            set({ grammar: { ...state.grammar }, selected })
        },
        remove: (at?: HierarchicalParsedSteps | undefined | string) => {
            const state = get()
            if (state.type != "gui") {
                return
            }
            at = at ?? state.selected
            if (at == null) {
                return
            }
            remove(at, operations, state.grammar)
            if (at === state.selected) {
                set({
                    selected: undefined,
                    grammar: { ...state.grammar },
                })
            } else {
                set({
                    selected:
                        typeof state.selected === "object"
                            ? replace(state.selected, { ...state.selected }, state.grammar)
                            : state.selected,
                    grammar: { ...state.grammar },
                })
            }
        },
        rename: (name: string) => {
            const state = get()
            if (state.type != "gui") {
                return
            }
            if (typeof state.selected != "string") {
                return
            }
            rename(state.selected, name, state.grammar)
            set({
                selected: name,
                grammar: { ...state.grammar },
            })
        },
        replace: (at: HierarchicalParsedSteps, replaceWith: ParsedSteps) => {
            const state = get()
            if (state.type != "gui") {
                return
            }
            if (state.selected == null || typeof state.selected === "string") {
                return
            }
            const newValue = replace(at, replaceWith, state.grammar)
            set({
                selected:
                    at === state.selected ? newValue : replace(state.selected, { ...state.selected }, state.grammar),
                grammar: { ...state.grammar },
            })
        },
    }
}

export type BaseStateFunctions = ReturnType<typeof createBaseStateFunctions>
