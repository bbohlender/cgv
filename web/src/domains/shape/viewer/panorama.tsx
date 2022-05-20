import { useTexture } from "@react-three/drei"
import { Suspense, useEffect, useState } from "react"
import { a } from "@react-spring/three"
import { DoubleSide, SphereBufferGeometry } from "three"
import { panoramas } from "../global"
import { useViewerState } from "./state"

const geometry = new SphereBufferGeometry(500, 60, 40)

const rotationOffsetMap = new Map<string, number>()

export function PanoramaView() {
    const panoramaIndex = useViewerState(({ showBackground, viewType, panoramaIndex }) =>
        showBackground && viewType === "3d" ? panoramaIndex : undefined
    )
    const panorama = panoramaIndex != null ? panoramas[panoramaIndex] : undefined
    const [rotationOffset, setRotationOffset] = useState(0)
    useEffect(() => {
        if (panorama == null) {
            return
        }
        setRotationOffset(rotationOffsetMap.get(panorama.url) ?? panorama.rotationOffset)
        const listener = (e: KeyboardEvent) => {
            if (e.key === "e") {
                setRotationOffset((r) => {
                    const result = r + 1

                    rotationOffsetMap.set(panorama.url, result)
                    console.log(rotationOffsetMap)
                    return result
                })
            }
            if (e.key === "q") {
                setRotationOffset((r) => {
                    const result = r - 1

                    rotationOffsetMap.set(panorama.url, result)
                    console.log(rotationOffsetMap)
                    return result
                })
            }
        }
        window.addEventListener("keydown", listener)
        return () => window.removeEventListener("keydown", listener)
    }, [panorama])
    if (panorama == null) {
        return null
    }
    return (
        <Suspense fallback={null}>
            <Dome url={panorama.url} rotationOffset={(rotationOffset / 180) * Math.PI} />
        </Suspense>
    )
}

function Dome({ url, rotationOffset }: { url: string; rotationOffset: number }) {
    const texture = useTexture(url)
    return (
        <mesh scale={[1, 1, -1]} geometry={geometry} rotation-y={rotationOffset}>
            {
                //@ts-ignore
                <a.meshBasicMaterial
                    depthWrite={false}
                    depthTest={true}
                    transparent={true}
                    opacity={1}
                    map={texture}
                    side={DoubleSide}
                />
            }
        </mesh>
    )
}
