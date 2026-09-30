"use client";

import React, { Component, ReactNode } from "react";
import Icon from "./Icon";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  errorMsg: string;
}

export class WebGlErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMsg: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMsg: error?.message || "WebGL context lost or initialization failed.",
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.warn("WebGL / 3D Canvas Error caught by boundary:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, errorMsg: "" });
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="relative w-full h-full min-h-[400px] flex flex-col items-center justify-center bg-slate-950 text-slate-200 p-6 overflow-hidden select-none">
          {/* Subtle starfield glow effect */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900/80 via-slate-950 to-slate-950" />
          
          <div className="relative z-10 max-w-md w-full p-6 rounded-2xl bg-slate-900/90 border border-cyan-500/30 backdrop-blur-xl shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center mx-auto text-cyan-400">
              <Icon name="orbit" className="h-6 w-6 animate-pulse" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-100 tracking-wide">
                {this.props.fallbackTitle || "3D Observatory Degraded Mode"}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                WebGL hardware acceleration was disrupted. StarGazer is operating in dark safety mode.
              </p>
            </div>

            <button
              onClick={this.handleRetry}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-2 mx-auto"
            >
              <Icon name="rotate-cw" className="h-3.5 w-3.5" />
              <span>Reload 3D Graphics</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default WebGlErrorBoundary;
