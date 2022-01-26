import { Primitive } from "co-3gen"
import { Attribute } from "./attribute"

export type InstanceAttributes = { [name in string]?: Attribute }

export type Instance = {
    path: Array<number>
    attributes: InstanceAttributes
    primitive: Primitive
}

export function cloneInstance(instance: Instance, i: number) {
    return {
        path: [...instance.path, i],
        attributes: { ...instance.attributes },
        primitive: instance.primitive.clone(),
    }
}

export * from "./attribute"
export * from "./operations"
export * from "./to-object3d"
