import { useLoader } from "@react-three/fiber"
import { getSatelliteUrl, lat2tile, lon2tile, tileSizeMeters } from "cgv/domains/shape"
import { Suspense, useMemo } from "react"
import { tile2lat, tile2lon } from "cgv/domains/shape"
import { DoubleSide, PlaneBufferGeometry, TextureLoader, Vector3Tuple } from "three"
import { FOV, getPosition, useViewerState } from "./state"
import { shallowEqual } from "cgv"

type ViewBounds = [minX: number, minY: number, maxX: number, maxY: number, zoom: number]

function calculateTileViewBounds(lon: number, lat: number, height: number, fov: number, ratio: number): ViewBounds {
    const zoom = 18
    const x = lon2tile(lon, zoom)
    const y = lat2tile(lat, zoom)
    return [x, y, x, y, zoom]
}

export function Tiles() {
    const [minX, minY, maxX, maxY, zoom] = useViewerState((state) => {
        const { lat, lon, height } = getPosition(state)
        return calculateTileViewBounds(lon, lat, height, FOV, 1)
    }, shallowEqual)
    const distanceX = maxX + 1 - minX
    const distanceY = maxY + 1 - minY
    return (
        <>
            {new Array(distanceX * distanceY).fill(null).map((_, i) => {
                const x = minX + i / distanceX
                const y = minY + (i % distanceX)
                return <Tile key={`${x}/${y}`} x={x} y={y} zoom={zoom} />
            })}
        </>
    )
}

export function Tile({ x, y, zoom }: { x: number; y: number; zoom: number }) {
    const showGround = useViewerState((state) => state.showBackground && state.viewType === "2d")
    const { position, scale } = useMemo<{ position: Vector3Tuple; scale: Vector3Tuple }>(() => {
        const lat = tile2lat(y, zoom)
        const lon = tile2lon(x, zoom)
        const tileSizeLat = tile2lat(y + 1, zoom) - lat
        const tileSizeLon = tile2lon(x + 1, zoom) - lon
        const sizeMeters = tileSizeMeters(y, zoom)
        const scaleX = tileSizeLon / sizeMeters
        const scaleZ = tileSizeLat / sizeMeters
        return {
            position: [lon, 0, lat],
            scale: [scaleX, 1, scaleZ],
        }
    }, [x, y, zoom])
    return (
        <group scale={scale} position={position}>
            {zoom === 18 && <Descriptions x={x} y={y} />}
            {showGround && (
                <Suspense fallback={null}>
                    <Ground x={x} y={y} zoom={zoom} />
                </Suspense>
            )}
        </group>
    )
}

function Descriptions({ x, y }: { x: number; y: number }) {
    return null
}

function Description({}: { name: string }) {}

function SelectedDescription() {}

function UnselectedDescription() {}

const planeGeometry = new PlaneBufferGeometry(1, 1)
planeGeometry.translate(0.5, -0.5, 0)
planeGeometry.rotateX(-Math.PI / 2)

function Ground({ x, y, zoom }: { x: number; y: number; zoom: number }) {
    const texture = useLoader(TextureLoader, getSatelliteUrl(x, y, zoom))
    const sizeInMeter = tileSizeMeters(y, zoom)
    return (
        <mesh scale={[sizeInMeter, 1, sizeInMeter]} geometry={planeGeometry} renderOrder={-1} position={[0, 0, 0]}>
            <meshBasicMaterial side={DoubleSide} depthWrite={false} depthTest={false} map={texture} />
        </mesh>
    )
}
