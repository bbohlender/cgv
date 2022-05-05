import {
    HierarchicalParsedSteps,
    HierarchicalParsedGrammarDefinition,
    replace,
    Operations,
    ParsedSteps,
    ParsedGrammarDefinition,
    toHierarchical,
    insert,
    removeStep,
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
    renameNoun,
    setName,
    parseDescription,
    getDescriptionOfNoun,
    serializeString,
    globalizeStepsSerializer,
    getLocalDescription,
    exchangeDescription,
    getDescriptionRootStep,
    localizeStepsSerializer,
    DependencyMap,
    computeDependencies,
    globalizeNoun,
} from "cgv"
import produce, { Draft } from "immer"
import create, { GetState, SetState } from "zustand"
import { combine, subscribeWithSelector } from "zustand/middleware"
import { operationGuiMap } from "./domains/shape"
import { UseBaseStore } from "./global"
import { childrenSelectable } from "./gui"

export type BaseState = (CombineEmpty<GuiState, TuiState> | CombineEmpty<TuiState, GuiState>) & {
    interpretationDelay: number
    descriptions: Array<{
        name: string
        visible: boolean
    }>
    selectedDescription: string | undefined
    showTui: boolean
}

export type CombineEmpty<T, K> = T & {
    [Key in Exclude<keyof K, keyof T>]?: undefined
}

export type GuiState = {
    type: "gui"
    grammar: HierarchicalParsedGrammarDefinition
    dependencyMap: DependencyMap
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
    grammar: ParsedGrammarDefinition
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
        grammar: [],
        dependencyMap: {},
        descriptions: [],
        selectedDescription: undefined,
        interpretationDelay: 0,
        requested: undefined,
        shift: false,
        control: false,
        showTui: false,
    }
}

function createBaseStateFunctions(
    operations: Operations<any, any>,
    set: SetState<BaseState>,
    get: GetState<BaseState>
) {
    return {
        setShowTui: (showTui: boolean) => {
            set({ showTui })
        },
        selectDescription: (name: string) => {
            const state = get()
            if (state.selectedDescription === name) {
                return
            }
            if (state.type === "gui") {
                const rootStep = getDescriptionRootStep(state.grammar, name)
                set({
                    selectedDescription: name,
                    indicesMap: {},
                    selectionsList:
                        rootStep == null
                            ? []
                            : [
                                  {
                                      steps: rootStep,
                                      indices: [],
                                  },
                              ],
                    hovered: undefined,
                })
            } else {
                set({
                    selectedDescription: name,
                    text: serializeString(
                        getLocalDescription(state.grammar, undefined, name),
                        localizeStepsSerializer.bind(null, name)
                    ),
                })
            }
        },
        addDescription: (name: string) => {
            const { descriptions, grammar } = get()
            if (descriptions.findIndex((description) => description.name === name) !== -1) {
                return
            }
            const newGrammar = grammar.concat(
                toHierarchical([{ name: globalizeNoun("Start", name), step: { type: "this" } }])
            )
            set({
                descriptions: produce(get().descriptions, (draft) => {
                    draft.push({
                        name,
                        visible: true,
                    })
                }),
                grammar: newGrammar,
                dependencyMap: computeDependencies(newGrammar),
            })
        },
        deleteDescription: (name: string) => {
            const { descriptions, selectedDescription } = get()
            set({
                descriptions: descriptions.filter((description) => description.name != name),
                selectedDescription: selectedDescription === name ? undefined : selectedDescription,
            })
        },
        toggleDescriptionVisible: (index: number) => {
            const { descriptions } = get()
            set({
                descriptions: produce(descriptions, (draft) => {
                    draft[index].visible = !draft[index].visible
                }),
            })
        },
        setText: (text: string) => {
            const state = get()
            if (state.type != "tui" || state.selectedDescription == null) {
                return
            }
            try {
                const description = parseDescription(text, state.selectedDescription)
                set({
                    text,
                    correct: true,
                    grammar: exchangeDescription(state.grammar, description, state.selectedDescription),
                })
            } catch (error: any) {
                set({ text, correct: false, error: error.message })
            }
        },
        setType: (type: "gui" | "tui") => {
            const state = get()
            if (state.type === type) {
                return
            }
            const newGrammar = toHierarchical(state.grammar)
            if (state.type === "tui" && state.correct) {
                set({
                    type: "gui",
                    grammar: newGrammar,
                    dependencyMap: computeDependencies(newGrammar),
                    indicesMap: {},
                    selectionsList: [],
                    hovered: undefined,
                    requested: undefined,
                    shift: false,
                })
                return
            }

            set({
                type: "tui",
                grammar: state.grammar,
                text:
                    state.selectedDescription == null
                        ? ""
                        : serializeString(
                              getLocalDescription(state.grammar, undefined, state.selectedDescription),
                              localizeStepsSerializer.bind(null, state.selectedDescription)
                          ),
                correct: true,
            })
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
        /*createNoun: (name: string) => {
            const state = get()
            if (state.type != "gui") {
                return
            }
            set({
                grammar: [...state.grammar, [name]: toHierarchicalSteps({ type: "this" }, name) },
            })
        },*/
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
        renameNoun: (name: string, descriptionName: string) => {
            const state = get()
            if (state.type != "gui") {
                return
            }
            set(
                renameNoun(
                    state.indicesMap,
                    state.selectionsList,
                    globalizeStepsSerializer(descriptionName, name) ?? name,
                    state.grammar
                )
            )
        },
        setName: (name: string, descriptionName: string) => {
            const state = get()
            if (state.type != "gui") {
                return
            }
            set(
                setName(
                    state.indicesMap,
                    state.selectionsList,
                    globalizeStepsSerializer(descriptionName, name) ?? name,
                    state.grammar
                )
            )
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

export function getFirstSelectedDescription(state: BaseState): string | undefined {
    if (state.type !== "gui" || state.selectionsList.length === 0) {
        return undefined
    }

    const firstSelections = state.selectionsList[0]

    return getDescriptionOfNoun(
        typeof firstSelections.steps === "string" ? firstSelections.steps : firstSelections.steps.path[0]
    )
}

export type BaseStateFunctions = ReturnType<typeof createBaseStateFunctions>

export type BaseStore = BaseState & BaseStateFunctions
