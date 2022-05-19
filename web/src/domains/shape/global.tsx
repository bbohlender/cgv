import { lat2tile, lon2tile, tileMeterRatio } from "cgv/domains/shape"
import { Vector3Tuple } from "three"
import panoramaList from "./panorama-list.json"

/**
 * 1. from: 40.7628862, -73.9894495 (721 9th Ave, New York, NY 10019, Vereinigte Staaten) to 40.7640629, -73.9921892 (W 49 St & 10 Av)
 * 2. from: 50.1157581, 8.6629498 (Feuerbachstraße 25, 60325 Frankfurt am Main) to 50.114883, 8.660569 (Lindenstraße 2, 60325 Frankfurt am Main) and back
 */

export const panoramas: Array<{ url: string; rotationOffset: number; position: Vector3Tuple }> =
    panoramaList /**converting (lon, y <meter>, lat) to (x,y,z) in global tile coordinate system */
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
