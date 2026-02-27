"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";

export default function RequestCallModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [fullName, setFullName] = useState("");
    const [mobile, setMobile] = useState("");
    const [loading, setLoading] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!fullName || fullName.trim().length === 0) {
            toast.error("Please enter your full name.");
            return;
        }
        if (!mobile || mobile.length < 10) {
            toast.error("Please enter a valid mobile number.");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/request-call", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fullName, mobile }),
            });

            if (res.ok) {
                toast.success("Request sent successfully! We will call you soon.");
                setIsOpen(false);
                setFullName("");
                setMobile("");
            } else {
                toast.error("Something went wrong. Please try again.");
            }
        } catch (error) {
            toast.error("Failed to send request.");
        } finally {
            setLoading(false);
        }
    };

    const modalContent = isOpen ? (
        <div style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 999999
        }}>
            <div style={{
                backgroundColor: "#fff",
                padding: "24px",
                borderRadius: "12px",
                width: "90%",
                maxWidth: "400px",
                color: "#000",
                boxShadow: "0 10px 25px rgba(0,0,0,0.1)"
            }}>
                <h3 style={{ marginTop: 0, marginBottom: "16px", fontSize: "18px", fontWeight: 600 }}>
                    Request a Call Back
                </h3>
                <p style={{ fontSize: "14px", color: "#666", marginBottom: "20px" }}>
                    Enter your details and our support team will get back to you shortly.
                </p>
                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        placeholder="Enter your full name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        style={{
                            width: "100%",
                            padding: "12px",
                            borderRadius: "8px",
                            border: "1px solid #ccc",
                            marginBottom: "12px",
                            fontSize: "16px",
                            boxSizing: "border-box",
                            outline: "none"
                        }}
                    />
                    <input
                        type="tel"
                        placeholder="Enter your 10-digit mobile number"
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                        style={{
                            width: "100%",
                            padding: "12px",
                            borderRadius: "8px",
                            border: "1px solid #ccc",
                            marginBottom: "20px",
                            fontSize: "16px",
                            boxSizing: "border-box",
                            outline: "none"
                        }}
                    />
                    <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            style={{
                                padding: "10px 16px",
                                backgroundColor: "transparent",
                                border: "1px solid #ddd",
                                borderRadius: "8px",
                                cursor: "pointer",
                                fontSize: "14px",
                                fontWeight: 500,
                                color: "#333"
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                padding: "10px 20px",
                                backgroundColor: "#000",
                                color: "#fff",
                                border: "none",
                                borderRadius: "8px",
                                cursor: loading ? "not-allowed" : "pointer",
                                fontSize: "14px",
                                fontWeight: 500
                            }}
                        >
                            {loading ? "Submitting..." : "Submit Request"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    ) : null;

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                style={{
                    padding: "8px 16px",
                    backgroundColor: "#fff",
                    color: "#000",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    fontWeight: 500,
                    cursor: "pointer",
                    fontSize: "14px"
                }}
            >
                Request a Call
            </button>
            {mounted && createPortal(modalContent, document.body)}
        </>
    );
}
