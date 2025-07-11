import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function parseJsonForReactFlow(json:JSON) {
  let initialX=100, initialY=150;
  let initalNode = new Array(), initialEdge = new Array();
  const myMap = new Map(Object.entries(json));
  const outputInputMap = new Map();
  let index=1, YIncrement=200, XPos = initialX, YPos=initialY;
  
  for (const [taskName, task] of myMap) {
            
  
    let nodeJson = {
          id: index+"",
          position: { x: XPos, y: YPos },
          type:'taskNode',
          data: {  label:taskName, inputLabel:task.input, outputLabel:task.output},
    };
    initalNode.push(nodeJson)
    outputInputMap.set(index,task.output);
    
    index = index + 1;
    YPos = YPos + YIncrement;
  }
  
  return initalNode;
}