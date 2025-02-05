import React from 'react';

function ItemBag({ items }) {
  return (
    <div className="item-bag">
      <h3>Items</h3>
      <ul>
        {items.map((item, index) => (
          <li key={index}>{item.name} - {item.item_type}</li>
        ))}
      </ul>
    </div>
  );
}

export default ItemBag;