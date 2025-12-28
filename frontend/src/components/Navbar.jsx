import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { auth, signOutUser, getUserRole } from "../utils/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { ShieldCheck, User, LogOut, Menu, X, ChevronRight, QrCode } from "lucide-react";

const Navbar = () => {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null);
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                const userRole = await getUserRole(currentUser.uid);
                setRole(userRole);
            } else {
                setRole(null);
            }
        });
        return () => unsubscribe();
    }, []);

    const handleLogout = async () => {
        await signOutUser();
        navigate("/login");
        setIsOpen(false);
    };

    const navLinks = [
        { name: "Home", path: "/" },
        { name: "Verify", path: "/verify/public" },
        { name: "Scan", path: "/scan" },
        ...(role === "institution" ? [{ name: "Issue", path: "/institution" }] : []),
        ...(role === "student" ? [{ name: "My Certificates", path: "/student" }] : []),
    ];

    const isActive = (path) => location.pathname === path;

    return (
        <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">
                    {/* Logo Area */}
                    <Link to="/" className="flex items-center space-x-2.5 hover:opacity-90 transition">
                        <div className="bg-primary p-2 rounded-xl text-white shadow-md shadow-blue-200">
                            <ShieldCheck className="h-6 w-6" />
                        </div>
                        <span className="text-2xl font-black text-gray-900 tracking-tight">Merit<span className="text-primary text-[1.4rem]">Registry</span></span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center space-x-8">
                        {navLinks.map((link) => (
                            <Link
                                key={link.path}
                                to={link.path}
                                className={`text-sm font-bold transition-all hover:text-primary ${isActive(link.path) ? "text-primary" : "text-gray-500"
                                    }`}
                            >
                                {link.name}
                            </Link>
                        ))}

                        <div className="h-6 w-px bg-gray-100"></div>

                        {user ? (
                            <div className="flex items-center space-x-4">
                                <div className="flex flex-col items-end text-right">
                                    <span className="text-xs font-bold text-gray-900 truncate max-w-[120px]">{user.email}</span>
                                    <span className="text-[10px] text-gray-400 uppercase tracking-widest font-black leading-none">{role || 'loading...'}</span>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="p-2.5 rounded-xl bg-gray-50 text-gray-500 hover:text-error hover:bg-red-50 transition-all border border-gray-100 shadow-sm"
                                    title="Logout"
                                >
                                    <LogOut className="h-5 w-5" />
                                </button>
                            </div>
                        ) : (
                            <Link
                                to="/login"
                                className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-600 transition shadow-lg shadow-blue-100 text-sm active:scale-95"
                            >
                                Get Started
                            </Link>
                        )}
                    </div>

                    {/* Mobile Toggle */}
                    <button
                        className="md:hidden p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition"
                        onClick={() => setIsOpen(!isOpen)}
                    >
                        {isOpen ? <X className="h-7 w-7" /> : <Menu className="h-7 w-7" />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {isOpen && (
                <div className="md:hidden absolute top-16 inset-x-0 bg-white border-b border-gray-100 shadow-xl overflow-hidden animate-in slide-in-from-top duration-300">
                    <div className="p-4 space-y-2">
                        {navLinks.map((link) => (
                            <Link
                                key={link.path}
                                to={link.path}
                                className={`flex items-center justify-between p-4 rounded-xl text-lg font-bold transition-all ${isActive(link.path) ? "bg-blue-50 text-primary" : "text-gray-600 hover:bg-gray-50"
                                    }`}
                                onClick={() => setIsOpen(false)}
                            >
                                <span>{link.name}</span>
                                <ChevronRight className="h-5 w-5 opacity-30" />
                            </Link>
                        ))}

                        <div className="pt-4 mt-2 border-t border-gray-100">
                            {user ? (
                                <div className="space-y-4">
                                    <div className="px-4 py-2">
                                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Logged in as</p>
                                        <p className="text-sm font-bold text-gray-900">{user.email}</p>
                                        <p className="text-[10px] text-primary font-black uppercase tracking-tight">{role}</p>
                                    </div>
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center justify-center space-x-2 p-4 bg-red-50 text-error rounded-xl font-bold"
                                    >
                                        <LogOut className="h-5 w-5" />
                                        <span>Logout Account</span>
                                    </button>
                                </div>
                            ) : (
                                <Link
                                    to="/login"
                                    className="block w-full text-center p-4 bg-primary text-white rounded-xl font-bold"
                                    onClick={() => setIsOpen(false)}
                                >
                                    Sign In to System
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
