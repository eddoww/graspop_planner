import React, { createContext, useState, useContext, useEffect } from "react";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Try to get user from localStorage
    const savedUser = localStorage.getItem("graspopUser");
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }

    // Fetch users from backend
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_URL}/users/`);
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectUser = (user) => {
    setCurrentUser(user);
    localStorage.setItem("graspopUser", JSON.stringify(user));
  };

  const createUser = async (name) => {
    try {
      const response = await fetch(`${API_URL}/users/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      });
      const newUser = await response.json();
      setUsers([...users, newUser]);
      selectUser(newUser);
    } catch (error) {
      console.error("Error creating user:", error);
    }
  };

  return (
    <UserContext.Provider
      value={{ currentUser, users, selectUser, createUser, isLoading }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
