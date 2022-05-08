import { Plane, useTexture } from "@react-three/drei"
import { useLoader } from "@react-three/fiber"
import { Suspense } from "react"
import { a } from "@react-spring/three"
import { BackSide, DoubleSide, PlaneBufferGeometry, SphereBufferGeometry, TextureLoader } from "three"
import { panoramas } from "../global"
import { useViewerState } from "./state"
import { getSatelliteUrl } from "cgv/domains/shape"

const geometry = new SphereBufferGeometry(500, 60, 40)

function PanoramaView() {
    const panoramaIndex = useViewerState(({ showBackground, viewType, panoramaIndex }) =>
        showBackground && viewType === "3d" ? panoramaIndex : undefined
    )
    if (panoramaIndex == null) {
        return null
    }
    const { url, rotationOffset } = panoramas[panoramaIndex]
    return (
        <Suspense fallback={null}>
            <Dome url={url} rotationOffset={rotationOffset} />
        </Suspense>
    )
}

function Dome({ url, rotationOffset }: { url: string; rotationOffset: number }) {
    const texture = useTexture(url)
    return (
        <mesh geometry={geometry} rotation-y={rotationOffset}>
            {
                //@ts-ignore
                <a.meshBasicMaterial
                    depthWrite={false}
                    depthTest={true}
                    transparent={true}
                    opacity={1}
                    map={texture}
                    side={BackSide}
                />
            }
        </mesh>
    )
}

function TopDownView() {
    const isTopDown = useViewerState(({ showBackground, viewType }) => showBackground && viewType === "2d")
    if (!isTopDown) {
        return null
    }
    return (
        <Suspense fallback={null}>
            <Ground />
        </Suspense>
    )
}

const planeGeometry = new PlaneBufferGeometry(1000, 1000)
planeGeometry.translate(500, 500, 0)
planeGeometry.scale(1, -1, 1)
planeGeometry.rotateX(-Math.PI / 2)

function Ground() {
    const texture = useLoader(TextureLoader, getSatelliteUrl(18, 50.1159, 8.66318)) //Kettenhofweg 66
    return (
        <mesh geometry={planeGeometry} renderOrder={-1} position={[0, 0, 0]}>
            <a.meshBasicMaterial side={DoubleSide} depthWrite={false} depthTest={false} map={texture} />
        </mesh>
    )
}

export function Background() {
    return (
        <>
            <Suspense fallback={null}>
                <TopDownView />
            </Suspense>
            <PanoramaView />
        </>
    )
}
