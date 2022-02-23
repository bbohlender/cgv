import { Primitive } from "./primitive"
import { Attribute } from "./attribute"

export type InstanceAttributes = { [name in string]?: Attribute }

export type Instance = {
    attributes: InstanceAttributes
    primitive: Primitive
}

export * from "./primitive"
export * from "./primitive-utils"
export * from "./attribute"
export * from "./mapbox"
export * from "./operations"
export * from "./to-object3d"
