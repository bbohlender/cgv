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
    { type: "null" },
]

export function getAllStepDescriptors(operations: Operations<any, any>): Array<StepDescriptor> {
    return [
        ...Object.keys(operations).map<StepDescriptor>((identifier) => ({ type: "operation", identifier })),
        ...allStepTypes,
    ]
}

export function createDefaultStep<T, A>(descriptor: StepDescriptor, operations: Operations<T, A>): ParsedSteps {
    switch (descriptor.type) {
        case "add":
        case "multiply":
        case "subtract":
        case "divide":
        case "modulo":
        case "equal":
        case "unequal":
        case "greater":
        case "greaterEqual":
        case "smaller":
        case "smallerEqual":
            return {
                type: descriptor.type,
                children: [
                    {
                        type: "raw",
                        value: 2,
                    },
                    {
                        type: "raw",
                        value: 1,
                    },
                ],
            }
        case "and":
        case "or":
            return {
                type: descriptor.type,
                children: [
                    {
                        type: "raw",
                        value: true,
                    },
                    {
                        type: "raw",
                        value: false,
                    },
                ],
            }
        case "if":
            return {
                type: descriptor.type,
                children: [
                    {
                        type: "raw",
                        value: true,
                    },
                    {
                        type: "this",
                    },
                    {
                        type: "this",
                    },
                ],
            }
        case "parallel":
        case "sequential":
        case "random":
            return {
                type: descriptor.type,
                children: [],
                probabilities: [],
            }
        case "switch":
            return {
                type: descriptor.type,
                cases: [],
                children: [
                    {
                        type: "raw",
                        value: 0,
                    },
                ],
            }
        case "operation": {
            const operation = operations[descriptor.identifier]
            if (operation == null) {
                throw new Error(`unknown operation "${descriptor.identifier}"`)
            }
            return {
                type: descriptor.type,
                children: operation.defaultParameters(),
                identifier: descriptor.identifier,
            }
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
                children: [
                    {
                        type: "raw",
                        value: 1,
                    },
                ],
            }
        case "not":
            return {
                type: descriptor.type,
                children: [
                    {
                        type: "raw",
                        value: true,
                    },
                ],
            }
        case "invert":
            return {
                type: descriptor.type,
                children: [
                    {
                        type: "raw",
                        value: 1,
                    },
                ],
            }
        case "return":
        case "this":
        case "null":
            return {
                type: descriptor.type,
            }
    }
}
