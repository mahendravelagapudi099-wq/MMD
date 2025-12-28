import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInUser, signUpUser, resetPassword, getAuthErrorMessage, getUserRole, auth } from "../utils/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect } from "react";
import { Mail, Lock, AlertCircle, CheckCircle, User, Building2, ArrowRight } from "lucide-react";

const Login = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState("student");
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const role = await getUserRole(user.uid);
                navigate(role === "institution" ? "/institution" : "/student");
            }
        });
        return () => unsubscribe();
    }, [navigate]);

    const validateForm = () => {
        if (!email || !password) {
            setError("Please fill in all fields.");
            return false;
        }
        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            return false;
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setMessage("");
        if (!validateForm()) return;

        setLoading(true);
        try {
            if (isLogin) {
                await signInUser(email, password);
                navigate("/");
            } else {
                await signUpUser(email, password, role);
                setMessage("Account created successfully!");
                setTimeout(() => navigate("/"), 1500);
            }
        } catch (err) {
            setError(getAuthErrorMessage(err));
            console.error("Auth Error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!email) {
            setError("Please enter your email address first.");
            return;
        }
        setLoading(true);
        try {
            await resetPassword(email);
            setMessage("Password reset email sent!");
        } catch (err) {
            setError(getAuthErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[85vh] flex items-center justify-center px-4 py-8 bg-gray-50/50">
            <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-gray-100 transition-all duration-300">
                <div className="text-center mb-8">
                    <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">
                        {isLogin ? "Welcome Back" : "Create Account"}
                    </h2>
                    <p className="text-gray-500 mt-2">
                        {isLogin ? "Access your decentralized certificates" : "Join the MeritRegistry network"}
                    </p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border-l-4 border-error text-error rounded-r-md flex items-center space-x-3 animate-in fade-in slide-in-from-top-2">
                        <AlertCircle className="h-5 w-5 flex-shrink-0" />
                        <span className="text-sm font-medium">{error}</span>
                    </div>
                )}

                {message && (
                    <div className="mb-6 p-4 bg-green-50 border-l-4 border-success text-success rounded-r-md flex items-center space-x-3 animate-in fade-in slide-in-from-top-2">
                        <CheckCircle className="h-5 w-5 flex-shrink-0" />
                        <span className="text-sm font-medium">{message}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Role Selection (Only for Sign Up) */}
                    {!isLogin && (
                        <div className="grid grid-cols-2 gap-4 mb-2">
                            <button
                                type="button"
                                onClick={() => setRole("student")}
                                className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all ${role === "student" ? "border-primary bg-blue-50 text-primary" : "border-gray-100 text-gray-400 grayscale"
                                    }`}
                            >
                                <User className="h-6 w-6 mb-1" />
                                <span className="text-xs font-bold">Student</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setRole("institution")}
                                className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all ${role === "institution" ? "border-primary bg-blue-50 text-primary" : "border-gray-100 text-gray-400 grayscale"
                                    }`}
                            >
                                <Building2 className="h-6 w-6 mb-1" />
                                <span className="text-xs font-bold">Institution</span>
                            </button>
                        </div>
                    )}

                    <div className="space-y-1">
                        <label className="block text-sm font-semibold text-gray-700 ml-1">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="email"
                                required
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:bg-white focus:border-transparent transition-all outline-none"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <div className="flex justify-between items-center px-1">
                            <label className="block text-sm font-semibold text-gray-700">Password</label>
                            {isLogin && (
                                <button
                                    type="button"
                                    onClick={handleForgotPassword}
                                    className="text-xs text-primary hover:underline font-medium"
                                >
                                    Forgot?
                                </button>
                            )}
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="password"
                                required
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:bg-white focus:border-transparent transition-all outline-none font-sans"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary text-white py-3 rounded-xl font-bold text-lg hover:bg-blue-600 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center space-x-2 shadow-lg shadow-blue-100"
                    >
                        {loading ? (
                            <div className="h-6 w-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <span>{isLogin ? "Sign In" : "Create Account"}</span>
                                <ArrowRight className="h-5 w-5" />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-gray-500 font-medium">
                        {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
                        <button
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setError("");
                                setMessage("");
                            }}
                            className="text-primary font-bold hover:underline"
                        >
                            {isLogin ? "Sign Up" : "Log In"}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
