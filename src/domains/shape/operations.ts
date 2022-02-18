import { Observable, of } from "rxjs"
import { Instance } from "."
import { Matrix, operationInterpretion, Operations, thisParameter } from "../.."
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
): Observable<Array<Instance>> {
    return of(
        instances.reduce<Array<Instance>>(
            (instances, instance) => [
                ...instances,
                ...instance.primitive
                    .components(type)
                    .map<Instance>((primitive) => ({ attributes: { ...instance.attributes }, primitive })),
            ],
            []
        )
    )
}

const computePoints = computeComponents.bind(null, "points")
const computeLines = computeComponents.bind(null, "lines")
const computeFaces = computeComponents.bind(null, "faces")

function computeSplitZ([instance, at, limit]: Array<any>): Observable<Array<Instance>> {
    return of(
        Split(instance.primitive, Axis.Z, (matrix, index, x, y, z) => {
            if (limit == null || index < limit) {
                const size = Math.min(at, z)
                return FacePrimitive.fromLengthAndHeight(matrix, x, size, false, instance.primitive.materialGenerator)
            } else {
                return FacePrimitive.fromLengthAndHeight(matrix, x, z, false, instance.primitive.materialGenerator)
            }
        }).map((primitive) => ({
            attributes: { ...instance.attributes },
            primitive,
        }))
    )
}

function computeSplitX([instance, at, limit]: Array<any>): Observable<Array<Instance>> {
    return of(
        Split(instance.primitive, Axis.X, (matrix, index, x, y, z) => {
            if (limit == null || index < limit) {
                const size = Math.min(at, x)
                return FacePrimitive.fromLengthAndHeight(matrix, size, z, false, instance.primitive.materialGenerator)
            } else {
                return FacePrimitive.fromLengthAndHeight(matrix, x, z, false, instance.primitive.materialGenerator)
            }
        }).map((primitive) => ({
            attributes: { ...instance.attributes },
            primitive,
        }))
    )
}

function computeMultiSplitX([instance, ...distances]: Array<any>) {
    return of(
        Split(instance.primitive, Axis.X, (matrix, index, x, y, z) => {
            const size = distances[index]
            if (size != null && x > size) {
                return FacePrimitive.fromLengthAndHeight(matrix, size, z, false, instance.primitive.materialGenerator)
            } else {
                return FacePrimitive.fromLengthAndHeight(matrix, x, z, false, instance.primitive.materialGenerator)
            }
        }).map((primitive) => ({
            attributes: { ...instance.attributes },
            primitive,
        }))
    )
}

function computeMultiSplitZ([instance, ...distances]: Array<any>) {
    return of(
        Split(instance.primitive, Axis.Z, (matrix, index, x, y, z) => {
            const size = distances[index]
            if (size != null && z > size) {
                return FacePrimitive.fromLengthAndHeight(matrix, x, size, false, instance.primitive.materialGenerator)
            } else {
                return FacePrimitive.fromLengthAndHeight(matrix, x, z, false, instance.primitive.materialGenerator)
            }
        }).map((primitive) => ({
            attributes: { ...instance.attributes },
            primitive,
        }))
    )
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
        changes.pipe(operationInterpretion(computeSplitX, (values) => values, [thisParameter, ...parameters])),
    splitZ: (parameters) => (changes) =>
        changes.pipe(operationInterpretion(computeSplitZ, (values) => values, [thisParameter, ...parameters])),

    multiSplitX: (parameters) => (changes) =>
        changes.pipe(operationInterpretion(computeMultiSplitX, (values) => values, [thisParameter, ...parameters])),

    multiSplitZ: (parameters) => (changes) =>
        changes.pipe(operationInterpretion(computeMultiSplitZ, (values) => values, [thisParameter, ...parameters])),

    points: (parameters) => (changes) =>
        changes.pipe(operationInterpretion(computePoints, (values) => values, [thisParameter, ...parameters])),
    lines: (parameters) => (changes) =>
        changes.pipe(operationInterpretion(computeLines, (values) => values, [thisParameter, ...parameters])),
    faces: (parameters) => (changes) =>
        changes.pipe(operationInterpretion(computeFaces, (values) => values, [thisParameter, ...parameters])),

    color: (parameters) => (changes) =>
        changes.pipe(operationInterpretion(computeColorChange, values => values, [thisParameter, ...parameters])),

    size: (parameters) => (matrix) =>
        matrix.pipe(operationInterpretion(computeSize, values => values, [thisParameter, ...parameters])),
}
