import { parse, interprete, MatrixEntry } from "cgv"
import { FacePrimitive, Primitive } from "co-3gen"
import { useMemo, useState } from "react"
import { Matrix4, Plane, Vector3 } from "three"
import { Layers, loadLayers } from "./api"
import { cloneInstance, Instance, operations } from "cgv/domains/shape"
import { BehaviorSubject, from, map, Observable, shareReplay } from "rxjs"

const roadParameters = {
    layer: "road",
}
const buildingParameters = {
    layer: "building",
}

export function useResult(text: string) {
    const [subjects, setSubjects] = useState<Array<BehaviorSubject<any>> | undefined>()

    const changes = useMemo(
        () =>
            from(loadLayers()).pipe(
                map((layers) => {
                    const primitives = layersToPrimitives(layers)
                    const parameterSubjects = primitives.map(() => new BehaviorSubject<any>({}))
                    setSubjects((subjects) => {
                        subjects?.forEach((subject) => subject.complete())
                        return parameterSubjects
                    })
                    const changes = primitives.map<MatrixEntry<Observable<Instance>>>((primitive, i) => ({
                        index: [i],
                        value: parameterSubjects[i].pipe(
                            map((parameters) => ({
                                id: `${i}`,
                                parameters: {
                                    ...buildingParameters,
                                    ...parameters,
                                },
                                attributes: {},
                                primitive,
                                children: [],
                            }))
                        ),
                    }))
                    return changes
                }),
                shareReplay({ bufferSize: 1, refCount: false }) //TODO: unsubscribe when the component is destroyed
            ),
        []
    )
    const [instances, error] = useMemo(() => {
        try {
            const grammar = parse(text)
            return [interprete(changes, grammar, operations, cloneInstance), undefined] as const
        } catch (error: any) {
            return [undefined, error.message] as const
        }
    }, [text])

    return [instances, error, subjects] as const
}

function layersToPrimitives(layers: Layers): Array<Primitive> {
    let roadId = 0
    let buildingId = 0
    /*const instances =
        layers["road"] //building
        .filter((feature) => feature.properties.class === "street")
        .map((feature) =>
            feature.geometry.map((geoemtry) => ({
                attributes: {},
                parameters: roadParameters,
                primitive: new CombinedPrimitive(
                    new Matrix4(),
                    geoemtry.slice(0, -1).map((p1, i) => {
                        const p2 = geoemtry[(i + 1) % geoemtry.length]
                        return LinePrimitive.fromPoints(
                            new Matrix4(),
                            new Vector3(p1.x, 0, p1.y),
                            new Vector3(p2.x, 0, p2.y)
                        )
                    })
                ),
                children: [],
                id: `root/road/${roadId++}`,
                parent: base,
            }))
        )
        .reduce<Array<Instance>>((v1, v2) => v1.concat(v2), [])
        .concat(*/
    return layers["building"]
        .map((value) =>
            value.geometry.map((lot) =>
                FacePrimitive.fromPointsOnPlane(
                    new Matrix4(),
                    new Plane(new Vector3(0, 1, 0)),
                    lot.map(({ x, y }) => new Vector3(x, 0, y))
                )
            )
        )
        .reduce((v1, v2) => v1.concat(v2), [])
}
