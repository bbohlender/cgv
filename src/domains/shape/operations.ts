import {
    boolean3d,
    ComponentType,
    makeRotationMatrix,
    makeScaleMatrix,
    makeTranslationMatrix,
    connect as connect3Gen,
    sample2d as sample2d3Gen,
    Primitive,
    expand,
    YAXIS,
    boolean2d,
} from "co-3gen"
import { from, map, mergeMap, NEVER, Observable, of, OperatorFunction, switchMap } from "rxjs"
import { Plane } from "three"
import { GLTFLoader, DRACOLoader, GLTF } from "three-stdlib"
import { Attribute, AttributeType, Instance } from "."
import {
    ArrayOrSingle,
    debounceBufferTime,
    getMatrixEntryIndexKey,
    InterpretionValue,
    MatrixEntriesObservable,
    MatrixEntry,
    mergeMatrixOperators,
    mergeMatrixOperatorsIV,
    operation,
    Operations,
    switchGroupMap,
} from "../.."
import { cache } from "../../cache"
import { ObjectPrimitive } from "./object-primitive"

/*export function equal(): Array<any> {

}*/

function layerToIndex(layer: string): number {
    return layer === "road" ? 0 : 1
}

export function switchType(
    clone: (value: Instance, index: number) => Instance, //TODO: remove
    parameters: ArrayOrSingle<
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
                ([layer, value], i) =>
                    [layer, { ...value, value: clone(value.value, i) }] as [number, InterpretionValue<Instance>],
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

function computeAttribute([instance, name, min, max, type]: Array<any>): Observable<Array<any>> {
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
    return of([attribute.generateRandomValue()])
}

function setAttribute(instance: Instance, name: string, attribute: Attribute): void {
    instance.attributes[name] = attribute
}

function boolean3DOp(op: "union" | "intersect" | "subtract", input: Array<Instance>): Observable<Array<Instance>> {
    if (input.length === 0) {
        return of([])
    }
    return of([
        instanceChangePrimitive(
            input.slice(1).reduce((prev, current) => boolean3d(op, prev, current.primitive), input[0].primitive),
            input[0]
        ),
    ])
}

function boolean2DOp(op: "union" | "intersect" | "subtract", input: Array<Instance>): Observable<Array<Instance>> {
    return of([
        instanceChangePrimitive(
            boolean2d(op, input[0].primitive, ...input.slice(1).map((value) => value.primitive)),
            input[0]
        ),
    ])
}

function computeConnect([i1, i2]: Array<any>): Observable<Array<Instance>> {
    const value = instanceChangePrimitive(connect3Gen(i1.primitive, i2.primitive), i1)
    return of([value])
}

const computeUnion3d = boolean3DOp.bind(null, "union")
const computeIntersect3d = boolean3DOp.bind(null, "intersect")
const computeSubtract3d = boolean3DOp.bind(null, "subtract")

const computeUnion2d = boolean2DOp.bind(null, "union")
const computeIntersect2d = boolean2DOp.bind(null, "intersect")
const computeSubtract2d = boolean2DOp.bind(null, "subtract")

function computeExpand2d([instance, delta]: Array<any>): Observable<Array<Instance>> {
    return of([instanceChangePrimitive(expand(instance.primitive, new Plane(YAXIS), delta), instance)])
}

function components(
    type: number,
    clone: (value: Instance, index: number) => Instance, //TODO: remove
    parameters: ArrayOrSingle<
        OperatorFunction<
            Array<MatrixEntry<Observable<InterpretionValue<Instance> | undefined>>>,
            Array<MatrixEntry<Observable<InterpretionValue<Instance> | undefined>>>
        >
    >,
    changes: MatrixEntriesObservable<InterpretionValue<Instance>>
): MatrixEntriesObservable<InterpretionValue<Instance>> {
    //TODO: cache, distinctUntilChanged, toChanges?
    return changes.pipe(
        mergeMatrixOperatorsIV(clone, parameters),
        map((changes) =>
            changes.map((change) => ({
                index: change.index,
                value: change.value.pipe(
                    map((value) =>
                        value == null
                            ? undefined
                            : {
                                  ...value,
                                  value: instanceChangePrimitive(value.value.primitive.components(type), value.value), //TODO return multiple results (not a combined primitive)
                              }
                    )
                ),
            }))
        )
    )
}

export function terminateRandomly(
    clone: (value: Instance, index: number) => Instance, //TODO: remove
    parameters: ArrayOrSingle<
        OperatorFunction<
            Array<MatrixEntry<Observable<InterpretionValue<Instance> | undefined>>>,
            Array<MatrixEntry<Observable<InterpretionValue<Instance> | undefined>>>
        >
    >,
    changes: MatrixEntriesObservable<InterpretionValue<Instance>>
): MatrixEntriesObservable<InterpretionValue<Instance>> {
    //TODO: cache, distinctUntilChanged, toChanges?
    return changes.pipe(
        mergeMatrixOperatorsIV(clone, parameters),
        map((changes) =>
            changes.map((change) => ({
                index: change.index,
                value: change.value.pipe(
                    map((value) => {
                        const terminated = Math.random() > 0.5
                        return value == null
                            ? undefined
                            : {
                                  ...value,
                                  terminated,
                              }
                    })
                ),
            }))
        )
    )
}

function computeTranslate([instance, x, y, z]: Array<any>): Observable<Array<Instance>> {
    return of([instanceChangePrimitive(instance.primitive.applyMatrix(makeTranslationMatrix(x, y, z)), instance)])
}

function computeRotate([instance, ...euler]: Array<any>): Observable<Array<Instance>> {
    return of([
        instanceChangePrimitive(
            instance.primitive.applyMatrix(
                makeRotationMatrix(...(euler.map((a) => (a / 180) * Math.PI) as [number, number, number]))
            ),
            instance
        ),
    ])
}

function computeScale([instance, x, y, z]: Array<any>): Observable<Array<Instance>> {
    return of([instanceChangePrimitive(instance.primitive.applyMatrix(makeScaleMatrix(x, y, z)), instance)])
}

function instanceChangePrimitive(primitive: Primitive, instance: Instance): Instance {
    instance.primitive = primitive
    return instance
}

const loader = new GLTFLoader()
loader.setDRACOLoader(new DRACOLoader())

function computeLoad(url: string): Observable<GLTF> {
    return from(loader.loadAsync(url))
}

//TODO: currently not good, since the we can't rotate/scale the object at it's origin because the object's position is changed here
function computeReplace([instance, url]: Array<any>): Observable<Array<Instance>> {
    return of(url).pipe(
        cache((url) => [url], computeLoad),
        map((gltf) => {
            if (instance.primitive.pointAmount <= 0) {
                return []
            }
            const clone = gltf.scene.clone(true)
            instance.primitive.getPoint(0, clone.position)
            clone.scale.set(200, 200, 200) //TODO: remove - just for testing
            return [instanceChangePrimitive(new ObjectPrimitive(clone), instance)]
        })
    )
}

function computeSample2d([instance, amount]: Array<any>): Observable<Array<Instance>> {
    return of(
        new Array(amount as any).fill(null).map((_, i) => ({
            path: [...instance.path, i],
            attributes: { ...instance.attributes },
            primitive: sample2d3Gen(instance.primitive),
        }))
    )
}

//TODO: fix draco loader wasm error (=> redo push with .gitattributes fixed)

export const operations: Operations<Instance> = {
    sample2d: (clone, parameters) => (changes) =>
        changes.pipe(operation(computeSample2d, (values) => values, clone, parameters, undefined, 2)),
    replace: (clone, parameters) => (changes) =>
        changes.pipe(operation(computeReplace, (values) => values, clone, parameters, undefined, 2)),
    connect: (clone, parameters) => (changes) =>
        changes.pipe(operation(computeConnect, (values) => values, clone, parameters, undefined, 2, undefined)),
    points: (clone, parameters) => components.bind(null, ComponentType.Point, clone, parameters),
    lines: (clone, parameters) => components.bind(null, ComponentType.Line, clone, parameters),
    faces: (clone, parameters) => components.bind(null, ComponentType.Face, clone, parameters),
    union3d: (clone, parameters) => (changes) =>
        changes.pipe(operation(computeUnion3d, (values) => values, clone, parameters)),
    subtract3d: (clone, parameters) => (changes) =>
        changes.pipe(operation(computeSubtract3d, (values) => values, clone, parameters)),
    intersect3d: (clone, parameters) => (changes) =>
        changes.pipe(operation(computeIntersect3d, (values) => values, clone, parameters)),
    union2d: (clone, parameters) => (changes) =>
        changes.pipe(operation(computeUnion2d, (values) => values, clone, parameters)),
    subtract2d: (clone, parameters) => (changes) =>
        changes.pipe(operation(computeSubtract2d, (values) => values, clone, parameters)),
    intersect2d: (clone, parameters) => (changes) =>
        changes.pipe(operation(computeIntersect2d, (values) => values, clone, parameters)),
    translate: (clone, parameters) => (changes) =>
        changes.pipe(operation(computeTranslate, (values) => values, clone, parameters, undefined, 4)),
    rotate: (clone, parameters) => (changes) =>
        changes.pipe(operation(computeRotate, (values) => values, clone, parameters, undefined, 4)),
    scale: (clone, parameters) => (changes) =>
        changes.pipe(operation(computeScale, (values) => values, clone, parameters, undefined, 4)),
    attribute: (clone, parameters) => (changes) =>
        changes.pipe(operation(computeAttribute, (values) => values, clone, parameters, undefined, 5)),
    expand2d: (clone, parameters) => (changes) =>
        changes.pipe(operation(computeExpand2d, (values) => values, clone, parameters, undefined, 2)),
    switchType: (clone, parameters) => switchType.bind(null, clone, parameters),
    terminateRandomly: (clone, parameters) => terminateRandomly.bind(null, clone, parameters),
}
