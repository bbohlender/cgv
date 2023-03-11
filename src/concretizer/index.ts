import { lastValueFrom, of } from "rxjs"
import { interprete, InterpreterOptions, Operations, toValue } from "../interpreter"
import { ParsedDescription, ParsedTransformation } from "../parser"
import { filterNull } from "../util"

export async function concretize<T>(
    baseValue: T,
    grammar: ParsedDescription,
    operations: Operations<T>,
    options: InterpreterOptions<T, any>
): Promise<ParsedDescription> {
    const indexMap = await deriveRandomOutputStepIndex(baseValue, grammar, operations, options)
    return concretizeRandomDerivedIndices(grammar, indexMap)
}

export async function deriveRandomOutputStepIndex<T>(
    baseValue: T,
    grammar: ParsedDescription,
    operations: Operations<T>,
    options: InterpreterOptions<T, any>
): Promise<Map<ParsedTransformation, Array<[inputIndex: string, selectedChildIndex: number]>>> {
    const fullIndicesMap = new Map<ParsedTransformation, Array<[inputIndex: string, selectedChildIndex: number]>>()
    await lastValueFrom(
        of(baseValue).pipe(
            toValue(),
            interprete(grammar, operations, {
                ...options,
                listeners: {
                    onRandom: (step, value, childIndex) => {
                        let entries = fullIndicesMap.get(step)
                        if (entries == null) {
                            entries = []
                            fullIndicesMap.set(step, entries)
                        }
                        entries.push([value.index.join(","), childIndex])
                    },
                },
            })
        )
    )
    return fullIndicesMap
}

export function concretizeRandomDerivedIndices(
    grammar: ParsedDescription,
    indexMap: Map<ParsedTransformation, Array<[inputIndex: string, selectedChildIndex: number]>>
): ParsedDescription {
    return grammar.map(({ name, step }) => ({ name, step: concretizeRandomStep(step, indexMap) }))
}

function concretizeRandomStep(
    step: ParsedTransformation,
    indexMap: Map<ParsedTransformation, Array<[inputIndex: string, selectedChildIndex: number]>>
): ParsedTransformation {
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
    } as ParsedTransformation
}
