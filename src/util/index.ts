import { AbstractParsedSteps, ParsedSteps } from ".."

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

export function assureType<Type extends ParsedSteps["type"], T>(
    type: Type,
    steps: AbstractParsedSteps<T>
): AbstractParsedSteps<T> & { type: Type } {
    if (steps.type != type) {
        throw new Error(`expected step "${steps}" to have type "${type}"`)
    }
    return steps as any
}

export function filterNull<T>(val: T | null | undefined): val is T {
    return val != null
}

export * from "./precendence"
export * from "./hierarchical"
export * from "./flatten"
