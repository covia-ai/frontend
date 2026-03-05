"use client"

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Home, Users, CreditCard, FileText, Shield } from 'lucide-react';
import TreeStructure from './AgentTree';

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
      children: [
        { name: "Compliance Documentation Agent", icon: "agent" },
        { name: "Security Review Agent", icon: "agent" },
        { name: "Client Reporting Agent", icon: "agent" }
      ]
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

      {agentData.children.map((category) => (
        <div key={category.name} className="border border-border rounded-lg overflow-hidden bg-card shadow-sm">
          <button
            onClick={() => toggleItem(category.name)}
            className="w-full flex items-center justify-between p-4 hover:bg-accent transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400">
                <IconComponent iconName={category.icon} size={18} />
              </div>
              <span className="font-medium text-foreground">{category.name}</span>
              {category.children.length > 0 && (
                <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">
                  {category.children.length} agents
                </span>
              )}
            </div>
            {category.children.length > 0 && (
              expandedItems.has(category.name) ? 
                <ChevronDown className="text-muted-foreground" size={20} /> : 
                <ChevronRight className="text-muted-foreground" size={20} />
            )}
          </button>

          {expandedItems.has(category.name) && category.children.length > 0 && (
            <div className="bg-muted border-t border-border">
              {category.children.map((agent, index) => (
                <div
                  key={agent.name}
                  className={`flex items-center gap-3 p-3 pl-16 hover:bg-card transition-colors ${
                    index !== category.children.length - 1 ? 'border-b border-border' : ''
                  }`}
                >
                  <div className="w-6 h-6 bg-muted rounded flex items-center justify-center text-muted-foreground">
                    <span className="text-xs">🤖</span>
                  </div>
                  <span className="text-foreground">{agent.name}</span>
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
      <div className="flex items-center gap-2 mb-6 p-4 bg-card rounded-lg border border-border">
        <button
          onClick={() => navigateTo(0)}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
        >
          <Home size={18} />
          <span>{agentData.name}</span>
        </button>
        {currentPath.map((pathItem, index) => (
          <React.Fragment key={pathItem}>
            <ChevronRight size={16} className="text-muted-foreground" />
            <button
              onClick={() => navigateTo(index + 1)}
              className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              {pathItem}
            </button>
          </React.Fragment>
        ))}
      </div>

    

      {/* Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {currentLevel.items.map((item) => (
          <div
            key={item.name}
            onClick={() => item.children && item.children.length > 0 ? navigateDown(item.name) : null}
            className={`p-5 border border-border rounded-lg bg-card shadow-sm ${
              item.children && item.children.length > 0 ? 'cursor-pointer hover:shadow-md hover:border-primary' : ''
            } transition-all`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3 flex-1">
                {item.icon && (
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0">
                    <IconComponent iconName={item.icon} size={20} />
                  </div>
                )}
                {!item.icon && (
                  <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">🤖</span>
                  </div>
                )}
                <div className="flex-1">
                  <h4 className="font-semibold text-foreground">{item.name}</h4>
                  {item.children && item.children.length > 0 && (
                    <p className="text-sm text-muted-foreground mt-1">{item.children.length} sub-agents</p>
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
        <div className="text-center py-12 text-muted-foreground">
          <p>No agents in this category</p>
        </div>
      )}
    </div>
  );
};

// Main App Component
export default function AgentTree2() {
  const [activeView, setActiveView] = useState('tree');

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Customer Support</h1>
        </div>

        {/* View Toggle */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setActiveView('tree')}
            className={`p-2 rounded-lg font-medium transition-all ${
              activeView === 'tree'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-card text-foreground border border-border hover:border-primary'
            }`}
          >
            Tree View
          </button>
          <button
            onClick={() => setActiveView('accordion')}
            className={`p-2 rounded-lg font-medium transition-all ${
              activeView === 'accordion'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-card text-foreground border border-border hover:border-primary'
            }`}
          >
            Accordion View
          </button>
          <button
            onClick={() => setActiveView('breadcrumb')}
            className={`p-2 rounded-lg font-medium transition-all ${
              activeView === 'breadcrumb'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-card text-foreground border border-border hover:border-primary'
            }`}
          >
            Breadcrumb Navigation
          </button>
        </div>

        {/* Active View */}
        <div className=" rounded-xl shadow-lg p-6">
          {activeView === 'accordion' && <AccordionView />}
          {activeView === 'breadcrumb' && <BreadcrumbView />}
          {activeView === 'tree' && <TreeStructure />}
        </div>

        
      </div>
    </div>
  );
}