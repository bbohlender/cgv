//https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/16/33196/22545.mvt?access_token=pk.eyJ1IjoiZ2V0dGlucWRvd24iLCJhIjoiY2t2NXVnMXY2MTl4cDJ1czNhd3AwNW9rMCJ9.k8Dv277a0znf4LE_Pkcl3Q

//@ts-ignore
import { VectorTile } from "vector-tile"
import Protobuf from "pbf"

export async function loadLayers(): Promise<{
    [Layer in string]: Array<{
        properties: any
        geometry: Array<Array<{ x: number; y: number }>>
    }>
}> {
    const response = await fetch("/22545.mvt")
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
