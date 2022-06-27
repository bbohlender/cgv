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
    FullValue,
    SelectionsList,
    getRelatedSelections,
    compareSelectedStepsPath,
    SelectedSteps,
    getSelectedStepsJoinedPath,
    renameNoun,
    parseDescription,
    getDescriptionOfNoun,
    serializeString,
    getLocalDescription,
    exchangeDescription,
    localizeStepsSerializer,
    DependencyMap,
    computeDependencies,
    globalizeNoun,
    removeUnusedNouns,
    isNounOfDescription,
    PatternSelector,
    getIndexRelation,
    HierarchicalRelation,
    localizeNoun,
    copyNoun,
    removeHierarchicalFromDescription,
    parse,
    Selections,
    autoSelectPattern,
    PatternType,
    multilineStringWhitespace,
    setName,
    concretize,
    AbstractParsedNoun,
    getSelectedStepsPath,
    getGlobalDescription,
    HierarchicalPath,
    globalizeStepsSerializer,
    ValueMap,
} from "cgv"
import { PointPrimitive, createPhongMaterialGenerator } from "cgv/domains/shape"
import { Draft, freeze } from "immer"
import { Matrix4, Color } from "three"
import create, { GetState, SetState } from "zustand"
import { combine, subscribeWithSelector } from "zustand/middleware"
import { UseBaseStore } from "./global"

export type BaseState = (CombineEmpty<GuiState, TuiState> | CombineEmpty<TuiState, GuiState>) & {
    interpretationDelay: number
    descriptions: Array<{ seed: number; name: string }>
    selectedDescriptions: Array<string>
    showTui: boolean
}

export type CombineEmpty<T, K> = T & {
    [Key in Exclude<keyof K, keyof T>]?: undefined
}

export type GuiState = {
    type: "gui"
    grammar: HierarchicalParsedGrammarDefinition
    dependencyMap: DependencyMap
    requested: { type: string; data?: any; fulfill: (value: any) => void } | undefined
    shift: boolean
    graphVisualization: boolean
    valueMap: ValueMap<any, any>
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

export function createBaseState(operations: Operations<any, any>, patternTypes: Array<PatternType<any, any>>) {
    return create(
        subscribeWithSelector(
            combine(createBaseStateInitial(), createBaseStateFunctions.bind(null, operations, patternTypes))
        )
    ) as UseBaseStore
}

function createBaseStateInitial(): BaseState {
    return {
        type: "gui",
        valueMap: {},
        selectionsList: [],
        hovered: undefined,
        grammar: [],
        dependencyMap: {},
        descriptions: [],
        selectedDescriptions: [],
        interpretationDelay: 0,
        requested: undefined,
        shift: false,
        showTui: false,
        graphVisualization: false,
    }
}

const point = new PointPrimitive(new Matrix4(), createPhongMaterialGenerator(new Color(0xff0000)))

function createBaseStateFunctions(
    operations: Operations<any, any>,
    patternTypes: Array<PatternType<any, any>>,
    set: SetState<BaseState>,
    get: GetState<BaseState>
) {
    const request = (type: string, fulfill: ((value: any) => void) | undefined, data?: any) => {
        const state = get()
        if (state.type != "gui") {
            return
        }
        set({
            requested: {
                type,
                data,
                fulfill: (value) => {
                    const currentRequested = get().requested
                    fulfill && fulfill(value)
                    const state = get()
                    if (state.type === "gui" && state.requested === currentRequested) {
                        set({ requested: undefined })
                    }
                },
            },
        })
    }
    const selectPattern: PatternSelector = (conditions) =>
        new Promise((resolve) => request("select-condition", resolve, conditions))
    return {
        import: (data: string) => {
            try {
                const parsedDescription = toHierarchical(parse(data))
                const descriptionSet = new Set<string>()
                for (const { name } of parsedDescription) {
                    const descriptionName = getDescriptionOfNoun(name)
                    descriptionSet.add(descriptionName)
                }
                set({
                    descriptions: Array.from(descriptionSet).map((name) => ({
                        name,
                        seed: Math.random() * Number.MAX_SAFE_INTEGER,
                    })),
                    grammar: parsedDescription,
                    selectedDescriptions: [],
                    selectionsList: [],
                    valueMap: {},
                    dependencyMap: computeDependencies(parsedDescription),
                    hovered: undefined,
                    requested: undefined,
                    type: "gui",
                })
            } catch (e) {
                console.error(e)
            }
        },
        download: () => {
            const state = get()
            const unhierarchicalDescription =
                state.type === "gui" ? removeHierarchicalFromDescription(state.grammar) : state.grammar
            const string = serializeString(unhierarchicalDescription, undefined, multilineStringWhitespace)
            const a = document.createElement("a")
            a.href = window.URL.createObjectURL(new Blob([string], { type: "text/plain" }))
            a.download = "descriptions.cgv"
            a.click()
        },
        setShowTui: (showTui: boolean) => {
            set({ showTui })
        },
        selectDescription: (name: string, shift: boolean) => {
            const state = get()
            if (state.type === "gui") {
                const rootNoun = state.grammar.find((noun) => isNounOfDescription(name, noun.name))?.name

                if (!shift) {
                    if (state.selectedDescriptions.length === 1 && state.selectedDescriptions[0] === name) {
                        return
                    }
                    //set
                    const valueMapEntries = Object.entries(state.valueMap)
                    set({
                        selectedDescriptions: [name],
                        selectionsList:
                            rootNoun == null
                                ? []
                                : [
                                      {
                                          steps: rootNoun,
                                          values: valueMapEntries
                                              .filter(([path]) => path == rootNoun)
                                              .reduce<Array<FullValue>>(
                                                  (prev, [, values]) => (values != null ? prev.concat(values) : prev),
                                                  []
                                              ),
                                      },
                                  ],
                    })
                    return
                }

                if (!state.selectedDescriptions.includes(name)) {
                    //add
                    set({
                        selectedDescriptions: [...state.selectedDescriptions, name],
                        selectionsList:
                            rootNoun == null
                                ? state.selectionsList
                                : [
                                      ...state.selectionsList,
                                      {
                                          steps: rootNoun,
                                          values: [],
                                      },
                                  ],
                    })
                    return
                }

                //remove
                set({
                    selectedDescriptions: state.selectedDescriptions.filter(
                        (descriptionName) => name !== descriptionName
                    ),
                    selectionsList: state.selectionsList.filter(
                        ({ steps }) => !isNounOfDescription(name, getSelectedStepsPath(steps)[0])
                    ),
                    hovered:
                        state.hovered?.steps != null &&
                        isNounOfDescription(name, getSelectedStepsPath(state.hovered.steps)[0])
                            ? undefined
                            : state.hovered,
                })
            } else if (state.selectedDescriptions.length !== 1 || state.selectedDescriptions[0] !== name) {
                set({
                    selectedDescriptions: [name],
                    text: serializeString(
                        getLocalDescription(state.grammar, undefined, name),
                        localizeStepsSerializer.bind(null, name),
                        multilineStringWhitespace
                    ),
                })
            }
        },
        clearValueMap: (name: string) => {
            const state = get()
            if (state.type !== "gui") {
                return
            }
            set({
                valueMap: Object.entries(state.valueMap)
                    .filter(([path]) => !path.includes("@" + name))
                    .reduce((prev, [name, value]) => ({ ...prev, [name]: value }), {}),
            })
        },
        copyNoun: async (description: string, step: HierarchicalParsedSteps, globalNounName: string) => {
            const state = get()
            if (state.type !== "gui" || state.selectedDescriptions == null) {
                return
            }
            const currentDescriptionName = getDescriptionOfNoun(globalNounName)
            const localNounName = localizeNoun(globalNounName, currentDescriptionName)
            const copiedNouns = copyNoun(state.grammar, localNounName, currentDescriptionName, description)

            const joinedPath = getSelectedStepsJoinedPath(step)
            set(
                await replace(
                    state.valueMap,
                    state.selectionsList.filter((selections) =>
                        compareSelectedStepsPath(selections.steps, step, joinedPath)
                    ),
                    patternTypes,
                    selectPattern,
                    () => ({ type: "symbol", identifier: globalizeNoun(localNounName, description) }),
                    state.grammar.concat(copiedNouns)
                )
            )
        },
        addDescriptions: (newDescriptions: Array<{ name: string; step?: ParsedSteps }>) => {
            let { descriptions, grammar, dependencyMap } = get()
            for (const newDescription of newDescriptions) {
                if (descriptions.findIndex((description) => description.name === newDescription.name) !== -1) {
                    continue
                }
                const newNounName = globalizeNoun("Start", newDescription.name)
                if (grammar.findIndex((noun) => noun.name === newNounName) === -1) {
                    grammar = freeze(
                        toHierarchical([{ name: newNounName, step: newDescription.step ?? { type: "this" } }]).concat(
                            grammar as any
                        )
                    )
                }
                descriptions = [{ name: newDescription.name, seed: Math.random() * Number.MAX_SAFE_INTEGER }].concat(
                    descriptions
                )
            }
            dependencyMap = computeDependencies(grammar)
            set({
                descriptions,
                grammar,
                dependencyMap,
            })
        },
        deleteDescription: (name: string) => {
            const { descriptions, selectedDescriptions, grammar, selectionsList } = get()
            const newDescriptions = descriptions.filter((description) => description.name != name)
            set({
                descriptions: newDescriptions,
                selectedDescriptions: selectedDescriptions.filter((descriptionName) => descriptionName !== name),
                ...removeUnusedNouns(
                    grammar,
                    selectionsList ?? [],
                    newDescriptions.map(({ name }) => name)
                ),
            })
        },
        concretizeDescription: async (name: string, seed: number) => {
            const state = get()
            if (state.type !== "gui") {
                return
            }
            const rootNoun = state.grammar.find((noun) => isNounOfDescription(name, noun.name))?.name
            if (rootNoun == null) {
                return
            }
            const description = getGlobalDescription(rootNoun, state.grammar, state.dependencyMap)
            const concretizedDescription = await concretize(point, description, operations, {
                seed,
            })

            const grammar = toHierarchical(
                freeze([...concretizedDescription, ...state.grammar.filter((noun) => !description.includes(noun))])
            )

            set({
                ...removeUnusedNouns(
                    grammar,
                    state.selectionsList ?? [],
                    state.descriptions.map(({ name }) => name)
                ),
                dependencyMap: computeDependencies(grammar),
            })
        },
        setSeed: (name: string, seed: number) => {
            set({
                descriptions: get().descriptions.map((description) =>
                    description.name === name ? { name: description.name, seed } : description
                ),
            })
        },
        setText: (text: string) => {
            const state = get()
            if (state.type != "tui" || state.selectedDescriptions.length != 1) {
                return
            }
            try {
                const description = parseDescription(text, state.selectedDescriptions[0])
                set({
                    text,
                    correct: true,
                    grammar: exchangeDescription(state.grammar, description, state.selectedDescriptions[0]),
                })
            } catch (error: any) {
                set({ text, correct: false, error: error.message })
            }
        },
        setGraphVisualization: (graphVisualization: boolean) => {
            const state = get()
            if (state.type !== "gui") {
                return
            }
            set({ graphVisualization })
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
                    valueMap: {},
                    selectionsList: [],
                    hovered: undefined,
                    requested: undefined,
                    shift: false,
                })
                return
            }

            if (state.selectedDescriptions.length != 1) {
                return
            }

            set({
                type: "tui",
                grammar: state.grammar,
                text:
                    state.selectedDescriptions == null
                        ? ""
                        : serializeString(
                              getLocalDescription(state.grammar, undefined, state.selectedDescriptions[0]),
                              localizeStepsSerializer.bind(null, state.selectedDescriptions[0]),
                              multilineStringWhitespace
                          ),
                correct: true,
            })
        },
        onStartHover: (steps: SelectedSteps, values: Array<FullValue> | undefined) => {
            const state = get()
            if (state.type != "gui") {
                return
            }
            values = values ?? state.valueMap[getSelectedStepsJoinedPath(steps)] ?? []
            /*if (state.hovered?.steps === steps && shallowEqual(state.hovered.indices, indices)) {
                return
            }*/
            set({
                hovered: {
                    steps,
                    values,
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
            values: Array<{
                steps: HierarchicalParsedSteps
                value: FullValue
            }>,
            add: boolean
        ) => {
            const state = get()
            if (state.type != "gui") {
                return
            }
            set(editIndices(state.valueMap, state.selectionsList, state.hovered, values, add))
        },
        autoSelectPattern: async (selections: Selections<any, any>) => {
            const state = get()
            if (state.type != "gui") {
                return
            }
            set({
                selectionsList: await autoSelectPattern(
                    state.selectionsList,
                    state.valueMap,
                    selections,
                    patternTypes,
                    selectPattern
                ),
            })
        },
        select: (steps: SelectedSteps, value?: FullValue, type?: "replace" | "add" | "remove" | "toggle") => {
            const state = get()
            if (state.type != "gui") {
                return
            }
            type = type ?? (state.shift ? "add" : "replace")
            set({
                selectionsList: editSelection(
                    state.valueMap,
                    state.selectionsList,
                    [{ steps, values: value == null ? undefined : [value] }],
                    type
                ),
            })
        },
        selectResult: (clickedSteps: HierarchicalParsedSteps, clickedValue: FullValue) => {
            const state = get()
            if (state.type != "gui") {
                return
            }

            set({
                selectionsList: editSelection(
                    state.valueMap,
                    state.selectionsList,
                    [{ steps: clickedSteps, values: [clickedValue] }],
                    state.shift ? "toggle" : "replace"
                ),
            })
        },
        selectChildren: (steps: SelectedSteps, values: Array<FullValue>, child: HierarchicalParsedSteps) => {
            const state = get()
            if (state.type != "gui") {
                return
            }
            set({
                selectionsList: editSelection(
                    state.valueMap,
                    editSelection(state.valueMap, state.selectionsList, [{ steps, values }], "remove"),
                    getRelatedSelections(
                        state.valueMap,
                        [child],
                        values,
                        (current, next) => {
                            const relation = getIndexRelation(next.before.index, current.before.index)
                            return (
                                relation === HierarchicalRelation.Successor || relation === HierarchicalRelation.Equal
                            )
                        },
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
                    state.valueMap,
                    editSelection(state.valueMap, state.selectionsList, [currentSelections], "remove"),
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
        request,
        cancelRequest: () => {
            const state = get()
            if (state.type != "gui") {
                return
            }
            set({ requested: undefined })
        },
        insert: async (
            type: "before" | "after" | "parallel",
            stepGenerator: (path: HierarchicalPath) => ParsedSteps,
            dependenciesGenerator?: (description: string) => Array<AbstractParsedNoun<unknown>> | undefined
        ) => {
            const state = get()
            if (state.type != "gui") {
                return
            }
            let grammar = state.grammar
            if (dependenciesGenerator != null) {
                grammar = state.selectedDescriptions.reduce((prev, descriptionName) => {
                    const dependencies = dependenciesGenerator(descriptionName)
                    if (dependencies == null) {
                        return prev
                    }
                    return prev.concat()
                }, grammar)
            }
            set(
                await insert(
                    state.valueMap,
                    state.selectionsList,
                    patternTypes,
                    selectPattern,
                    type,
                    stepGenerator,
                    grammar
                )
            )
        },
        removeStep: async () => {
            const state = get()
            if (state.type != "gui") {
                return
            }
            set(
                await removeStep(
                    state.valueMap,
                    state.selectionsList,
                    patternTypes,
                    selectPattern,
                    operations,
                    state.grammar
                )
            )
        },
        renameNoun: async (name: string) => {
            const state = get()
            if (state.type != "gui") {
                return
            }
            set(
                await renameNoun(state.valueMap, state.selectionsList, patternTypes, selectPattern, name, state.grammar)
            )
        },
        setName: async (name: string) => {
            const state = get()
            if (state.type != "gui" || state.selectedDescriptions.length !== 1) {
                return
            }

            set(
                await setName(
                    state.valueMap,
                    state.selectionsList,
                    patternTypes,
                    selectPattern,
                    globalizeStepsSerializer(state.selectedDescriptions[0], name) ?? name,
                    state.grammar
                )
            )
        },
        replace: async <Type extends ParsedSteps["type"]>(
            replaceWith: (
                steps: Draft<ParsedSteps & { type: Type }>,
                path: HierarchicalPath
            ) => Draft<ParsedSteps> | void,
            steps?: SelectedSteps,
            dependenciesGenerator?: (description: string) => Array<AbstractParsedNoun<unknown>> | undefined
        ) => {
            const joinedPath = steps != null ? getSelectedStepsJoinedPath(steps) : undefined
            const state = get()
            if (state.type != "gui") {
                return
            }
            let grammar = state.grammar
            if (dependenciesGenerator != null) {
                grammar = state.selectedDescriptions.reduce((prev, descriptionName) => {
                    const dependencies = dependenciesGenerator(descriptionName)
                    if (dependencies == null) {
                        return prev
                    }
                    return prev.concat()
                }, grammar)
            }
            set(
                await replace(
                    state.valueMap,
                    steps == null
                        ? state.selectionsList
                        : state.selectionsList.filter((selections) =>
                              compareSelectedStepsPath(selections.steps, steps, joinedPath)
                          ),
                    patternTypes,
                    selectPattern,
                    replaceWith as any,
                    grammar
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
