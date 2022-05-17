import { of } from "rxjs"
import { Color, Matrix4, Shape, Vector2, Vector3 } from "three"
import { CombinedPrimitive, createPhongMaterialGenerator, FacePrimitive, LinePrimitive, Primitive } from "."

//https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames
export function lon2tile(lon: number, zoom: number) {
    return Math.floor(((lon + 180) / 360) * Math.pow(2, zoom))
}
export function lat2tile(lat: number, zoom: number) {
    return Math.floor(
        ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) *
            Math.pow(2, zoom)
    )
}
export function tile2lon(x: number, zoom: number) {
    return (x / Math.pow(2, zoom)) * 360 - 180
}
export function tile2lat(y: number, zoom: number) {
    const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, zoom)
    return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)))
}
export function tileSizeMeters(y: number, zoom: number, tilePixelSize = 256): number {
    const lat = tile2lat(y, zoom)
    return ((156543.03 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom)) * tilePixelSize
}
/*
export function gpsToMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
    // generally used geo measurement function
    var R = 6378.137 // Radius of earth in KM
    var dLat = (lat2 * Math.PI) / 180 - (lat1 * Math.PI) / 180
    var dLon = (lon2 * Math.PI) / 180 - (lon1 * Math.PI) / 180
    var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    var d = R * c
    return d * 1000 // meters
}

export function tileSizeMeters(x: number, y: number, zoom: number): { width: number; height: number } {
    const startLon = tile2lon(x, zoom)
    const startLat = tile2lat(y, zoom)
    const nextLon = tile2lon(x + 1, zoom)
    const nextLat = tile2lat(y + 1, zoom)
    return {
        width: gpsToMeters(startLat, startLon, startLat, nextLon),
        height: gpsToMeters(startLat, startLon, nextLat, startLon),
    }
}*/

import { VectorTile, VectorTileLayer } from "@mapbox/vector-tile"
import Protobuf from "pbf"
import { MaterialGenerator } from "./primitive"
import { ParsedSteps } from "../../parser"

export type Layers = {
    [Layer in string]: Array<{
        properties: any
        geometry: Array<Array<{ x: number; y: number }>>
    }>
}

export async function loadMap(
    x: number,
    y: number,
    zoom: number,
    materialGenerator: MaterialGenerator,
    tilePixelSize = 256
) {
    const layers = await loadMapLayers(x, y, zoom, tilePixelSize)
    const roads = getRoads(layers, materialGenerator)
    const buildings = getBuildings(layers, materialGenerator)
    return [roads, buildings]
}

export function getSatelliteUrl(x: number, y: number, zoom: number): string {
    return `https://api.mapbox.com/v4/mapbox.satellite/${zoom}/${x}/${y}@2x.jpg70?access_token=pk.eyJ1IjoiZ2V0dGlucWRvd24iLCJhIjoiY2t2NXVnMXY2MTl4cDJ1czNhd3AwNW9rMCJ9.k8Dv277a0znf4LE_Pkcl3Q
    `
}

export async function loadMapLayers(x: number, y: number, zoom: number, tilePixelSize = 256): Promise<Layers> {
    const sizeInMeter = tileSizeMeters(y, zoom, tilePixelSize)
    const response =
        await fetch(`https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/${zoom}/${x}/${y}.mvt?access_token=pk.eyJ1IjoiZ2V0dGlucWRvd24iLCJhIjoiY2t2NXVnMXY2MTl4cDJ1czNhd3AwNW9rMCJ9.k8Dv277a0znf4LE_Pkcl3Q
    `)
    const data = await response.arrayBuffer()
    const vectorTile = new VectorTile(new Protobuf(data))
    return Object.entries(vectorTile.layers).reduce((prev, [name, layer]: [string, VectorTileLayer]) => {
        const meterToIntegerRatio = sizeInMeter / layer.extent
        return {
            ...prev,
            [name]: new Array(layer.length).fill(null).map((_, i) => {
                const feature = layer.feature(i)
                return {
                    properties: feature.properties,
                    geometry: feature
                        .loadGeometry()
                        .map((points) =>
                            points.map(({ x, y }) => ({ x: x * meterToIntegerRatio, y: y * meterToIntegerRatio }))
                        ),
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

export function convertRoadsToSteps(layers: Layers, suffix: string): Array<{ name: string; step: ParsedSteps }> {
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
        .map((step, i) => ({ name: `Road${i + 1}${suffix}`, step }))
}

export function convertLotsToSteps(layers: Layers, suffix: string): Array<{ name: string; step: ParsedSteps }> {
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
        .map((step, i) => ({ name: `Building${i + 1}${suffix}`, step }))
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
