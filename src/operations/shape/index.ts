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
import { Operation } from ".."

//TODO: efficiency / only clone when necassary

function boolean3DOp(op: "union" | "intersect" | "subtract", ...values: Array<Primitive | any>) {
    return values.slice(0, -1).map((value) => boolean3d(op, value, values[values.length - 1]))
}

export const join: Operation<Primitive> = (...values) => [new CombinedPrimitive(new Matrix4(), values)]

export const connect: Operation<Primitive> = (...values) => {
    return values.slice(0, -1).map((value) => connect3Gen(value, values[values.length - 1]))
}

export const sample2d: Operation<Primitive> = (...values) => {
    return values.slice(0, -1).map(
        (value) =>
            new CombinedPrimitive(
                new Matrix4(),
                new Array(values[values.length - 1]).fill(null).map(() => sample2d3Gen(value))
            )
    )
}

export const union3d: Operation<Primitive> = boolean3DOp.bind(null, "union")
export const intersect3d: Operation<Primitive> = boolean3DOp.bind(null, "intersect")
export const subtract3d: Operation<Primitive> = boolean3DOp.bind(null, "subtract")

export const points: Operation<Primitive> = (...values) =>
    values.map((value) => value.components(ComponentType.Point))
export const lines: Operation<Primitive> = (...values) =>
    values.map((value) => value.components(ComponentType.Line))
export const faces: Operation<Primitive> = (...values) =>
    values.map((value) => value.components(ComponentType.Face))

export const translate: Operation<Primitive> = (...values) =>
    values.slice(0, -3).map((value) => value.clone().applyMatrix(makeTranslationMatrix(...lastX<number>(values, 3) as [number, number, number])))
export const rotate: Operation<Primitive> = (...values) =>
    values.slice(0, -3).map((value) => value.clone().applyMatrix(makeRotationMatrix(...lastX<number>(values, 3).map(a => a / 180 * Math.PI) as [number, number, number])))
export const scale: Operation<Primitive> = (...values) =>
    values.slice(0, -3).map((value) => value.clone().applyMatrix(makeScaleMatrix(...lastX<number>(values, 3) as [number, number, number])))


function lastX<T>(a: Array<T>, x: number): Array<T> {
    return a.slice(-x)
}
