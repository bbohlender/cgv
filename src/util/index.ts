import { ParsedTransformation, ParsedTransformation } from ".."
import { ParsedDescription, ParsedDescription } from "../parser"

export enum HierarchicalRelation {
    Predecessor,
    Successor,
    Equal,
    None,
}

export function getIndexRelation(i1: Array<number>, i2: Array<number>): HierarchicalRelation {
    const length = Math.min(i1.length, i2.length)
    for (let i = 0; i < length; i++) {
        if (i1[i] != i2[i]) {
            return HierarchicalRelation.None
        }
    }
    return i1.length < i2.length
        ? HierarchicalRelation.Successor
        : i1.length === i2.length
        ? HierarchicalRelation.Equal
        : HierarchicalRelation.Predecessor
}

export function shallowEqual(array1: Array<any> | undefined, array2: Array<any> | undefined): boolean {
    if (array1 == null || array2 == null) {
        return false
    }
    if (array1 == array2) {
        return true
    }
    if (array1.length != array2.length) {
        return false
    }
    for (let i = 0; i < array1.length; i++) {
        if (array1[i] != array2[i]) {
            return false
        }
    }
    return true
}

export function assureType<Type extends ParsedTransformation["type"], T>(
    type: Type,
    steps: ParsedTransformation<T>
): ParsedTransformation<T> & { type: Type } {
    if (steps.type != type) {
        throw new Error(`expected step "${steps}" to have type "${type}"`)
    }
    return steps as any
}

export function filterNull<T>(val: T | null | undefined): val is T {
    return val != null
}

export function getNounIndex(name: string, grammar: ParsedDescription): number | undefined {
    const index = grammar.findIndex(({ name: nounName }) => nounName === name)
    return index === -1 ? undefined : index
}

export function setNounStep(name: string, grammar: ParsedDescription, step: ParsedTransformation): void {
    const index = getNounIndex(name, grammar)
    if (index != null) {
        grammar[index].step = step
    }
}
/*
export function setNounName(name: string, grammar: ParsedGrammarDefinition, newName: string): void {
    const index = getNounIndex(name, grammar)
    if(index != null) {
        grammar[index].name = newName
    }
}*/

export function getNounStep<T>(
    name: string,
    grammar: ParsedDescription<T>
): ParsedTransformation<T> | undefined {
    const index = getNounIndex(name, grammar)
    return index == null ? undefined : grammar[index].step
}

export function traverseSteps<T>(root: ParsedTransformation<T>, cb: (step: ParsedTransformation<T>) => void) {
    cb(root)
    if (root.children == null) {
        return
    }
    for (const child of root.children) {
        traverseSteps(child, cb)
    }
}

export * from "./math"
export * from "./precendence"
export * from "./hierarchical"
export * from "./description"
