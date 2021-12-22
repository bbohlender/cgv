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

export function cloneInstance(instance: Instance, i: number) {
    const child = {
        parent: instance,
        id: `${instance.id}/${i}`,
        attributes: {},
        parameters: instance.parameters,
        primitive: instance.primitive.clone(),
        children: [],
    }
    instance.children.push(child)
    return child
}

export * from "./attribute"
export * from "./operations"
