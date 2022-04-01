import {
    HierarchicalParsedSteps,
    HierarchicalParsedGrammarDefinition,
    StepDescriptor,
    add,
    replace,
    remove,
    rename,
    Operations,
    ParsedSteps,
    replaceStep,
    createDefaultStep,
    parse,
    toHierachical,
    serializeString,
    ParsedGrammarDefinition,
} from "cgv"
import { GetState, SetState } from "zustand"

export type BaseState = {
    type: "tui" | "gui"
    selected: HierarchicalParsedSteps | string | undefined
    hovered: Array<HierarchicalParsedSteps | string>
    grammar: HierarchicalParsedGrammarDefinition
    stepDescriptorDialogFor: "addParameter" | "replace" | "before" | "parallel" | "after" | undefined
    text: string | undefined
    parseError: string | undefined
    parsedGrammar: ParsedGrammarDefinition | undefined
}

export function createBaseStateInitial(baseGrammar: HierarchicalParsedGrammarDefinition): BaseState {
    return {
        type: "gui",
        selected: undefined,
        hovered: [],
        grammar: baseGrammar,
        stepDescriptorDialogFor: undefined,
        text: undefined,
        parseError: undefined,
        parsedGrammar: undefined,
    }
}

export function createBaseStateFunctions(
    operations: Operations<any, any>,
    set: SetState<BaseState>,
    get: GetState<BaseState>
) {
    return {
        setText: (text: string) => {
            const { type } = get()
            if (type === "gui") {
                return
            }
            let parsedGrammar: ParsedGrammarDefinition | undefined = undefined
            let parseError: string | undefined = undefined
            try {
                parsedGrammar = parse(text)
            } catch (error: any) {
                parseError = error.message
            }
            set({ text, parsedGrammar, parseError })
        },
        setType: (type: "gui" | "tui") => {
            const { grammar, type: currentType, parsedGrammar } = get()
            if (currentType === type) {
                return
            }
            if (type === "gui" && parsedGrammar != null) {
                set({
                    type: "gui",
                    text: undefined,
                    parsedGrammar: undefined,
                    parseError: undefined,
                    grammar: toHierachical(parsedGrammar),
                })
                return
            }
            if (type === "tui") {
                set({
                    type: "tui",
                    selected: undefined,
                    parsedGrammar: grammar,
                    hovered: [],
                    stepDescriptorDialogFor: undefined,
                    text: serializeString(grammar),
                })
                return
            }
        },
        onStepDescribed: (descriptor: StepDescriptor | undefined) => {
            const { stepDescriptorDialogFor, selected, grammar, type } = get()
            if (type === "tui") {
                return
            }
            if (descriptor == null) {
                set({
                    stepDescriptorDialogFor: undefined,
                })
                return
            }
            if (selected == null) {
                return
            }
            let newSelected: HierarchicalParsedSteps
            switch (stepDescriptorDialogFor) {
                case "after":
                case "before":
                case "parallel":
                    newSelected = add(stepDescriptorDialogFor, selected, descriptor, operations, grammar)
                    break
                case "replace":
                    if (typeof selected === "string") {
                        return
                    }
                    newSelected = replace(selected, descriptor, operations, grammar)
                    break
                case "addParameter":
                    if (typeof selected === "string" || selected.type != "operation") {
                        return
                    }
                    newSelected = replaceStep(
                        selected,
                        {
                            ...selected,
                            children: [...selected.children, createDefaultStep(descriptor, operations, grammar)],
                        },
                        grammar
                    )
                    break
                default:
                    return
            }
            set({ selected: newSelected, stepDescriptorDialogFor: undefined, grammar: { ...grammar } })
        },
        onStartHover: (step: HierarchicalParsedSteps | string) => {
            const { hovered, type } = get()
            if (type === "tui") {
                return
            }
            if (!hovered.includes(step)) {
                set({ hovered: [...hovered, step] })
            }
        },
        escape: () => {
            const { stepDescriptorDialogFor, selected, type } = get()
            if (type === "tui") {
                return
            }
            if (stepDescriptorDialogFor != null) {
                set({ stepDescriptorDialogFor: undefined })
                return
            }
            if (selected != null) {
                set({ selected: undefined })
                return
            }
        },
        onEndHover: (step: HierarchicalParsedSteps | string) => {
            const { hovered, type } = get()
            if (type === "tui") {
                return
            }
            set({ hovered: hovered.filter((hoveredStep) => hoveredStep != step) })
        },
        select: (selected: HierarchicalParsedSteps | string | undefined) => {
            const { type } = get()
            if (type === "tui") {
                return
            }
            set({ selected })
        },
        openStepDescriptorDialog: (
            dialogFor: "addParameter" | "replace" | "before" | "parallel" | "after" | undefined
        ) => {
            const { type } = get()
            if (type === "tui") {
                return
            }
            set({ stepDescriptorDialogFor: dialogFor })
        },
        remove: (at?: HierarchicalParsedSteps | undefined | string) => {
            const { grammar, selected, type } = get()
            if (type === "tui") {
                return
            }
            at = at ?? selected
            if (at == null) {
                return
            }
            remove(at, operations, grammar)
            if (at === selected) {
                set({
                    selected: undefined,
                    grammar: { ...grammar },
                })
            } else {
                set({
                    selected: typeof selected === "object" ? replaceStep(selected, { ...selected }, grammar) : selected,
                    grammar: { ...grammar },
                })
            }
        },
        rename: (name: string) => {
            const { selected, grammar, type } = get()
            if (type === "tui") {
                return
            }
            if (typeof selected != "string") {
                return
            }
            rename(selected, name, grammar)
            set({
                selected: name,
                grammar: { ...grammar },
            })
        },
        change: (at: HierarchicalParsedSteps, replaceWith: ParsedSteps) => {
            const { grammar, selected, type } = get()
            if (type === "tui") {
                return
            }
            if (selected == null || typeof selected === "string") {
                return
            }
            const newValue = replaceStep(at, replaceWith, grammar)
            set({
                selected: at === selected ? newValue : replaceStep(selected, { ...selected }, grammar),
                grammar: { ...grammar },
            })
        },
        replace: (descriptor: StepDescriptor) => {
            const { selected, grammar, type } = get()
            if (type === "tui") {
                return
            }
            if (selected == null) {
                return
            }
            if (typeof selected === "string") {
                return
            }
            set({
                selected: replace(selected, descriptor, operations, grammar),
                grammar: { ...grammar },
            })
        },
    }
}

export type BaseStateFunctions = ReturnType<typeof createBaseStateFunctions>
