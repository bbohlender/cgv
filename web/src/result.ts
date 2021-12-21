import { parse, derive } from "cgv"
import { Primitive, CombinedPrimitive, LinePrimitive } from "co-3gen"
import { useState, useEffect, useMemo } from "react"
import { Matrix4, Vector3 } from "three"
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

function clone(instance: Instance, i: number) {
    const child = {
        parent: instance,
        id: `${instance.id}/${i}`,
        attributes: instance.attributes,
        parameters: instance.parameters,
        primitive: instance.primitive.clone(),
        children: [],
    }
    instance.children.push(child)
    return child
}

export function useResult(
    parameters: InstanceParameters,
    text: string
): [Array<Instance> | undefined, string | undefined] {
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
                        .reduce((v1, v2) => v1.concat(v2), [])
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

    const [result, derivationError] = useMemo(() => {
        if (lotPrimitives == null || definition == null) {
            return [undefined, undefined]
        } else {
            const instances = lotPrimitives.map<Instance>((primitive, i) => ({
                attributes: {},
                parameters,
                primitive,
                children: [],
                id: i.toString(),
            }))
            try {
                const values = derive(instances, definition, shapeOperations, clone)
                return [values, undefined]
            } catch (error: any) {
                return [undefined, error.message]
            }
        }
    }, [definition, lotPrimitives, parameters])

    return useMemo(() => [result, parseError ?? derivationError], [result, parseError, derivationError])
}
