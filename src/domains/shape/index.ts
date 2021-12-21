import { Primitive } from "co-3gen"
import { Attribute } from "./attribute"

export type InstanceParameters = { [name in string]?: number }
export type InstanceAttributes = { [name in string]?: Attribute }

export type Instance = {
    id: string
    parameters: InstanceParameters
    attributes: InstanceAttributes
    primitive: Primitive
    parent?: Instance
    children: Array<Instance>
}

export function getRoot(values: Array<Instance>): Array<Instance> {
    if (values.length === 0) {
        throw new Error("can't get the root of an empty instance array")
    }
    const stepUpSet: Set<Instance> = new Set()
    let anyInstanceHasAParent = false
    for (const value of values) {
        if (value.parent != null) {
            anyInstanceHasAParent = true
            stepUpSet.add(value.parent)
        } else {
            stepUpSet.add(value)
        }
    }
    const stepUp = Array.from(stepUpSet)
    if (!anyInstanceHasAParent) {
        return stepUp
    }
    return getRoot(stepUp)
}

export * from "./attribute"
export * from "./operations"
