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
import { from, map, Observable, of, tap } from "rxjs"
import { Plane } from "three"
import { GLTFLoader, DRACOLoader, GLTF } from "three-stdlib"
import { Attribute, AttributeType, Instance } from "."
import {
    EventDepthMap,
    InterpretionValue,
    MatrixEntriesObservable,
    MatrixEntry,
    maxEventDepth,
    operation,
    Operation,
    Operations,
    staticMatrix,
} from "../.."
import { cache } from "../../cache"
import { ObjectPrimitive } from "./object-primitive"

/*export function equal(): Array<any> {

}*/

const switchType: Operation<Instance> = (values) => {
    //TODO
}

function computeAttribute(values: Array<InterpretionValue<any>>) {
    const eventDepthMap = parameterMaxDepthMap(values)
    const [instance, name, min, max, type] = values
    const attribute: Attribute = {
        type: type.value === "float" ? AttributeType.Float : AttributeType.Int,
        min: min.value,
        max: max.value,
        generateRandomValue:
            type.value === "float"
                ? () => min.value + Math.random() * (max.value - min.value)
                : () => min.value + Math.floor(Math.random() * (1 + max.value - min.value)),
    }
    setAttribute(instance.value, name.value, attribute)
    const split = instance.value.id.split("/")
    let path: string | undefined = undefined
    for (let i = 0; i < split.length; i++) {
        path = (path == null ? "" : path + "/") + split[i]
        const value = instance.value.parameters[`${path}/${name}`]
        if (value != null) {
            return value
        }
    }
    return of([
        {
            eventDepthMap,
            value: attribute.generateRandomValue(),
        },
    ])
}

function setAttribute(instance: Instance, name: string, attribute: Attribute): void {
    instance.attributes[name] = attribute
    if (instance.parent != null) {
        setAttribute(instance.parent, name, attribute)
    }
}

function boolean3DOp(
    op: "union" | "intersect" | "subtract",
    input: Array<InterpretionValue<Instance>>
): Observable<Array<InterpretionValue<Instance>>> {
    if (input.length === 0) {
        return of([])
    }
    const eventDepthMap = parameterMaxDepthMap(input)
    return of([
        {
            eventDepthMap,
            terminated: false,
            value: instanceChangePrimitive(
                input
                    .slice(1)
                    .reduce((prev, current) => boolean3d(op, prev, current.value.primitive), input[0].value.primitive),
                input[0].value
            ),
        },
    ])
}

function boolean2DOp(
    op: "union" | "intersect" | "subtract",
    input: Array<InterpretionValue<Instance>>
): Observable<Array<InterpretionValue<Instance>>> {
    if (input.length === 0) {
        return of([])
    }
    const eventDepthMap = parameterMaxDepthMap(input)
    return of([
        {
            terminated: false,
            value: instanceChangePrimitive(
                boolean2d(op, input[0].value.primitive, ...input.slice(1).map((value) => value.value.primitive)),
                input[0].value
            ),
            eventDepthMap,
        },
    ])
}

function computeConnect(values: Array<InterpretionValue<any>>) {
    const eventDepthMap = parameterMaxDepthMap(values)
    const [i1, i2] = values
    const value = instanceChangePrimitive(connect3Gen(i1.value.primitive, i2.value.primitive), i1.value)
    return of([
        {
            terminated: false,
            eventDepthMap,
            value,
        },
    ])
}

const computeUnion3d = boolean3DOp.bind(null, "union")
const computeIntersect3d = boolean3DOp.bind(null, "intersect")
const computeSubtract3d = boolean3DOp.bind(null, "subtract")

const computeUnion2d = boolean2DOp.bind(null, "union")
const computeIntersect2d = boolean2DOp.bind(null, "intersect")
const computeSubtract2d = boolean2DOp.bind(null, "subtract")

function computeExpand2d(values: Array<InterpretionValue<any>>) {
    const eventDepthMap = parameterMaxDepthMap(values)
    const [instance, delta] = values
    return of([
        {
            terminated: false,
            eventDepthMap,
            value: instanceChangePrimitive(
                expand(instance.value.primitive, new Plane(YAXIS), delta.value),
                instance.value
            ),
        },
    ])
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
                                  terminated: value.terminated,
                                  eventDepthMap: value.eventDepthMap,
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

function computeTranslate(values: Array<InterpretionValue<any>>) {
    const eventDepthMap = parameterMaxDepthMap(values)
    const [instance, x, y, z] = values
    return of([
        {
            terminated: false,
            value: instanceChangePrimitive(
                instance.value.primitive.applyMatrix(makeTranslationMatrix(x.value, y.value, z.value)),
                instance.value
            ),
            eventDepthMap,
        },
    ])
}

function computeRotate(values: Array<InterpretionValue<any>>) {
    const eventDepthMap = parameterMaxDepthMap(values)
    const [instance, ...euler] = values
    return of([
        {
            terminated: false,
            eventDepthMap,
            value: instanceChangePrimitive(
                instance.value.primitive.applyMatrix(
                    makeRotationMatrix(...(euler.map((a) => (a.value / 180) * Math.PI) as [number, number, number]))
                ),
                instance.value
            ),
        },
    ])
}

function computeScale(values: Array<InterpretionValue<any>>) {
    const eventDepthMap = parameterMaxDepthMap(values)
    const [instance, x, y, z] = values
    return of([
        {
            terminated: false,
            eventDepthMap,
            value: instanceChangePrimitive(
                instance.value.primitive.applyMatrix(makeScaleMatrix(x.value, y.value, z.value)),
                instance.value
            ),
        },
    ])
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
function computeReplace([instance, url]: Array<InterpretionValue<any>>) {
    return of(url.value).pipe(
        cache((url) => [url], computeLoad),
        map((gltf) => {
            const clone = gltf.scene.clone(true)
            instance.value.primitive.getPoint(0, clone.position)
            clone.scale.set(500, 500, 500) //TODO: remove - just for testing
            return [
                {
                    terminated: false,
                    eventDepthMap: maxEventDepth(url.eventDepthMap, instance.eventDepthMap),
                    value: instanceChangePrimitive(new ObjectPrimitive(clone), instance.value),
                },
            ]
        })
    )
}

function parameterMaxDepthMap(values: Array<InterpretionValue<any>>): EventDepthMap {
    return maxEventDepth(...values.map(({ eventDepthMap }) => eventDepthMap))
}

function computeSample2d([instance, amount]: Array<InterpretionValue<any>>) {
    const eventDepthMap = maxEventDepth(instance.eventDepthMap, amount.eventDepthMap)
    return of(
        new Array(amount.value as any).fill(null).map(() => ({
            terminated: false,
            eventDepthMap,
            value: {
                //TODO
                id: "",
                attributes: instance.value.attributes,
                children: [],
                parameters: {},
                primitive: sample2d3Gen(instance.value.primitive),
            },
        }))
    )
}

//TODO: fix draco loader wasm error (=> redo push with .gitattributes fixed)

export const operations: Operations<Instance> = {
    sample2d: (changes) =>
        changes.pipe(operation(computeSample2d, ([instance, amount]) => [instance.value, amount.value], undefined, 2)),
    replace: (changes) =>
        changes.pipe(operation(computeReplace, ([instance, url]) => [instance.value, url.value], undefined, 2)),
    connect: (changes) =>
        changes.pipe(operation(computeConnect, ([i1, i2]) => [i1.value, i2.value], undefined, 2, undefined)),
    points: components.bind(null, ComponentType.Point),
    lines: components.bind(null, ComponentType.Line),
    faces: components.bind(null, ComponentType.Face),
    union3d: (changes) => changes.pipe(operation(computeUnion3d, (values) => values.map(({ value }) => value))),
    subtract3d: (changes) => changes.pipe(operation(computeSubtract3d, (values) => values.map(({ value }) => value))),
    intersect3d: (changes) => changes.pipe(operation(computeIntersect3d, (values) => values.map(({ value }) => value))),
    union2d: (changes) => changes.pipe(operation(computeUnion2d, (values) => values.map(({ value }) => value))),
    subtract2d: (changes) => changes.pipe(operation(computeSubtract2d, (values) => values.map(({ value }) => value))),
    intersect2d: (changes) => changes.pipe(operation(computeIntersect2d, (values) => values.map(({ value }) => value))),
    translate: (changes) =>
        changes.pipe(
            operation(
                computeTranslate,
                ([instance, x, y, z]) => [instance.value, x.value, y.value, z.value],
                undefined,
                4
            )
        ),
    rotate: (changes) =>
        changes.pipe(
            operation(computeRotate, ([instance, x, y, z]) => [instance.value, x.value, y.value, z.value], undefined, 4)
        ),
    scale: (changes) =>
        changes.pipe(
            operation(computeScale, ([instance, x, y, z]) => [instance.value, x.value, y.value, z.value], undefined, 4)
        ),
    attribute: (changes) =>
        changes.pipe(
            operation(
                computeAttribute,
                ([instance, name, min, max, type]) => [instance.value, name.value, min.value, max.value, type.value],
                undefined,
                5
            )
        ),
    expand2d: (changes) =>
        changes.pipe(operation(computeExpand2d, ([instance, delta]) => [instance.value, delta.value], undefined, 2)),
    switchType,
    terminateRandomly,
}
