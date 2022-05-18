import { lat2tile, lon2tile, tileMeterRatio } from "cgv/domains/shape"
import { Vector3Tuple } from "three"

export const panoramas: Array<{ url: string; rotationOffset: number; position: Vector3Tuple }> = [
    {
        position: [0, 20, 0],
        url: "/cgv/panorama-1.jpg",
        rotationOffset: 0,
    },
    {
        position: [-63.56732023711336, 20, -73.41277377555825],
        url: "/cgv/panorama-2.jpg",
        rotationOffset: Math.PI / 2,
    },
    {
        position: [-63.57632544002161, 20, 88.17223061904349],
        url: "/cgv/panorama-3.jpg",
        rotationOffset: Math.PI / 2,
    },
    {
        position: [-126.85182954572484, 20, -9.930769947840974],
        url: "/cgv/panorama-4.jpg",
        rotationOffset: 0,
    },
] /**converting (lat, y <meter>, lat) to (x,y,z) in global tile coordinate system */
    .map((panorama) => {
        const x = lon2tile(panorama.position[0], 0)
        const z = lat2tile(panorama.position[2], 0)
        const ratio = tileMeterRatio(0, 0)
        const y = panorama.position[1] / ratio /* tile = meter / ratio */
        return {
            ...panorama,
            position: [x, y, z],
        }
    })
