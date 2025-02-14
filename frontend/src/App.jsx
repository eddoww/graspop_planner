import "./App.css";
import GraspopPlanner from "./components/graspop";
import FestivalPlanner from "./components/FestivalPlanner";
import { UserProvider } from "./contexts/UserContext";
import { useState } from "react";

export default function App() {
  const [view, setView] = useState("personal"); // 'personal' or 'group'

  return (
    <main>
      <UserProvider>
        <div className="fixed top-4 right-4 z-10">
          <button
            onClick={() => setView(view === "personal" ? "group" : "personal")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg"
          >
            {view === "personal" ? "Group View" : "Personal View"}
          </button>
        </div>
        {view === "personal" ? <GraspopPlanner /> : <FestivalPlanner />}
      </UserProvider>
    </main>
  );
}
