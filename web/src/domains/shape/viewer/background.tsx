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
