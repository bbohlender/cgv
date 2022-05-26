import { of } from "rxjs"
import { VectorTile, VectorTileLayer } from "@mapbox/vector-tile"
import Protobuf from "pbf"
import { ParsedSteps } from "../../parser"
import { filterNull } from "../../util"

//https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames
export function lon2tile(lon: number, zoom: number) {
    return ((lon + 180) / 360) * Math.pow(2, zoom)
}
export function lat2tile(lat: number, zoom: number) {
    return (
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

/**
 * @example meter = tile * tileMeterRatio(y, zoom)
 */
export function tileMeterRatio(y: number, zoom: number, tilePixelSize = 256): number {
    const lat = tile2lat(y, zoom)
    return ((156543.03 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom)) * tilePixelSize
}

/**
 * @example toX = fromX * tileZoomRatio(fromZoom, toZoom)
 */
export function tileZoomRatio(from: number, to: number): number {
    return Math.pow(2, to) / Math.pow(2, from)
}

export type Layers = {
    [Layer in string]: Array<{
        properties: any
        geometry: Array<Array<{ x: number; y: number }>>
    }>
}

export async function loadMapLayers(url: string, y: number, zoom: number, tilePixelSize = 256): Promise<Layers> {
    const sizeInMeter = /** 1 tile */ tileMeterRatio(y, zoom, tilePixelSize)
    const response = await fetch(url)
    const data = await response.arrayBuffer()
    const vectorTile = new VectorTile(new Protobuf(data))
    return Object.entries(vectorTile.layers).reduce((prev, [name, layer]: [string, VectorTileLayer]) => {
        const meterToIntegerRatio = sizeInMeter / layer.extent
        return {
            ...prev,
            [name]: new Array(layer.length).fill(null).map((_, i) => {
                const feature = layer.feature(i)
                const geometry = feature
                    .loadGeometry()
                    .map((points) => {
                        const polygon = new Array<{ x: number; y: number }>(points.length)
                        for (let i = 0; i < points.length; i++) {
                            const { x, y } = points[i]
                            polygon[i] = {
                                x: x * meterToIntegerRatio,
                                y: y * meterToIntegerRatio,
                            }
                        }
                        return polygon
                    })
                    .filter((points) => points.length > 0)
                return {
                    properties: feature.properties,
                    geometry,
                }
            }),
        }
    }, {} as Layers)
}

export function convertRoadsToSteps(
    layers: Layers,
    suffix: string,
    outside: "exclude" | "clip" | "include",
    extent: number
): Array<{ name: string; step: ParsedSteps }> {
    return layers["road"]
        .filter((feature) => feature.properties.class === "street")
        .map<ParsedSteps | undefined>((feature) => {
            const steps = feature.geometry.reduce<Array<ParsedSteps>>((prev, polygon) => {
                const steps = convertPolygonStreetToSteps(polygon, outside, extent)
                if (steps == null) {
                    return prev
                }
                return prev.concat(steps)
            }, [])
            if (steps.length === 1) {
                return steps[0]
            }
            return {
                type: "parallel",
                children: steps,
            }
        }, [])
        .filter(filterNull)
        .map((step, i) => ({ name: `Road${i + 1}${suffix}`, step }))
}

function convertPolygonStreetToSteps(
    polygon: Layers[string][number]["geometry"][number],
    outside: "exclude" | "clip" | "include",
    extent: number
): Array<ParsedSteps> | undefined {
    const result = polygon
        .slice(0, -1)
        .map<ParsedSteps | undefined>((p1, i) => {
            let p2 = polygon[(i + 1) % polygon.length]

            switch (outside) {
                case "include":
                    //do nothing
                    break
                case "exclude":
                    if (!isInTile(p1.x, p1.y, extent) || !isInTile(p2.x, p2.y, extent)) {
                        return undefined
                    }
                    break
                case "clip":
                    const result = clipLine(p1.x, p1.y, p2.x, p2.y, 0, 0, extent, extent)
                    if (result == null) {
                        return undefined
                    }
                    p1 = result.start
                    p2 = result.end
            }

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
        .filter(filterNull)
    if (result.length === 0) {
        return undefined
    }
    return result
}

function clipLine(
    xStart: number,
    yStart: number,
    xEnd: number,
    yEnd: number,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number
): { start: { x: number; y: number }; end: { x: number; y: number } } | undefined {
    const slope = (yEnd - yStart) / (xEnd - xStart)
    const yOffset = yStart - slope * xStart
    const start = clipPointOnLine(slope, yOffset, xStart, yStart, minX, minY, maxX, maxY)
    const end = clipPointOnLine(slope, yOffset, xEnd, yEnd, minX, minY, maxX, maxY)
    if (start == null || end == null) {
        return undefined
    }
    return {
        start,
        end,
    }
}

function clipPointOnLine(
    slope: number,
    yOffset: number,
    x: number,
    y: number,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number
): { x: number; y: number } | undefined {
    if (pointIsInside(x, y, minX, minY, maxX, maxY)) {
        return { x, y }
    }

    const y1 = clip(y, minY, maxY)
    const x1 = calculateX(y1, slope, yOffset)
    if (pointIsInside(x1, y1, minX, minY, maxX, maxY)) {
        return { x: x1, y: y1 }
    }

    const x2 = clip(x, minX, maxX)
    const y2 = calculateY(x2, slope, yOffset)

    if (pointIsInside(x2, y2, minX, minY, maxX, maxY)) {
        return { x: x2, y: y2 }
    }

    return undefined
}

function calculateX(y: number, slope: number, yOffset: number): number {
    return (y - yOffset) / slope
}

function calculateY(x: number, slope: number, yOffset: number): number {
    return x * slope + yOffset
}

function clip(v: number, min: number, max: number): number {
    return Math.max(Math.min(v, max), min)
}

export function convertLotsToSteps(
    layers: Layers,
    suffix: string,
    outside: "exclude" | "include",
    extent: number
): Array<{ name: string; step: ParsedSteps }> {
    return layers["building"]
        .map<ParsedSteps | undefined>((feature) => {
            const steps = feature.geometry
                .map((polygon) => convertPolygonLotToSteps(polygon, outside, extent))
                .filter(filterNull)
            if (steps.length === 0) {
                return undefined
            }
            return steps.length === 1
                ? steps[0]
                : {
                      type: "parallel",
                      children: steps,
                  }
        })
        .filter(filterNull)
        .map((step, i) => ({ name: `Building${i + 1}${suffix}`, step }))
}

function pointIsInside(x: number, y: number, minX: number, minY: number, maxX: number, maxY: number): boolean {
    return minX <= x && minY <= y && x <= maxX && y <= maxY
}

function isInTile(x: number, y: number, extent: number): boolean {
    return 0 < x && 0 < y && x < extent && y < extent
}

function convertPolygonLotToSteps(
    geometry: Layers[string][number]["geometry"][number],
    outside: "exclude" | "include",
    extent: number
): ParsedSteps | undefined {
    const children = new Array<ParsedSteps>(geometry.length)
    for (let i = 0; i < geometry.length; i++) {
        const { x, y } = geometry[i]
        if (outside === "exclude" && !isInTile(x, y, extent)) {
            return undefined
        }
        children[i] = {
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
        }
    }
    return {
        type: "operation",
        identifier: "face",
        children,
    }
}
