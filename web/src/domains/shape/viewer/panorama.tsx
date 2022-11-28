import { useTexture } from "@react-three/drei"
import { Suspense } from "react"
import { DoubleSide, SphereGeometry } from "three"
import { panoramas } from "../global"
import { getBackgroundOpacity, useViewerState } from "./state"

const geometry = new SphereGeometry(500, 60, 40)

export function PanoramaView() {
    const panoramaIndex = useViewerState(({ viewType, panoramaIndex }) =>
        viewType === "panorama" ? panoramaIndex : undefined
    )
    const visualType = useViewerState((state) => (state.viewType === "panorama" ? state.visualType : 0))
    const opacity = getBackgroundOpacity(visualType)
    const panorama = panoramaIndex != null ? panoramas[panoramaIndex] : undefined
    if (panorama == null || opacity === 0) {
        return null
    }
    return (
        <Suspense fallback={null}>
            <Dome url={panorama.url} rotationOffset={(panorama.rotationOffset / 180) * Math.PI} />
        </Suspense>
    )
}

function Dome({ url, rotationOffset }: { url: string; rotationOffset: number }) {
    const texture = useTexture(url)
    return (
        <mesh scale={[1, 1, -1]} geometry={geometry} rotation-y={rotationOffset}>
            {<meshBasicMaterial depthWrite={false} depthTest={false} map={texture} side={DoubleSide} />}
        </mesh>
    )
}
/**<mesh
            scale={[1, 1, -1]}
            geometry={geometry}
            rotation-z={(-1 / 180) * Math.PI}
            rotation-x={(0 / 180) * Math.PI}
            rotation-y={rotationOffset+(
                3 / 180) * Math.PI}>
            {<meshBasicMaterial depthWrite={false} depthTest={false} map={texture} side={DoubleSide} />}
        </mesh> */
