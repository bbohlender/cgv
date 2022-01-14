import { parse, interprete } from "cgv"
import { CombinedPrimitive, LinePrimitive, FacePrimitive } from "co-3gen"
import { useState, useEffect } from "react"
import { Matrix4, Plane, Vector3 } from "three"
import { Layers, loadLayers } from "./api"
import { cloneInstance, Instance, InstanceParameters, operations } from "cgv/domains/shape"
import { from, map } from "rxjs"

export function useResult(
    parameters: InstanceParameters,
    text: string
): [Array<Instance> | undefined, Instance | undefined, string | undefined] {
    const [state, setState] = useState<[Array<Instance> | undefined, Instance | undefined, string | undefined]>([
        undefined,
        undefined,
        undefined,
    ])

    useEffect(() => {
        try {
            const grammar = parse(text)
            setState([undefined, undefined, undefined])

            const subscription = interprete(
                from(loadLayers()).pipe(
                    map((layers) => {
                        const base: Instance = {
                            children: [],
                            id: "root",
                            attributes: {},
                            parameters,
                            primitive: new CombinedPrimitive(new Matrix4(), []),
                        }
                        setState([undefined, base, undefined])
                        return addInstances(base, layers, parameters)
                    })
                ),
                grammar,
                operations,
                cloneInstance
            ).subscribe({
                next: (instances) => setState(([, base]) => [instances, base, undefined]),
                error: (error) => setState([undefined, undefined, error.message]),
            })

            return () => subscription.unsubscribe()
        } catch (error: any) {
            setState([undefined, undefined, error.message])
        }
    }, [text, parameters])

    return state
}

function addInstances(base: Instance, layers: Layers, parameters: InstanceParameters): Array<Instance> {
    const roadParameters = {
        ...parameters,
        layer: "road",
    }
    const buildingParameters = {
        ...parameters,
        layer: "building",
    }
    let roadId = 0
    let buildingId = 0
    const instances =
        /*layers["road"] //building
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
        layers["building"]
            .map((value) =>
                value.geometry.map((lot) => ({
                    attributes: {},
                    parameters: buildingParameters,
                    primitive: FacePrimitive.fromPointsOnPlane(
                        new Matrix4(),
                        new Plane(new Vector3(0, 1, 0)),
                        lot.map(({ x, y }) => new Vector3(x, 0, y))
                    ),
                    children: [],
                    id: `root/building/${buildingId++}`,
                    parent: base,
                }))
            )
            .reduce((v1, v2) => v1.concat(v2), [])
    //)
    base.children.push(...instances)
    return instances
}
