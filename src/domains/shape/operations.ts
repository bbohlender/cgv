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
} from "co-3gen"
import { Matrix4 } from "three"
import { AttributeType, Instance } from "."
import { Operation } from "../.."

export function attribute(...values: Array<any>): Array<any> {
    const input = splitValues<[Instance, string, number, number, "int" | "float"]>(values, 5)
    return input.map(([instance, name, min, max, type]) => {
        instance.attributes[name] = {
            type: type === "float" ? AttributeType.Float : AttributeType.Int,
            min,
            max,
            generateRandomValue:
                type === "float"
                    ? () => min + Math.random() * (max - min)
                    : () => min + Math.floor(Math.random() * (1 + max - min)),
        }
        const split = instance.id.split("/")
        let path = name
        for (let i = 0; i < split.length + 1; i++) {
            const value = instance.parameters[path]
            if (value != null) {
                return value
            }
            path = split[i] + "/" + path
        }
        const attribute = instance.attributes[name]
        if (attribute == null) {
            throw new Error(`unknown attribute '${name}' at instance "${instance.id}"`)
        }
        return attribute.generateRandomValue()
    })
}

function boolean3DOp(op: "union" | "intersect" | "subtract", ...values: Array<Instance>): Array<Instance> {
    const input = splitValues<[Instance, Instance]>(values, 2)
    return input.map(([i1, i2]) => instanceChangePrimitive(boolean3d(op, i1.primitive, i2.primitive), i1))
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
        .map((_, i) => new Array(splits).fill(null).map((_, ii) => array[i * splits + ii]) as T)
}
