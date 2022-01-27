import { parse, interprete, MatrixEntry, InterpretionValue, Parameters } from "cgv"
import { CombinedPrimitive, FacePrimitive, LinePrimitive, Primitive } from "co-3gen"
import { useMemo } from "react"
import { Matrix4, Plane, Vector3 } from "three"
import { Layers, loadLayers } from "./api"
import { cloneInstance, Instance, operations } from "cgv/domains/shape"
import { from, map, Observable, of, shareReplay } from "rxjs"

const roadParameters: Parameters = {
    layer: of("road"),
}
const buildingParameters: Parameters = {
    layer: of("building"),
}

export function useResult(text: string) {
    const changes = useMemo(
        () =>
            from(loadLayers()).pipe(
                shareReplay({ bufferSize: 1, refCount: true }),
                map((layers) => {
                    const roads = getRoads(layers)
                    const buildings = getBuildings(layers)
                    const changes = [...roads, ...buildings].map<MatrixEntry<Observable<InterpretionValue<Instance>>>>(
                        ([primitive, parameters], i) => ({
                            index: [i],
                            value: of({
                                terminated: false,
                                eventDepthMap: {},
                                parameters,
                                value: {
                                    path: [i],
                                    attributes: {},
                                    primitive,
                                },
                            }),
                        })
                    )
                    return changes
                })
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

    return [instances, error] as const
}

function getBuildings(layers: Layers): Array<[Primitive, Parameters]> {
    return layers["building"].reduce<Array<[Primitive, Parameters]>>(
        (prev, feature) =>
            prev.concat(
                feature.geometry.map<[Primitive, Parameters]>((lot) => [
                    FacePrimitive.fromPointsOnPlane(
                        new Matrix4(),
                        new Plane(new Vector3(0, 1, 0)),
                        lot.map(({ x, y }) => new Vector3(x, 0, y))
                    ),
                    buildingParameters,
                ])
            ),
        []
    )
}

function getRoads(layers: Layers): Array<[Primitive, Parameters]> {
    return layers["road"]
        .filter((feature) => feature.properties.class === "street")
        .reduce<Array<[Primitive, Parameters]>>(
            (prev, feature) =>
                prev.concat(
                    feature.geometry.map((geoemtry) => [
                        new CombinedPrimitive(
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
                        roadParameters,
                    ])
                ),
            []
        )
}
