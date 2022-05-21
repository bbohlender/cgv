import { createWriteStream } from "fs"
import { get } from "https"
import availableTiles, { getTilePath } from "../src/domains/shape/available-tiles"

function download(filePath: string, url: string) {
    const file = createWriteStream(filePath)
    get(url, (response) => {
        response.pipe(file)
        file.on("finish", () => {
            file.close()
        })
    })
}

const token = "pk.eyJ1IjoiZ2V0dGlucWRvd24iLCJhIjoiY2t2NXVnMXY2MTl4cDJ1czNhd3AwNW9rMCJ9.k8Dv277a0znf4LE_Pkcl3Q"

//raster tiles
for (const { x, y, zoom } of availableTiles) {
    download(
        getTilePath(zoom, x, y, "png"),
        `https://api.mapbox.com/v4/mapbox.satellite/${zoom}/${x}/${y}@2x.jpg70?access_token=${token}`
    )
}

//vector tiles
for (const { x, y, zoom } of availableTiles) {
    download(
        getTilePath(zoom, x, y, "mvt"),
        `https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/${zoom}/${x}/${y}.mvt?access_token=${token}`
    )
}
