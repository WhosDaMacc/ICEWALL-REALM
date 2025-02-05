import React, { useState, useEffect } from "react";
import { fetchUserData } from "../services/api";

function UserProfile({ userId }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchUserData(userId).then((data) => setUser(data));
  }, [userId]);

  return user ? (
    <div className="user-profile">
      <h2>{user.username}'s Profile</h2>
      <div>
        <strong>Item Bag:</strong>
        <ul>
          {user.item_bag.map((item, index) => (
            <li key={index}>{item.name} - {item.item_type}</li>
          ))}
        </ul>
      </div>
    </div>
  ) : (
    <p>Loading user data...</p>
  );
}

export default UserProfile;