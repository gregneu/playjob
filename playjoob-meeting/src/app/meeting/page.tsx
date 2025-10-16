"use client";
import { useEffect, useState } from "react";

export default function Meeting() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const fetchToken = async () => {
      const res = await fetch(
        "https://cicmapcwlvdatmgwdylh.supabase.co/functions/v1/get-jitsi-token",
        {
          headers: {
            Authorization:
              "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpY21hcGN3bHZkYXRtZ3dkeWxoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyODg1MjcsImV4cCI6MjA2ODg2NDUyN30.zCbbHc9pOa75I06Eow4M4s2fjF9iXuyHvuWdLPNhZDo",
          },
        }
      );
      const data = await res.json();
      setToken(data.token);
    };
    fetchToken();
  }, []);

  useEffect(() => {
    if (token && typeof window !== "undefined") {
      const script = document.createElement("script");
      script.src = "https://8x8.vc/external_api.js";
      script.async = true;
      script.onload = () => {
        const domain = "8x8.vc";
        const options = {
          roomName: "test-room",
          jwt: token,
          width: "100%",
          height: 700,
          parentNode: document.querySelector("#meet"),
        };
        new window.JitsiMeetExternalAPI(domain, options);
      };
      document.body.appendChild(script);
    }
  }, [token]);

  return (
    <div className="w-full h-screen flex items-center justify-center bg-gray-900">
      <div id="meet" className="w-full h-[90vh]" />
    </div>
  );
}
