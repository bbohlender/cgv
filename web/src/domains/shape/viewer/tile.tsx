import { useLoader, useThree } from "@react-three/fiber"
import { tileMeterRatio, tileZoomRatio } from "cgv/domains/shape"
import { Suspense, useMemo } from "react"
import { DoubleSide, PlaneBufferGeometry, TextureLoader, Vector3Tuple } from "three"
import { clip, FOV, getPosition, useViewerState } from "./state"
import { shallowEqual } from "cgv"
import { Descriptions } from "./description"
import availableTiles, { getTileUrl } from "../available-tiles"

type ViewBounds = [
    centerX: number,
    centerY: number,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    zoom: number
]

function calculateTileViewBounds(
    xGlobal: number,
    yGlobal: number,
    zGlobal: number,
    fov: number,
    ratio: number
): ViewBounds {
    const zoom = 18
    const globalLocalRatio = tileZoomRatio(0, zoom)
    const topDistance = Math.tan(((fov / 180) * Math.PI) / 2) * yGlobal
    const leftDistance = topDistance * ratio
    const centerX = Math.floor(globalLocalRatio * xGlobal)
    const centerY = Math.floor(globalLocalRatio * zGlobal)
    const globalMinX = clip(xGlobal - leftDistance, 0, 1)
    const globalMaxX = clip(xGlobal + leftDistance, 0, 1)
    const globalMinY = clip(zGlobal - topDistance, 0, 1)
    const globalMaxY = clip(zGlobal + topDistance, 0, 1)
    const minX = Math.floor(globalLocalRatio * globalMinX)
    const minY = Math.floor(globalLocalRatio * globalMinY)
    const maxX = Math.floor(globalLocalRatio * globalMaxX)
    const maxY = Math.floor(globalLocalRatio * globalMaxY)
    return [centerX, centerY, minX, minY, maxX, maxY, zoom]
}

export function Tiles() {
    const { size } = useThree()
    const [centerX, centerY, minX, minY, maxX, maxY, zoom] = useViewerState((state) => {
        const [x, y, z] = getPosition(state)
        return calculateTileViewBounds(x, y, z, FOV, size.width / size.height)
    }, shallowEqual)
    const distanceX = maxX + 1 - minX
    const distanceY = maxY + 1 - minY
    return (
        <>
            {new Array(distanceX * distanceY).fill(null).map((_, i) => {
                const x = minX + Math.floor(i / distanceY)
                const y = minY + (i % distanceY)
                return <Tile highlighted={x === centerX && y === centerY} key={`${x}/${y}`} x={x} y={y} zoom={zoom} />
            })}
        </>
    )
}

export function Tile({ x, y, zoom, highlighted }: { highlighted: boolean; x: number; y: number; zoom: number }) {
    const showGround = useViewerState((state) => state.showBackground && state.viewType === "2d")
    const { position, scale } = useMemo<{ position: Vector3Tuple; scale: number }>(() => {
        const globalLocalRatio = tileZoomRatio(0, zoom)
        const xGlobal = x / globalLocalRatio
        const yGlobal = y / globalLocalRatio
        const tileSizeInMeter = tileMeterRatio(y, zoom)
        const scale = 1 / (tileSizeInMeter * globalLocalRatio)
        return {
            position: [xGlobal, 0, yGlobal],
            scale,
        }
    }, [x, y, zoom])
    const url = getTileUrl(zoom, x, y, "png")
    return (
        <group scale={scale} position={position}>
            {zoom === 18 && <Descriptions x={x} y={y} />}
            {showGround && url != null && (
                <Suspense fallback={null}>
                    <Ground highlighted={highlighted} url={url} y={y} zoom={zoom} />
                </Suspense>
            )}
        </group>
    )
}

const planeGeometry = new PlaneBufferGeometry(1, 1)
planeGeometry.translate(0.5, -0.5, 0)
planeGeometry.rotateX(-Math.PI / 2)

function Ground({ url, y, zoom, highlighted }: { highlighted: boolean; url: string; y: number; zoom: number }) {
    const texture = useLoader(TextureLoader, url)
    const sizeInMeter = /**1 tile */ tileMeterRatio(y, zoom)
    return (
        <mesh scale={[sizeInMeter, 1, sizeInMeter]} geometry={planeGeometry} renderOrder={-1} position={[0, 0, 0]}>
            <meshBasicMaterial
                color={highlighted ? 0xffffff : 0xbbbbbb}
                side={DoubleSide}
                depthWrite={false}
                depthTest={false}
                map={texture}
            />
        </mesh>
    )
}
