// Type definitions
interface Agent {
  id: string;
  name: string;
  description: string;
  status: string;
  lastRun: string;
  provider: string;
  totalSteps: number;
  executionTime: string;
  venueId: string;
}

interface Step {
  stepNumber: number;
  stepId: string;
  stepName: string;
  stepType: string;
  description: string;
  timestamp: string;
  venueId: string;
  jobId: string;
  status: string;
  input: Record<string, any>;
  output: Record<string, any>;
}

interface AgentData {
  agent: Agent;
  steps: Step[];
}

interface ReactFlowNode {
  id: string;
  type: 'input' | 'default' | 'output';
  position: {
    x: number;
    y: number;
  };
  data: {
    label: string;
    description: string;
    status: string;
    timestamp: string;
    jobId: string;
    stepType?: string;
    venueId?: string;
    agentName?: string;
  };
}

interface ReactFlowEdge {
  id: string;
  source: string;
  target: string;
  animated: boolean;
  label?: string;
}

interface ConversionOptions {
  verticalSpacing?: number;
  horizontalPosition?: number;
  horizontalSpacing?: number;
  animateEdges?: boolean;
}

interface AgentWorkflow {
  agentInfo: Agent;
  nodes: ReactFlowNode[];
  edges: ReactFlowEdge[];
}

interface WorkflowsResult {
  [key: string]: AgentWorkflow;
}

interface SingleFlowResult {
  nodes: ReactFlowNode[];
  edges: ReactFlowEdge[];
}

/**
 * Converts agent workflow data to React Flow format
 * @param agentData - Array of agent objects with steps
 * @param options - Configuration options
 * @returns Object containing workflows for each agent
 */
function convertAgentDataToReactFlow(
  agentData: AgentData[],
  options: ConversionOptions = {}
): WorkflowsResult {
  const {
    verticalSpacing = 150,
    horizontalPosition = 250,
    animateEdges = true,
  } = options;

  const result: WorkflowsResult = {};

  agentData.forEach((agentObj) => {
    const { agent, steps } = agentObj;
    
    // Create a key from agent name (camelCase)
    const agentKey = agent.name
      .replace(/\s+/g, '')
      .replace(/^./, str => str.toLowerCase());

    // Convert steps to nodes
    const nodes: ReactFlowNode[] = steps.map((step, index) => {
      // Determine node type based on position
      let nodeType: 'input' | 'default' | 'output' = 'default';
      if (index === 0) nodeType = 'input';
      else if (index === steps.length - 1) nodeType = 'output';

      return {
        id: `${agent.id.split('-')[0]}-step-${step.stepNumber}`,
        type: nodeType,
        position: {
          x: horizontalPosition,
          y: index * verticalSpacing
        },
        data: {
          label: step.stepName,
          description: step.description,
          status: step.status,
          timestamp: step.timestamp,
          jobId: step.jobId,
          stepType: step.stepType,
          venueId: step.venueId
        }
      };
    });

    // Create edges between consecutive steps
    const edges: ReactFlowEdge[] = [];
    for (let i = 0; i < steps.length - 1; i++) {
      const currentStep = steps[i];
      const nextStep = steps[i + 1];
      
      // Generate a descriptive label based on output/input
      let edgeLabel = 'Data Flow';
      if (currentStep.output && typeof currentStep.output === 'object') {
        const outputKeys = Object.keys(currentStep.output);
        if (outputKeys.length > 0) {
          edgeLabel = outputKeys[0]
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
        }
      }

      edges.push({
        id: `${agent.id.split('-')[0]}-e${currentStep.stepNumber}-${nextStep.stepNumber}`,
        source: `${agent.id.split('-')[0]}-step-${currentStep.stepNumber}`,
        target: `${agent.id.split('-')[0]}-step-${nextStep.stepNumber}`,
        animated: animateEdges,
        label: edgeLabel
      });
    }

    result[agentKey] = {
      agentInfo: {
        id: agent.id,
        name: agent.name,
        description: agent.description,
        status: agent.status,
        lastRun: agent.lastRun,
        provider: agent.provider,
        totalSteps: agent.totalSteps,
        executionTime: agent.executionTime,
        venueId: agent.venueId
      },
      nodes,
      edges
    };
  });

  return result;
}

/**
 * Converts a single agent workflow to React Flow format
 * @param agentObj - Single agent object with steps
 * @param options - Configuration options
 * @returns Object with nodes and edges
 */
function convertSingleAgentToReactFlow(
  agentObj: AgentData,
  options: ConversionOptions = {}
): AgentWorkflow {
  const result = convertAgentDataToReactFlow([agentObj], options);
  const firstKey = Object.keys(result)[0];
  return result[firstKey];
}

/**
 * Combines all agents into a single React Flow diagram
 * @param agentData - Array of agent objects with steps
 * @param options - Configuration options
 * @returns Object with combined nodes and edges
 */
function convertToSingleReactFlow(
  agentData: AgentData[],
  options: ConversionOptions = {}
): SingleFlowResult {
  const {
    verticalSpacing = 150,
    horizontalSpacing = 400,
    animateEdges = true,
  } = options;

  const allNodes: ReactFlowNode[] = [];
  const allEdges: ReactFlowEdge[] = [];

  agentData.forEach((agentObj, agentIndex) => {
    const { agent, steps } = agentObj;
    const xPosition = agentIndex * horizontalSpacing;

    steps.forEach((step, stepIndex) => {
      let nodeType: 'input' | 'default' | 'output' = 'default';
      if (stepIndex === 0) nodeType = 'input';
      else if (stepIndex === steps.length - 1) nodeType = 'output';

      allNodes.push({
        id: `${agent.id}-step-${step.stepNumber}`,
        type: nodeType,
        position: {
          x: xPosition,
          y: stepIndex * verticalSpacing
        },
        data: {
          label: step.stepName,
          description: step.description,
          status: step.status,
          timestamp: step.timestamp,
          jobId: step.jobId,
          agentName: agent.name
        }
      });

      if (stepIndex < steps.length - 1) {
        const nextStep = steps[stepIndex + 1];
        allEdges.push({
          id: `${agent.id}-e${step.stepNumber}-${nextStep.stepNumber}`,
          source: `${agent.id}-step-${step.stepNumber}`,
          target: `${agent.id}-step-${nextStep.stepNumber}`,
          animated: animateEdges
        });
      }
    });
  });
  return { nodes: allNodes, edges: allEdges };
}

// Example usage:
// const workflows = convertAgentDataToReactFlow(agentData);
// const singleAgent = convertSingleAgentToReactFlow(agentData[0]);
// const combinedFlow = convertToSingleReactFlow(agentData);

export type {
  Agent,
  Step,
  AgentData,
  ReactFlowNode,
  ReactFlowEdge,
  ConversionOptions,
  AgentWorkflow,
  WorkflowsResult,
  SingleFlowResult
};

export {
  convertAgentDataToReactFlow,
  convertSingleAgentToReactFlow,
  convertToSingleReactFlow
};