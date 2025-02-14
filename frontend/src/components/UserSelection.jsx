import React, { useState } from "react";
import { useUser } from "../contexts/UserContext";

const UserSelection = () => {
  const { currentUser, users, selectUser, createUser } = useUser();
  const [newUserName, setNewUserName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  if (currentUser) {
    return (
      <div className="mb-4 flex items-center gap-4">
        <span className="text-gray-600">Welcome, {currentUser.name}!</span>
        <button
          onClick={() => selectUser(null)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Switch User
        </button>
      </div>
    );
  }

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (newUserName.trim()) {
      await createUser(newUserName.trim());
      setNewUserName("");
      setIsCreating(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <h2 className="text-xl font-bold mb-4">Welcome to Graspop Planner</h2>

      {isCreating ? (
        <form onSubmit={handleCreateUser} className="space-y-4">
          <input
            type="text"
            value={newUserName}
            onChange={(e) => setNewUserName(e.target.value)}
            placeholder="Enter your name"
            className="w-full px-4 py-2 border rounded-lg"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create Profile
            </button>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          {users.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select your profile:
              </label>
              <select
                onChange={(e) => selectUser(users[e.target.value])}
                className="w-full px-4 py-2 border rounded-lg"
              >
                <option value="">Choose a profile...</option>
                {users.map((user, index) => (
                  <option key={user.id} value={index}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Create New Profile
          </button>
        </div>
      )}
    </div>
  );
};

export default UserSelection;
