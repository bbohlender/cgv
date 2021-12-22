import {
    boolean3d,
    ComponentType,
    makeRotationMatrix,
    makeScaleMatrix,
    makeTranslationMatrix,
    connect as connect3Gen,
    sample2d as sample2d3Gen,
    Primitive,
    CombinedPrimitive,
    expand,
    YAXIS,
    boolean2d,
} from "co-3gen"
import { Matrix4, Plane } from "three"
import { Attribute, AttributeType, Instance } from "."
import { Operation } from "../.."

/*export function equal(): Array<any> {

}*/

export function isRoad(...values: Array<any>): Array<any> {
    return values.map((value) => value.parameters.layer === "road")
}

export function isBuilding(...values: Array<any>): Array<any> {
    return values.map((value) => value.parameters.layer === "building")
}

export function filter(...values: Array<any>): Array<any> {
    const input = splitValues<[Instance, boolean]>(values, 2)
    return input.filter(([, v]) => v).map(([v]) => v)
}

export function attribute(...values: Array<any>): Array<any> {
    const input = splitValues<[Instance, string, number, number, "int" | "float"]>(values, 5)
    return input.map(([instance, name, min, max, type]) => {
        const attribute: Attribute = {
            type: type === "float" ? AttributeType.Float : AttributeType.Int,
            min,
            max,
            generateRandomValue:
                type === "float"
                    ? () => min + Math.random() * (max - min)
                    : () => min + Math.floor(Math.random() * (1 + max - min)),
        }
        setAttribute(instance, name, attribute)
        const split = instance.id.split("/")
        let path: string | undefined = undefined
        for (let i = 0; i < split.length; i++) {
            path = (path == null ? "" : path + "/") + split[i]
            const value = instance.parameters[`${path}/${name}`]
            if (value != null) {
                return value
            }
        }
        return attribute.generateRandomValue()
    })
}

function setAttribute(instance: Instance, name: string, attribute: Attribute): void {
    instance.attributes[name] = attribute
    if (instance.parent != null) {
        setAttribute(instance.parent, name, attribute)
    }
}

function boolean3DOp(op: "union" | "intersect" | "subtract", ...values: Array<Instance>): Array<Instance> {
    if (values.length === 0) {
        return []
    }
    return [
        instanceChangePrimitive(
            values.slice(1).reduce((prev, current) => boolean3d(op, prev, current.primitive), values[0].primitive),
            values[0]
        ),
    ]
}

function boolean2DOp(op: "union" | "intersect" | "subtract", ...values: Array<Instance>): Array<Instance> {
    if (values.length === 0) {
        return []
    }
    return [
        instanceChangePrimitive(
            boolean2d(op, values[0].primitive, ...values.slice(1).map((value) => value.primitive)),
            values[0]
        ),
    ]
}

export const connect: Operation<Instance> = (...values: Array<Instance>) => {
    const input = splitValues<[Instance, Instance]>(values, 2)
    return input.map(([i1, i2]) => instanceChangePrimitive(connect3Gen(i1.primitive, i2.primitive), i1))
}

export const sample2d: Operation<Instance> = (...values: Array<any>) => {
    const input = splitValues<[Instance, number]>(values, 2)

    return input.map(([instance, amount]) =>
        instanceChangePrimitive(
            new CombinedPrimitive(
                new Matrix4(),
                new Array(amount).fill(null).map(() => sample2d3Gen(instance.primitive))
            ),
            instance
        )
    )
}

export const union3d: Operation<Instance> = boolean3DOp.bind(null, "union")
export const intersect3d: Operation<Instance> = boolean3DOp.bind(null, "intersect")
export const subtract3d: Operation<Instance> = boolean3DOp.bind(null, "subtract")

export const union2d: Operation<Instance> = boolean2DOp.bind(null, "union")
export const intersect2d: Operation<Instance> = boolean2DOp.bind(null, "intersect")
export const subtract2d: Operation<Instance> = boolean2DOp.bind(null, "subtract")

export const expand2d: Operation<Instance> = (...values: Array<any>) => {
    const input = splitValues<[Instance, number]>(values, 2)
    return input.map(([instance, delta]) =>
        instanceChangePrimitive(expand(instance.primitive, new Plane(YAXIS), delta), instance)
    )
}

export const points: Operation<Instance> = (...values: Array<Instance>) =>
    values.map((value) => instanceChangePrimitive(value.primitive.components(ComponentType.Point), value))
export const lines: Operation<Instance> = (...values: Array<Instance>) =>
    values.map((value) => instanceChangePrimitive(value.primitive.components(ComponentType.Line), value))
export const faces: Operation<Instance> = (...values: Array<Instance>) =>
    values.map((value) => instanceChangePrimitive(value.primitive.components(ComponentType.Face), value))

export const translate: Operation<Instance> = (...values) => {
    const input = splitValues<[Instance, number, number, number]>(values, 4)
    return input.map(([instance, x, y, z]) =>
        instanceChangePrimitive(instance.primitive.applyMatrix(makeTranslationMatrix(x, y, z)), instance)
    )
}
export const rotate: Operation<Instance> = (...values) => {
    const input = splitValues<[Instance, number, number, number]>(values, 4)
    return input.map(([instance, ...euler]) =>
        instanceChangePrimitive(
            instance.primitive.applyMatrix(
                makeRotationMatrix(...(euler.map((a) => (a / 180) * Math.PI) as [number, number, number]))
            ),
            instance
        )
    )
}

export const scale: Operation<Instance> = (...values) => {
    const input = splitValues<[Instance, number, number, number]>(values, 4)
    return input.map(([instance, x, y, z]) =>
        instanceChangePrimitive(instance.primitive.applyMatrix(makeScaleMatrix(x, y, z)), instance)
    )
}

function instanceChangePrimitive(primitive: Primitive, instance: Instance): Instance {
    instance.primitive = primitive
    return instance
}

function splitValues<T extends Array<any>>(array: Array<any>, splits: number): Array<T> {
    if (array.length % splits !== 0) {
        throw new Error(
            `operation input has length ${array.length} and is not devidable by the amount of parameters expected for the operation (${splits})`
        )
    }
    const splitSize = array.length / splits
    return new Array(splitSize)
        .fill(null)
        .map((_, i) => new Array(splits).fill(null).map((_, ii) => array[ii * splitSize + i]) as T)
}
