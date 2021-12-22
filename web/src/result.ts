import { parse, derive } from "cgv"
import { Primitive, CombinedPrimitive, LinePrimitive, FacePrimitive } from "co-3gen"
import { useState, useEffect, useMemo } from "react"
import { Matrix4, Plane, Vector3 } from "three"
import { loadLayers } from "./api"
import {
    connect,
    points,
    faces,
    lines,
    union3d,
    subtract3d,
    intersect3d,
    translate,
    rotate,
    scale,
    sample2d,
    attribute,
    Instance,
    InstanceParameters,
    expand2d,
    intersect2d,
    subtract2d,
    union2d,
    cloneInstance,
} from "cgv/domains/shape"

const shapeOperations = {
    connect,
    points,
    faces,
    lines,
    union3d,
    subtract3d,
    intersect3d,
    union2d,
    subtract2d,
    intersect2d,
    translate,
    rotate,
    scale,
    sample2d,
    attribute,
    expand2d,
}

export function useResult(
    parameters: InstanceParameters,
    text: string
): [Array<Instance> | undefined, Instance | undefined, string | undefined] {
    const [lotPrimitives, setLotPrimitives] = useState<Array<Primitive> | undefined>(undefined)
    useEffect(
        () =>
            void loadLayers().then((layers) => {
                setLotPrimitives(
                    layers["road"] //building
                        .filter((feature) => feature.properties.class === "street")
                        .map((feature) => {
                            return feature.geometry.map(
                                (geoemtry) =>
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
                                    )
                            )
                        })
                        .reduce<Array<Primitive>>((v1, v2) => v1.concat(v2), [])
                        .concat(
                            layers["building"]
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
                        )
                )
            }),
        []
    )

    const [definition, parseError] = useMemo(() => {
        try {
            return [parse(text), undefined]
        } catch (error: any) {
            return [undefined, error.message]
        }
    }, [text])

    const [result, base, derivationError] = useMemo(() => {
        if (lotPrimitives == null || definition == null) {
            return [undefined, undefined, undefined]
        } else {
            const base: Instance = {
                children: [],
                id: "root",
                attributes: {},
                parameters,
                primitive: new CombinedPrimitive(new Matrix4(), lotPrimitives),
            }
            const instances = lotPrimitives.map<Instance>((primitive, i) => ({
                attributes: {},
                parameters,
                primitive,
                children: [],
                id: `root/${i}`,
                parent: base,
            }))
            base.children.push(...instances)
            try {
                const values = derive(instances, definition, shapeOperations, cloneInstance)
                return [values, base, undefined]
            } catch (error: any) {
                return [undefined, undefined, error.message]
            }
        }
    }, [definition, lotPrimitives, parameters])

    return useMemo(() => [result, base, parseError ?? derivationError], [result, base, parseError, derivationError])
}
