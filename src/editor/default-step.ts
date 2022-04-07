import type { ParsedSteps, Operations } from ".."

export type StepDescriptor =
    | { type: Exclude<ParsedSteps["type"], "operation" | "symbol"> }
    | { type: "operation"; identifier: string }

const allStepTypes: Array<{ type: Exclude<ParsedSteps["type"], "operation" | "symbol"> }> = [
    { type: "add" },
    { type: "and" },
    { type: "divide" },
    { type: "equal" },
    { type: "getVariable" },
    { type: "greater" },
    { type: "greaterEqual" },
    { type: "if" },
    { type: "invert" },
    { type: "modulo" },
    { type: "multiply" },
    { type: "not" },
    { type: "or" },
    { type: "parallel" },
    { type: "random" },
    { type: "raw" },
    { type: "return" },
    { type: "sequential" },
    { type: "setVariable" },
    { type: "smaller" },
    { type: "smallerEqual" },
    { type: "subtract" },
    { type: "switch" },
    { type: "this" },
    { type: "unequal" },
]

export function getAllStepDescriptors(operations: Operations<any, any>): Array<StepDescriptor> {
    return [
        ...Object.keys(operations).map<StepDescriptor>((identifier) => ({ type: "operation", identifier })),
        ...allStepTypes,
    ]
}

export function createDefaultStep<T, A>(descriptor: StepDescriptor, operations: Operations<T, A>): ParsedSteps {
    const children = getDefaultChildren(descriptor, operations)
    switch (descriptor.type) {
        case "random":
            return {
                type: descriptor.type,
                children: children!,
                probabilities: [],
            }
        case "switch":
            return {
                type: descriptor.type,
                cases: [],
                children: children!,
            }
        case "operation":
            return {
                type: descriptor.type,
                children: children!,
                identifier: descriptor.identifier,
            }
        case "raw":
            return {
                type: descriptor.type,
                value: 1,
            }
        case "getVariable":
            return {
                type: descriptor.type,
                identifier: "x",
            }
        case "setVariable":
            return {
                type: descriptor.type,
                identifier: "x",
                children: children! as [ParsedSteps],
            }
        default:
            return {
                type: descriptor.type,
                children: children as any,
            }
    }
}

const binaryNumberOperationChildren: Array<() => ParsedSteps> = [
    () => ({
        type: "raw",
        value: 2,
    }),
    () => ({
        type: "raw",
        value: 1,
    }),
]

const binaryBooleanOperationChildren: Array<() => ParsedSteps> = [
    () => ({
        type: "raw",
        value: true,
    }),
    () => ({
        type: "raw",
        value: false,
    }),
]

const defaultChildrenMap: {
    [T in Exclude<ParsedSteps["type"], "operation">]:
        | Array<() => ParsedSteps>
        | undefined
        | ((index: number) => ParsedSteps)
} = {
    add: binaryNumberOperationChildren,
    multiply: binaryNumberOperationChildren,
    subtract: binaryNumberOperationChildren,
    divide: binaryNumberOperationChildren,
    modulo: binaryNumberOperationChildren,
    equal: binaryNumberOperationChildren,
    unequal: binaryNumberOperationChildren,
    greater: binaryNumberOperationChildren,
    greaterEqual: binaryNumberOperationChildren,
    smaller: binaryNumberOperationChildren,
    smallerEqual: binaryNumberOperationChildren,
    and: binaryBooleanOperationChildren,
    or: binaryBooleanOperationChildren,
    if: [
        () => ({
            type: "raw",
            value: true,
        }),
        () => ({
            type: "this",
        }),
        () => ({
            type: "this",
        }),
    ],
    switch: (index) => {
        if (index === 0) {
            return {
                type: "raw",
                value: 0,
            }
        }
        return {
            type: "null",
        }
    },
    setVariable: [
        () => ({
            type: "raw",
            value: 1,
        }),
    ],
    not: [
        () => ({
            type: "raw",
            value: true,
        }),
    ],
    invert: [
        () => ({
            type: "raw",
            value: 1,
        }),
    ],
    this: undefined,
    return: undefined,
    random: () => ({ type: "null" }),
    getVariable: undefined,
    parallel: () => ({ type: "null" }),
    raw: undefined,
    symbol: undefined,
    null: undefined,
    sequential: () => ({ type: "this" }),
}

export function getDefaultChildren(
    descriptor: StepDescriptor,
    operations: Operations<any, any>
): Array<ParsedSteps> | undefined {
    return getDefaultChildrenGenerators(descriptor, operations)?.map((fn) => fn())
}

export function getDefaultChildAtIndex(
    descriptor: StepDescriptor,
    operations: Operations<any, any>,
    index: number
): ParsedSteps | undefined {
    const generators = getDefaultChildrenGenerators(descriptor, operations)
    if (generators == null) {
        return undefined
    }
    const generator = generators[index]
    if (generator == null) {
        return undefined
    }
    return generator()
}

function getDefaultChildrenGenerators(
    descriptor: StepDescriptor,
    operations: Operations<any, any>
): Array<() => ParsedSteps> | undefined {
    if (descriptor.type !== "operation") {
        return defaultChildrenMap[descriptor.type]
    }

    const operation = operations[descriptor.identifier]
    if (operation == null) {
        throw new Error(`unknown operator "${descriptor.identifier}"`)
    }
    return operation.defaultParameters
}
