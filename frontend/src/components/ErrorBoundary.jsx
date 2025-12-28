import React from "react";
import { AlertCircle, RefreshCcw } from "lucide-react";

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                    <div className="max-w-md w-full bg-white p-10 rounded-[3rem] shadow-2xl border border-gray-100 text-center space-y-8 animate-in zoom-in-95 duration-300">
                        <div className="h-20 w-20 bg-red-50 text-error rounded-[2rem] flex items-center justify-center mx-auto shadow-inner">
                            <AlertCircle className="h-10 w-10" />
                        </div>

                        <div className="space-y-3">
                            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Something went wrong</h1>
                            <p className="text-gray-500 font-medium leading-relaxed">
                                The application encountered an unexpected error. Don't worry, your data is safe on the blockchain.
                            </p>
                        </div>

                        {this.state.error && (
                            <div className="p-4 bg-gray-50 rounded-2xl text-left overflow-auto max-h-32">
                                <code className="text-xs text-error font-mono font-bold">
                                    {this.state.error.toString()}
                                </code>
                            </div>
                        )}

                        <button
                            onClick={() => window.location.reload()}
                            className="w-full flex items-center justify-center space-x-3 py-4 bg-primary text-white rounded-2xl font-black text-lg hover:bg-blue-600 transition shadow-xl shadow-blue-100 active:scale-95"
                        >
                            <RefreshCcw className="h-5 w-5" />
                            <span>Reload Application</span>
                        </button>

                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest leading-relaxed pt-4">
                            Error Boundary ID: MDM-ERR-{Math.random().toString(36).substring(7).toUpperCase()}
                        </p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
