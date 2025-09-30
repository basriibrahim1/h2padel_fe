"use client";

import { updateDisplayName } from "@/lib/supabase/updateUser";
import { useState } from "react";

export default function ProfileForm() {
  const [name, setName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const user = await updateDisplayName(name);
      console.log("Updated user:", user);
      alert("Display name updated!");
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input type="text" placeholder="Enter display name" value={name} onChange={(e) => setName(e.target.value)} className="border p-2 rounded" />
      <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">
        Save
      </button>
    </form>
  );
}
