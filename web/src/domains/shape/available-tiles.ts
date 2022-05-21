type Tile = { zoom: number; x: number; y: number }

const availableTiles: Array<Tile> = [
    ...generateTileRange(77188, 98509, 77198, 98516, 18), //new york
    ...generateTileRange(137374, 88769, 137385, 88778, 18), //frankfurt
]

const availableTileSet = new Set(availableTiles.map(({ x, y, zoom }) => `${zoom}/${x}/${y}`))

function tileIsAvailable(zoom: number, x: number, y: number): boolean {
    return availableTileSet.has(`${zoom}/${x}/${y}`)
}

function generateTileRange(minX: number, minY: number, maxX: number, maxY: number, zoom: number): Array<Tile> {
    const distanceX = maxX + 1 - minX
    const distanceY = maxY + 1 - minY
    return new Array(distanceX * distanceY).fill(undefined).map((_, i) => {
        const x = minX + Math.floor(i / distanceY)
        const y = minY + (i % distanceY)
        return {
            x,
            y,
            zoom,
        }
    })
}

export function getTileUrl(zoom: number, x: number, y: number, format: "png" | "mvt"): string | undefined {
    if (!tileIsAvailable(zoom, x, y)) {
        return undefined
    }
    return `/cgv/tiles/_${zoom}-${x}-${y}.${format}`
}

export function getTilePath(zoom: number, x: number, y: number, format: "png" | "mvt") {
    return `./public/tiles/_${zoom}-${x}-${y}.${format}`
}

export default availableTiles
