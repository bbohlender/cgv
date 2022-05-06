import { HierarchicalParsedGrammarDefinition, HierarchicalParsedSteps, ParsedGrammarDefinition, ParsedSteps } from "cgv"
import { graphlib, layout } from "dagre"
import { Edge, Node, Position } from "react-flow-renderer"

export function createGraph(
    nodes: Array<Node>,
    edges: Array<Edge>,
    description: HierarchicalParsedGrammarDefinition
): void {
    const graph = new graphlib.Graph()
    graph.setGraph({ rankdir: "LR" })
    for (const noun of description) {
        //TODO: add node representing noun
        updateGraphNode(nodes, edges, graph, noun.step, undefined)
    }
    layout(graph)
    for (const node of nodes) {
        const { x, y, width, height } = graph.node(node.id)
        console.log(width, height)
        node.targetPosition = Position.Left
        node.sourcePosition = Position.Right
        node.position.x = x - width / 2
        node.position.y = y - height / 2
        //node.width = width
        //node.height = height
    }
}

function updateGraphNode(
    nodes: Array<Node>,
    edges: Array<Edge>,
    graph: graphlib.Graph,
    step: HierarchicalParsedSteps,
    parentId: string | undefined
): void {
    const path = step.path.join(",")

    if (parentId != null) {
        //add
        graph.setEdge(parentId, path, {})
        edges.push({
            id: edgeId(parentId, path),
            source: parentId,
            target: path,
        })
    }

    nodes.push({
        data: {
            label: step.type, //TODO
        },
        id: path,
        position: { x: 0, y: 0 },
        connectable: false,
        selectable: false,
        draggable: false,
    })
    graph.setNode(path, {
        width: 100,
        height: 20,
    })

    if (step.children == null) {
        return
    }

    for (const child of step.children) {
        updateGraphNode(nodes, edges, graph, child, path)
    }
}

function edgeId(sourceId: string, targetId: string): string {
    return `${sourceId}-${targetId}`
}
