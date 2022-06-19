import { lastValueFrom, of } from "rxjs"
import { interprete, InterpreterOptions, Operations, toValue } from "../interpreter"
import { ParsedGrammarDefinition, ParsedRandom, ParsedSteps } from "../parser"
import { HierarchicalParsedGrammarDefinition, HierarchicalParsedSteps } from "../util"

function randomFilter(step: ParsedSteps): boolean {
    return step.type === "random"
}

export async function concretize<T>(
    baseValue: T,
    grammar: ParsedGrammarDefinition,
    operations: Operations<T, any>,
    options: InterpreterOptions<T, any, any>
): Promise<ParsedGrammarDefinition> {
    const indexMap = await deriveConcreteIndices(baseValue, grammar, operations, options, randomFilter)
    return concretizeRandomDerivedIndices(grammar, indexMap)
}

export async function deriveConcreteIndices<T>(
    baseValue: T,
    grammar: ParsedGrammarDefinition,
    operations: Operations<T, any>,
    options: InterpreterOptions<T, any, any>,
    filter: (step: ParsedSteps) => boolean
): Promise<Map<ParsedSteps, Array<[before: string, after: Array<number>]>>> {
    const beforeIndicesMap = new Map<ParsedSteps, Array<string>>()
    const fullIndicesMap = new Map<ParsedSteps, Array<[before: string, after: Array<number>]>>()
    await lastValueFrom(
        of(baseValue).pipe(
            toValue(),
            interprete(grammar, operations, {
                ...options,
                annotateAfterStep: (value, step) => {
                    if (!filter(step)) {
                        return
                    }
                    const beforeIndices = beforeIndicesMap.get(step) ?? []
                    const afterIndex = value.index.join(",")
                    const beforeIndex = beforeIndices?.find((possibleBeforeIndex) =>
                        afterIndex.startsWith(possibleBeforeIndex)
                    )
                    if (beforeIndex == null) {
                        throw new Error(`no input for output "${afterIndex}"`)
                    }
                    let indices = fullIndicesMap.get(step)
                    if (indices == null) {
                        indices = []
                        fullIndicesMap.set(step, indices)
                    }
                    indices.push([beforeIndex, value.index])
                },
                annotateBeforeStep: (value, step) => {
                    if (!filter(step)) {
                        return
                    }
                    let indices = beforeIndicesMap.get(step)
                    if (indices == null) {
                        indices = []
                        beforeIndicesMap.set(step, indices)
                    }
                    indices.push(value.index.join(","))
                },
            })
        )
    )
    return fullIndicesMap
}

export function concretizeRandomDerivedIndices(
    grammar: ParsedGrammarDefinition,
    indexMap: Map<ParsedSteps, Array<[before: string, after: Array<number>]>>
): ParsedGrammarDefinition {
    return grammar.map(({ name, step }) => ({ name, step: concretizeRandomStep(step, indexMap) }))
}

function concretizeRandomStep(
    step: ParsedSteps,
    indexMap: Map<ParsedSteps, Array<[before: string, after: Array<number>]>>
): ParsedSteps {
    if (step.type === "random") {
        const indices = indexMap.get(step)
        if (indices == null) {
            throw new Error(`unknown step "${step}"`)
        }
        const idList = step.children.map<Array<string>>(() => [])
        for (const [beforeIndex, afterIndex] of indices) {
            const lastIndex = afterIndex[afterIndex.length - 1]
            const ids = idList[lastIndex]
            if (ids == null) {
                throw new Error(`no child on random at index "${lastIndex}"`)
            }
            ids.push(beforeIndex)
        }
        return {
            type: "switch",
            children: [
                {
                    type: "operation",
                    children: [],
                    identifier: "id",
                },
                ...idList.map<ParsedSteps>((ids, i) => (ids.length > 0 ? step.children[i] : { type: "null" })),
            ],
            cases: idList.map((ids) => (ids.length === 0 ? [0] : ids)),
        }
    }
    if (step.children == null) {
        return step
    }
    return {
        ...step,
        children: step.children.map((child) => concretizeRandomStep(child, indexMap)),
    } as ParsedSteps
}
