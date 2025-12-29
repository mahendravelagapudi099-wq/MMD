import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
    ShieldCheck,
    Anchor,
    Search,
    Globe,
    FileCheck,
    Lock,
    History,
    Key,
    UserPlus,
    LayoutDashboard
} from "lucide-react";
import { auth, getUserRole } from "../utils/firebase";
import { onAuthStateChanged } from "firebase/auth";

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

    const getIssuanceText = () => {
        if (!user) return "Go to Issuance";
        return role === "institution" ? "Go to Issuance" : "Access Professional Portal";
    };

    return (
        <div className="space-y-32 pb-24">
            {/* Hero Section */}
            <header className="relative pt-20 pb-16 text-center space-y-10 max-w-5xl mx-auto px-4">
                <div className="inline-flex items-center space-x-2 bg-gray-50 border border-gray-100 px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest text-primary">
                    <div className="h-1.5 w-1.5 bg-secondary rounded-full animate-pulse" />
                    <span>Blockchain Credibility: Polygon Mainnet</span>
                </div>

                <div className="space-y-6">
                    <h1 className="text-6xl md:text-8xl font-black text-gray-900 tracking-tighter leading-[1] animate-in slide-in-from-bottom-8 duration-700">
                        Maritime <br />
                        <span className="bg-gradient-to-r from-primary via-blue-600 to-secondary bg-clip-text text-transparent">
                            Document Management
                        </span>
                    </h1>
                    <div className="flex items-center justify-center space-x-4 text-sm font-black uppercase tracking-[0.2em] text-gray-400 animate-in fade-in delay-500">
                        <span>Secure</span>
                        <span className="h-1 w-1 bg-primary rounded-full" />
                        <span>Organized</span>
                        <span className="h-1 w-1 bg-primary rounded-full" />
                        <span>Compliant</span>
                    </div>
                    <p className="text-xl md:text-2xl text-gray-500 leading-relaxed max-w-3xl mx-auto font-medium animate-in fade-in slide-in-from-bottom-4 delay-700">
                        The gold standard in maritime verification. MDM provides a bulletproof, blockchain-anchored ledger for managing global maritime credentials.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row justify-center items-center gap-5 pt-8">
                    <Link
                        to={getCTALink()}
                        className="w-full sm:w-auto bg-primary text-white px-10 py-4 rounded-lg font-bold text-lg hover:bg-opacity-90 transition shadow-lg active:scale-[0.98]"
                    >
                        {getIssuanceText()}
                    </Link>
                    <Link
                        to="/verify/public"
                        className="w-full sm:w-auto bg-white border-2 border-primary text-primary px-10 py-4 rounded-lg font-bold text-lg hover:bg-gray-50 transition active:scale-[0.98]"
                    >
                        Verify Document
                    </Link>
                </div>
            </header>

            {/* Verification Section */}
            <section className="max-w-4xl mx-auto px-4">
                <div className="bg-gray-900 rounded-2xl p-8 md:p-12 text-white shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <ShieldCheck className="h-32 w-32" />
                    </div>
                    <div className="relative z-10 space-y-8">
                        <div className="space-y-2">
                            <h2 className="text-3xl font-bold">Instant Global Verification</h2>
                            <p className="text-gray-400">Emphasize instant and global verification. Enter the document reference below.</p>
                        </div>
                        <div className="relative group max-w-2xl">
                            <input
                                type="text"
                                placeholder="Enter Document ID or Reference Number"
                                className="w-full pl-14 pr-6 py-5 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-secondary focus:bg-white/20 outline-none transition-all text-lg placeholder:text-white/30"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') window.location.href = `/verify/${e.currentTarget.value}`;
                                }}
                            />
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-6 w-6 text-white/40 group-focus-within:text-secondary transition" />
                        </div>
                    </div>
                </div>
            </section>

            {/* Trusted By Section */}
            <section className="max-w-6xl mx-auto px-4 text-center space-y-12">
                <h3 className="text-sm font-black uppercase tracking-[0.3em] text-gray-400">Trusted by Maritime Authorities & Institutions</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-12 items-center opacity-60">
                    <div className="flex flex-col items-center space-y-3 grayscale hover:grayscale-0 transition cursor-default">
                        <Anchor className="h-10 w-10 text-primary" />
                        <span className="font-bold text-sm">Port Authorities</span>
                    </div>
                    <div className="flex flex-col items-center space-y-3 grayscale hover:grayscale-0 transition cursor-default">
                        <Globe className="h-10 w-10 text-primary" />
                        <span className="font-bold text-sm">Maritime Training Institutes</span>
                    </div>
                    <div className="flex flex-col items-center space-y-3 grayscale hover:grayscale-0 transition cursor-default">
                        <FileCheck className="h-10 w-10 text-primary" />
                        <span className="font-bold text-sm">Shipping Companies</span>
                    </div>
                    <div className="flex flex-col items-center space-y-3 grayscale hover:grayscale-0 transition cursor-default">
                        <ShieldCheck className="h-10 w-10 text-primary" />
                        <span className="font-bold text-sm">Regulatory Bodies</span>
                    </div>
                </div>
            </section>

            {/* How It Works Section */}
            <section className="bg-gray-50 py-24 px-4 border-y border-gray-100">
                <div className="max-w-6xl mx-auto space-y-16">
                    <div className="text-center space-y-4">
                        <h2 className="text-4xl font-bold text-primary">How It Works</h2>
                        <p className="text-gray-500 max-w-xl mx-auto">A streamlined process for maritime document security and verification.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="bg-white p-10 rounded-xl border border-gray-100 shadow-sm space-y-6">
                            <div className="h-12 w-12 bg-primary/10 text-primary rounded-lg flex items-center justify-center font-bold">01</div>
                            <div className="space-y-3">
                                <h4 className="text-xl font-bold">Register Document Hash</h4>
                                <p className="text-gray-500 text-sm leading-relaxed">Authorized institutions submit cryptographic hashes of documents to the blockchain.</p>
                            </div>
                        </div>

                        <div className="bg-white p-10 rounded-xl border border-gray-100 shadow-sm space-y-6">
                            <div className="h-12 w-12 bg-primary/10 text-primary rounded-lg flex items-center justify-center font-bold">02</div>
                            <div className="space-y-3">
                                <h4 className="text-xl font-bold">Authorized Digital Signing</h4>
                                <p className="text-gray-500 text-sm leading-relaxed">Issuers sign records using verified private keys, ensuring authenticity.</p>
                            </div>
                        </div>

                        <div className="bg-white p-10 rounded-xl border border-gray-100 shadow-sm space-y-6">
                            <div className="h-12 w-12 bg-secondary/10 text-secondary rounded-lg flex items-center justify-center font-bold">03</div>
                            <div className="space-y-3">
                                <h4 className="text-xl font-bold">Instant Global Verification</h4>
                                <p className="text-gray-500 text-sm leading-relaxed">Documents can be verified anytime, anywhere by anyone with access.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="max-w-6xl mx-auto px-4">
                <div className="grid md:grid-cols-3 gap-16">
                    <div className="space-y-6">
                        <div className="h-12 w-12 bg-gray-50 rounded-lg flex items-center justify-center text-primary">
                            <Lock className="h-6 w-6" />
                        </div>
                        <div className="space-y-3">
                            <h4 className="text-xl font-bold">Enterprise-Grade Privacy</h4>
                            <p className="text-gray-500 text-sm leading-relaxed">Only cryptographic hashes are stored on-chain, keeping sensitive data private and secure.</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="h-12 w-12 bg-gray-50 rounded-lg flex items-center justify-center text-primary">
                            <Globe className="h-6 w-6" />
                        </div>
                        <div className="space-y-3">
                            <h4 className="text-xl font-bold">Global Maritime Interoperability</h4>
                            <p className="text-gray-500 text-sm leading-relaxed">Built on open blockchain standards for seamless cross-border verification.</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="h-12 w-12 bg-gray-50 rounded-lg flex items-center justify-center text-primary">
                            <History className="h-6 w-6" />
                        </div>
                        <div className="space-y-3">
                            <h4 className="text-xl font-bold">Controlled Revocation & Audit Trail</h4>
                            <p className="text-gray-500 text-sm leading-relaxed">Maintain a transparent status history with controlled revocation capabilities.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Call to Action Section */}
            <section className="max-w-5xl mx-auto px-4">
                <div className="bg-primary rounded-3xl p-12 text-center text-white space-y-10 shadow-2xl">
                    <div className="space-y-4">
                        <h2 className="text-4xl font-bold">Ready to Modernize Maritime Documentation?</h2>
                        <p className="text-white/70 max-w-xl mx-auto font-medium">Join the global network of maritime authorities using blockchain for secure document management.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <Link to="/login" className="bg-white text-primary px-10 py-4 rounded-lg font-bold hover:bg-gray-100 transition active:scale-95 flex items-center justify-center space-x-2">
                            <UserPlus className="h-5 w-5" />
                            <span>Register Institution</span>
                        </Link>
                        <Link to="/login" className="bg-secondary text-white px-10 py-4 rounded-lg font-bold hover:bg-opacity-90 transition active:scale-95 flex items-center justify-center space-x-2">
                            <LayoutDashboard className="h-5 w-5" />
                            <span>Access Professional Portal</span>
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Home;

