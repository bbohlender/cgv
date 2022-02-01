import { debounceTime, filter, map, NEVER, Observable, of, OperatorFunction, switchMap } from "rxjs"
import { Instance } from "."
import {
    defaultParameterIndex,
    getMatrixEntryIndexKey,
    InterpretionValue,
    MatrixEntriesObservable,
    MatrixEntry,
    mergeMatrixOperators,
    nestChanges,
    operation,
    Operations,
    switchGroupMap,
    thisParameter,
    toArray,
    toChanges,
} from "../.."
import { makeRotationMatrix, makeScaleMatrix, makeTranslationMatrix } from "./math"
import { FacePrimitive } from "./primitive"
import { Axis, Split } from "./primitive-utils"

function layerToIndex(layer: string): number {
    return layer === "road" ? 0 : 1
}

export function switchType(
    parameters: Array<
        OperatorFunction<
            Array<MatrixEntry<Observable<InterpretionValue<Instance> | undefined>>>,
            Array<MatrixEntry<Observable<InterpretionValue<Instance> | undefined>>>
        >
    >,
    changes: MatrixEntriesObservable<InterpretionValue<Instance>>
): MatrixEntriesObservable<InterpretionValue<Instance>> {
    if (Array.isArray(parameters) && parameters.length === 2) {
        //TODO: cache, distinctUntilChanged, toChanges?
        return changes.pipe(
            map((changes) =>
                changes.map((change) => ({
                    ...change,
                    value: change.value.pipe(
                        switchMap(
                            (value) =>
                                value?.parameters.layer?.pipe(
                                    map<any, [number, InterpretionValue<Instance>]>((layer) => [
                                        layerToIndex(layer),
                                        value,
                                    ])
                                ) ?? of(undefined)
                        )
                    ),
                }))
            ),
            mergeMatrixOperators(
                parameters.map<
                    OperatorFunction<
                        Array<MatrixEntry<Observable<[number, InterpretionValue<Instance>] | undefined>>>,
                        Array<MatrixEntry<Observable<InterpretionValue<Instance> | undefined>>>
                    >
                >(
                    (parameter, i) => (observable) =>
                        observable.pipe(
                            map((changes) =>
                                changes.map((change) => ({
                                    ...change,
                                    value: change.value.pipe(
                                        map((content) => (content == null || content[0] !== i ? undefined : content[1]))
                                    ),
                                }))
                            ),
                            parameter
                        )
                )
            )
        )
    } else {
        return NEVER
    }
}

export function select(
    parameters: Array<
        OperatorFunction<
            Array<MatrixEntry<Observable<InterpretionValue<any> | undefined>>>,
            Array<MatrixEntry<Observable<InterpretionValue<any> | undefined>>>
        >
    >,
    changes: MatrixEntriesObservable<InterpretionValue<Instance>>
): MatrixEntriesObservable<InterpretionValue<Instance>> {
    //TODO: improve this so we don't have to subscribe to the input
    return changes.pipe(
        mergeMatrixOperators(parameters),
        nestChanges(defaultParameterIndex, 10),
        switchGroupMap(
            (change) =>
                change.value.pipe(
                    filter(filterNull),
                    toArray(10),
                    filter((array) => array.length === 3),
                    map(([instance, from, to]) => [
                        indexIsInRange(change.index, from.value, to.value)
                            ? {
                                  index: trimIndex(change.index, from.value, to.value),
                                  value: of(instance),
                              }
                            : {
                                  index: change.index,
                                  value: of(undefined),
                              },
                    ])
                ),
            getMatrixEntryIndexKey
        )
    )
}

function indexIsInRange(index: Array<number>, from: number, to: number): boolean {
    if (index.length === 0 && from === 0 && to > 0) {
        return true
    }
    const lastEntry = index[index.length - 1]
    return from <= lastEntry && lastEntry < to
}

function trimIndex(index: Array<number>, from: number, to: number): Array<number> {
    if (index.length === 0) {
        return index
    }
    return [...index.slice(0, -1), index[index.length - 1] - from]
}

function filterNull<T>(val: T | undefined): val is T {
    return val != null
}

function computeScale([instance, x, y, z]: Array<any>): Observable<Array<Instance>> {
    return of([
        {
            attributes: { ...instance.attributes },
            primitive: instance.primitive.multiplyMatrix(makeScaleMatrix(x, y, z)),
        },
    ])
}

function degreeToRadians(degree: number): number {
    return (Math.PI * degree) / 180
}

function computeRotate([instance, x, y, z]: Array<any>): Observable<Array<Instance>> {
    return of([
        {
            attributes: { ...instance.attributes },
            primitive: instance.primitive.multiplyMatrix(
                makeRotationMatrix(degreeToRadians(x), degreeToRadians(y), degreeToRadians(z))
            ),
        },
    ])
}

function computeTranslate([instance, x, y, z]: Array<any>): Observable<Array<Instance>> {
    return of([
        {
            attributes: { ...instance.attributes },
            primitive: instance.primitive.multiplyMatrix(makeTranslationMatrix(x, y, z)),
        },
    ])
}

function computeExtrude([instance, by]: Array<any>): Observable<Array<Instance>> {
    return of([{ attributes: { ...instance.attributes }, primitive: instance.primitive.extrude(by) }])
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
                return FacePrimitive.fromLengthAndHeight(matrix, x, size)
            } else {
                return FacePrimitive.fromLengthAndHeight(matrix, x, z)
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
                return FacePrimitive.fromLengthAndHeight(matrix, size, z)
            } else {
                return FacePrimitive.fromLengthAndHeight(matrix, x, z)
            }
        }).map((primitive) => ({
            attributes: { ...instance.attributes },
            primitive,
        }))
    )
}

export const operations: Operations<Instance> = {
    translate: (parameters) => (changes) =>
        changes.pipe(operation(computeTranslate, (values) => values, [thisParameter, ...parameters], undefined, [4])),

    scale: (parameters) => (changes) =>
        changes.pipe(operation(computeScale, (values) => values, [thisParameter, ...parameters], undefined, [4])),

    rotate: (parameters) => (changes) =>
        changes.pipe(operation(computeRotate, (values) => values, [thisParameter, ...parameters], undefined, [4])),

    extrude: (parameters) => (changes) =>
        changes.pipe(operation(computeExtrude, (values) => values, [thisParameter, ...parameters], undefined, [2])),

    splitX: (parameters) => (changes) =>
        changes.pipe(operation(computeSplitX, (values) => values, [thisParameter, ...parameters], undefined, [2, 3])),
    splitZ: (parameters) => (changes) =>
        changes.pipe(operation(computeSplitZ, (values) => values, [thisParameter, ...parameters], undefined, [2, 3])),

    points: (parameters) => (changes) =>
        changes.pipe(operation(computePoints, (values) => values, [thisParameter, ...parameters])),
    lines: (parameters) => (changes) =>
        changes.pipe(operation(computeLines, (values) => values, [thisParameter, ...parameters])),
    faces: (parameters) => (changes) =>
        changes.pipe(operation(computeFaces, (values) => values, [thisParameter, ...parameters])),
    switchType: (parameters) => switchType.bind(null, parameters),
    select: (parameters) => select.bind(null, [thisParameter, ...parameters]),
}
