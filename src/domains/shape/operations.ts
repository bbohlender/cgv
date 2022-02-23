import { from, map, Observable, of, shareReplay, tap } from "rxjs"
import { Instance, LinePrimitive, loadMap, PointPrimitive } from "."
import {
    createMatrixFromArray,
    InterpretionValue,
    Matrix,
    operation,
    operationInterpretion,
    Operations,
    thisParameter,
} from "../.."
import { makeRotationMatrix, makeScaleMatrix, makeTranslationMatrix } from "./math"
import { createPhongMaterialGenerator, FacePrimitive } from "./primitive"
import { Axis, Split } from "./primitive-utils"
import { operations as defaultOperations } from ".."
import { Color, Matrix4, Shape, Vector2, Vector3 } from "three"

const redMaterialGenerator = createPhongMaterialGenerator(new Color(0xff0000))

function computeMapbox(/*[lat, lon]: ReadonlyArray<any>*/): Observable<Matrix<InterpretionValue<Instance>>> {
    return from(loadMap()).pipe(
        map(([roads, buildings]) => {
            const values = [...roads, ...buildings].map<InterpretionValue<Instance>>(([primitive, parameters], i) => ({
                terminated: false,
                eventDepthMap: {},
                parameters,
                value: {
                    path: [i],
                    attributes: {},
                    primitive,
                },
            }))
            return createMatrixFromArray(values, values.length)
        }),
        shareReplay({ bufferSize: 1, refCount: true })
    )
}

function computePoint([x, y, z]: ReadonlyArray<any>): Observable<Matrix<Instance>> {
    return of({
        attributes: {},
        primitive: new PointPrimitive(makeTranslationMatrix(x, y, z, new Matrix4()), redMaterialGenerator),
    })
}

const helperVector = new Vector3()

//TODO: make capable of 3d (currently only 2d)
function computeFace(points: ReadonlyArray<Instance>): Observable<Matrix<Instance>> {
    const points2d = points.map((point) => {
        helperVector.setFromMatrixPosition(point.primitive.matrix)
        return new Vector2(helperVector.x, helperVector.z)
    })
    console.log(points2d)
    return of({
        attributes: {},
        primitive: new FacePrimitive(
            new Matrix4(),
            new Shape(points2d),
            redMaterialGenerator
        ),
    })
}

//TODO: make capable of 3d (currently only 2d)
function computeLine(points: ReadonlyArray<Instance>): Observable<Matrix<Instance>> {
    const [p1, p2] = points.map((point) => {
        helperVector.setFromMatrixPosition(point.primitive.matrix)
        return new Vector2(helperVector.x, helperVector.z)
    })
    return of({
        attributes: {},
        primitive: LinePrimitive.fromPoints(new Matrix4(), p1, p2, redMaterialGenerator),
    })
}

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

    toPoints: (parameters) => (changes) =>
        changes.pipe(
            operationInterpretion(computeComponents.bind(null, "points"), (values) => values, [
                thisParameter,
                ...parameters,
            ])
        ),
    toLines: (parameters) => (changes) =>
        changes.pipe(
            operationInterpretion(computeComponents.bind(null, "lines"), (values) => values, [
                thisParameter,
                ...parameters,
            ])
        ),
    toFaces: (parameters) => (changes) =>
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

    mapbox: (parameters) => (matrix) => matrix.pipe(operation(computeMapbox, (values) => values, parameters)),

    point: (parameters) => (matrix) => matrix.pipe(operationInterpretion(computePoint, (values) => values, parameters)),
    line: (parameters) => (matrix) => matrix.pipe(operationInterpretion(computeLine, (values) => values, parameters)),
    face: (parameters) => (matrix) => matrix.pipe(operationInterpretion(computeFace, (values) => values, parameters)),
}
