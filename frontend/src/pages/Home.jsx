import React from "react";
import { Link } from "react-router-dom";
import {
    ShieldCheck,
    Award,
    CheckCircle,
    Search,
    Zap,
    Lock,
    Globe,
    Upload,
    Fingerprint,
    Link as LinkIcon
} from "lucide-react";
import { auth, getUserRole } from "../utils/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useState, useEffect } from "react";

const Home = () => {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null);

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

    const getCTALink = () => {
        if (!user) return "/login";
        return role === "institution" ? "/institution" : "/student";
    };

    const getCTAText = () => {
        if (!user) return "Issue Now";
        return role === "institution" ? "Go to Issuance" : "View My Portal";
    };
    return (
        <div className="space-y-24 py-16">
            {/* Hero Section */}
            <header className="relative text-center space-y-8 max-w-4xl mx-auto px-4">
                <div className="inline-flex items-center space-x-2 bg-blue-50 text-primary px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-4 animate-in fade-in zoom-in-50 duration-700">
                    <Zap className="h-4 w-4 fill-primary" />
                    <span>Web3 Powered Verification</span>
                </div>
                <h1 className="text-6xl md:text-7xl font-black text-gray-900 tracking-tighter leading-[1.05] animate-in slide-in-from-bottom-8 duration-700">
                    The Proof of Your <br />
                    <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent italic">Achievements</span>
                </h1>
                <p className="text-xl md:text-2xl text-gray-500 leading-relaxed font-medium max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 delay-200 duration-700">
                    A tamper-proof decentralized registry for academic certificates. Verify credentials instantly on the Polygon blockchain.
                </p>
                <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-6 animate-in fade-in slide-in-from-bottom-8 delay-300 duration-700">
                    <Link
                        to={getCTALink()}
                        className="w-full sm:w-auto bg-primary text-white px-10 py-4 rounded-2xl font-black text-lg hover:bg-blue-600 transition shadow-xl shadow-blue-200 active:scale-95"
                    >
                        {getCTAText()}
                    </Link>
                    <div className="relative group w-full sm:w-80">
                        <input
                            type="text"
                            placeholder="Verify by Certificate ID..."
                            className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-primary outline-none transition-all shadow-sm"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') window.location.href = `/verify/${e.currentTarget.value}`;
                            }}
                        />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-gray-300 group-focus-within:text-primary transition" />
                    </div>
                </div>
            </header>

            {/* Stats/Logo Cloud (Subtle) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 opacity-40 grayscale max-w-5xl mx-auto px-4">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="flex items-center justify-center space-x-2">
                        <Globe className="h-6 w-6" />
                        <span className="font-bold tracking-tighter text-xl">TRUSTED_ORG_{i}</span>
                    </div>
                ))}
            </div>

            {/* How it Works Section */}
            <section className="relative px-4 overflow-hidden py-16 rounded-[3rem] bg-gray-900 text-white">
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[500px] h-[500px] bg-primary/20 blur-[120px] rounded-full" />
                <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-blue-500/10 blur-[120px] rounded-full" />

                <div className="relative z-10 space-y-16 max-w-6xl mx-auto">
                    <div className="text-center space-y-4">
                        <h2 className="text-4xl md:text-5xl font-black tracking-tight">Simple. Immutable. Secure.</h2>
                        <p className="text-gray-400 font-medium max-w-xl mx-auto italic">Verification has never been easier or more reliable.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-12 relative">
                        {/* Connection Line (Desktop) */}
                        <div className="hidden md:block absolute top-12 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-transparent via-gray-700 to-transparent" />

                        {/* Step 1 */}
                        <div className="text-center space-y-6 flex flex-col items-center group">
                            <div className="bg-gray-800 p-6 rounded-3xl border border-gray-700 group-hover:border-primary transition duration-500">
                                <Upload className="h-10 w-10 text-primary" />
                            </div>
                            <div className="space-y-2">
                                <span className="text-primary font-black text-sm uppercase">Step 01</span>
                                <h3 className="text-2xl font-black">Anchor Hash</h3>
                                <p className="text-gray-400 text-sm leading-relaxed">Institutions upload a cryptographic hash of the certificate to the Polygon network.</p>
                            </div>
                        </div>

                        {/* Step 2 */}
                        <div className="text-center space-y-6 flex flex-col items-center group">
                            <div className="bg-gray-800 p-6 rounded-3xl border border-gray-700 group-hover:border-primary transition duration-500">
                                <Fingerprint className="h-10 w-10 text-primary" />
                            </div>
                            <div className="space-y-2">
                                <span className="text-primary font-black text-sm uppercase">Step 02</span>
                                <h3 className="text-2xl font-black">Sign Transaction</h3>
                                <p className="text-gray-400 text-sm leading-relaxed">The issuer signs the record with their private key, establishing ownership and trust.</p>
                            </div>
                        </div>

                        {/* Step 3 */}
                        <div className="text-center space-y-6 flex flex-col items-center group">
                            <div className="bg-primary p-6 rounded-3xl border border-primary/50 shadow-2xl shadow-primary/20 hover:scale-105 transition duration-500">
                                <ShieldCheck className="h-10 w-10 text-white" />
                            </div>
                            <div className="space-y-2">
                                <span className="text-primary font-black text-sm uppercase">Step 03</span>
                                <h3 className="text-2xl font-black">Public Proof</h3>
                                <p className="text-gray-400 text-sm leading-relaxed">Instantly verify the status and authenticity from anywhere in the world.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Showcase */}
            <section className="grid md:grid-cols-2 lg:grid-cols-3 gap-12 px-4 max-w-7xl mx-auto">
                <div className="group space-y-6">
                    <div className="h-14 w-14 bg-blue-50 text-primary rounded-2xl flex items-center justify-center group-hover:bg-primary group-hover:text-white transition duration-500 shadow-md">
                        <Lock className="h-7 w-7" />
                    </div>
                    <div className="space-y-3">
                        <h4 className="text-2xl font-black tracking-tight">Military Grade Privacy</h4>
                        <p className="text-gray-500 leading-relaxed font-medium">We only store hashes. Your sensitive academic data never leaves your institution's local servers.</p>
                    </div>
                </div>

                <div className="group space-y-6">
                    <div className="h-14 w-14 bg-green-50 text-success rounded-2xl flex items-center justify-center group-hover:bg-success group-hover:text-white transition duration-500 shadow-md">
                        <Globe className="h-7 w-7" />
                    </div>
                    <div className="space-y-3">
                        <h4 className="text-2xl font-black tracking-tight">Global Interoperability</h4>
                        <p className="text-gray-500 leading-relaxed font-medium">Built on open ERC standards. Your certificates can be verified across many blockchain explorers.</p>
                    </div>
                </div>

                <div className="group space-y-6">
                    <div className="h-14 w-14 bg-red-50 text-error rounded-2xl flex items-center justify-center group-hover:bg-error group-hover:text-white transition duration-500 shadow-md">
                        <LinkIcon className="h-7 w-7" />
                    </div>
                    <div className="space-y-3">
                        <h4 className="text-2xl font-black tracking-tight">Smart Revocation</h4>
                        <p className="text-gray-500 leading-relaxed font-medium">Easily invalidate credentials if errors are found, with a clear on-chain status trail.</p>
                    </div>
                </div>
            </section>

            {/* CTA Footer */}
            <section className="text-center space-y-10 py-20 px-4 bg-gradient-to-b from-transparent to-blue-50/50 rounded-[4rem]">
                <div className="space-y-4">
                    <h2 className="text-4xl md:text-5xl font-black tracking-tight">Ready to Secure the Future?</h2>
                    <p className="text-gray-500 font-medium max-w-lg mx-auto">Join hundreds of institutions modernizing their academic record systems today.</p>
                </div>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                    <Link to="/login" className="bg-gray-900 text-white px-12 py-4 rounded-2xl font-black text-lg hover:bg-black transition shadow-xl active:scale-95">
                        Register Institution
                    </Link>
                    <Link to="/login" className="bg-white border-2 border-primary text-primary px-12 py-4 rounded-2xl font-black text-lg hover:bg-blue-50 transition shadow-sm active:scale-95">
                        Student Portal
                    </Link>
                </div>
            </section>
        </div>
    );
};

export default Home;
