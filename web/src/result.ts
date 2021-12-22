import { parse, derive } from "cgv"
import { Primitive, CombinedPrimitive, LinePrimitive, FacePrimitive } from "co-3gen"
import { useState, useEffect, useMemo } from "react"
import { Matrix4, Plane, Vector3 } from "three"
import { Layers, loadLayers } from "./api"
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
    filter,
    isBuilding,
    isRoad,
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
    filter,
    isRoad,
    isBuilding,
}

export function useResult(
    parameters: InstanceParameters,
    text: string
): [Array<Instance> | undefined, Instance | undefined, string | undefined] {
    const [layers, setLayers] = useState<Layers | undefined>(undefined)
    useEffect(() => void loadLayers().then(setLayers), [])

    const [definition, parseError] = useMemo(() => {
        try {
            return [parse(text), undefined]
        } catch (error: any) {
            return [undefined, error.message]
        }
    }, [text])

    const [result, base, derivationError] = useMemo(() => {
        if (layers == null || definition == null) {
            return [undefined, undefined, undefined]
        } else {
            const base: Instance = {
                children: [],
                id: "root",
                attributes: {},
                parameters,
                primitive: new CombinedPrimitive(new Matrix4(), []),
            }
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
            const instances = layers["road"] //building
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
                .concat(
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
                )
            base.children.push(...instances)
            try {
                const values = derive(instances, definition, shapeOperations, cloneInstance)
                return [values, base, undefined]
            } catch (error: any) {
                return [undefined, undefined, error.message]
            }
        }
    }, [definition, layers, parameters])

    return useMemo(() => [result, base, parseError ?? derivationError], [result, base, parseError, derivationError])
}
