import { expect } from "chai"
import { parse, serializeString } from "../src"
import {
    findDistributions,
    applyInstance,
    Instance,
    generateInitialPopulation,
    Population,
    procreatePopulation,
} from "../src/selector"

describe("select instance of random grammar", () => {
    it("should find random distributions", async () => {
        const description = parse(`a --> { 50%: 1 50%: 2 } | { 10%: 2 50%: { 20%: 1 80%: 3 } 40%: 33 }`)
        expect(findDistributions(description[0].step)).to.deep.equal([
            [0.5, 0.5],
            [0.2, 0.8],
            [0.1, 0.5, 0.4],
        ])
    })

    it("should specify the randoms", () => {
        const description = parse(`a --> { 50%: 1 50%: 2 } | { 10%: 2 50%: { 20%: 1 80%: 3 } 40%: 33 }`)
        expect(serializeString([{ name: "a", step: applyInstance(description[0].step, [1, 1, 0]) }])).to.equal(
            `a --> 2 | 2`
        )
    })

    it("should select target after iterations", () => {
        const description = parse(`a --> { 50%: 1 50%: 2 } | { 10%: 2 50%: { 20%: 1 80%: 3 } 40%: 33 }`)
        const distribution = findDistributions(description[0].step)
        const target: Instance = [1, 1, 0]

        const populationSize = 4

        const distance: (i1: Instance, i2: Instance) => number = (i1, i2) =>
            i1.reduce((result, value, i) => result + Math.abs(value - i2[i]), 0) //computes the sum of distances

        let population = generateInitialPopulation(distribution, populationSize)
        for (let i = 0; i < 10; i++) {
            //select instance with the smallest distance
            population = procreatePopulation(
                distribution,
                populationSize,
                selectBestInstance(population, target, distance),
                0.5
            )
        }

        const result = selectBestInstance(population, target, distance)

        expect(serializeString([{ name: "a", step: applyInstance(description[0].step, result) }])).to.equal(
            `a --> 2 | 2`
        )
    })
})

function selectBestInstance(
    population: Population,
    target: Instance,
    distance: (i1: Instance, i2: Instance) => number
): Instance {
    return population.sort((i1, i2) => distance(i1, target) - distance(i2, target))[0]
}
