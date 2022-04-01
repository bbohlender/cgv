import { Plane, useTexture } from "@react-three/drei"
import { useLoader } from "@react-three/fiber"
import { Suspense } from "react"
import { a, FrameValue } from "@react-spring/three"
import { BackSide, SphereBufferGeometry, TextureLoader } from "three"
import { panoramas, useShapeStoreState } from "../global"
import { getCurrentViewState } from "./viewer-state"

const geometry = new SphereBufferGeometry(500, 60, 40)

function PanoramaView({ panoramaIndex, opacity }: { panoramaIndex: number; opacity: FrameValue<number> }) {
    const { url, rotationOffset } = panoramas[panoramaIndex]
    const texture = useTexture(url)
    return (
        <mesh geometry={geometry} rotation-y={rotationOffset}>
            <a.meshBasicMaterial
                depthWrite={false}
                depthTest={true}
                transparent={true}
                opacity={opacity}
                attach="material"
                map={texture}
                side={BackSide}
            />
        </mesh>
    )
}

function TopDownView({ opacity }: { opacity: FrameValue<number> }) {
    const texture = useLoader(TextureLoader, "/cgv/map.jpg")
    return (
        <Plane
            rotation-z={-(Math.PI * 2 * 11.5) / 360}
            scale-y={-1}
            rotation-x={-Math.PI / 2}
            position={[0, -1, 0]}
            args={[100, 100]}>
            <a.meshBasicMaterial
                depthWrite={false}
                depthTest={true}
                transparent={true}
                opacity={opacity}
                map={texture}
            />
        </Plane>
    )
}

export function Background({ s1Current, s1 }: { s1: boolean; s1Current: FrameValue<number> }) {
    const state = useShapeStoreState((s) => getCurrentViewState(s))
    const opacity = s1Current.to((s1Opacity) => (s1 ? s1Opacity : 1 - s1Opacity))

    return (
        <Suspense fallback={null}>
            {state.type === "2d" ? (
                <TopDownView opacity={opacity} />
            ) : (
                <PanoramaView opacity={opacity} panoramaIndex={state.panoramaIndex} />
            )}
        </Suspense>
    )
}
