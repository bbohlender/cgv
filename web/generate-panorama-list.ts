import { readdirSync, writeFileSync } from "fs"
import type { Vector3Tuple } from "three"

const searchFolders = ["panoramas/ny", "panoramas/fm"]

const baseFolder = "./public/"

const regex = /.*@(-?\d+.\d+),(-?\d+.\d+).*/

const panorama_height = 1.5

const result: Array<{ url: string; rotationOffset: number; position: Vector3Tuple }> = []

for (const searchFolder of searchFolders) {
    const files = readdirSync(`${baseFolder}${searchFolder}`)
    for (const file of files) {
        const match = regex.exec(file)
        if (match == null) {
            continue
        }
        const lat = parseFloat(match[1])
        const lon = parseFloat(match[2])
        result.push({
            position: [lon, panorama_height, lat],
            rotationOffset: 0,
            url: `/cgv/${searchFolder}/${file}`,
        })
    }
}

writeFileSync("src/domains/shape/panorama-list.json", JSON.stringify(result))