import { lastValueFrom, of } from "rxjs"
import { interprete, InterpreterOptions, Operations, toValue } from "../interpreter"
import { ParsedGrammarDefinition, ParsedSteps } from "../parser"
import { filterNull } from "../util"

export async function concretize<T>(
    baseValue: T,
    grammar: ParsedGrammarDefinition,
    operations: Operations<T, any>,
    options: InterpreterOptions<T, any, any>
): Promise<ParsedGrammarDefinition> {
    const indexMap = await deriveRandomOutputStepIndex(baseValue, grammar, operations, options)
    return concretizeRandomDerivedIndices(grammar, indexMap)
}

export async function deriveRandomOutputStepIndex<T>(
    baseValue: T,
    grammar: ParsedGrammarDefinition,
    operations: Operations<T, any>,
    options: InterpreterOptions<T, any, any>
): Promise<Map<ParsedSteps, Array<[inputIndex: string, selectedChildIndex: number]>>> {
    const fullIndicesMap = new Map<ParsedSteps, Array<[inputIndex: string, selectedChildIndex: number]>>()
    await lastValueFrom(
        of(baseValue).pipe(
            toValue(),
            interprete(grammar, operations, {
                ...options,
                listeners: {
                    onRandom: (step, index, childIndex) => {
                        let entries = fullIndicesMap.get(step)
                        if (entries == null) {
                            entries = []
                            fullIndicesMap.set(step, entries)
                        }
                        entries.push([index.join(","), childIndex])
                    },
                },
            })
        )
    )
    return fullIndicesMap
}

export function concretizeRandomDerivedIndices(
    grammar: ParsedGrammarDefinition,
    indexMap: Map<ParsedSteps, Array<[inputIndex: string, selectedChildIndex: number]>>
): ParsedGrammarDefinition {
    return grammar.map(({ name, step }) => ({ name, step: concretizeRandomStep(step, indexMap) }))
}

function concretizeRandomStep(
    step: ParsedSteps,
    indexMap: Map<ParsedSteps, Array<[inputIndex: string, selectedChildIndex: number]>>
): ParsedSteps {
    if (step.type === "random") {
        const indices = indexMap.get(step)
        if (indices == null) {
            return {
                type: "null",
            }
        }
        const childIndexGroup = new Map<number, Array<string>>()
        for (const [inputIndex, selectedChildIndex] of indices) {
            let group = childIndexGroup.get(selectedChildIndex)
            if (group == null) {
                group = []
                childIndexGroup.set(selectedChildIndex, group)
            }
            group.push(inputIndex)
        }
        const children = Array.from(childIndexGroup.keys()).map((index) => step.children[index])
        if (children.length === 1) {
            return children[0]
        }
        return {
            type: "switch",
            children: [
                {
                    type: "operation",
                    children: [],
                    identifier: "id",
                },
                ...children,
            ],
            cases: Array.from(childIndexGroup.values()),
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
