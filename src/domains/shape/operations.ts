import { Observable, of } from "rxjs"
import { Instance } from "."
import { createMatrixFromArray, Matrix, operationInterpretion, Operations, thisParameter } from "../.."
import { makeRotationMatrix, makeScaleMatrix, makeTranslationMatrix } from "./math"
import { createPhongMaterialGenerator, FacePrimitive } from "./primitive"
import { Axis, Split } from "./primitive-utils"
import { operations as defaultOperations } from ".."
import { Vector3 } from "three"

const size = new Vector3()

function computeSize([instance, axis]: Array<any>): Observable<Matrix<any>> {
    instance.primitive.getGeometrySize(size)
    return of(size[axis as keyof Vector3])
}

function computeScale([instance, x, y, z]: Array<any>): Observable<Matrix<Instance>> {
    return of({
        attributes: { ...instance.attributes },
        primitive: instance.primitive.multiplyMatrix(makeScaleMatrix(x, y, z)),
    })
}

function degreeToRadians(degree: number): number {
    return (Math.PI * degree) / 180
}

function computeRotate([instance, x, y, z]: Array<any>): Observable<Matrix<Instance>> {
    return of({
        attributes: { ...instance.attributes },
        primitive: instance.primitive.multiplyMatrix(
            makeRotationMatrix(degreeToRadians(x), degreeToRadians(y), degreeToRadians(z))
        ),
    })
}

function computeTranslate([instance, x, y, z]: Array<any>): Observable<Matrix<Instance>> {
    return of({
        attributes: { ...instance.attributes },
        primitive: instance.primitive.multiplyMatrix(makeTranslationMatrix(x, y, z)),
    })
}

function computeColorChange([instance, color]: Array<any>): Observable<Matrix<Instance>> {
    return of({
        attributes: { ...instance.attributes },
        primitive: instance.primitive.changeMaterialGenerator(createPhongMaterialGenerator(color)),
    })
}

function computeExtrude([instance, by]: Array<any>): Observable<Matrix<Instance>> {
    return of({ attributes: { ...instance.attributes }, primitive: instance.primitive.extrude(by) })
}

function computeComponents(
    type: "points" | "lines" | "faces",
    instances: Array<Instance>
): Observable<Matrix<Instance>> {
    const components = instances.reduce<Array<Instance>>(
        (instances, instance) => [
            ...instances,
            ...instance.primitive
                .components(type)
                .map<Instance>((primitive) => ({ attributes: { ...instance.attributes }, primitive })),
        ],
        []
    )
    return of(createMatrixFromArray(components, components.length))
}

function computeSplit(axis: Axis, [instance, at, limit]: Array<any>): Observable<Matrix<Instance>> {
    const splits = Split(instance.primitive, axis, (matrix, index, x, y, z) => {
        if (limit == null || index < limit) {
            const sizeX = axis === Axis.X ? Math.min(at, x) : x
            const sizeZ = axis === Axis.Z ? Math.min(at, z) : z
            return FacePrimitive.fromLengthAndHeight(matrix, sizeX, sizeZ, false, instance.primitive.materialGenerator)
        } else {
            return FacePrimitive.fromLengthAndHeight(matrix, x, z, false, instance.primitive.materialGenerator)
        }
    }).map((primitive) => ({
        attributes: { ...instance.attributes },
        primitive,
    }))
    return of(createMatrixFromArray(splits, splits.length))
}

function computeMultiSplit(axis: Axis, [instance, ...distances]: Array<any>) {
    const splits = Split(instance.primitive, axis, (matrix, index, x, y, z) => {
        const sizeX = axis === Axis.X && distances[index] != null ? Math.min(distances[index], x) : x
        const sizeZ = axis === Axis.Z && distances[index] != null ? Math.min(distances[index], z) : z

        return FacePrimitive.fromLengthAndHeight(matrix, sizeX, sizeZ, false, instance.primitive.materialGenerator)
    }).map((primitive) => ({
        attributes: { ...instance.attributes },
        primitive,
    }))
    return of(createMatrixFromArray(splits, splits.length))
}

export const operations: Operations = {
    ...defaultOperations,
    translate: (parameters) => (changes) =>
        changes.pipe(operationInterpretion(computeTranslate, (values) => values, [thisParameter, ...parameters])),

    scale: (parameters) => (changes) =>
        changes.pipe(operationInterpretion(computeScale, (values) => values, [thisParameter, ...parameters])),

    rotate: (parameters) => (changes) =>
        changes.pipe(operationInterpretion(computeRotate, (values) => values, [thisParameter, ...parameters])),

    extrude: (parameters) => (changes) =>
        changes.pipe(operationInterpretion(computeExtrude, (values) => values, [thisParameter, ...parameters])),

    splitX: (parameters) => (changes) =>
        changes.pipe(
            operationInterpretion(computeSplit.bind(null, Axis.X), (values) => values, [thisParameter, ...parameters])
        ),
    splitZ: (parameters) => (changes) =>
        changes.pipe(
            operationInterpretion(computeSplit.bind(null, Axis.Z), (values) => values, [thisParameter, ...parameters])
        ),

    multiSplitX: (parameters) => (changes) =>
        changes.pipe(
            operationInterpretion(computeMultiSplit.bind(null, Axis.X), (values) => values, [
                thisParameter,
                ...parameters,
            ])
        ),

    multiSplitZ: (parameters) => (changes) =>
        changes.pipe(
            operationInterpretion(computeMultiSplit.bind(null, Axis.Z), (values) => values, [
                thisParameter,
                ...parameters,
            ])
        ),

    points: (parameters) => (changes) =>
        changes.pipe(
            operationInterpretion(computeComponents.bind(null, "points"), (values) => values, [
                thisParameter,
                ...parameters,
            ])
        ),
    lines: (parameters) => (changes) =>
        changes.pipe(
            operationInterpretion(computeComponents.bind(null, "lines"), (values) => values, [
                thisParameter,
                ...parameters,
            ])
        ),
    faces: (parameters) => (changes) =>
        changes.pipe(
            operationInterpretion(computeComponents.bind(null, "faces"), (values) => values, [
                thisParameter,
                ...parameters,
            ])
        ),

    color: (parameters) => (changes) =>
        changes.pipe(operationInterpretion(computeColorChange, (values) => values, [thisParameter, ...parameters])),

    size: (parameters) => (matrix) =>
        matrix.pipe(operationInterpretion(computeSize, (values) => values, [thisParameter, ...parameters])),
}
