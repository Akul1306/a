import { getApiUrl } from "./apiConfig";

export const loginWithEmail = async (email, password) => {
  const response = await fetch(getApiUrl("/api/auth/login"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to log in");
  }
  return data; // { status, token, data: { user } }
};

export const registerUser = async (userData) => {
  const response = await fetch(getApiUrl("/api/auth/register"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(userData),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to register");
  }
  return data;
};

export const googleAuth = async (credentialToken) => {
  const response = await fetch(getApiUrl("/api/auth/google"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ credentialToken }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Google authentication failed");
  }
  return data;
};

export const getAuthHeaders = () => {
  const token = localStorage.getItem("kalyan_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const getProfileAPI = async () => {
  const token = localStorage.getItem("kalyan_token");
  if (!token) return null;
  
  const response = await fetch(getApiUrl("/api/users/profile"), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch profile");
  }
  return data;
};

export const updateProfileAPI = async (formDataOrData) => {
  const token = localStorage.getItem("kalyan_token");
  const isMultipart = formDataOrData instanceof FormData;
  const headers = {
    Authorization: `Bearer ${token}`,
  };
  if (!isMultipart) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(getApiUrl("/api/users/profile"), {
    method: "PUT",
    headers,
    body: isMultipart ? formDataOrData : JSON.stringify(formDataOrData),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to update profile");
  }
  return data;
};
