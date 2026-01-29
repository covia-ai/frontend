"use client"

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Home, Users, CreditCard, FileText, Shield } from 'lucide-react';

const agentData = {
  name: "Customer Support Agent",
  children: [
    {
      name: "Platform Migration Support",
      icon: "users",
      children: [
        { name: "Database Migration Agent", icon: "agent" },
        { name: "API Integration Agent", icon: "agent" },
        { name: "User Communication Agent", icon: "agent" }
      ]
    },
    {
      name: "Billing Discrepancy Investigation",
      icon: "credit-card",
      children: [
        { name: "Transaction Analysis Agent", icon: "agent" },
        { name: "Finance Coordination Agent", icon: "agent" },
        { name: "Customer Relations Agent", icon: "agent" }
      ]
    },
    {
      name: "Feature Request - Custom Reporting",
      icon: "file-text",
      children: [
        { name: "Requirements Gathering Agent", icon: "agent" },
        { name: "Feasibility Analysis Agent", icon: "agent" },
        { name: "Product Liaison Agent", icon: "agent" }
      ]
    },
    {
      name: "Security Audit Compliance",
      icon: "shield",
      children: []
    }
  ]
};

const IconComponent = ({ iconName, size = 16 }) => {
  const icons = {
    'users': Users,
    'credit-card': CreditCard,
    'file-text': FileText,
    'shield': Shield,
    'home': Home
  };
  const Icon = icons[iconName] || Users;
  return <Icon size={size} />;
};

// Accordion Component
const AccordionView = () => {
  const [expandedItems, setExpandedItems] = useState(new Set(['Platform Migration Support']));

  const toggleItem = (name) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(name)) {
      newExpanded.delete(name);
    } else {
      newExpanded.add(name);
    }
    setExpandedItems(newExpanded);
  };

  return (
    <div className="space-y-2">
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white">
            <Home size={20} />
          </div>
          <h3 className="text-lg font-semibold text-gray-800">{agentData.name}</h3>
        </div>
      </div>

      {agentData.children.map((category) => (
        <div key={category.name} className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
          <button
            onClick={() => toggleItem(category.name)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                <IconComponent iconName={category.icon} size={18} />
              </div>
              <span className="font-medium text-gray-800">{category.name}</span>
              {category.children.length > 0 && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                  {category.children.length} agents
                </span>
              )}
            </div>
            {category.children.length > 0 && (
              expandedItems.has(category.name) ? 
                <ChevronDown className="text-gray-400" size={20} /> : 
                <ChevronRight className="text-gray-400" size={20} />
            )}
          </button>

          {expandedItems.has(category.name) && category.children.length > 0 && (
            <div className="bg-gray-50 border-t border-gray-200">
              {category.children.map((agent, index) => (
                <div
                  key={agent.name}
                  className={`flex items-center gap-3 p-3 pl-16 hover:bg-white transition-colors ${
                    index !== category.children.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                >
                  <div className="w-6 h-6 bg-gray-200 rounded flex items-center justify-center text-gray-600">
                    <span className="text-xs">🤖</span>
                  </div>
                  <span className="text-gray-700">{agent.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// Breadcrumb Navigation Component
const BreadcrumbView = () => {
  const [currentPath, setCurrentPath] = useState([]);

  const getCurrentLevel = () => {
    if (currentPath.length === 0) {
      return { items: agentData.children, title: agentData.name, type: 'categories' };
    } else if (currentPath.length === 1) {
      const category = agentData.children.find(c => c.name === currentPath[0]);
      return { items: category.children, title: category.name, type: 'agents', icon: category.icon };
    }
    return { items: [], title: '', type: '' };
  };

  const navigateTo = (index) => {
    setCurrentPath(currentPath.slice(0, index));
  };

  const navigateDown = (itemName) => {
    setCurrentPath([...currentPath, itemName]);
  };

  const currentLevel = getCurrentLevel();

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 p-4 bg-white rounded-lg border border-gray-200">
        <button
          onClick={() => navigateTo(0)}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
        >
          <Home size={18} />
          <span>{agentData.name}</span>
        </button>
        {currentPath.map((pathItem, index) => (
          <React.Fragment key={pathItem}>
            <ChevronRight size={16} className="text-gray-400" />
            <button
              onClick={() => navigateTo(index + 1)}
              className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              {pathItem}
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* Current Level Header */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-lg mb-6 border border-blue-200">
        <div className="flex items-center gap-3">
          {currentLevel.icon && (
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center text-white">
              <IconComponent iconName={currentLevel.icon} size={24} />
            </div>
          )}
          {!currentLevel.icon && currentPath.length === 0 && (
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white">
              <Home size={24} />
            </div>
          )}
          <div>
            <h3 className="text-xl font-bold text-gray-800">{currentLevel.title}</h3>
            <p className="text-sm text-gray-600 mt-1">
              {currentLevel.type === 'categories' ? `${currentLevel.items.length} categories` : `${currentLevel.items.length} agents`}
            </p>
          </div>
        </div>
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {currentLevel.items.map((item) => (
          <div
            key={item.name}
            onClick={() => item.children && item.children.length > 0 ? navigateDown(item.name) : null}
            className={`p-5 border border-gray-200 rounded-lg bg-white shadow-sm ${
              item.children && item.children.length > 0 ? 'cursor-pointer hover:shadow-md hover:border-blue-300' : ''
            } transition-all`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3 flex-1">
                {item.icon && (
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 flex-shrink-0">
                    <IconComponent iconName={item.icon} size={20} />
                  </div>
                )}
                {!item.icon && (
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">🤖</span>
                  </div>
                )}
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-800">{item.name}</h4>
                  {item.children && item.children.length > 0 && (
                    <p className="text-sm text-gray-500 mt-1">{item.children.length} sub-agents</p>
                  )}
                </div>
              </div>
              {item.children && item.children.length > 0 && (
                <ChevronRight className="text-gray-400 flex-shrink-0 mt-1" size={20} />
              )}
            </div>
          </div>
        ))}
      </div>

      {currentLevel.items.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>No agents in this category</p>
        </div>
      )}
    </div>
  );
};

// Main App Component
export default function AgentTree2() {
  const [activeView, setActiveView] = useState('accordion');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Agent Hierarchy UI Patterns</h1>
          <p className="text-gray-600">Compare different ways to visualize nested agent structures</p>
        </div>

        {/* View Toggle */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setActiveView('accordion')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              activeView === 'accordion'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-300'
            }`}
          >
            Accordion View
          </button>
          <button
            onClick={() => setActiveView('breadcrumb')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              activeView === 'breadcrumb'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-300'
            }`}
          >
            Breadcrumb Navigation
          </button>
        </div>

        {/* Active View */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          {activeView === 'accordion' && <AccordionView />}
          {activeView === 'breadcrumb' && <BreadcrumbView />}
        </div>

        
      </div>
    </div>
  );
}