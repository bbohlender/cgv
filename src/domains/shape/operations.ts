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
import { filter, from, map, mergeMap, NEVER, Observable, of, switchMap, tap } from "rxjs"
import { Plane } from "three"
import { GLTFLoader, DRACOLoader, GLTF } from "three-stdlib"
import { Attribute, AttributeType, Instance } from "."
import {
    debounceBufferTime,
    defaultParameterIndex,
    getMatrixEntryIndexKey,
    InterpretionValue,
    MatrixEntriesObservable,
    MatrixEntry,
    nestChanges,
    operation,
    Operation,
    Operations,
    switchGroupMap,
    toArray,
    toChanges,
    toOuterArray,
} from "../.."
import { cache } from "../../cache"
import { ObjectPrimitive } from "./object-primitive"

/*export function equal(): Array<any> {

}*/

function layerToIndex(layer: string): number {
    return layer === "road" ? 0 : 1
}

export function switchType(
    changes: MatrixEntriesObservable<InterpretionValue<Instance>>
): MatrixEntriesObservable<InterpretionValue<Instance>> {
    //TODO: cache, distinctUntilChanged, toChanges?
    return changes.pipe(
        mergeMap((changes) => of(...changes)),
        map((change) => ({
            index: change.index,
            value: change.value.pipe(
                switchMap(
                    (value) =>
                        value?.parameters.layer?.pipe(//TODO: bad implementation
                            map((layer) => (layerToIndex(layer) !== change.index[0] ? undefined : value))
                        ) ?? NEVER
                )
            ),
        })),
        debounceBufferTime(10)
    )
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
    changes: MatrixEntriesObservable<InterpretionValue<Instance>>
): MatrixEntriesObservable<InterpretionValue<Instance>> {
    //TODO: cache, distinctUntilChanged, toChanges?
    return changes.pipe(
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
    changes: MatrixEntriesObservable<InterpretionValue<Instance>>
): MatrixEntriesObservable<InterpretionValue<Instance>> {
    //TODO: cache, distinctUntilChanged, toChanges?
    return changes.pipe(
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
            if(instance.primitive.pointAmount <= 0) {
                return []
            }
            const clone = gltf.scene.clone(true)
            instance.primitive.getPoint(0, clone.position)
            clone.scale.set(500, 500, 500) //TODO: remove - just for testing
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
    sample2d: (changes) => changes.pipe(operation(computeSample2d, (values) => values, undefined, 2)),
    replace: (changes) => changes.pipe(operation(computeReplace, (values) => values, undefined, 2)),
    connect: (changes) => changes.pipe(operation(computeConnect, (values) => values, undefined, 2, undefined)),
    points: components.bind(null, ComponentType.Point),
    lines: components.bind(null, ComponentType.Line),
    faces: components.bind(null, ComponentType.Face),
    union3d: (changes) => changes.pipe(operation(computeUnion3d, (values) => values)),
    subtract3d: (changes) => changes.pipe(operation(computeSubtract3d, (values) => values)),
    intersect3d: (changes) => changes.pipe(operation(computeIntersect3d, (values) => values)),
    union2d: (changes) => changes.pipe(operation(computeUnion2d, (values) => values)),
    subtract2d: (changes) => changes.pipe(operation(computeSubtract2d, (values) => values)),
    intersect2d: (changes) => changes.pipe(operation(computeIntersect2d, (values) => values)),
    translate: (changes) => changes.pipe(operation(computeTranslate, (values) => values, undefined, 4)),
    rotate: (changes) => changes.pipe(operation(computeRotate, (values) => values, undefined, 4)),
    scale: (changes) => changes.pipe(operation(computeScale, (values) => values, undefined, 4)),
    attribute: (changes) => changes.pipe(operation(computeAttribute, (values) => values, undefined, 5)),
    expand2d: (changes) => changes.pipe(operation(computeExpand2d, (values) => values, undefined, 2)),
    switchType,
    terminateRandomly,
}
