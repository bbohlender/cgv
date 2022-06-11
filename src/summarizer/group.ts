import { diffArrays } from "diff"
import { ParsedSteps } from "../parser"

type Horizontal<T> = Array<T>
type Vertical<T> = Array<T>

export function align<T>(
    unalignedLists: Vertical<Horizontal<T>>,
    generateFiller: () => T,
    isSimilar: (v1: T, v2: T) => boolean
): Vertical<Horizontal<T>> {
    const mergedList: Array<T> = [...unalignedLists[0]]
    const alignedLists: Array<Array<T>> = [[...unalignedLists[0]]]
    for (let i = 1; i < unalignedLists.length; i++) {
        const alignedList = [...unalignedLists[i]]

        const changes = diffArrays<T, T>(mergedList, alignedList, {
            comparator: isSimilar,
        })

        let ii = 0
        for (const change of changes) {
            const length = change.value.length

            if (change.added) {
                mergedList.splice(ii, 0, ...change.value)
                for (const prevAlignedLinearization of alignedLists) {
                    prevAlignedLinearization.splice(
                        ii,
                        0,
                        ...new Array(length).fill(undefined).map<T>(() => generateFiller())
                    )
                }
            } else if (change.removed) {
                alignedList.splice(ii, 0, ...new Array(length).fill(undefined).map<T>(() => generateFiller()))
            }
            ii += length
        }

        alignedLists.push(alignedList)
    }
    return alignedLists
}

type Groups = Array<Array<number>>

function groupVertical<T>(combine: (v1: T, v2: T) => T): Horizontal<Groups> {
    //TODO: group vertically
}

export type NestedGroup<T> = Array<Array<NestedGroup<T>>> | T

function groupNested<T>(verticalGroups: Horizontal<Groups>): NestedGroup<T> {
    //group nested
}

type Partition<T> = {
    size: number,
    parts: Horizontal<Vertical<T | Partition<T>>>
}

function partitionHorizontal<T>(groups: Horizontal<Groups>, ): Partition<T> {
    const partitions: Array<Partition<T>> = []
    let prevPartition: { x: number, groups: Array<Array<number>>, width: number } | undefined
    for(let x = groups.length; x++) {
        if(prevPartition == null || !groupsContainGroups(prevPartition.groups, groups[x])) {
            prevPartition = {
                x,
                width: 1,
                groups: groups[x]
            }
        } else {
            prevPartition.width += 1
        }
    }
    if(prevPartition != null) {

    }
    //TODO: if prev. partition is valid, include next steps
    //TODO: if prev. partition is invalid, destroy partition and reform
}

function expandPartition(): void {

}

function groupsContainGroups(superGroups: Groups, subGroups: Groups): boolean {

}

function removeUnecassaryThis(): ParsedSteps {}

/*
function alignAndPartition(linearizations: Array<LinearizedSteps>): Array<Partition> {

    const mergedLinearization: LinearizedSteps = [...linearizations[0]]

    const similars = new Array(linearizations[0].length).fill(true)
    const alignedLinearizations: Array<LinearizedSteps> = [
        [...linearizations[0]]
    ]
    
    for(let i = 1; i < linearizations.length; i++) {
        const alignedLinearization = [...linearizations[i]]
        const changes = diffArrays<LinearizedStep, LinearizedStep>(mergedLinearization, alignedLinearization, {
            comparator: isSimilar
        })
        let i1 = 0
        let i2 = 0
        for(const change of changes) {
            const length = change.value.length
            //TODO: insert inton all alignedLinearizations and alignedLinearization
            if(change.added) {
                alignedLinearization.splice(i1, 0, ...new Array(length).fill(undefined).map<LinearizedStep>(() => ({ type: "this"})))
                i1 += length
            } else if(change.removed) {
                mergedLinearization.splice(i2, 0, ...change.value)
                for(const prevAlignedLinearization of alignedLinearizations) {
                    prevAlignedLinearization.splice(i2, 0, ...new Array(length).fill(undefined).map<LinearizedStep>(() => ({ type: "this"})))
                }
                i2 += length
            } else {
                i1 += length
                i2 += length
            }
            for(const prevAlignedLinearization of alignedLinearizations) {

            }
            alignedLinearizations.push(alignedLinearization)
        }
    }

    const partitions: Array<Partition> = []
    for(let i = 0; i < targetLinearization.length; i++) {
        const lastPartionSimilar: boolean | undefined = partitions.length === 0 ? undefined : partitions[partitions.length - 1].similar
        const currentPartionSimilar: boolean = similars[i]
        if(lastPartionSimilar === currentPartionSimilar) {
            partitions.push({
                similar: currentPartionSimilar,
                alignments: [alignedLinearizations.map((steps) => steps[i])]
            })
        } else {
            partitions[partitions.length - 1].alignments.push(alignedLinearizations.map(steps => steps[i]))
        }
    }
    return partitions
}*/
