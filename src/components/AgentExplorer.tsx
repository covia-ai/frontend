"use client";

import React, { useState, useRef, useEffect } from 'react';
import { ChevronRight, Folder, UserCircle, GripVertical, Bot, Activity, Clock, Cpu, MapPin, Zap, ChartNoAxesGantt, ChartGanttIcon, ChartGantt, ArrowRight } from 'lucide-react';
import agentsJson from "@/components/public/mockAgent.json"
import { Agent } from '@/config/types';
import { useRouter } from 'next/navigation';

const AgentExplorer = (props:any) => {
  const [agentData, setAgentData] = useState<Agent[]>()
  const [selectedProject, setSelectedProject] = useState<Agent>(null);
  const [selectedAgentId, setSelectedAgentId] = useState(null);
  const router = useRouter();
  // Resizing State for both columns
  const [leftWidth, setLeftWidth] = useState(320); // Initial width in pixels
  const [middleWidth, setMiddleWidth] = useState(400); // Initial width for middle column
  const isResizingLeft = useRef(false);
  const isResizingMiddle = useRef(false);

  useEffect(() => {
      if(props.agentId != null) {
        const foundObject = agentsJson.find(item => item.id === props.agentId);
        setAgentData(agentsJson);
        setSelectedProject(foundObject)
      }
      else {
         setAgentData(agentsJson);
         
      }
    },[])

     useEffect(() => {
        if(agentData && agentData.length >0 && props.agentId == null)
            setSelectedProject(agentData[0])
  
    },[agentData])

  // Get selected agent data
  const selectedAgent = selectedProject?.agents?.find(agent => agent.id === selectedAgentId);

  // Mock metadata for selected agent
  const getAgentMetadata = (agent) => {
    if (!agent) return null;
    
    return {
      steps: Math.floor(Math.random() * 50) + 10,
      lastRun: ['15min ago', '32min ago', '2 hours ago', '45min ago'][Math.floor(Math.random() * 4)],
      llm: ['GPT-4', 'Claude-3-Opus', 'Claude-3-Sonnet', 'Gemini-Pro'][Math.floor(Math.random() * 4)],
      venue: ['AWS US-East-1', 'GCP Europe-West1', 'Azure West-US', 'Local Docker'][Math.floor(Math.random() * 4)],
      runtime: `${Math.floor(Math.random() * 300) + 30}s`,
      memoryUsage: `${Math.floor(Math.random() * 512) + 256}MB`
    };
  };

  // Left column resize handlers
  const startResizingLeft = (e) => {
    isResizingLeft.current = true;
    document.addEventListener("mousemove", handleMouseMoveLeft);
    document.addEventListener("mouseup", stopResizingLeft);
    document.body.style.cursor = "col-resize";
  };

  const handleMouseMoveLeft = (e) => {
    if (!isResizingLeft.current) return;
    const newWidth = Math.min(Math.max(200, e.clientX - 20), 600);
    setLeftWidth(newWidth);
  };

  const stopResizingLeft = () => {
    isResizingLeft.current = false;
    document.removeEventListener("mousemove", handleMouseMoveLeft);
    document.removeEventListener("mouseup", stopResizingLeft);
    document.body.style.cursor = "default";
  };

  // Middle column resize handlers
  const startResizingMiddle = (e) => {
    isResizingMiddle.current = true;
    document.addEventListener("mousemove", handleMouseMoveMiddle);
    document.addEventListener("mouseup", stopResizingMiddle);
    document.body.style.cursor = "col-resize";
  };

  const handleMouseMoveMiddle = (e) => {
    if (!isResizingMiddle.current) return;
    // Calculate the starting position of the middle column (left column width + left resize handle width)
    const middleColumnStart = leftWidth + 6; // 6px is approximately the resize handle width (1.5 * 4)
    const newWidth = Math.min(Math.max(250, e.clientX - middleColumnStart), 700);
    setMiddleWidth(newWidth);
  };

  const stopResizingMiddle = () => {
    isResizingMiddle.current = false;
    document.removeEventListener("mousemove", handleMouseMoveMiddle);
    document.removeEventListener("mouseup", stopResizingMiddle);
    document.body.style.cursor = "default";
  };

  return (
    <div className="flex h-[600px] w-full border border-slate-200 rounded-lg overflow-hidden shadow-sm select-none">
      
      {/* Column 1: Projects */}
      <div 
        style={{ width: `${leftWidth}px` }} 
        className="flex-shrink-0 border-r border-slate-200 overflow-y-auto"
      >
      {agentData?.map((agent) => (
        <>
           <div className="p-3 text-xs font-semibold text-slate-200 uppercase tracking-wider">
          {agent?.name}
        </div>
        {
          <button
            key={agent?.id}
            onClick={() => {
              setSelectedProject(agent!);
              setSelectedAgentId(null);
            }}
            className={`w-full flex items-center justify-between p-4 text-left transition-colors border-b border-slate-100 last:border-0
              ${selectedProject?.id === agent?.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-100 text-slate-700'}`}
          >
            <div className="flex items-center gap-3 min-w-0">
              
              <div className="truncate">
                <p className="font-medium text-sm truncate">{agent?.name}</p>
                <p className="text-xs opacity-70 truncate">{agent?.description}</p>
              </div>
            </div>
            <ChevronRight size={16} className="flex-shrink-0 ml-2" />
          </button>
        }
        </>

      ))}
       
      </div>

      {/* Resize Handle - Left */}
      <div
        onMouseDown={startResizingLeft}
        className="w-1.5 hover:w-1.5 bg-transparent hover:bg-blue-400 cursor-col-resize transition-colors flex items-center justify-center group relative z-10"
      >
        <div className="hidden group-hover:block absolute bg-blue-500 rounded-full p-0.5">
          <GripVertical size={10} className="text-white" />
        </div>
      </div>

      {/* Column 2: Agents */}
      <div 
        style={selectedAgentId ? { width: `${middleWidth}px` } : {}}
        className={`overflow-y-auto ${selectedAgentId ? 'flex-shrink-0 border-r border-slate-200' : 'flex-1'}`}
      >
        {selectedProject ? (
          <>
            <div className="divide-y divide-slate-100">
              {selectedProject.agents.map((agent) => (
                <div
                  key={agent.id}
                  onClick={() => setSelectedAgentId(agent.id)}
                  className={`p-4 cursor-pointer transition-all duration-200 border-l-4 group
                    ${selectedAgentId === agent.id 
                      ? 'bg-gradient-to-r from-blue-50 to-blue-50/30 border-blue-500 shadow-sm' 
                      : 'border-transparent hover:border-blue-300 hover:bg-slate-50/80 hover:shadow-sm'
                    }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-2">
                      <Bot 
                        size={16} 
                        className={`transition-colors duration-200 
                          ${selectedAgentId === agent.id 
                            ? 'text-blue-600' 
                            : 'text-slate-400 group-hover:text-blue-500'
                          }`} 
                      />
                      <h4 className={`font-semibold text-sm transition-colors duration-200
                        ${selectedAgentId === agent.id 
                          ? 'text-slate-800' 
                          : 'text-slate-600 group-hover:text-slate-800'
                        }`}>
                        {agent.name}
                      </h4>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition-all duration-200
                      ${selectedAgentId === agent.id 
                        ? 'bg-green-500 text-white shadow-sm' 
                        : 'bg-green-100 text-green-700 group-hover:bg-green-200'
                      }`}>
                      {agent.status}
                    </span>
                  </div>
                  <p className={`text-sm ml-6 transition-colors duration-200
                    ${selectedAgentId === agent.id 
                      ? 'text-slate-600' 
                      : 'text-slate-500 group-hover:text-slate-600'
                    }`}>
                    {agent.description}
                  </p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center">
            <p className="text-sm">Select a project</p>
          </div>
        )}
      </div>

      {/* Resize Handle - Middle */}
      {selectedAgentId && (
        <div
          onMouseDown={startResizingMiddle}
          className="w-1.5 hover:w-1.5 bg-transparent hover:bg-blue-400 cursor-col-resize transition-colors flex items-center justify-center group relative z-10"
        >
          <div className="hidden group-hover:block absolute bg-blue-500 rounded-full p-0.5">
            <GripVertical size={10} className="text-white" />
          </div>
        </div>
      )}
  
      {/* Column 3: Agent Metadata */}
        {selectedAgent && (
          <div className="p-6 flex-grow overflow-y-auto ">
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <Bot size={24} className="text-blue-600" />
                <h3 className="text-xl font-bold text-slate-200">{selectedAgent.name}</h3>
              </div>
              <p className="text-sm text-slate-600">{selectedAgent.description}</p>
            </div>

            <div className="space-y-4">
              {/* Status */}
              <div className="bg-slate-200 rounded-lg p-1 border border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 my-2">
                    <Activity size={18} className="text-green-600" />
                    <span className="font-semibold text-sm text-slate-700 ">Status</span>
                  </div>
                  <span className="text-sm px-3 py-1 rounded-full bg-green-100 text-green-700 font-semibold">
                    {selectedAgent.status}
                  </span>
                </div>
              </div>

              {/* Steps */}
              <div className="bg-slate-200 rounded-lg p-1 border border-slate-200">
                <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 my-2">
                  <Zap size={18} className="text-amber-600" />
                  <span className="font-semibold text-sm text-slate-700">Total Steps</span>
                </div>
                <p className="text-sm font-semibold text-slate-800 mr-2">
                  {getAgentMetadata(selectedAgent)?.steps}
                </p>
              </div>
              </div>

              {/* Last Run */}
               <div className="bg-slate-200 rounded-lg p-1 border border-slate-200">
                 <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 my-2">
                  <Clock size={18} className="text-blue-600" />
                  <span className="font-semibold text-sm text-slate-700">Last Run</span>
                </div>
                 <p className="text-sm font-semibold text-slate-800 mr-2">
                  {getAgentMetadata(selectedAgent)?.lastRun}
                </p>
              </div>
              </div>

              {/* LLM Model */}
              <div className="bg-slate-200 rounded-lg p-1 border border-slate-200">
                <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 my-2">
                  <Cpu size={18} className="text-purple-600" />
                  <span className="font-semibold text-sm text-slate-700">LLM Model</span>
                </div>
                <p className="text-sm font-medium text-slate-800 mr-2">
                  {getAgentMetadata(selectedAgent)?.llm}
                </p>
               
                </div>
              </div>

              {/* Venue Location */}
              <div className="bg-slate-200 rounded-lg p-1 border border-slate-200">
                <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 my-2">
                  <MapPin size={18} className="text-red-600" />
                  <span className="font-semibold text-sm text-slate-700">Venue</span>
               </div>
                <p className="text-sm font-medium text-slate-800 mr-2">
                  {getAgentMetadata(selectedAgent)?.venue}
                </p>
                 </div>
              </div>

                {/* Timeline */}
               <div className="bg-blue-600 rounded-lg p-1 border border-slate-200">
                <div className="flex items-center justify-between">
                <div className="flex items-center justify-center my-2 gap-2">
                  <ChartGantt size={18} className="text-white-600" />
                  <span className="font-thin text-sm text-slate-200">View Timeline</span>
               </div>
                <p className="mr-2">
                  <ArrowRight  onClick={() => router.push(`/agents/${props.agentId}/agent/${selectedAgent.id}`)} className="text-white-600 "/>
                </p>
                 </div>
              </div>

              </div>
            
             
          </div>
        ) 
        }

      
      </div>
     
  );
};

export default AgentExplorer;