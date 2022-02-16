import { InterpretionValue, Parameters } from "cgv"
import { useMemo } from "react"
import { Color, Matrix4, Shape, Vector2 } from "three"
import { Layers, loadLayers } from "./api"
import { Instance } from "cgv/domains/shape"
import { from, map, NEVER, of, shareReplay } from "rxjs"
import {
    CombinedPrimitive,
    createPhongMaterialGenerator,
    FacePrimitive,
    LinePrimitive,
    Primitive,
} from "cgv/domains/shape/primitive"

const roadParameters: Parameters = {
    layer: of("road"),
}
const buildingParameters: Parameters = {
    layer: of("building"),
}

const redMaterialGenerator = createPhongMaterialGenerator(new Color(0xff0000))

export function useMapbox() {
    return useMemo(
        () =>
            global.window == null
                ? NEVER
                : from(loadLayers()).pipe(
                      shareReplay({ bufferSize: 1, refCount: true }),
                      map((layers) => {
                          const roads = getRoads(layers)
                          const buildings = getBuildings(layers)
                          const matrix = [...roads, ...buildings].map<InterpretionValue<Instance>>(
                              ([primitive, parameters], i) => ({
                                  terminated: false,
                                  eventDepthMap: {},
                                  parameters,
                                  value: {
                                      path: [i],
                                      attributes: {},
                                      primitive,
                                  },
                              })
                          )
                          return matrix
                      })
                  ),
        []
    )
}

function getBuildings(layers: Layers): Array<[Primitive, Parameters]> {
    return layers["building"].reduce<Array<[Primitive, Parameters]>>(
        (prev, feature) =>
            prev.concat(
                feature.geometry.map<[Primitive, Parameters]>((lot) => [
                    new FacePrimitive(
                        new Matrix4(),
                        new Shape(lot.map(({ x, y }) => new Vector2(x, y))),
                        redMaterialGenerator
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
                                    new Vector2(p1.x, p1.y),
                                    new Vector2(p2.x, p2.y),
                                    redMaterialGenerator
                                )
                            })
                        ),
                        roadParameters,
                    ])
                ),
            []
        )
}
