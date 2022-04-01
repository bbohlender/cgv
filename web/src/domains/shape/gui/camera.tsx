import { PerspectiveCamera } from "@react-three/drei"
import { useEffect, useMemo } from "react"
import { animated, SpringValue, to, useSpring } from "@react-spring/three"
import { Euler, Quaternion } from "three"
import { panoramas, useShapeStore } from "../global"
import { Background } from "./background"
import { NumberTuple3, NumberTuple4, PanoramaViewerState, quternionToTuple, TopDownViewerState } from "./viewer-state"

export const topPosition: NumberTuple3 = [0, 100, 0]
export const topQuaternion = quternionToTuple(new Quaternion().setFromEuler(new Euler(-Math.PI / 2, 0, 0)))

const qHelp1 = new Quaternion()
const qHelp2 = new Quaternion()

const APerspectiveCamera = animated(PerspectiveCamera)

export function ViewerCamera({ showBackground }: { showBackground: boolean }) {
    const [{ positionS1, quaternionS1, positionS2, quaternionS2, s1Current }, api] = useSpring(
        {
            positionS1: topPosition,
            quaternionS1: topQuaternion,
            positionS2: topPosition,
            quaternionS2: topQuaternion,
            s1Current: 1,
        },
        []
    )
    const store = useShapeStore()

    useEffect(() => {
        const unsubscribeS1Current = store.subscribe<boolean>(
            (s1Current) => api.start({ s1Current: s1Current ? 1 : 0 }),
            (s) => s.s1CurrentState
        )
        const unsubscribeS1 = store.subscribe<TopDownViewerState | PanoramaViewerState>(
            (state) =>
                api.set({
                    positionS1: calculatePosition(state),
                    quaternionS1: calculateRotation(state),
                }),
            (s) => s.s1
        )
        const unsubscribeS2 = store.subscribe<TopDownViewerState | PanoramaViewerState | undefined>(
            (state) =>
                state != null &&
                api.set({
                    positionS2: calculatePosition(state),
                    quaternionS2: calculateRotation(state),
                }),
            (s) => s.s2
        )

        return () => {
            unsubscribeS1Current()
            unsubscribeS1()
            unsubscribeS2()
        }
    }, [store, api])

    const animatedPosition = useMemo(
        () =>
            to<[SpringValue<NumberTuple3>, SpringValue<NumberTuple3>, SpringValue<number>], NumberTuple3>(
                [positionS1, positionS2, s1Current],
                (positionS1, positionS2, s1Current) => interpolate(positionS1, positionS2, s1Current)
            ),
        [positionS1, positionS2, s1Current]
    )

    const animatedQuaternion = useMemo(
        () =>
            to<[SpringValue<NumberTuple4>, SpringValue<NumberTuple4>, SpringValue<number>], NumberTuple4>(
                [quaternionS1, quaternionS2, s1Current],
                (quaternionS1, quaternionS2, s1Current) => {
                    qHelp1.set(...quaternionS1)
                    qHelp2.set(...quaternionS2)
                    qHelp2.slerp(qHelp1, s1Current)
                    return quternionToTuple(qHelp2)
                }
            ),
        [quaternionS1, quaternionS2, s1Current]
    )

    //TODO: move background out of here

    return (
        <>
            <APerspectiveCamera
                rotation-x={-Math.PI / 2}
                position={animatedPosition}
                quaternion={animatedQuaternion as any}
                makeDefault></APerspectiveCamera>

            {showBackground && <Background s1={true} s1Current={s1Current} />}
            {showBackground && <Background s1={false} s1Current={s1Current} />}
        </>
    )
}

function interpolate(v1: NumberTuple3, v2: NumberTuple3, value: number): NumberTuple3 {
    return v1.map((v1, index) => v1 * value + (1 - value) * v2[index]) as any
}

function calculatePosition(state: TopDownViewerState | PanoramaViewerState) {
    if (state.type === "2d") {
        return state.position
    }
    return panoramas[state.panoramaIndex].position
}

function calculateRotation(state: TopDownViewerState | PanoramaViewerState) {
    if (state.type === "2d") {
        return topQuaternion
    }
    return state.rotation
}
