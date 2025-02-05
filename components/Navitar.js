import React from 'react';

function Navitar({ avatarData }) {
  return (
    <div className="navitar">
      <h3>{avatarData.name}</h3>
      <div className="avatar-image">
        <img src={avatarData.image} alt={avatarData.name} />
      </div>
      <div className="navitar-actions">
        <button>Send Challenge</button>
        <button>Check Perks</button>
      </div>
    </div>
  );
}

export default Navitar;