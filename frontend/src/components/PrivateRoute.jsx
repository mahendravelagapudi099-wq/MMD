import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { auth, getUserRole } from "../utils/firebase";
import { onAuthStateChanged } from "firebase/auth";

const PrivateRoute = ({ children, allowedRole = null }) => {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                const userRole = await getUserRole(currentUser.uid);
                setRole(userRole);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    if (loading) {
        return (
            <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-4">
                <div className="relative h-16 w-16">
                    <div className="absolute inset-0 rounded-full border-4 border-gray-100" />
                    <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                </div>
                <p className="text-gray-400 font-black text-xs uppercase tracking-widest animate-pulse">
                    Verifying Identity...
                </p>
            </div>
        );
    }

    if (!user) return <Navigate to="/login" />;

    // Multi-layered protection
    if (allowedRole && role !== allowedRole) {
        return <Navigate to="/" />; // Redirect unauthorized roles to home
    }

    return children;
};

export default PrivateRoute;
