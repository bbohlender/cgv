import { of } from "rxjs"
import { Color, Matrix4, Shape, Vector2, Vector3 } from "three"
import { CombinedPrimitive, createPhongMaterialGenerator, FacePrimitive, LinePrimitive, Primitive } from "."

//https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames
function lon2tile(lon: number, zoom: number) {
    return Math.floor(((lon + 180) / 360) * Math.pow(2, zoom))
}
function lat2tile(lat: number, zoom: number) {
    return Math.floor(
        ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) *
            Math.pow(2, zoom)
    )
}

//https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/17/68690/44386.mvt?access_token=pk.eyJ1IjoiZ2V0dGlucWRvd24iLCJhIjoiY2t2NXVnMXY2MTl4cDJ1czNhd3AwNW9rMCJ9.k8Dv277a0znf4LE_Pkcl3Q

//@ts-ignore
import { VectorTile } from "vector-tile"
import Protobuf from "pbf"
import { MaterialGenerator } from "./primitive"
import { ParsedSteps } from "../../parser"

export type Layers = {
    [Layer in string]: Array<{
        properties: any
        geometry: Array<Array<{ x: number; y: number }>>
    }>
}

export async function loadMap(materialGenerator: MaterialGenerator) {
    const layers = await loadMapLayers(18, 50.1159, 8.66318) //Kettenhofweg 66
    const roads = getRoads(layers, materialGenerator)
    const buildings = getBuildings(layers, materialGenerator)
    return [roads, buildings]
}

export function getSatelliteUrl(zoom: number, lat: number, lon: number): string {
    return `https://api.mapbox.com/v4/mapbox.satellite/${zoom}/${lon2tile(lon, zoom)}/${lat2tile(
        lat,
        zoom
    )}.jpg70?access_token=pk.eyJ1IjoiZ2V0dGlucWRvd24iLCJhIjoiY2t2NXVnMXY2MTl4cDJ1czNhd3AwNW9rMCJ9.k8Dv277a0znf4LE_Pkcl3Q
    `
}

export async function loadMapLayers(zoom: number, lat: number, lon: number): Promise<Layers> {
    const response = await fetch(`https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/${zoom}/${lon2tile(
        lon,
        zoom
    )}/${lat2tile(
        lat,
        zoom
    )}.mvt?access_token=pk.eyJ1IjoiZ2V0dGlucWRvd24iLCJhIjoiY2t2NXVnMXY2MTl4cDJ1czNhd3AwNW9rMCJ9.k8Dv277a0znf4LE_Pkcl3Q
    `)
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

export function convertRoadsToSteps(layers: Layers): Array<{ name: string; step: ParsedSteps }> {
    return layers["road"]
        .filter((feature) => feature.properties.class === "street")
        .reduce<Array<ParsedSteps>>(
            (prev, feature) =>
                prev.concat(
                    feature.geometry.reduce<Array<ParsedSteps>>(
                        (prev, geoemtry) =>
                            prev.concat(
                                geoemtry.slice(0, -1).map((p1, i) => {
                                    const p2 = geoemtry[(i + 1) % geoemtry.length]
                                    return {
                                        type: "operation",
                                        identifier: "line",
                                        children: [p1, p2].map(({ x, y }) => ({
                                            type: "operation",
                                            identifier: "point2",
                                            children: [
                                                {
                                                    type: "raw",
                                                    value: x,
                                                },
                                                {
                                                    type: "raw",
                                                    value: y,
                                                },
                                            ],
                                        })),
                                    }
                                })
                            ),
                        []
                    )
                ),
            []
        )
        .map((step, i) => ({ name: `Road${i + 1}`, step }))
}

export function convertLotsToSteps(layers: Layers): Array<{ name: string; step: ParsedSteps }> {
    return layers["building"]
        .reduce<Array<ParsedSteps>>(
            (prev, feature) =>
                prev.concat(
                    feature.geometry.map<ParsedSteps>((lot, i) => ({
                        type: "operation",
                        identifier: "face",
                        children: lot.map(({ x, y }) => ({
                            type: "operation",
                            identifier: "point2",
                            children: [
                                {
                                    type: "raw",
                                    value: x,
                                },
                                {
                                    type: "raw",
                                    value: y,
                                },
                            ],
                        })),
                    }))
                ),
            []
        )
        .map((step, i) => ({ name: `Lot${i + 1}`, step }))
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
