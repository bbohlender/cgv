import { of } from "rxjs"
import { Color, Matrix4, Shape, Vector2, Vector3 } from "three"
import { CombinedPrimitive, createPhongMaterialGenerator, FacePrimitive, LinePrimitive, Primitive } from "."

//https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/16/33196/22545.mvt?access_token=pk.eyJ1IjoiZ2V0dGlucWRvd24iLCJhIjoiY2t2NXVnMXY2MTl4cDJ1czNhd3AwNW9rMCJ9.k8Dv277a0znf4LE_Pkcl3Q

//@ts-ignore
import { VectorTile } from "vector-tile"
import Protobuf from "pbf"
import { MaterialGenerator } from "./primitive"

export type Layers = {
    [Layer in string]: Array<{
        properties: any
        geometry: Array<Array<{ x: number; y: number }>>
    }>
}

export async function loadMap(materialGenerator: MaterialGenerator) {
    const layers = await loadMapLayers()
    const roads = getRoads(layers, materialGenerator)
    const buildings = getBuildings(layers, materialGenerator)
    return [roads, buildings]
}

async function loadMapLayers(): Promise<Layers> {
    const response = await fetch(`/cgv/22545.mvt`)
    const data = await response.arrayBuffer()
    const vectorTile = new VectorTile(new Protobuf(data))
    return Object.entries(vectorTile.layers).reduce((prev, [name, layer]: [string, any]) => {
        return {
            ...prev,
            [name]: new Array(layer.length).fill(null).map((_, i) => {
                const feature = layer.feature(i)
                return {
                    properties: feature.properties,
                    geometry: feature.loadGeometry(),
                }
            }),
        }
    }, {})
}

type Parameters = {
    //TODO
}

const roadParameters: Parameters = {
    layer: of("road"),
}
const buildingParameters: Parameters = {
    layer: of("building"),
}

function getBuildings(layers: Layers, materialGenerator: MaterialGenerator): Array<[Primitive, Parameters]> {
    return layers["building"].reduce<Array<[Primitive, Parameters]>>(
        (prev, feature) =>
            prev.concat(
                feature.geometry.map<[Primitive, Parameters]>((lot) => [
                    new FacePrimitive(
                        new Matrix4(),
                        new Shape(lot.map(({ x, y }) => new Vector2(x, y))),
                        materialGenerator
                    ),
                    buildingParameters,
                ])
            ),
        []
    )
}

function getRoads(layers: Layers, materialGenerator: MaterialGenerator): Array<[Primitive, Parameters]> {
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
                                    new Vector3(p2.x, 0, p2.y),
                                    materialGenerator
                                )
                            })
                        ),
                        roadParameters,
                    ])
                ),
            []
        )
}
