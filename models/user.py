from dataclasses import dataclass, field
from typing import List, Dict, Optional
import time

@dataclass
class User:
    user_id: str
    items: List['Item'] = field(default_factory=list)
    cooldowns: Dict[str, float] = field(default_factory=dict)
    team: Optional['Team'] = None

@dataclass
class Item:
    item_id: str
    name: str
    effect: str  # e.g., "speed_boost", "damage_reduction"
    duration: int  # in seconds