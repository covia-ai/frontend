import { useVenue } from "@/hooks/use-venue";
import { useStore } from "zustand";

export function parseOpMetadata(metadata: JSON) {
	const inputArray = Object.keys(metadata.operation.input.properties);
	const outputArray = Object.keys(metadata.operation.output.properties)
	const steps = metadata.operation.steps;
	const results = metadata.operation.result;

	const stepIndex = 0;
	const posX = 100, posYIO = 200, posYS = 400;
	const nodes = new Array<any>(), edges = new Array<any>();
	processInput(nodes, inputArray, posX, posYIO);
	processSteps(stepIndex, steps, results, nodes, edges, posX + 100, posYS);
	processOutput(results, nodes, edges, posX + 100, posYIO, outputArray)
	return [nodes, edges]
}
function processInput(nodes, inputArray, posX, posYIO) {
	nodes.push(
		{
			id: nodes.length + "",
			type: 'InputNode',
			data: { nodeLabel: "Inputs", inputs: inputArray },
			position: { x: posX, y: posYIO },
		}
	)
}
function processOutput(results, nodes, edges, posX, posY, outputArray) {
	nodes.push(
		{
			id: (nodes.length) + "",
			type: 'OutputNode',
			data: { nodeLabel: "Outputs", outputs: outputArray },
			position: { x: posX + 200 * nodes.length, y: posY },
		}
	)
	outputArray.forEach((output) => {

		if (results[output] && results[output].length > 0) {
			const stepId = results[output][0];
			if (typeof (stepId) == "number") {
				let sourceHandle = "";
				if (results[output] > 1)
					sourceHandle = results[output][1]
				else
					sourceHandle = getResultOfStep(results, stepId)[0];
				edges.push(
					{
						id: "e" + edges.length,
						source: (stepId + 1) + "",
						target: (nodes.length - 1) + "",
						animated: true,
						sourceHandle: sourceHandle,
						targetHandle: output,
						type: "customEdge",
					}
				)
			}
			else if (stepId == "input") {
				let sourceHandle = "";
				if (results[output] > 1)
					sourceHandle = results[output][1]
				else
					sourceHandle = "input";
				edges.push(
					{
						id: "e" + edges.length,
						source: "0",
						target: (nodes.length - 1) + "",
						animated: true,
						sourceHandle: sourceHandle,
						targetHandle: output,
						type: "customEdge",
					}
				)
			}
		}
	})
}

function processSteps(stepIndex, steps, results, nodes, edges, posX, posY) {
	if (stepIndex == steps.length) {
		return;
	}
	else {
		const currentStep = steps[stepIndex];
		const inputs = currentStep.input;

		if (inputs[0] == 'const' && inputs.length > 1) {
			nodes.push(
				{
					id: (stepIndex + 1) + "c",
					type: 'ConstNode',
					data: { id: stepIndex + "c", nodeLabel: JSON.stringify(inputs[1]) },
					position: { x: posX, y: posY + 200 },
				}
			)
			nodes.push(
				{
					id: (stepIndex + 1) + "",
					type: 'TaskNode',
					data: { nodeLabel: currentStep.name, op: currentStep.op, inputs: [], outputs: getResultOfStep(results, stepIndex) },
					position: { x: posX + 100, y: posY + 200 },
				}
			)
			posX = posX + 400;
			edges.push(
				{
					id: "e" + edges.length,
					source: (stepIndex + 1) + "c",
					target: (stepIndex + 1) + "",
					animated: true,
					targetHandle: "taskinput",
					type: "customEdge",
				}
			)
		}
		else if (inputs[0] == '0' && inputs.length == 1) {
			nodes.push(
				{
					id: (stepIndex + 1) + "",
					type: 'TaskNode',
					data: { nodeLabel: currentStep.name, op: currentStep.op, inputs: getResultOfStep(results, stepIndex - 1), outputs: getResultOfStep(results, stepIndex) },
					position: { x: posX, y: posY },
				}
			)
			posX = posX + 300;
			edges.push(
				{
					id: "e" + edges.length,
					source: (stepIndex) + "",
					target: (stepIndex + 1) + "",
					animated: true,
					sourceHandle: getResultOfStep(results, stepIndex - 1)[0],
					targetHandle: getResultOfStep(results, stepIndex - 1)[0],
					type: "customEdge",
				}
			)
		}
		else {
			const stepInputKeys = Object.keys(currentStep.input);
			const stepOutput = getResultOfStep(results, stepIndex);
			nodes.push(
				{
					id: (stepIndex + 1) + "",
					type: 'TaskNode',
					data: { nodeLabel: currentStep.name, op: currentStep.op, inputs: stepInputKeys, outputs: stepOutput },
					position: { x: posX, y: posY },
				}

			)

			stepInputKeys.forEach((inputKey => {
				const inputData = currentStep.input[inputKey];
				if (inputData[0] == 'input') {
					let sourceHandle = "input";
					if (inputData.length > 1) {
						sourceHandle = inputData[1];
					}
					edges.push(
						{
							id: "e" + edges.length,
							source: "0",
							target: (stepIndex + 1) + "",
							animated: true,
							sourceHandle: sourceHandle,
							targetHandle: inputKey,
							type: "customEdge",
						}
					)
				}
				else if (typeof (inputData[0]) == 'number') {
					edges.push(
						{
							id: "e" + edges.length,
							source: inputData[0] + "",
							target: (stepIndex + 1) + "",
							animated: true,
							sourceHandle: inputData[1],
							targetHandle: inputKey,
							type: "customEdge",
						}
					)
				}
				else if (inputData[0] == 'const') {
				}
			}))
			posX = posX + 300;

		}
	}
	processSteps(stepIndex + 1, steps, results, nodes, edges, posX, posY)

}
function getResultOfStep(results, stepIndex) {
	for (const key in results) {
		const stepResult = Array.from(results[key]);
		if (stepResult[0] == stepIndex) {
			if (stepResult.length == 1)
				return [key]
			else
				return [stepResult[1]]
		}

	}
	return [];
}
