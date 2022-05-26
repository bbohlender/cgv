import { Context } from "mocha"
import {
    ParsedGetVariable,
    ParsedGrammarDefinition,
    ParsedIf,
    ParsedOperation,
    ParsedParallel,
    ParsedRandom,
    ParsedRaw,
    ParsedSequantial,
    ParsedSetVariable,
    ParsedSteps,
    ParsedSwitch,
} from "../parser"

export function summarize(...descriptions: Array<ParsedGrammarDefinition>): ParsedGrammarDefinition {
    return descriptions.reduce((prev, current, i) => {
        const weight1 = i + 1
        const weight2 = 1
        const sum = weight1 + weight2
        const p1 = weight1 / sum
        const p2 = weight2 / sum
        return combineDescriptions(prev, p1, current, p2)
    })
}

function combineDescriptions(
    description1: ParsedGrammarDefinition,
    probability1: number,
    description2: ParsedGrammarDefinition,
    probability2: number
): ParsedGrammarDefinition {
    const combineNoun: CombineNoun = (noun1, weight1, noun2, weight2, context) => {
        /**
         * cases:
         *  1. noun1 is already there but not noun2 -> insert noun2 with symbol to noun1
         *  2. vice verca
         *  3. both nouns are already there
         *      a. the same noun -> return this noun
         *      b. different nouns -> insert noun1'
         *  4. no nouns are already there -> insert noun1 rename noun2 to noun1
         */

        let newNounName: string

        

        const step1 = translateNoun(noun1, description1)
        const step2 = translateNoun(noun2, description2)
        
        const translatedName1 = context.nounTranslationMap1[noun1]
        const translatedName2 = context.nounTranslationMap2[noun2]

        if(translatedName1 === translatedName2) {
            return [context, {
                type: "symbol",
                identifier: translatedName1
            }]
        }

        if (typeof noun1 === "string") {
            newNounName = getNounName(noun1, nounTranslationMap1)
        } else if (typeof noun2 === "string") {
            newNounName = getNounName(noun2, nounTranslationMap2)
        } else {
            throw new Error(`can't combine two non-nouns as nouns`)
        }

        /**
         * 
        if (typeof noun1 === "string") {
            nounTranslationMap1.set(noun1, newContext)
        }
        if (typeof noun2 === "string") {
            nounTranslationMap2.set(noun2, newContext)
        }
        nounTranslationMap1.set(newNounName, newContext)
         */

        const result = combineSteps(step1, probability1, step2, probability2, combineNoun, {
            ...context,
            nounTranslationMap1: [...],
            nounTranslationMap2: [...]
        })

        if (result == null) {
            return undefined
        }

        const [newContext, combined] = result

        return [
            {
                ...newContext,
                grammar: [
                    ...newContext.grammar,
                    {
                        name: newNounName,
                        step: combined,
                    },
                ],
            },
            {
                type: "symbol",
                identifier: newNounName,
            },
        ]
    }

    let result = combineNoun(description1[0].name, probability1, description2[0].name, probability2, {
        grammar: [],
        nounTranslationMap1: {},
        nounTranslationMap2: {},
    })

    if (result == null) {
        const rootName1 = description1[0].name
        const rootName2 = description1[0].name
        result = combineOuter(description1[0].step, description2[0].step, {
            grammar: [],
            nounTranslationMap1: {
                [rootName1]: rootName1,
            },
            nounTranslationMap2: {
                [rootName2]: rootName1,
            },
        })
        result[0].grammar.unshift({
            name: rootName1,
            step: result[1],
        })
    }

    return result[0].grammar
}

function translateNoun(noun: string | ParsedSteps, description: ParsedGrammarDefinition): ParsedSteps {
    if (typeof noun === "string") {
        const result = description.find(({ name }) => name === noun)
        if (result == null) {
            throw new Error(`unknown noun "${noun}"`)
        }
        return result.step
    }
    return noun
}

function getNounName(preferredName: string, nounTranslationMap: Map<string, ParsedSteps>): string {
    if (noun) {
        const newName = getNounName(`${preferredName}'`, grammar, undefined)
        if (nounTranslationMap != null) {
            nounTranslationMap.set(preferredName, newName)
        }
        return newName
    }
    return preferredName
}

type CombineNoun = (
    n1: string | ParsedSteps,
    probability1: number,
    n2: string | ParsedSteps,
    probability2: number,
    context: CombineContext
) => CombineResult

type NounTranslationMap = {
    [oldName in string]: string
}

type CombineContext = {
    grammar: ParsedGrammarDefinition
    nounTranslationMap: Array<[first: string, second: string, to: string]>
}

type CombineResult = [CombineContext, ParsedSteps] | undefined

/**
 * @returns undefined if the step1 & 2 are not combineable
 */
function combineSteps(
    step1: ParsedSteps,
    probability1: number,
    step2: ParsedSteps,
    probability2: number,
    combineNoun: CombineNoun,
    context: CombineContext
): CombineResult {
    if (step1.type === "symbol" || step2.type === "symbol") {
        const noun1 = step1.type === "symbol" ? step1.identifier : step1
        const noun2 = step2.type === "symbol" ? step2.identifier : step2
        if (
            (typeof noun1 === "string" && context.nounTranslationMap[noun1] != null) ||
            (typeof noun2 === "string" && context.nounTranslationMap1[noun2] != null)
        ) {
            //recursive combination must be stopped
            return undefined
        }
        return combineNoun(noun1, probability1, noun2, probability2, context)
    }
    let combined: CombineResult
    if (step1.type === step2.type) {
        switch (step1.type) {
            case "raw":
                combined = combineRaw(step1, probability1, step2 as typeof step1, probability2, combineNoun, context)
                break
            case "getVariable":
                combined = combineGetVariable(
                    step1,
                    probability1,
                    step2 as typeof step1,
                    probability2,
                    combineNoun,
                    context
                )
                break
            case "setVariable":
                combined = combineSetVariable(
                    step1,
                    probability1,
                    step2 as typeof step1,
                    probability2,
                    combineNoun,
                    context
                )
                break
            case "operation":
                combined = combineOperation(
                    step1,
                    probability1,
                    step2 as typeof step1,
                    probability2,
                    combineNoun,
                    context
                )
                break
            case "parallel":
                combined = combineParallel(
                    step1,
                    probability1,
                    step2 as typeof step1,
                    probability2,
                    combineNoun,
                    context
                )
                break
            case "switch":
                combined = combineSwitch(step1, probability1, step2 as typeof step1, probability2, combineNoun, context)
                break
            case "random":
                combined = combineRandom(step1, probability1, step2 as typeof step1, probability2, combineNoun, context)
                break
            case "sequential":
                combined = combineSequential(
                    step1,
                    probability1,
                    step2 as typeof step1,
                    probability2,
                    combineNoun,
                    context
                )
                break
            default:
                combined = combineChildrenDefault(
                    step1,
                    probability1,
                    step2 as typeof step1,
                    probability1,
                    combineNoun,
                    context
                )
                break
        }
    }
    return (
        combined ??
        combineWithChild(step2, probability2, step1, probability1, swap(combineNoun), context) ??
        combineWithChild(step1, probability1, step2, probability2, combineNoun, context)
    )
}

function swap(fn: CombineNoun): CombineNoun {
    return (n1, p1, n2, p2, context) => {
        const result = fn(n2, p2, n1, p1, swapContext(context))
        if (result == null) {
            return undefined
        }
        return swapContext(result)
    }
}

function swapContext<T>(context: CombineContext & T): CombineContext & T {
    return {
        ...context,
        nounTranslationMap1: context.nounTranslationMap2,
        nounTranslationMap2: context.nounTranslationMap1,
        visited1: context.visited2,
        visited2: context.visited1,
    }
}

function combineOuter(step1: ParsedSteps, probability1: number, step2: ParsedSteps, probability2: number, context: CombineContext): [CombineContext, ParsedSteps] {
    return {

    }
}

function combineWithChild(
    step1: ParsedSteps,
    probability1: number,
    step2: ParsedSteps,
    probability2: number,
    combineNoun: CombineNoun,
    context: CombineContext
): CombineResult {
    if (step1.children == null) {
        return undefined
    }
    for (let i = 0; i < step1.children.length; i++) {
        const neutralCombinationGenerator = getNeutralStepForCombination(step1, i)
        if (neutralCombinationGenerator == null) {
            continue
        }
        const combined = combineSteps(step1.children[i], probability1, step2, probability2, combineNoun, context)
        if (combined != null) {
            return {
                ...step1,
                children: step1.children.map((child, index) =>
                    i === index
                        ? combined
                        : {
                              type: "random",
                              children: [child, neutralCombinationGenerator()],
                              probabilities: [probability1, probability2],
                          }
                ),
            } as ParsedSteps
        }
    }
    return undefined
}

const generateNull: () => ParsedSteps = () => ({ type: "null" })
const generateThis: () => ParsedSteps = () => ({ type: "this" })

function getNeutralStepForCombination(parent: ParsedSteps, childIndex: number): (() => ParsedSteps) | undefined {
    switch (parent.type) {
        case "sequential":
            return generateThis
        case "parallel":
        case "random":
            return generateNull
        case "switch":
        case "if":
            return childIndex > 0 ? generateNull : undefined
    }
    return undefined
}

function combineRaw(step1: ParsedRaw, probability1: number, step2: ParsedRaw, probability2: number, combineNoun: CombineNoun, context: CombineContext): CombineResult {
    return step1.value === step2.value ? [context, step1] : undefined
}

function combineOperation(
    step1: ParsedOperation,
    probability1: number,
    step2: ParsedOperation,
    probability2: number,
    combineNoun: CombineNoun,
    context: CombineContext
): CombineResult {
    if (step1.identifier !== step2.identifier) {
        return undefined
    }
    return combineDefault(step1, probability1, step2, probability2, combineNoun, context)
}

function combineDefault(
    step1: ParsedSteps,
    probability1: number,
    step2: ParsedSteps,
    probability2: number,
    combineNoun: CombineNoun,
    context: CombineContext): CombineResult {
    if (step1.children == null || step2.children == null) {
        return [context, step1]
    }
    
    const result = combineChildrenDefault(step1.children, probability1, step2.children, probability2, combineNoun, context)

    if(result == null) {
        return undefined
    }
    return [result[0], {
        ...step1,
        children: result[1]
    } as ParsedSteps]
}

function combineChildrenDefault(
    children1: Array<ParsedSteps>,
    probability1: number,
    children2: Array<ParsedSteps>,
    probability2: number,
    combineNoun: CombineNoun,
    context: CombineContext
): [CombineContext, Array<ParsedSteps>] | undefined {
    const length = Math.max(children1.length, children2.length)
    let combined: number = 0
    const children: Array<ParsedSteps> = new Array(length)
    
    for(let i = 0; i < length; i++) {
        const child1 = children1[i] ?? { type: "null"}
        const child2 = children2[i] ?? { type: "null" }
        const [ctx, step] = combineSteps(child1, probability1, child2, probability2, combineNoun, context) ?? combineOuter(child1, probability1, child2, probability2, context)
        children[i] = step
        context = ctx
    }

    if(combined < length / 2) {
        return undefined
    }
    
    return [context, children]
}

function combineGetVariable(
    step1: ParsedGetVariable,
    probability1: number,
    step2: ParsedGetVariable,
    probability2: number,
    combineNoun: CombineNoun,
    context: CombineContext
): CombineResult {
    if(step1.identifier !== step2.identifier) {
        return undefined
    }
    return [context, step1]
}

function combineSetVariable(
    step1: ParsedSetVariable,
    probability1: number,
    step2: ParsedSetVariable,
    probability2: number,
    combineNoun: CombineNoun,
    context: CombineContext
): CombineResult {
    if(step1.identifier !== step2.identifier) {
        return undefined
    }
    return combineDefault(step1, probability1, step2, probability2, combineNoun, context)
}

function combineParallel(
    step1: ParsedParallel,
    probability1: number,
    step2: ParsedParallel,
    probability2: number,
    combineNoun: CombineNoun,
    context: CombineContext
): CombineResult {
    //TODO: ?? { type: "null"}
    //TODO: filterBothUndefined
    const length = Math.max(step1.children.length, step2.children.length)
    const result = randomCombination<CombineResult>(length, (indices) =>
        combineAll((children, innerCombinedAmount) => innerCombinedAmount >= length / 2 ? { type: "parallel", children } : undefined, indices.map(([i1, i2]) => [step1.children[i1] ??, step2.children[i2] ?? { type: "null" }]), probability1, probability2, combineNoun, context))
    if(result == null) {
        return undefined
    }
    return result
}

function combineSwitch(
    step1: ParsedSwitch,
    probability1: number,
    step2: ParsedSwitch,
    probability2: number,
    combineNoun: CombineNoun,
    context: CombineContext
): CombineResult {
    //TODO: get case from combined steps
    //TODO: assure cases are the same
    const length = Math.max(step1.children.length, step2.children.length)
    const result = randomCombination<CombineResult>(length, (indices) =>
        combineAll((children, innerCombinedAmount) => innerCombinedAmount >= length / 2 ? { type: "switch", children } : undefined, indices.map(([i1, i2]) => []), probability1, probability2, combineNoun, context))
    if(result == null) {
        return undefined
    }
    return result
}

function combineSequential(
    step1: ParsedSequantial,
    probability1: number,
    step2: ParsedSequantial,
    probability2: number,
    combineNoun: CombineNoun,
    context: CombineContext
): CombineResult {
    //TODO: ?? { type: "thisp"}
    //TODO: filterBothUndefined
    const length = Math.max(step1.children.length, step2.children.length)
    const result = randomCombination<CombineResult>(length, (indices) =>
        combineAll((children, innerCombinedAmount) => innerCombinedAmount >= length / 2 ? { type: "sequential", children } : undefined, indices.map(([i1, i2]) => [step1.children[i1] , step2.children[i2] ]), probability1, probability2, combineNoun, context))
    if(result == null) {
        return undefined
    }
    return result
}

function combineRandom(
    step1: ParsedRandom,
    probability1: number,
    step2: ParsedRandom,
    probability2: number,
    combineNoun: CombineNoun,
    context: CombineContext
): CombineResult {
    //TODO: flatten random
    //TODO: get probability from combined steps
    const length = Math.max(step1.children.length, step2.children.length)
    const result = randomCombination<CombineResult>(length, (indices) =>
        combineAll((children, innerCombinedAmount) => innerCombinedAmount >= length / 2 ? { type: "random", children } : undefined, indices.map(([i1, i2]) => []), probability1, probability2, combineNoun, context))
    if(result == null) {
        return undefined
    }
    return [context]
}

function combineAll(combine: (steps: Array<ParsedSteps>, innerCombinedAmount: number) => ParsedSteps | undefined, stepCombinations: Array<[ParsedSteps, ParsedSteps]>, probability1: number, probability2: number, 
    combineNoun: CombineNoun,
    context: CombineContext): CombineResult {
        const combinedSteps: Array<ParsedSteps> = new Array(stepCombinations.length)
    
        let innerCombinedAmount = 0

    for(let i = 0; i < length; i++) {
        const [child1, child2] = stepCombinations[i]
        let result = combineSteps(child1, probability1, child2, probability2, combineNoun, context)
        if(result != null) {
            ++innerCombinedAmount
        } else {
            result = combineOuter(child1, probability1, child2, probability2, context)
        }
        context = result[0]
        combinedSteps[i] = result[1]
    }

    const combined = combine(combinedSteps, innerCombinedAmount)

    if(combined == null) {
        return undefined
    }

    return [context, combined]
}

function randomCombination<T>(length: number, select: (indices: Array<[number, number]>) => T | undefined, transform: (i1: number, i2: number) => Array<[number, number]> = () => []): T | undefined {
    if(length === 1) {
        return select(transform(0, 0))
    }
    for(let i = 0; i < length; i++) {
        const base = transform(0, i)
        const result = randomCombination(length - 1, select, (i1, i2) => [...base, [shiftIfGreaterEqual(i, i1), shiftIfGreaterEqual(i, i2)]])
        if(result != null) {
            return result
        }
    }
    return undefined
}

function filterBothUndefined<T>([v1, v2]: [T | undefined, T | undefined]): boolean {
    return v1 != null || v2 != null
}

function shiftIfGreaterEqual(then: number, value: number): number {
    return value >= then ? value + 2 : value + 1
}

//TODO: keep grammar symbol names
/*
export function summarize(grammarDefinitions: Array<ParsedGrammarDefinition>): ParsedGrammarDefinition {
    const steps = grammarDefinitions.map(replaceSymbolsGrammar)
    const combinedSteps = combineSteps(steps, combineRandom)
    return { s1: unifyNestedRandom(combinedSteps) }
}

type SummaryInfo = {
    summarySize: number
    parent?: ParsedStepsSummary
    childrenIndex?: number
}

type ParsedStepsSummary = AbstractParsedSteps<SummaryInfo>

/**
 * groups the ParsedSteps into groups to then distribute the probability
 * the groups are established based on equality of the ParsedSteps
 * if there is only one resulting group, the ParsedStep itself is returned
 */
/*export function combineRandom(steps1: ParsedStepsSummary, steps2: ParsedStepsSummary): ParsedStepsSummary {
    const summarySize = steps1.summarySize + steps2.summarySize
    return {
        type: "random",
        probabilities: [steps1.summarySize / summarySize, steps2.summarySize / summarySize],
        children: [steps1, steps2],
        summarySize,
    }
}

export function unifyNestedRandom(steps: ParsedSteps): ParsedSteps {
    if (steps.type !== "random") {
        const result = { ...steps }
        result.children = steps.children?.map(unifyNestedRandom)
        return result
    }
    const map = new Map<string, [ParsedSteps, number]>()
    for (let i = 0; i < steps.children!.length; i++) {
        const childProbability = steps.probabilities![i]
        const child = unifyNestedRandom(steps.children![i])
        if (child.type === "random") {
            for (let i = 0; i < child.children!.length; i++) {
                const childOfChild = child.children![i]
                const probability = child.probabilities![i] * childProbability
                const key = serializeStepString(childOfChild)
                const [, currentProbability] = map.get(key) ?? [childOfChild, 0]
                map.set(key, [childOfChild, currentProbability + probability])
            }
        } else {
            const key = serializeStepString(child)
            const [, currentProbability] = map.get(key) ?? [child, 0]
            map.set(key, [child, currentProbability + childProbability])
        }
    }
    const results = Array.from(map.values())
    return {
        type: "random",
        children: results.map(([child]) => child),
        probabilities: results.map(([, probability]) => probability),
    }
}

type StepsMap = Map<ParsedStepsSummary["type"], Set<ParsedStepsSummary>>

/**
 * traverses the ParsedSteps ASTs and try to combine each ParsedSteps with the ParsedSteps of the other ASTs
 * ParsedSteps are combined if they have the same ParsedStep.type and at least one equal child
 * a step is combined unordered (matching children don't need to have the same index) if a ParsedStep is a ParsedParallel step
 */
/*export function combineSteps(
    stepsList: Array<ParsedSteps>,
    combine: (steps1: ParsedStepsSummary, steps2: ParsedStepsSummary) => ParsedStepsSummary
): ParsedStepsSummary {
    const combineAndReplace = (steps1: ParsedStepsSummary, steps2: ParsedStepsSummary) => {
        const combined = combine(steps1, steps2)
        steps1.parent = replace(steps1, combined)
        steps1.childrenIndex = 0
        steps1.parent = replace(steps2, combined)
        steps1.childrenIndex = 1
    }
    let result = toSummary(stepsList[0])
    for (let i = 1; i < stepsList.length; i++) {
        result = combineRecursively(result, toSummary(stepsList[i]), combineAndReplace)
    }
    return result
}

function replace(steps: ParsedStepsSummary, replaceWith: ParsedStepsSummary): ParsedStepsSummary {
    const replaceParented: ParsedStepsSummary = {
        ...replaceWith,
        parent: steps.parent,
        childrenIndex: steps.childrenIndex,
    }
    if (steps.parent != null && steps.childrenIndex != null) {
        steps.parent.children![steps.childrenIndex] = replaceParented
    }
    return replaceParented
}

export function toSummary(steps: ParsedSteps, parent?: ParsedStepsSummary, childrenIndex?: number): ParsedStepsSummary {
    const result = Object.assign<ParsedSteps, SummaryInfo & { children?: any }>(
        { ...steps },
        {
            summarySize: 1,
            parent,
            childrenIndex,
        }
    )
    result.children = steps.children?.map((child, index) => toSummary(child, result, index))
    return result
}

function indexComplexStepsSummary(steps: ParsedStepsSummary): StepsMap {
    const map: StepsMap = new Map()
    function traverse(steps: ParsedStepsSummary): void {
        if (steps.children == null || steps.children.length === 0) {
            return
        }
        let set = map.get(steps.type)
        if (set == null) {
            set = new Set()
            map.set(steps.type, set)
        }
        set.add(steps)
        for (const child of steps.children) {
            traverse(child)
        }
    }
    traverse(steps)
    return map
}

function combineRecursively(
    summary1: ParsedStepsSummary,
    summary2: ParsedStepsSummary,
    combineAndReplace: (steps1: ParsedStepsSummary, steps2: ParsedStepsSummary) => void
): ParsedStepsSummary {
    const map1 = indexComplexStepsSummary(summary1)
    const map2 = indexComplexStepsSummary(summary2)
    for (const [, set] of map1) {
        for (const entry1 of set) {
            combineWithSet(entry1, map1, map2, combineAndReplace)
        }
    }
    const root1 = getRoot(summary1)
    const root2 = getRoot(summary2)
    if (isEqual(root1, root2)) {
        return root1
    }
    combineAndReplace(root1, root2)
    return getRoot(root1)
}

function getRoot(steps: ParsedStepsSummary): ParsedStepsSummary {
    return steps.parent == null ? steps : getRoot(steps.parent)
}

function combineWithSet(
    mainEntry: ParsedStepsSummary,
    mainMap: StepsMap,
    foreignMap: StepsMap,
    combineAndReplace: (steps1: ParsedStepsSummary, steps2: ParsedStepsSummary) => void
): void {
    const foreignEntries = foreignMap.get(mainEntry.type)
    if (foreignEntries != null) {
        for (const foreignEntry of foreignEntries) {
            if (isEqual(foreignEntry, mainEntry) || !stepsMatchable(foreignEntry, mainEntry)) {
                continue
            }

            if (combineTwoSteps(mainEntry, foreignEntry, combineAndReplace)) {
                if (mainEntry.parent != null) {
                    combineWithSet(mainEntry.parent, mainMap, foreignMap, combineAndReplace)
                }
                if (foreignEntry.parent != null) {
                    combineWithSet(foreignEntry.parent, foreignMap, mainMap, combineAndReplace)
                }
                break
            }
        }
    }
}

function combineTwoSteps(
    parent1: ParsedStepsSummary,
    parent2: ParsedStepsSummary,
    combineAndReplace: (steps1: ParsedStepsSummary, steps2: ParsedStepsSummary) => void
): boolean {
    const childSet1 = new Map<ParsedStepsSummary, number>(parent1.children!.map((child, index) => [child, index]))
    const childSet2 = new Map<ParsedStepsSummary, number>(parent2.children!.map((child, index) => [child, index]))

    let equalMatchesCount = 0

    for (const [child1, i1] of childSet1) {
        for (const [child2, i2] of childSet2) {
            if (isPotentialMatch(parent1, i1, parent2, i2) && isEqual(child1, child2)) {
                childSet1.delete(child1)
                childSet2.delete(child2)

                const summarySize = child1.summarySize + child2.summarySize
                child1.summarySize = summarySize
                child2.summarySize = summarySize

                ++equalMatchesCount
                break
            }
        }
    }

    if (equalMatchesCount === 0) {
        return false
    }

    if (equalMatchesCount < Math.max(parent1.children!.length, parent2.children!.length) / 2) {
        combineAndReplace(parent1, parent2)
        return true
    }

    for (const [child1, i1] of childSet1) {
        for (const [child2, i2] of childSet2) {
            if (isPotentialMatch(parent1, i1, parent2, i2)) {
                childSet1.delete(child1)
                childSet2.delete(child2)
                combineAndReplace(child1, child2)
                break
            }
        }
    }

    const emptyMatches = [
        ...Array.from(childSet1).map<[ParsedStepsSummary, number, undefined, undefined]>(([child, index]) => [
            child,
            index,
            undefined,
            undefined,
        ]),
        ...Array.from(childSet2).map<[undefined, undefined, ParsedStepsSummary, number]>(([child, index]) => [
            undefined,
            undefined,
            child,
            index,
        ]),
    ]

    for (const [step1, index1, step2, index2] of emptyMatches) {
        switch (parent1.type) {
            case "random":
                if (step1 != null && index1 != null) {
                    addRandomChild(step1, index1, parent1, parent2 as typeof parent1)
                }
                if (step2 != null && index2 != null) {
                    addRandomChild(step2, index2, parent2 as typeof parent1, parent1)
                }
                break
            default:
                throw new Error(`step of type "${parent1.type}" can't have empty matches`)
        }
    }

    const summarySize = parent1.summarySize + parent2.summarySize
    parent1.summarySize = summarySize
    parent2.summarySize = summarySize

    return true
}

function isPotentialMatch(parent1: ParsedStepsSummary, index1: number, parent2: ParsedStepsSummary, index2: number) {
    switch (parent1.type) {
        case "parallel":
            return true
        case "random":
            return true
        case "switch": {
            const cases1 = parent1.cases
            const cases2 = (parent2 as typeof parent1).cases
            return cases1[index1 - 1] === cases2[index2 - 1]
        }
        case "add":
        case "multiply":
        case "and":
        case "or":
        case "equal":
        case "unequal":
            return true
        default:
            //ordered match
            return index1 === index2
    }
}

function addRandomChild(steps: ParsedStepsSummary, index: number, mainParent: ParsedRandom, otherParent: ParsedRandom) {
    const probability = mainParent.probabilities[index]
    otherParent.children!.push(steps)
    otherParent.probabilities.push(probability * 0.5)
}

/**
 * compares everything except for the children of the steps
 */
/*function stepsMatchable(element1: ParsedStepsSummary, element2: ParsedStepsSummary) {
    switch (element1.type) {
        case "operation":
        case "getVariable":
        case "setVariable":
        case "symbol":
            return element1.identifier === (element2 as typeof element1).identifier
        case "raw":
            return element1.value === (element2 as typeof element1).value
        case "if": //same condition
            return isEqual(element1.children[0], (element2 as typeof element1).children[0])
        case "switch": //same switch value
            return element1.children[0] === (element2 as typeof element1).children[0]
        default:
            return true
    }
}
*/
